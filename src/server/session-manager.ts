/**
 * Phase 2-2 — session registry.
 *
 * One live `query()` per session, driven in **streaming input mode** (the
 * prompt is an AsyncIterable we push into) rather than one query() per user
 * message. Two reasons this beats the resume-per-message shape:
 *
 *   - Control requests (`interrupt`, `setPermissionMode`, `mcpServerStatus`)
 *     are only available in streaming input mode.
 *   - The MCP servers and plugin stay warm between turns instead of being
 *     respawned on every message.
 *
 * `resume` is still wired: every session records the SDK `session_id` from its
 * init message, and `create({ resume })` reattaches to a prior conversation —
 * which is what the plan's "session ID ↔ resume" item needs it for (server
 * restart, reconnect), rather than as the per-turn mechanism.
 *
 * In-memory only. Sessions do not survive a server restart; the recorded
 * sdkSessionId is what makes them recoverable.
 */
import { randomUUID } from "node:crypto";
import {
  query,
  type PermissionResult,
  type Query,
  type SDKMessage,
  type SDKUserMessage,
} from "@anthropic-ai/claude-agent-sdk";
import type { ContentBlockParam } from "@anthropic-ai/sdk/resources/messages";
import { loadConfig, requireApiKey, type PocConfig } from "../config.ts";
import { ToolLog } from "./tool-log.ts";
import {
  buildToolPolicy,
  isSapReadTool,
  needsHookApproval,
  QUESTION_TOOL,
  SAP_TOOL_PREFIX,
  type ToolPolicy,
  allowedByLevel,
  type ApprovalLevel,
} from "./tool-policy.ts";
import {
  toContentBlocks,
  toMeta,
  type Attachment,
  type AttachmentMeta,
} from "./attachments.ts";

/** How long discovery waits for the MCP server to leave `pending`. */
const MCP_DISCOVERY_TIMEOUT_MS = 60_000;

/** Per-session replay buffer cap. Oldest events drop first. */
const HISTORY_LIMIT = 500;

/**
 * How long a busy session keeps working with nobody watching before its turn
 * is abandoned.
 *
 * Long enough to cover a reload, a tab restore or a laptop lid — those drop the
 * SSE connection and reattach within a second or two, and killing the turn for
 * one of those would be worse than the cost of waiting. Short enough that a
 * closed tab does not leave the model reading ABAP programs, and paying for
 * them, for an answer nobody will ever see.
 */
const ORPHAN_GRACE_MS = 15_000;

/**
 * Appended to the model's system prompt for every session.
 *
 * One rule, about how table data is laid out. Left to itself the model
 * transposes a single-record result into a two-column field/value list while
 * rendering many records as one column per field — so the same query reads as
 * a different shape at one row versus two. This pins the orientation: fields
 * are columns and records are rows, at any count.
 */
const OUTPUT_FORMAT_APPEND =
  "When you present data read from a SAP table — whether one record or many — " +
  "always render it as a Markdown table with one column per field and one row " +
  "per record. Keep this same header-and-rows orientation for a single record: " +
  "never transpose one record into a two-column field/value list.";

/**
 * Tells the plugin's skills which host they are running under.
 *
 * Skills written for the Claude Code CLI open with a permission bootstrap
 * (`trust-session`) that writes `.claude/settings.local.json`. This host loads
 * only the project settings and decides permissions itself, so that step
 * grants nothing and costs a turn of file reads. The skills skip it when they
 * see this marker — `analyze-symptom` first; see its workflow-steps.md.
 */
const HOST_APPEND =
  "Host: sc4sap-web. This is a headless host that governs tool permissions " +
  "itself; skip any session-trust / permission-bootstrap step a skill asks for.";

/**
 * How long an unanswered approval blocks the turn before it is denied.
 * Without a ceiling a closed browser tab wedges the session forever.
 * Overridable so the timeout path is testable without a five-minute wait.
 */
const PERMISSION_TIMEOUT_MS = Number(
  process.env.SC4SAP_PERMISSION_TIMEOUT_MS ?? 5 * 60_000,
);


export type SessionStatus = "starting" | "idle" | "busy" | "closed" | "error";

/** The sub-agent dispatch. Its input carries the model the skill asked for. */
const AGENT_TOOL = "Agent";

/** The raw Anthropic stream event, reached through SDKMessage so no transitive import is needed. */
type StreamEvent = Extract<SDKMessage, { type: "stream_event" }>["event"];

/**
 * An approval waiting on a human. `kind: "question"` is the model asking the
 * user to choose (the AskUserQuestion tool) rather than asking to act; the
 * frontend renders it as an option form instead of an allow/deny prompt.
 */
export type PendingApproval = {
  reqId: string;
  kind: "tool" | "question";
  toolName: string;
  toolUseId: string;
  input: Record<string, unknown>;
  /** Prompt text rendered by the SDK bridge; prefer it over reconstructing one. */
  title?: string;
  displayName?: string;
  description?: string;
  /** For `kind: "question"` — the `questions[]` array, forwarded as-is. */
  questions?: unknown;
  createdAt: string;
};

export type PermissionDecision = "allow" | "deny" | "expired";

/** What a client sends back to settle a pending approval. */
export type PermissionResponse =
  | {
      behavior: "allow";
      updatedInput?: Record<string, unknown>;
      /** For questions: `{ [question text]: chosen label }`. */
      answers?: Record<string, string>;
      annotations?: Record<string, unknown>;
    }
  | { behavior: "deny"; message?: string };

