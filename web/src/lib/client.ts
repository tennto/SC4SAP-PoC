/**
 * Browser-side wrapper over the backend HTTP surface.
 *
 * Everything goes through the same-origin `/api/*` proxy route, never at the
 * backend directly — the browser is not supposed to know where it lives.
 */
import type {
  AttachmentMeta,
  Chat,
  ChatMessage,
  Health,
  PendingApproval,
  PermissionResponse,
  Session,
} from "./types";
import type { Attachment } from "./attachments";

/** Backend errors arrive as `{error: "..."}`; surface that text, not "500". */
async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`/api${path}`, {
    ...init,
    headers:
      init?.body === undefined
        ? init?.headers
        : { "Content-Type": "application/json", ...init?.headers },
  });

  if (!response.ok) {
    let detail = `${response.status} ${response.statusText}`;
    try {
      const body = (await response.json()) as { error?: string };
      if (body.error) detail = body.error;
    } catch {
      // Non-JSON error body — the status line is all we have.
    }
    throw new Error(detail);
  }

  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

export const api = {
  /**
   * `fresh` skips the backend's short cache on the Claude API key check. Pass
   * it when a person asked for the check; leave it off for incidental reads.
   */
  health: (fresh = false): Promise<Health> =>
    request<Health>(fresh ? "/health?fresh=1" : "/health"),

  /**
   * The stored conversations. These are served by Next routes rather than
   * proxied to the backend — the backend has no idea who is signed in.
   */
  listChats: async (): Promise<Chat[]> =>
    (await request<{ chats: Chat[] }>("/chats")).chats,

  readChat: (
    id: string,
  ): Promise<{ chat: Chat; messages: ChatMessage[]; context: string | null }> =>
    request(`/chats/${id}`),

  saveTurns: (
    id: string,
    body: {
      title?: string | null;
      sdkSessionId?: string | null;
      turns?: number;
      totalCostUsd?: number;
      messages: {
        seq: number;
        role: "user" | "agent";
        text: string;
        attachments?: AttachmentMeta[];
      }[];
    },
  ): Promise<{ ok: boolean }> =>
    request(`/chats/${id}`, { method: "POST", body: JSON.stringify(body) }),

  deleteChat: (id: string): Promise<{ ok: boolean }> =>
    request(`/chats/${id}`, { method: "DELETE" }),

  listSessions: async (): Promise<Session[]> =>
    (await request<{ sessions: Session[] }>("/sessions")).sessions,

  /**
   * `resume` reattaches to a prior SDK conversation (server restart,
   * reconnect).
   *
   * `prior` is the stored chat's running totals, for a session being created
   * to carry on a conversation that already has some behind it. The session
   * counts from there instead of from zero, which is what keeps the rail's
   * figures — and the stored ones this writes back over — cumulative across
   * every session a conversation has had.
   */
  createSession: async (
    resume?: string,
    prior?: { turns: number; totalCostUsd: number },
  ): Promise<Session> =>
    (
      await request<{ session: Session }>("/sessions", {
        method: "POST",
        body: JSON.stringify({
          ...(resume ? { resume } : {}),
          ...(prior
            ? { priorTurns: prior.turns, priorCostUsd: prior.totalCostUsd }
            : {}),
        }),
      })
    ).session,

  getSession: async (id: string): Promise<Session> =>
    (await request<{ session: Session }>(`/sessions/${id}`)).session,

  closeSession: (id: string): Promise<void> =>
    request<void>(`/sessions/${id}`, { method: "DELETE" }),

  /**
   * 202 — the answer arrives on the SSE stream, not in this response.
   *
   * `context` is prior conversation for a revived chat. The backend feeds it
   * to the model and keeps it off the stream, so the transcript still shows
   * only what was typed.
   *
   * `attachments` are files sent with the prompt, base64 in the body. The
   * backend checks type and size again; the ceilings are in
   * `lib/attachments.ts`.
   */
  sendMessage: (
    id: string,
    text: string,
    context?: string | null,
    attachments?: Attachment[],
  ): Promise<{ accepted: boolean }> =>
    request<{ accepted: boolean }>(`/sessions/${id}/messages`, {
      method: "POST",
      body: JSON.stringify({
        text,
        ...(context ? { context } : {}),
        ...(attachments && attachments.length > 0 ? { attachments } : {}),
      }),
    }),

  /**
   * Abandon the turn in flight. The session stays open for the next prompt.
   *
   * 409 when there was no turn to stop — the answer landed between the press
   * and the request — which is not worth surfacing as a failure.
   */
  stopSession: (id: string): Promise<{ ok: boolean }> =>
    request<{ ok: boolean }>(`/sessions/${id}/stop`, { method: "POST" }),

  pendingApprovals: async (id: string): Promise<PendingApproval[]> =>
    (await request<{ pending: PendingApproval[] }>(`/sessions/${id}/permissions`))
      .pending,

  /**
   * Settles one approval. `409` means it was already settled — by the 5-minute
   * timeout, or by another tab watching the same session — which is a stale
   * dialog rather than a failure.
   */
  respondToPermission: (
    id: string,
    reqId: string,
    response: PermissionResponse,
  ): Promise<{ ok: boolean }> =>
    request<{ ok: boolean }>(`/sessions/${id}/permissions/${reqId}`, {
      method: "POST",
      body: JSON.stringify(response),
    }),

  /**
   * Stop asking about SAP read-class tools for this session, or start again.
   *
   * Scoped to the live backend session on purpose: it dies with the session,
   * so a chat revived tomorrow asks again rather than inheriting a switch
   * nobody remembers flipping.
   */
  setAutoApprove: (
    id: string,
    enabled: boolean,
  ): Promise<{ ok: boolean; enabled: boolean }> =>
    request<{ ok: boolean; enabled: boolean }>(`/sessions/${id}/auto-approve`, {
      method: "POST",
      body: JSON.stringify({ enabled }),
    }),

  /** Where 3-2 opens the stream. Same-origin, so `EventSource` works as-is. */
  streamUrl: (id: string): string => `/api/sessions/${id}/stream`,
};
