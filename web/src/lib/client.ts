/**
 * Browser-side wrapper over the backend HTTP surface.
 *
 * Everything goes through the same-origin `/api/*` proxy route, never at the
 * backend directly — the browser is not supposed to know where it lives.
 */
import type { Health, PendingApproval, Session } from "./types";

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
  health: (): Promise<Health> => request<Health>("/health"),

  listSessions: async (): Promise<Session[]> =>
    (await request<{ sessions: Session[] }>("/sessions")).sessions,

  /** `resume` reattaches to a prior SDK conversation (server restart, reconnect). */
  createSession: async (resume?: string): Promise<Session> =>
    (
      await request<{ session: Session }>("/sessions", {
        method: "POST",
        body: JSON.stringify(resume ? { resume } : {}),
      })
    ).session,

  getSession: async (id: string): Promise<Session> =>
    (await request<{ session: Session }>(`/sessions/${id}`)).session,

  closeSession: (id: string): Promise<void> =>
    request<void>(`/sessions/${id}`, { method: "DELETE" }),

  /** 202 — the answer arrives on the SSE stream, not in this response. */
  sendMessage: (id: string, text: string): Promise<{ accepted: boolean }> =>
    request<{ accepted: boolean }>(`/sessions/${id}/messages`, {
      method: "POST",
      body: JSON.stringify({ text }),
    }),

  pendingApprovals: async (id: string): Promise<PendingApproval[]> =>
    (await request<{ pending: PendingApproval[] }>(`/sessions/${id}/permissions`))
      .pending,

  /** Where 3-2 opens the stream. Same-origin, so `EventSource` works as-is. */
  streamUrl: (id: string): string => `/api/sessions/${id}/stream`,
};