export type SessionEvent =
  /** A complete SDK message. Authoritative — a client may render from these alone. */
  | { type: "message"; message: SDKMessage }
  | { type: "permission_request"; request: PendingApproval }
  | { type: "permission_resolved"; reqId: string; decision: PermissionDecision }
  /** The session's auto-approve switch changed, so every watcher agrees on it. */
  | { type: "auto_approve"; enabled: boolean }
  | { type: "status"; status: SessionStatus }
  | { type: "turn_start" }
  | { type: "turn_end" }
  | { type: "text_delta"; index: number; text: string }
  | { type: "thinking_delta"; index: number; text: string }
  | { type: "tool_start"; index: number; toolUseId: string; name: string }
  | { type: "tool_end"; index: number }
  | { type: "error"; error: string };

/** An event as delivered to subscribers — `seq` drives SSE replay. */
export type SequencedEvent = { seq: number; event: SessionEvent };

/** JSON-safe view of a session, for the REST endpoints. */
export type SessionRecord = {
  id: string;
  sdkSessionId: string | null;
  status: SessionStatus;
  createdAt: string;
  turns: number;
  totalCostUsd: number;
  /**
   * The first prompt, trimmed to a line — what the session list shows instead
   * of a uuid. Null until the session has been asked something, which is the
   * state a freshly created session is in.
   */
  title: string | null;
  /**
   * Wave SAP read-class tool calls through without asking, for this session.
   *
   * Off by default and never persisted: it is a decision about the session in
   * front of someone, so a revived conversation starts by asking again rather
   * than inheriting a switch nobody remembers flipping.
   */
  autoApproveSapReads: boolean;
  /**
   * The USD ceiling this session was opened with, or `null` for none. The
   * SDK stops the run at it and reports `error_max_budget_usd`, which the
   * stream relays as an error the reader can act on.
   */
  maxBudgetUsd: number | null;
  /** The model this session runs on. The backend's default unless chosen. */
  model: string;
  /**
   * How much this session asks before it acts — the account's setting at
   * the time it was opened. See `ApprovalLevel`.
   */
  approval: ApprovalLevel;
  /**
   * Sub-agents run on Sonnet whatever the skill asked for.
   *
   * The plugin's heavier skills dispatch a reviewer with `model: "opus"`,
   * which is the right call for a production incident and five times the
   * price of Sonnet for a PoC. With this on, the dispatch is let through
   * with that one field rewritten — see `#requestApproval`.
   */
  economy: boolean;
};

type Subscriber = (event: SequencedEvent) => void;

/** First line of the prompt, clipped at a word boundary near 40 characters —
 * about what a 244px rail shows before it ellipsises anyway, so the clip
 * happens on a word here rather than mid-word in CSS. */
/**
 * Answers that name the thing a run was about, rather than describing it.
 *
 * Matched on the label the form used, because the value alone cannot be told
 * apart: `Program` is a choice from a list and `ZMMR1001` is a name, and both
 * are just words by the time they reach here.
 */
const SUBJECT_FIELD = /^(object name|program|package|class|object|table|transport|symptom|question)$/i;

function titleFrom(text: string): string {
  const parts = text
    .trim()
    .split(/\r?\n/)
    .map((entry) => entry.trim())
    .filter(Boolean);
  /**
   * A prompt that opens with a slash command is named after the command, and
   * after the first answer that is a value rather than a setting.
   *
   * The skill screens compose their prompts as the command and then `Label:
   * value` lines. Taking the first line named every run `/sc4sap:analyze-code`
   * — a rail of identical labels. Taking the *second* was worse in a quieter
   * way: it named them after whichever field the form happens to ask first,
   * so a rail of code reviews all read `Object type: Program`.
   *
   * So: the command becomes words, and the first answer that looks like a
   * name — an object, a package — is appended. Fields whose value is a choice
   * from a list are skipped; they describe the run, they do not identify it.
   *
   * This is the fallback. A screen that knows what it ran overrides it when
   * the conversation is stored — see `runTitle` in the web app.
   */
  const command = parts[0]?.startsWith("/") ? parts[0] : null;
  if (command) {
    const words = (command.split(":").pop() ?? "")
      .split(/[-_]/)
      .filter(Boolean)
      .map((word) => word[0]!.toUpperCase() + word.slice(1))
      .join(" ");
    const subject = parts
      .slice(1)
      .map((entry) => entry.split(/:\s*/))
      .filter(
        (pair): pair is [string, string] =>
          pair.length === 2 && SUBJECT_FIELD.test(pair[0]!) && pair[1] !== "",
      )
      .map((pair) => pair[1])
      .at(-1);
    const named = subject ? `${words} · ${subject}` : words;
    return named || "Untitled";
  }

  const line = parts[0] ?? "";
  if (line.length <= 40) return line || "Untitled";
  const clipped = line.slice(0, 40);
  const lastSpace = clipped.lastIndexOf(" ");
  return `${(lastSpace > 20 ? clipped.slice(0, lastSpace) : clipped).trimEnd()}…`;
}

/**
 * Turns discrete `push()` calls into the AsyncIterable that `query()` consumes.
 * Single-consumer by design: the SDK is the only reader.
 */
class InputPump implements AsyncIterable<SDKUserMessage> {
  readonly #pending: SDKUserMessage[] = [];
  #waiting: ((r: IteratorResult<SDKUserMessage>) => void) | null = null;
  #closed = false;

  push(content: string | ContentBlockParam[]): void {
    const message: SDKUserMessage = {
      type: "user",
      message: { role: "user", content },
      parent_tool_use_id: null,
    };
    const waiting = this.#waiting;
    if (waiting) {
      this.#waiting = null;
      waiting({ value: message, done: false });
      return;
    }
    this.#pending.push(message);
  }

  close(): void {
    this.#closed = true;
    const waiting = this.#waiting;
    if (waiting) {
      this.#waiting = null;
      waiting({ value: undefined as never, done: true });
    }
  }

