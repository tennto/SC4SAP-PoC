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
  Project,
  RunFile,
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
      /** Only read when the row is created. */
      kind?: "chat" | "task";
      projectId?: string | null;
      messages: {
        seq: number;
        role: "user" | "agent";
        text: string;
        attachments?: AttachmentMeta[];
      }[];
    },
  ): Promise<{ ok: boolean }> =>
    request(`/chats/${id}`, { method: "POST", body: JSON.stringify(body) }),

  /** Renames a stored conversation, or files it (`projectId: null` unfiles). */
  updateChat: (
    id: string,
    change: { title?: string; projectId?: string | null; pinned?: boolean },
  ): Promise<{ ok: boolean }> =>
    request(`/chats/${id}`, { method: "PATCH", body: JSON.stringify(change) }),

  deleteChat: (id: string): Promise<{ ok: boolean }> =>
    request(`/chats/${id}`, { method: "DELETE" }),

  /** Conversations whose title or saved messages contain `q`, with a snippet. */
  searchChats: async (q: string): Promise<{ id: string; snippet: string | null }[]> =>
    (
      await request<{ results: { id: string; snippet: string | null }[] }>(
        `/chats/search?q=${encodeURIComponent(q)}`,
      )
    ).results,

  listProjects: async (): Promise<Project[]> =>
    (await request<{ projects: Project[] }>("/projects")).projects,

  createProject: async (name: string): Promise<Project> =>
    (await request<{ project: Project }>("/projects", {
      method: "POST",
      body: JSON.stringify({ name }),
    })).project,

  renameProject: (id: string, name: string): Promise<{ ok: boolean }> =>
    request(`/projects/${id}`, { method: "PATCH", body: JSON.stringify({ name }) }),

  deleteProject: (id: string): Promise<{ ok: boolean }> =>
    request(`/projects/${id}`, { method: "DELETE" }),

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
    /**
     * How the run is allowed to spend. A skill screen sets these from its
     * pre-run dialog; the chat leaves them out. Zero budget means none.
     */
    spend?: {
      maxBudgetUsd?: number;
      economy?: boolean;
      model?: string;
      /** Every plugin sub-agent on this model; wins over `economy`. */
      subagentModel?: "haiku" | "sonnet" | "opus";
      /** An economy code review: one agent, the rule files in its first prompt. */
      reviewRules?: boolean;
      /**
       * What the run may reach for: `analyse` or `build`. Each skill declares
       * its own. Chat leaves it out and gets `ask`, which carries neither
       * sub-agents nor the file, shell and web tools.
       */
      profile?: "analyse" | "build";
      /** Reasoning effort, where the skill sets one. See `Skill.effort`. */
      effort?: "low" | "medium" | "high";
      /** `task` from a skill's page, so the chat list files it under Tasks. */
      kind?: "task";
    },
  ): Promise<Session> =>
    (
      await request<{ session: Session }>("/sessions", {
        method: "POST",
        body: JSON.stringify({
          ...(resume ? { resume } : {}),
          ...(prior
            ? { priorTurns: prior.turns, priorCostUsd: prior.totalCostUsd }
            : {}),
          ...(spend?.maxBudgetUsd ? { maxBudgetUsd: spend.maxBudgetUsd } : {}),
          ...(spend?.economy !== undefined ? { economy: spend.economy } : {}),
          ...(spend?.profile ? { profile: spend.profile } : {}),
          ...(spend?.effort ? { effort: spend.effort } : {}),
          ...(spend?.model ? { model: spend.model } : {}),
          ...(spend?.subagentModel ? { subagentModel: spend.subagentModel } : {}),
          ...(spend?.reviewRules ? { reviewRules: true } : {}),
          ...(spend?.kind ? { kind: spend.kind } : {}),
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

  /**
   * The documents the run wrote. Handed over once: the backend deletes them
   * as it answers, so the page must keep what this returns.
   */
  takeFiles: async (id: string): Promise<RunFile[]> =>
    (await request<{ files: RunFile[] }>(`/sessions/${id}/files`, { method: "POST" }))
      .files,

  /** A transcript-less run's running totals — see `recordRun`. */
  recordRun: (
    id: string,
    totals: { turns: number; totalCostUsd: number },
  ): Promise<{ ok: boolean }> =>
    request<{ ok: boolean }>(`/activity/runs/${id}`, {
      method: "POST",
      body: JSON.stringify(totals),
    }),

  /** Where 3-2 opens the stream. Same-origin, so `EventSource` works as-is. */
  streamUrl: (id: string): string => `/api/sessions/${id}/stream`,
};
