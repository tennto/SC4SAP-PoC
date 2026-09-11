/**
 * Browser-side mirror of the backend's wire types.
 *
 * Deliberately re-declared rather than imported from `src/server/*.ts`: those
 * modules pull in `@anthropic-ai/claude-agent-sdk` and are typed for a Node
 * process, not a React tree. Only the JSON that actually crosses the wire is
 * modelled here — keep it in step with `session-manager.ts`.
 */

export type SessionStatus =
  | "starting"
  | "idle"
  | "busy"
  | "closed"
  | "error";

/** `SessionRecord` as returned by GET/POST /sessions. */
export type Session = {
  id: string;
  sdkSessionId: string | null;
  status: SessionStatus;
  createdAt: string;
  turns: number;
  totalCostUsd: number;
  /** The first prompt, trimmed to a line. Null until the session is asked something. */
  title: string | null;
  /** SAP read-class calls are waved through without a dialog. Off by default. */
  autoApproveSapReads: boolean;
  /** The USD ceiling the session was opened with, or `null` for none. */
  maxBudgetUsd: number | null;
  /** Sub-agents run on Sonnet whatever the skill asked for. */
  economy: boolean;
};

/**
 * A conversation as stored in Mongo — what survives sign-out and a restart.
 * `id` is the backend session id that first opened it and never changes, so a
 * revived chat attaches a new backend session to the same history.
 */
export type Chat = {
  id: string;
  title: string | null;
  sdkSessionId: string | null;
  turns: number;
  totalCostUsd: number;
  createdAt: string;
  updatedAt: string;
};

/**
 * A file that went with a prompt — what is kept once the bytes have gone to
 * the model. Same shape on the wire and in Mongo; see `lib/attachments.ts`.
 */
export type AttachmentMeta = {
  name: string;
  mediaType: string;
  size: number;
};

/** One stored turn, already folded to what the transcript draws. */
export type ChatMessage = {
  seq: number;
  role: "user" | "agent";
  text: string;
  at: string;
  attachments?: AttachmentMeta[];
};

/** One approval blocking a turn (`permission_request`). Rendered in 3-3. */
export type PendingApproval = {
  reqId: string;
  kind: "tool" | "question";
  toolName: string;
  toolUseId: string;
  input: Record<string, unknown>;
  title?: string;
  displayName?: string;
  description?: string;
  questions?: unknown;
  createdAt: string;
};

export type PermissionDecision = "allow" | "deny" | "expired";

/** One `AskUserQuestion` question, forwarded from the tool input verbatim. */
export type Question = {
  question: string;
  header: string;
  multiSelect: boolean;
  options: { label: string; description?: string }[];
};

/** What settles a pending approval: `POST /sessions/:id/permissions/:reqId`. */
export type PermissionResponse =
  | {
      behavior: "allow";
      updatedInput?: Record<string, unknown>;
      /** For questions: `{ [question text]: chosen label }`. */
      answers?: Record<string, string>;
      annotations?: Record<string, unknown>;
    }
  | { behavior: "deny"; message?: string };

/** Structural minimum of an SDK message — enough to render, not to typecheck the SDK. */
export type SdkMessage = {
  type: string;
  subtype?: string;
  session_id?: string;
  message?: { role?: string; content?: unknown };
  [key: string]: unknown;
};

/**
 * The SSE vocabulary. `message` carries a whole SDK message and is the
 * authoritative record; the delta events are ephemeral typing effects that
 * never enter the replay buffer. 3-1 only consumes `status`; 3-2 consumes the
 * rest, which is why they are all declared up front.
 */
export type SessionEvent =
  | { type: "message"; message: SdkMessage }
  | { type: "permission_request"; request: PendingApproval }
  | { type: "permission_resolved"; reqId: string; decision: PermissionDecision }
  | { type: "auto_approve"; enabled: boolean }
  | { type: "status"; status: SessionStatus }
  | { type: "turn_start" }
  | { type: "turn_end" }
  | { type: "text_delta"; index: number; text: string }
  | { type: "thinking_delta"; index: number; text: string }
  | { type: "tool_start"; index: number; toolUseId: string; name: string }
  | { type: "tool_end"; index: number }
  | { type: "error"; error: string };

/** Config snapshot from GET /health, shown in the header. */
export type Health = {
  ok: boolean;
  plugin: string;
  workspace: string;
  model: string;
  sessions: number;
  /**
   * Whether the backend's Anthropic key still works — a real call, not an
   * assumption. `unknown` means the check could not be completed, which the
   * dashboard draws differently from a key that was refused.
   */
  claudeApi: {
    state: "up" | "down" | "unknown";
    detail: string;
    checkedAt: string;
  };
  toolPolicy: {
    autoAllowed: number;
    denyPatterns: string[];
    classes: Record<string, number>;
  };
};

/**
 * One tool call, as the backend logs it. Mirrors `ToolCall` in
 * `src/server/tool-log.ts`; the monitor page draws these both from the live
 * stream and from Mongo, so the two must agree.
 */
export type ToolCall = {
  /** The SDK's `tool_use` id. */
  id: string;
  userId: string;
  sessionId: string;
  /** The full name, `mcp__<server>__<tool>` or a built-in. */
  name: string;
  kind: "mcp" | "builtin";
  server: string | null;
  tool: string;
  /** The first 200 characters of the input as JSON. */
  inputPreview: string;
  startedAt: string;
  endedAt: string | null;
  durationMs: number | null;
  /** `null` while the call is still running. */
  ok: boolean | null;
  resultBytes: number | null;
  decision: "auto" | "allowed" | "denied" | "expired" | null;
};

/**
 * What the transcript is made of — the client's assembled view of the stream.
 *
 * `streaming` means the item is still being appended to by token deltas; the
 * complete `message` event closes it and replaces its text with the
 * authoritative version.
 */
export type TranscriptItem =
  | { kind: "user"; id: string; text: string; attachments?: AttachmentMeta[] }
  | { kind: "assistant"; id: string; text: string; streaming: boolean }
  | { kind: "thinking"; id: string; text: string; streaming: boolean }
  /**
   * One chip per *run* of the same tool, not per call: a chunked read fires
   * `ReadProgram` many times in a row and a column of identical chips reads as
   * a fault. `calls` is how many were folded in, `active` how many are still
   * open.
   */
  | { kind: "tool"; id: string; name: string; calls: number; active: number }
  | { kind: "notice"; id: string; text: string };