  [Symbol.asyncIterator](): AsyncIterator<SDKUserMessage> {
    return {
      next: (): Promise<IteratorResult<SDKUserMessage>> => {
        const queued = this.#pending.shift();
        if (queued) return Promise.resolve({ value: queued, done: false });
        if (this.#closed) {
          return Promise.resolve({ value: undefined as never, done: true });
        }
        return new Promise((resolve) => {
          this.#waiting = resolve;
        });
      },
    };
  }
}

/**
 * `includeHookEvents` is on because a blocklist denial is only visible in a
 * `hook_response` payload — but it also emits a `hook_started` and a
 * `hook_response` per registered hook per event, nearly all of them empty.
 * Relay only the responses that actually carry output; drop the rest.
 */
function isHookNoise(message: SDKMessage): boolean {
  if (message.type !== "system") return false;
  if (message.subtype === "hook_started" || message.subtype === "hook_progress") {
    return true;
  }
  if (message.subtype === "hook_response") {
    return !message.stdout && !message.output;
  }
  return false;
}

type LiveSession = {
  record: SessionRecord;
  /**
   * Whose session this is — the web app's account id, forwarded by its proxy
   * in `x-sc4sap-user`. The tool log keys on it; nothing else here does. A
   * session opened without one (a curl, a smoke test) is logged as such.
   */
  userId: string;
  pump: InputPump;
  session: Query;
  subscribers: Set<Subscriber>;
  history: SequencedEvent[];
  seq: number;
  /** Content-block indices currently holding a tool_use, so stop can be paired. */
  openToolBlocks: Set<number>;
  /** Approvals blocking a turn, keyed by reqId. */
  pending: Map<string, PendingEntry>;
  /**
   * What this conversation had already spent before this session existed.
   *
   * `turns` needs no equivalent because the record accumulates it and can
   * simply start at the carried-over figure. Cost cannot: the SDK reports a
   * running total for its own run, so the record assigns rather than adds and
   * the carried-over part has to be kept to add back each time.
   */
  priorCostUsd: number;
  /** Counting down to abandoning a turn nobody is watching. See `#orphan`. */
  orphanTimer?: ReturnType<typeof setTimeout>;
  /**
   * Background sub-agents this session has running.
   *
   * The plugin's heavier skills do their real work in one: `analyze-code`
   * dispatches `sap-code-reviewer` and the SDK launches it detached, returning
   * "Async agent launched successfully" immediately. The parent turn then ends
   * normally — `result subtype=success` — while the reviewer is still reading
   * the program.
   *
   * Nothing was wrong with either half of that; what was missing was anyone
   * holding the two together. Without this the session went idle the moment
   * the dispatch returned, the screen said the run was over, and the findings
   * arrived to a conversation that had stopped listening.
   *
   * Kept as a set with replace semantics, which is how the SDK reports it —
   * see `background_tasks_changed`.
   */
  backgroundTasks: Set<string>;
};

type PendingEntry = {
  request: PendingApproval;
  /** Idempotent: the first caller to settle wins, later ones are no-ops. */
  settle: (result: PermissionResult, decision: PermissionDecision) => void;
};

export class SessionManager {
  readonly #sessions = new Map<string, LiveSession>();
  readonly #config: PocConfig;
  /** Deny half applies from the start; the auto-allow half fills in at discover(). */
  #policy: ToolPolicy = buildToolPolicy([]);
  /** Every tool call, as it happens. See `tool-log.ts`. */
  readonly toolLog: ToolLog;

  constructor(config?: PocConfig, options: { toolLog?: ToolLog } = {}) {
    this.#config = config ?? loadConfig();
    requireApiKey();
    this.toolLog = options.toolLog ?? new ToolLog();
  }

  get config(): PocConfig {
    return this.#config;
  }

  get policy(): ToolPolicy {
    return this.#policy;
  }

