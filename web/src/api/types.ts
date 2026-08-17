/**
 * Browser-side mirror of the backend's wire types.
 *
 * Deliberately re-declared rather than imported from `src/server/*.ts`: those
 * modules pull in `@anthropic-ai/claude-agent-sdk` and `@types/node`, neither
 * of which belongs in a browser tsconfig. Only the JSON that actually crosses
 * the wire is modelled here — keep it in step with `session-manager.ts`.
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
  | { type: "status"; status: SessionStatus }
  | { type: "turn_start" }
  | { type: "turn_end" }
  | { type: "text_delta"; index: number; text: string }
  | { type: "thinking_delta"; index: number; text: string }
  | { type: "tool_start"; index: number; toolUseId: string; name: string }
  | { type: "tool_end"; index: number }
  | { type: "error"; error: string };

/** Structural minimum of an SDK message — enough to render, not to typecheck the SDK. */
export type SdkMessage = {
  type: string;
  subtype?: string;
  session_id?: string;
  message?: { role?: string; content?: unknown };
  [key: string]: unknown;
};

/** Config snapshot from GET /health, shown in the header. */
export type Health = {
  ok: boolean;
  plugin: string;
  workspace: string;
  model: string;
  sessions: number;
  toolPolicy: {
    autoAllowed: number;
    denyPatterns: string[];
    classes: Record<string, number>;
  };
};

/**
 * What the transcript is made of. The backend has no notion of this — it is
 * the client's assembled view of the conversation.
 *
 * `pending` marks a user turn that has been accepted (202) but whose answer
 * has not arrived; 3-2 clears it from the stream.
 */
export type TranscriptItem =
  | { kind: "user"; id: string; text: string; pending: boolean }
  | { kind: "assistant"; id: string; text: string; streaming: boolean }
  | { kind: "notice"; id: string; text: string };
