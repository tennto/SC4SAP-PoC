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
  type Query,
  type SDKMessage,
  type SDKUserMessage,
} from "@anthropic-ai/claude-agent-sdk";
import { loadConfig, requireApiKey, type PocConfig } from "../config.ts";

/** Per-session replay buffer cap. Oldest events drop first. */
const HISTORY_LIMIT = 500;

export type SessionStatus = "starting" | "idle" | "busy" | "closed" | "error";

/** The raw Anthropic stream event, reached through SDKMessage so no transitive import is needed. */
type StreamEvent = Extract<SDKMessage, { type: "stream_event" }>["event"];

export type SessionEvent =
  /** A complete SDK message. Authoritative — a client may render from these alone. */
  | { type: "message"; message: SDKMessage }
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
};

type Subscriber = (event: SequencedEvent) => void;

/**
 * Turns discrete `push()` calls into the AsyncIterable that `query()` consumes.
 * Single-consumer by design: the SDK is the only reader.
 */
class InputPump implements AsyncIterable<SDKUserMessage> {
  readonly #pending: SDKUserMessage[] = [];
  #waiting: ((r: IteratorResult<SDKUserMessage>) => void) | null = null;
  #closed = false;

  push(text: string): void {
    const message: SDKUserMessage = {
      type: "user",
      message: { role: "user", content: text },
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
  pump: InputPump;
  session: Query;
  subscribers: Set<Subscriber>;
  history: SequencedEvent[];
  seq: number;
  /** Content-block indices currently holding a tool_use, so stop can be paired. */
  openToolBlocks: Set<number>;
};

export class SessionManager {
  readonly #sessions = new Map<string, LiveSession>();
  readonly #config: PocConfig;

  constructor(config?: PocConfig) {
    this.#config = config ?? loadConfig();
    requireApiKey();
  }

  get config(): PocConfig {
    return this.#config;
  }

  create(options: { resume?: string } = {}): SessionRecord {
    const id = randomUUID();
    const pump = new InputPump();

    const session = query({
      prompt: pump,
      options: {
        plugins: [{ type: "local", path: this.#config.pluginPath }],
        cwd: this.#config.workspace,
        model: this.#config.model,
        // Loads the workspace .claude/settings.json, which is the ONLY place
        // the L1 blocklist guards are declared. Dropping this silently
        // ungates row extraction — see provision-workspace.ts.
        settingSources: ["project"],
        includeHookEvents: true,
        // Plan 2-3 — token-level relay. Produces `stream_event` messages that
        // #relayStreamEvent translates into text_delta / tool_start / tool_end.
        includePartialMessages: true,
        resume: options.resume,
        // Plan 2-4 replaces this with an approval queue pushed over SSE, and
        // 2-5 adds the read-only allowedTools guard. Until then the safe
        // default is to refuse rather than to auto-allow: a PoC backend that
        // silently approves SAP tool calls is the failure mode worth avoiding.
        canUseTool: async (toolName) => ({
          behavior: "deny",
          message:
            `Tool "${toolName}" was refused: the approval queue is not ` +
            "implemented yet (execution plan 2-4).",
        }),
      },
    });

    const live: LiveSession = {
      record: {
        id,
        sdkSessionId: null,
        status: "starting",
        createdAt: new Date().toISOString(),
        turns: 0,
        totalCostUsd: 0,
      },
      pump,
      session,
      subscribers: new Set(),
      history: [],
      seq: 0,
      openToolBlocks: new Set(),
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
   */
  send(id: string, text: string): boolean {
    const live = this.#sessions.get(id);
    if (!live) return false;
    if (live.record.status === "closed" || live.record.status === "error") {
      return false;
    }
    this.#setStatus(live, "busy");
    live.pump.push(text);
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
    return () => live.subscribers.delete(subscriber);
  }

  async close(id: string): Promise<boolean> {
    const live = this.#sessions.get(id);
    if (!live) return false;
    live.pump.close();
    await live.session.interrupt().catch(() => {});
    // Tell subscribers before dropping the entry — after this the id 404s.
    this.#setStatus(live, "closed");
    live.subscribers.clear();
    // Evicting is what keeps a long-running server from accumulating dead
    // sessions; the SDK session id is already in the client's hands if it
    // wants to resume.
    this.#sessions.delete(id);
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
            this.#setStatus(live, "idle");
          }
          if (message.type === "result") {
            // `num_turns` is per-turn in streaming-input mode, not cumulative,
            // so assigning it pins the session at 1. Accumulate instead.
            live.record.turns += message.num_turns;
            if (!message.is_error) {
              live.record.totalCostUsd = message.total_cost_usd;
            }
            this.#setStatus(live, "idle");
          }
          if (message.type === "stream_event") {
            this.#relayStreamEvent(live, message.event);
            continue;
          }
          if (isHookNoise(message)) continue;
          this.#emit(live, { type: "message", message });
        }
        this.#setStatus(live, "closed");
      } catch (err) {
        this.#emit(live, { type: "error", error: (err as Error).message });
        this.#setStatus(live, "error");
      }
    })();
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