  /**
   * Learns the SAP tool list from a throwaway session so read-class tools can
   * be auto-approved by exact name. Enumeration rather than a `Get*` wildcard
   * is deliberate: `GetTableContents` and `GetSqlQuery` share that prefix and
   * must never be auto-allowed.
   *
   * Best-effort. On failure the policy keeps its static deny half and an empty
   * auto-allow list, so every read simply prompts instead.
   */
  async discoverToolPolicy(): Promise<ToolPolicy> {
    const probe = query({
      prompt: "noop",
      options: {
        plugins: [{ type: "local", path: this.#config.pluginPath }],
        cwd: this.#config.workspace,
        model: this.#config.model,
        settingSources: ["project"],
        permissionMode: "dontAsk",
        maxTurns: 1,
      },
    });

    try {
      for await (const message of probe) {
        if (message.type !== "system" || message.subtype !== "init") continue;

        const until = Date.now() + MCP_DISCOVERY_TIMEOUT_MS;
        let statuses = await probe.mcpServerStatus();
        while (
          Date.now() < until &&
          (statuses.length === 0 ||
            statuses.some((s) => s.status === "pending"))
        ) {
          await new Promise((r) => setTimeout(r, 500));
          statuses = await probe.mcpServerStatus();
        }

        const names = statuses
          .filter((s) => s.status === "connected")
          .flatMap((s) => s.tools ?? [])
          .map((t) => (typeof t === "string" ? t : t.name));

        this.#policy = buildToolPolicy(names);
        break;
      }
    } catch {
      // Leave the fail-safe policy in place.
    } finally {
      await probe.interrupt().catch(() => {});
    }

    return this.#policy;
  }

  /**
   * `prior*` carry a conversation's running totals across the session that was
   * counting them.
   *
   * A session's turn count and cost are its own, and a conversation outlives
   * any one session: the web app stores its transcript and revives it against
   * a fresh session whenever this process has forgotten it — a restart, an
   * eviction, another machine. Starting that session's counters at zero does
   * not just under-report the rail; the web app writes them back over the
   * stored totals, so the history is lost rather than merely mis-shown.
   *
   * So the caller hands back what it has stored, and the counters continue
   * rather than restart. Omitted, they are zero, which is what a genuinely new
   * conversation wants.
   */
  create(
    options: {
      resume?: string;
      priorTurns?: number;
      priorCostUsd?: number;
      userId?: string;
      maxBudgetUsd?: number;
      economy?: boolean;
      /** The session's own model, over the backend's default. */
      model?: string;
      approval?: ApprovalLevel;
    } = {},
  ): SessionRecord {
    const id = randomUUID();
    const pump = new InputPump();
    const economy = options.economy === true;
    // An economy session takes `Agent` off the auto-allow list, so that a
    // dispatch reaches `canUseTool` — the one place its input can be edited
    // on the way through. Every other session keeps it waved through.
    const allowedTools = economy
      ? this.#policy.allowedTools.filter((tool) => tool !== "Agent")
      : this.#policy.allowedTools;

    const session = query({
      prompt: pump,
      options: {
        plugins: [{ type: "local", path: this.#config.pluginPath }],
        cwd: this.#config.workspace,
        model: options.model ?? this.#config.model,
        // Keep Claude Code's own prompt and add on top: one formatting rule —
        // SAP records render row-oriented at any row count — and the host
        // marker the skills read. See the constants.
        systemPrompt: {
          type: "preset",
          preset: "claude_code",
          append: `${OUTPUT_FORMAT_APPEND}\n\n${HOST_APPEND}`,
        },
        // Loads the workspace .claude/settings.json, which is the ONLY place
        // the L1 blocklist guards are declared. Dropping this silently
        // ungates row extraction — see provision-workspace.ts.
        settingSources: ["project"],
        includeHookEvents: true,
        // Plan 2-3 — token-level relay. Produces `stream_event` messages that
        // #relayStreamEvent translates into text_delta / tool_start / tool_end.
        includePartialMessages: true,
        resume: options.resume,
        // Plan 2-5 — write-class SAP tools are removed from context outright;
        // read-class ones are auto-approved so a single consultant answer does
        // not fire twenty prompts. Everything else falls through to 2-4.
        disallowedTools: this.#policy.disallowedTools,
        allowedTools,
        // A ceiling the SDK enforces. Undefined means none, as before.
        maxBudgetUsd: options.maxBudgetUsd,
        // Plan 2-4 — every tool call parks here until a human answers over
        // the SSE channel. Plan 2-5 adds allowedTools on top; note this
        // callback is NOT a complete chokepoint (ToolSearch was observed
        // running without consulting it), so the read-only guard cannot
        // rely on it alone.
        canUseTool: (toolName, input, context) =>
          this.#requestApproval(id, toolName, input, context),
        /**
         * The chokepoint `canUseTool` is not.
         *
         * Built-in tools reach the model's hands without the callback above
         * ever being consulted — verified by running a `Bash` call to
         * completion with `allowedTools` empty and no request raised. So the
         * tools that can change or leave this machine are gated here instead,
         * where the SDK does stop and wait, and the answer comes from the
         * same queue and the same dialog as everything else.
         *
         * The matcher takes everything and `needsHookApproval` decides, rather
         * than naming tools in a pattern: a built-in that a later SDK adds
         * then arrives gated instead of quietly slipping past a list that was
         * written before it existed.
         */
        hooks: {
          PreToolUse: [
            {
              // Outlives the queue's own 5-minute deadline, so a forgotten
              // dialog is denied by the timeout that reports it as such
              // rather than killed by this one, which would not.
              timeout: PERMISSION_TIMEOUT_MS / 1000 + 30,
              hooks: [
                async (input, toolUseID, { signal }) => {
                  if (input.hook_event_name !== "PreToolUse") return {};

                  // Economy: the sub-agent dispatch goes through with its
                  // model brought down to Sonnet. Here and not only in
                  // `canUseTool`, because that callback was never consulted
                  // for `Agent` — a dispatch with `model: "opus"` went out
                  // unchanged on an economy session — and this hook is the
                  // one place the SDK does stop for every tool.
                  const economyLive = this.#sessions.get(id);
                  if (input.tool_name === AGENT_TOOL && economyLive?.record.economy) {
                    const toolInput = (input.tool_input ?? {}) as Record<string, unknown>;
                    const requested = toolInput.model;
                    this.toolLog.decide(toolUseID ?? input.tool_use_id, "auto");
                    return {
                      hookSpecificOutput: {
                        hookEventName: "PreToolUse" as const,
                        permissionDecision: "allow" as const,
                        permissionDecisionReason: "Economy: sub-agents run on Sonnet.",
                        ...(typeof requested === "string" && /opus/i.test(requested)
                          ? { updatedInput: { ...toolInput, model: "sonnet" } }
                          : {}),
                      },
                    };
                  }

                  if (!needsHookApproval(input.tool_name)) return {};

                  const result = await this.#requestApproval(
                    id,
                    input.tool_name,
                    (input.tool_input ?? {}) as Record<string, unknown>,
                    {
                      signal,
                      toolUseID: toolUseID ?? input.tool_use_id,
                    },
                  );

                  return {
                    hookSpecificOutput: {
                      hookEventName: "PreToolUse" as const,
                      permissionDecision:
                        result.behavior === "allow" ? "allow" : "deny",
                      permissionDecisionReason:
                        result.behavior === "allow"
                          ? "Allowed by the operator."
                          : (result.message ?? "Denied by the operator."),
                    },
                  };
                },
              ],
            },
          ],
        },
      },
    });

    const priorTurns = Math.max(0, options.priorTurns ?? 0);
    const priorCostUsd = Math.max(0, options.priorCostUsd ?? 0);

    const live: LiveSession = {
      userId: options.userId ?? "anonymous",
      record: {
        id,
        sdkSessionId: null,
        status: "starting",
        createdAt: new Date().toISOString(),
        turns: priorTurns,
        totalCostUsd: priorCostUsd,
        title: null,
        autoApproveSapReads: false,
        maxBudgetUsd: options.maxBudgetUsd ?? null,
        economy,
        model: options.model ?? this.#config.model,
        approval: options.approval ?? "all",
      },
      pump,
      session,
      subscribers: new Set(),
      history: [],
      seq: 0,
      openToolBlocks: new Set(),
      pending: new Map(),
      backgroundTasks: new Set(),
      priorCostUsd,
    };
    this.#sessions.set(id, live);
    this.#consume(live);

    return { ...live.record };
  }

  get(id: string): SessionRecord | undefined {
    const live = this.#sessions.get(id);
    return live ? { ...live.record } : undefined;
  }

  list(): SessionRecord[] {
    return [...this.#sessions.values()].map((l) => ({ ...l.record }));
  }

  /**
   * Queues a user message. Returns false if the session is unknown or closed.
   * Does not wait for the turn — callers watch the SSE stream for output.
   *
   * `context` is prior conversation the caller wants the model to read before
   * this message — the web app sends it when reviving a stored chat whose
   * session did not survive the last restart. It goes to the SDK and *not* to
   * the stream: the transcript shows what the reader typed, not the history
   * the client re-attached behind it.
   *
   * `attachments` are files the reader sent with the prompt. The bytes go to
   * the model as content blocks; the echo on the stream carries only their
   * names and sizes, which is all the transcript draws — and all the replay
   * buffer should be asked to hold.
   */
  send(
    id: string,
    text: string,
    context?: string,
    attachments: Attachment[] = [],
  ): boolean {
    const live = this.#sessions.get(id);
    if (!live) return false;
    if (live.record.status === "closed" || live.record.status === "error") {
      return false;
    }
    // First prompt names the session, and nothing renames it afterwards: a
    // list whose labels move under the reader is worse than one whose labels
    // are only approximate. A prompt that is only a file is named after it.
    if (live.record.title === null) {
      live.record.title = titleFrom(
        text.trim() !== "" ? text : (attachments[0]?.name ?? ""),
      );
    }
    const meta: AttachmentMeta[] = attachments.map(toMeta);
    this.#setStatus(live, "busy");
    // A tab that sends and closes in the same breath unsubscribes while the
    // session is still idle, so the countdown has to be armed here too.
    if (live.subscribers.size === 0) this.#armOrphanTimer(live);
    // The SDK does not echo the prompt back on the output stream, so without
    // this the human half of the conversation is missing from the replay
    // buffer entirely and a reconnecting client rebuilds a transcript of
    // answers with no questions. Emitted in the SDK's own user-message shape,
    // with the content kept as a plain string: that is how the frontend tells
    // the reader's own prompt from the block arrays the SDK generates.
    this.#emit(live, {
      type: "message",
      message: {
        type: "user",
        message: { role: "user", content: text },
        parent_tool_use_id: null,
        session_id: live.record.sdkSessionId ?? "",
        ...(meta.length > 0 ? { attachments: meta } : {}),
      } as SDKMessage,
    });
    const prompt = context ? `${context}\n${text}` : text;
    live.pump.push(
      attachments.length > 0 ? toContentBlocks(prompt, attachments) : prompt,
    );
    return true;
  }

  /**
   * Subscribes to session events, replaying anything after `afterSeq` first so
   * a reconnecting client does not lose the turn it missed.
   * Returns an unsubscribe function.
   */
  subscribe(
    id: string,
    subscriber: Subscriber,
    afterSeq = 0,
  ): (() => void) | undefined {
    const live = this.#sessions.get(id);
    if (!live) return undefined;

    for (const entry of live.history) {
      if (entry.seq > afterSeq) subscriber(entry);
    }
    live.subscribers.add(subscriber);
    // Somebody is watching again — a reload, or a second tab.
    this.#cancelOrphanTimer(live);

    return () => {
      live.subscribers.delete(subscriber);
      if (live.subscribers.size === 0) this.#armOrphanTimer(live);
    };
  }

  /**
   * Starts the countdown to abandoning a turn that has lost its audience.
   *
   * Only a *busy* session is worth abandoning: an idle one costs nothing to
   * leave sitting there, and evicting it would take away the conversation the
   * reader is about to come back to.
   */
  #armOrphanTimer(live: LiveSession): void {
    if (live.record.status !== "busy") return;
    this.#cancelOrphanTimer(live);

    live.orphanTimer = setTimeout(() => {
      live.orphanTimer = undefined;
      if (live.subscribers.size > 0) return;
      if (live.record.status !== "busy") return;

      // Anything blocking the turn on a human is answered for them — nobody is
      // there to answer, and an un-settled approval leaves interrupt() waiting.
      for (const entry of [...live.pending.values()]) {
        entry.settle(
          { behavior: "deny", message: "Client disconnected." },
          "deny",
        );
      }

      // Goes into the replay buffer, so a reader who comes back to this
      // conversation is told why it stops where it does.
      this.#emit(live, {
        type: "error",
        error: "Stopped: the browser disconnected before this turn finished.",
      });
      void live.session.interrupt().catch(() => {});
      this.#setStatus(live, "idle");
    }, ORPHAN_GRACE_MS);
  }

  #cancelOrphanTimer(live: LiveSession): void {
    if (!live.orphanTimer) return;
    clearTimeout(live.orphanTimer);
    live.orphanTimer = undefined;
  }

  /** Approvals currently blocking this session, oldest first. */
  pendingApprovals(id: string): PendingApproval[] | undefined {
    const live = this.#sessions.get(id);
    if (!live) return undefined;
    return [...live.pending.values()].map((entry) => entry.request);
  }

  /**
   * Turn the session's "allow all SAP reads" switch on or off.
   *
   * Turning it on does not settle what is already on screen. The dialog the
   * operator is looking at is a decision they are in the middle of making, and
   * answering it for them would mean the button they pressed had two effects —
   * so the caller allows the current request itself, and this governs the
   * ones after it.
   */
  setAutoApprove(id: string, enabled: boolean): "ok" | "unknown-session" {
    const live = this.#sessions.get(id);
    if (!live) return "unknown-session";
    if (live.record.autoApproveSapReads === enabled) return "ok";
    live.record.autoApproveSapReads = enabled;
    this.#emit(live, { type: "auto_approve", enabled });
    return "ok";
  }

  /** Settles one pending approval. The turn resumes as soon as this returns. */
  respondToPermission(
    id: string,
    reqId: string,
    response: PermissionResponse,
  ): "ok" | "unknown-session" | "unknown-request" {
    const live = this.#sessions.get(id);
    if (!live) return "unknown-session";
    const entry = live.pending.get(reqId);
    if (!entry) return "unknown-request";

    if (response.behavior === "deny") {
      entry.settle(
        {
          behavior: "deny",
          message: response.message ?? "Denied by the user.",
        },
        "deny",
      );
      return "ok";
    }

    // For a question, the answers ARE the tool input: AskUserQuestion declares
    // `answers` as "collected by the permission component", so the tool echoes
    // back whatever we merge in here.
    const updatedInput =
      entry.request.kind === "question"
        ? {
            ...entry.request.input,
            ...(response.answers ? { answers: response.answers } : {}),
            ...(response.annotations
              ? { annotations: response.annotations }
              : {}),
          }
        : (response.updatedInput ?? entry.request.input);

    entry.settle({ behavior: "allow", updatedInput }, "allow");
    return "ok";
  }

  /**
   * Parks a tool call until a human answers, or until the timeout denies it.
   * Resolves exactly once — timeout, abort, and an explicit response all race
   * through the same idempotent `settle`.
   */
  #requestApproval(
    sessionId: string,
    toolName: string,
    input: Record<string, unknown>,
    context: { signal: AbortSignal; toolUseID: string; title?: string; displayName?: string; description?: string },
  ): Promise<PermissionResult> {
    const live = this.#sessions.get(sessionId);
    if (!live) {
      return Promise.resolve({
        behavior: "deny",
        message: "Session is gone.",
      });
    }

    // Economy: a sub-agent dispatch is allowed as it always was, with its
    // model brought down to Sonnet. Only here because `Agent` was taken off
    // the auto-allow list for this session — see `create`. `updatedInput`
    // is the SDK's own door for this; nothing else about the call changes.
    if (toolName === AGENT_TOOL && live.record.economy) {
      this.toolLog.decide(context.toolUseID, "auto");
      const requested = input.model;
      const updatedInput =
        typeof requested === "string" && /opus/i.test(requested)
          ? { ...input, model: "sonnet" }
          : input;
      return Promise.resolve({ behavior: "allow", updatedInput });
    }

    // The account's approval level, applied before a request is raised. A
    // read under "writes", or anything under "never", goes through here and
    // is logged as auto-approved, the same as a policy allow.
    if (allowedByLevel(live.record.approval, toolName, input)) {
      this.toolLog.decide(context.toolUseID, "auto");
      return Promise.resolve({ behavior: "allow", updatedInput: input });
    }

    // The switch, applied before a request is ever raised. Nothing reaches the
    // dialog, so there is no flicker of a modal that answers itself — and the
    // eligibility test is the policy's own, which is what keeps this from
    // being a second, looser definition of "safe to read".
    //
    // A question is never covered: `AskUserQuestion` is the model asking the
    // operator to choose, and there is no answer to give on their behalf.
    if (
      live.record.autoApproveSapReads &&
      toolName !== QUESTION_TOOL &&
      isSapReadTool(toolName)
    ) {
      this.toolLog.decide(context.toolUseID, "auto");
      return Promise.resolve({ behavior: "allow", updatedInput: input });
    }

    const reqId = randomUUID();
    const isQuestion = toolName === QUESTION_TOOL;
    const request: PendingApproval = {
      reqId,
      kind: isQuestion ? "question" : "tool",
      toolName,
      toolUseId: context.toolUseID,
      input,
      title: context.title,
      displayName: context.displayName,
      description: context.description,
      questions: isQuestion ? input.questions : undefined,
      createdAt: new Date().toISOString(),
    };

    return new Promise<PermissionResult>((resolve) => {
      const settle = (
        result: PermissionResult,
        decision: PermissionDecision,
      ): void => {
        // delete() returning false means someone already settled this one.
        if (!live.pending.delete(reqId)) return;
        clearTimeout(timer);
        context.signal.removeEventListener("abort", onAbort);
        this.toolLog.decide(
          context.toolUseID,
          decision === "allow" ? "allowed" : decision === "deny" ? "denied" : "expired",
        );
        this.#emit(live, { type: "permission_resolved", reqId, decision });
        resolve(result);
      };

      const timer = setTimeout(() => {
        settle(
          {
            behavior: "deny",
            message: `No response within ${PERMISSION_TIMEOUT_MS / 1000}s — denied.`,
          },
          "expired",
        );
      }, PERMISSION_TIMEOUT_MS);

      const onAbort = (): void => {
        settle({ behavior: "deny", message: "Request aborted." }, "deny");
      };
      context.signal.addEventListener("abort", onAbort, { once: true });

      live.pending.set(reqId, { request, settle });
      this.#emit(live, { type: "permission_request", request });
    });
  }

  /**
   * Abandon the turn in flight, on purpose, because someone asked.
   *
   * The same machinery the orphan timer uses, with two differences. It is not
   * on a timer — the reader is looking at the screen and pressed a button — and
   * the session survives: what is being stopped is one answer, not the
   * conversation, and the next prompt goes to the same session with everything
   * it has already been told still in it.
   *
   * `interrupt()` is awaited here where `close()` fires and forgets it. There
   * the entry is already gone and nothing can observe the subprocess; here the
   * session stays, and a caller that got its answer before the SDK had
   * actually stopped could send the next prompt into a run still winding down.
   */
  async stop(id: string): Promise<"stopped" | "unknown" | "not-busy"> {
    const live = this.#sessions.get(id);
    if (!live) return "unknown";
    if (live.record.status !== "busy") return "not-busy";

    // Anything blocking the turn on a human is answered for them, or
    // `interrupt()` waits on an approval that is never coming.
    for (const entry of [...live.pending.values()]) {
      entry.settle({ behavior: "deny", message: "Stopped." }, "deny");
    }

    // Into the replay buffer, so the transcript says why it ends where it
    // does — to this reader now, and to whoever opens the conversation later.
    this.#emit(live, {
      type: "error",
      error: "Stopped.",
    });

    await live.session.interrupt().catch(() => {});
    // The interrupt takes the background reviewers down with the turn. A
    // `background_tasks_changed` naming them can still arrive after this and
    // put the session back to busy; an empty set here is what it should
    // find when it does.
    live.backgroundTasks.clear();
    this.#setStatus(live, "idle");
    return "stopped";
  }

  async close(id: string): Promise<boolean> {
    const live = this.#sessions.get(id);
    if (!live) return false;
    // Release anything blocking a turn, or interrupt() waits on a human who
    // is never coming.
    for (const entry of [...live.pending.values()]) {
      entry.settle(
        { behavior: "deny", message: "Session closed." },
        "deny",
      );
    }
    this.#cancelOrphanTimer(live);
    live.pump.close();
    this.toolLog.abandon(id);
    // Tell subscribers before dropping the entry — after this the id 404s.
    this.#setStatus(live, "closed");
    live.subscribers.clear();
    // Evicting is what keeps a long-running server from accumulating dead
    // sessions; the SDK session id is already in the client's hands if it
    // wants to resume.
    this.#sessions.delete(id);

    /**
     * The subprocess teardown is not on the response path. `interrupt()` on a
     * session whose SDK has not finished booting can take seconds — and a
     * caller closing several sessions in a row waited for every one of them
     * before its list came back, which is how a closed session reappeared in
     * the next `GET /sessions`. The entry is already gone by here; whether the
     * subprocess has noticed yet changes nothing anyone can observe.
     */
    void live.session.interrupt().catch(() => {});
    return true;
  }

  async closeAll(): Promise<void> {
    await Promise.all([...this.#sessions.keys()].map((id) => this.close(id)));
  }

  /** Drains the SDK message stream into subscribers for the session's lifetime. */
  #consume(live: LiveSession): void {
    void (async () => {
      try {
        for await (const message of live.session) {
          if (message.type === "system" && message.subtype === "init") {
            live.record.sdkSessionId = message.session_id;
            // Only out of `starting`. The SDK emits `init` at the top of every
            // run it makes, not just the first — so a turn that goes back to
            // the model after a tool gets another one mid-flight, and reading
            // that as "idle" told every subscriber the turn was over while it
            // was still going. The transcript hung its whole working indicator
            // off this, so the dots vanished seconds before the answer.
            //
            // What actually ends a turn is `result`, below. This one only ever
            // means the session has finished booting.
            if (live.record.status === "starting") {
              this.#setStatus(live, "idle");
            }
          }
          if (message.type === "result") {
            // `num_turns` is per-turn in streaming-input mode, not cumulative,
            // so assigning it pins the session at 1. Accumulate instead.
            live.record.turns += message.num_turns;
            // The ceiling the session was opened with has been hit. Said as
            // a notice rather than left as a run that stopped mid-sentence:
            // the reader set the number, and this is what it did.
            if (message.subtype === "error_max_budget_usd") {
              this.#emit(live, {
                type: "error",
                error: `The run stopped at its budget of $${(
                  live.record.maxBudgetUsd ?? 0
                ).toFixed(2)}. Continue in chat to go on with a fresh budget, or run again with a higher one.`,
              });
            }
            if (!message.is_error) {
              // A running total for this SDK run, so it replaces rather than
              // adds — and what it does not know about is whatever the
              // conversation spent before this session picked it up.
              live.record.totalCostUsd =
                live.priorCostUsd + message.total_cost_usd;
            }
            // Only if nothing is still running underneath. A skill that
            // dispatches a background reviewer ends its own turn seconds after
            // it starts, and calling that idle told every screen the run was
            // over while the work had barely begun. See `backgroundTasks`.
            if (live.backgroundTasks.size === 0) {
              this.#setStatus(live, "idle");
            }
          }
          /**
           * A level signal with replace semantics: every background task this
           * session still has running, whenever that membership changes. Used
           * rather than pairing start and finish events, because a missed
           * bookend would wedge the session `busy` forever.
           *
           * A session with work outstanding is not idle, whatever its own turn
           * did. This is what keeps the working indicator up while a reviewer
           * reads a program for two minutes.
           */
          if (
            message.type === "system" &&
            message.subtype === "background_tasks_changed"
          ) {
            const tasks = (message as { tasks?: { task_id: string }[] }).tasks;
            live.backgroundTasks = new Set(
              (tasks ?? []).map((task) => task.task_id),
            );
            if (live.backgroundTasks.size > 0) {
              this.#setStatus(live, "busy");
            }
          }

          /**
           * A background sub-agent has settled. Nudge the parent to go and
           * collect it.
           *
           * The prompt goes straight into the pump rather than through
           * `send()`, so it never appears in the transcript: the reader did not
           * type it, and a conversation that shows the app talking to itself
           * reads as a bug even when the answer that follows is right.
           *
           * Only on `completed`. A failed or stopped task is reported to the
           * reader as a notice — asking the model to fetch findings that do not
           * exist would produce an apology and another turn's cost.
           */
          if (
            message.type === "system" &&
            message.subtype === "task_notification"
          ) {
            const note = message as {
              status: "completed" | "failed" | "stopped";
              task_id: string;
              summary?: string;
            };
            live.backgroundTasks.delete(note.task_id);

            if (note.status === "completed") {
              this.#setStatus(live, "busy");
              live.pump.push(
                [
                  `The background agent you dispatched (task ${note.task_id}) has finished.`,
                  note.summary ? `Its summary: ${note.summary}` : "",
                  "Collect its findings and continue the skill from where you",
                  "left off — produce the report you said you would. Do not",
                  "mention task or agent ids.",
                ]
                  .filter(Boolean)
                  .join(" "),
              );
            } else {
              this.#emit(live, {
                type: "error",
                error: `The background review ${note.status === "failed" ? "failed" : "was stopped"} before it reported.`,
              });
              // The parent turn ended when it dispatched, so nothing else
              // ends this one: a stopped reviewer left the session `busy`
              // for good, with a Stop button over a run that was over.
              if (live.backgroundTasks.size === 0) {
                this.#setStatus(live, "idle");
              }
            }
          }

          if (message.type === "stream_event") {
            this.#relayStreamEvent(live, message.event);
            continue;
          }
          if (isHookNoise(message)) continue;
          this.#logToolBlocks(live, message);
          this.#emit(live, { type: "message", message });
        }
        this.toolLog.abandon(live.record.id);
        this.#setStatus(live, "closed");
      } catch (err) {
        this.#emit(live, { type: "error", error: (err as Error).message });
        this.#setStatus(live, "error");
      }
    })();
  }

  /**
   * Feed the tool log from the complete messages.
   *
   * The assistant message is where a tool call's input is whole — the stream
   * events only carry it as JSON fragments — and the user message that follows
   * is where its result lands. Both are on the same loop the transcript is
   * relayed from, so nothing is observed that a client could not; this only
   * keeps a note of it.
   *
   * Content is read loosely on purpose. The SDK's message types are exact,
   * but a log that threw on an unexpected block shape would take the session
   * down with it, and this is the one place in the loop that must not.
   */
  #logToolBlocks(live: LiveSession, message: SDKMessage): void {
    if (message.type === "assistant") {
      for (const block of message.message.content) {
        if (block.type === "tool_use") {
          this.toolLog.start({
            id: block.id,
            userId: live.userId,
            sessionId: live.record.id,
            name: block.name,
            input: block.input,
          });
        }
      }
      return;
    }
    if (message.type === "user") {
      const content: unknown = message.message.content;
      if (!Array.isArray(content)) return;
      for (const block of content as Record<string, unknown>[]) {
        if (block?.type === "tool_result" && typeof block.tool_use_id === "string") {
          this.toolLog.finish({
            id: block.tool_use_id,
            isError: block.is_error === true,
            content: block.content,
          });
        }
      }
    }
  }

  /**
   * Translates a raw Anthropic stream event into the small vocabulary the
   * frontend consumes. Deltas are emitted **ephemerally** — live subscribers
   * get them for typing-effect rendering, but they are kept out of the replay
   * buffer: a reconnecting client rebuilds finished turns from the complete
   * `message` events, and storing every token would evict those in seconds.
   * Tool start/end stay in history, because a client that reconnects mid-call
   * still needs to know a tool is running.
   */
  #relayStreamEvent(live: LiveSession, event: StreamEvent): void {
    switch (event.type) {
      case "message_start":
        this.#emit(live, { type: "turn_start" }, { ephemeral: true });
        return;

      case "content_block_start": {
        const block = event.content_block;
        if (block.type === "tool_use" || block.type === "server_tool_use") {
          live.openToolBlocks.add(event.index);
          this.#emit(live, {
            type: "tool_start",
            index: event.index,
            toolUseId: block.id,
            name: block.name,
          });
        }
        return;
      }

      case "content_block_delta": {
        const { delta } = event;
        if (delta.type === "text_delta") {
          this.#emit(
            live,
            { type: "text_delta", index: event.index, text: delta.text },
            { ephemeral: true },
          );
        } else if (delta.type === "thinking_delta") {
          this.#emit(
            live,
            {
              type: "thinking_delta",
              index: event.index,
              text: delta.thinking,
            },
            { ephemeral: true },
          );
        }
        // input_json_delta is deliberately dropped — partial tool arguments are
        // not renderable, and the complete input arrives on the assistant message.
        return;
      }

      case "content_block_stop":
        if (live.openToolBlocks.delete(event.index)) {
          this.#emit(live, { type: "tool_end", index: event.index });
        }
        return;

      case "message_stop":
        this.#emit(live, { type: "turn_end" }, { ephemeral: true });
        return;

      default:
        // message_delta and anything the SDK adds later: nothing to render.
        return;
    }
  }

  #setStatus(live: LiveSession, status: SessionStatus): void {
    if (live.record.status === status) return;
    live.record.status = status;
    this.#emit(live, { type: "status", status });
  }

  #emit(
    live: LiveSession,
    event: SessionEvent,
    options: { ephemeral?: boolean } = {},
  ): void {
    // Ephemeral events still consume a seq, so Last-Event-ID stays monotonic —
    // they are simply absent from the replay buffer.
    const entry: SequencedEvent = { seq: ++live.seq, event };
    if (!options.ephemeral) {
      live.history.push(entry);
      if (live.history.length > HISTORY_LIMIT) live.history.shift();
    }
    for (const subscriber of live.subscribers) {
      try {
        subscriber(entry);
      } catch {
        // A broken client must not take down the session loop.
      }
    }
  }
}
