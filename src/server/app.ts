/**
 * Phase 2-1 — Fastify HTTP surface over the session registry.
 *
 *   POST   /sessions              create (optionally resuming an SDK session id)
 *   GET    /sessions              list
 *   GET    /sessions/:id          one
 *   DELETE /sessions/:id          close
 *   POST   /sessions/:id/messages queue a user turn (202; output arrives on the stream)
 *   GET    /sessions/:id/stream   SSE of everything the SDK emits
 *   POST   /sessions/:id/auto-approve  wave SAP reads through for this session
 *   GET    /monitor/stream        SSE of every tool call the caller's account runs
 *   GET    /profiles              the SAP systems configured, and which is live
 *   POST   /profiles              add a SAP system and move onto it
 *   POST   /profiles/check        is the live system answering?
 *   POST   /profiles/active       point the workspace at another SAP system
 *
 * The caller's account arrives as `x-sc4sap-user`, set by the web app's proxy
 * after it has checked the session cookie. The backend does not verify it —
 * it is bound to the loopback interface and the proxy is the only thing that
 * reaches it — so the header is an identity, not a credential.
 *
 * The stream carries whole SDK messages. Token-level `text_delta` relay is
 * plan item 2-3, which turns on `includePartialMessages` and splits these into
 * finer events; clients written against this shape keep working because the
 * event name stays `message`.
 */
import Fastify, { type FastifyInstance } from "fastify";
import {
  SessionManager,
  type PermissionResponse,
  type SequencedEvent,
} from "./session-manager.ts";
import { claudeApiHealth } from "./claude-api.ts";
import { APPROVAL_LEVELS, type ApprovalLevel } from "./tool-policy.ts";
import { BODY_LIMIT, validateAttachments } from "./attachments.ts";
import {
  checkActiveProfile,
  createProfile,
  listProfiles,
  switchProfile,
} from "./profiles.ts";

/** SSE comment heartbeat, so idle proxies do not drop the connection. */
const HEARTBEAT_MS = 15_000;

type IdParams = { id: string };

/**
 * The models a session may be opened on. A closed list rather than any
 * string, so a typo cannot open a session on a model that does not exist
 * and fail on its first turn. The web app's cost dialog offers these.
 */
export const MODELS = [
  { id: "claude-haiku-4-5", label: "Haiku 4.5", note: "Half the price of Sonnet. Enough to read a table or a program." },
  { id: "claude-sonnet-5", label: "Sonnet 5", note: "Fast, and enough to narrow most causes." },
  { id: "claude-opus-5", label: "Opus 5", note: "Deeper cross-file reasoning, about five times the price." },
] as const;

/**
 * The account's approval level, from `x-sc4sap-approval`. Set by the proxy
 * beside the account id; absent or unknown reads as `all`, which asks about
 * everything — the safe way to be wrong.
 */
function approvalOf(headers: Record<string, string | string[] | undefined>): ApprovalLevel {
  const value = headers["x-sc4sap-approval"];
  const level = Array.isArray(value) ? value[0] : value;
  return APPROVAL_LEVELS.includes(level as ApprovalLevel) ? (level as ApprovalLevel) : "all";
}

/** The account behind a request, or `undefined` for a caller that sent none. */
function userOf(headers: Record<string, string | string[] | undefined>): string | undefined {
  const value = headers["x-sc4sap-user"];
  const id = Array.isArray(value) ? value[0] : value;
  return id && /^[A-Za-z0-9_-]{1,64}$/.test(id) ? id : undefined;
}

export function buildApp(manager: SessionManager): FastifyInstance {
  // The default 1 MB body ceiling is smaller than one attached screenshot.
  // See `attachments.ts` for how the figure is arrived at.
  const app = Fastify({ logger: true, bodyLimit: BODY_LIMIT });

  app.get<{ Querystring: { fresh?: string } }>("/health", async (request) => ({
    models: MODELS,
    ok: true,
    plugin: manager.config.pluginPath,
    workspace: manager.config.workspace,
    model: manager.config.model,
    sessions: manager.list().length,
    warm: manager.warmCount,
    // A real check, cached for a few seconds — see `claude-api.ts`. The one
    // await in this handler, and the reason it can take a moment on a cold
    // call. `?fresh=1` skips the cache, for a caller who asked for the check
    // rather than merely happening to render a page.
    claudeApi: await claudeApiHealth(
      manager.config.model,
      request.query.fresh === "1",
    ),
    toolPolicy: {
      autoAllowed: manager.policy.allowedTools.length,
      denyPatterns: manager.policy.disallowedTools,
      classes: manager.policy.summary,
    },
  }));

  /**
   * The SAP systems this backend can reach, and the one it is on.
   *
   * Spawns the plugin's profile CLI, so it is not free — cheap enough for a
   * settings screen, not for a poll. A failure is a 503 rather than an empty
   * list: "no systems configured" and "the CLI did not answer" are different
   * states and a screen that renders them the same way invites deleting a
   * profile that is actually there.
   */
  app.get("/profiles", async (_request, reply) => {
    try {
      return await listProfiles(
        manager.config.pluginPath,
        manager.config.workspace,
      );
    } catch (err) {
      app.log.error({ err }, "profile list failed");
      return reply
        .code(503)
        .send({ error: `could not read profiles: ${(err as Error).message}` });
    }
  });

  /**
   * Add a SAP system, and move onto it.
   *
   * The password arrives in the body and goes straight to the profile CLI on
   * stdin, which puts it in the OS keychain. It is never logged, never
   * returned, and never written to `sap.env` in the clear.
   *
   * The caller is expected to have proved the logon works first — the web app
   * runs the same ADT probe the setup wizard does before it posts here. This
   * endpoint does not re-run it: a system that answered seconds ago would be
   * asked twice for one answer nobody sees.
   */
  /**
   * Is the live system reachable, with the logon its profile carries?
   *
   * What the dashboard's Reconnect asks. It probes the profile every session
   * runs on, not a copy of connection details stored per account — those were
   * two different systems the moment anyone switched, and a green row about
   * the wrong one is worse than no row.
   *
   * 502 rather than 500 when the system refuses or does not answer: this
   * endpoint worked, the stack behind it did not.
   */
  app.post("/profiles/check", async (_request, reply) => {
    const result = await checkActiveProfile(
      manager.config.pluginPath,
      manager.config.workspace,
    );
    if (!result.ok) return reply.code(502).send({ error: result.error });
    return { ok: true, detail: result.detail };
  });

  app.post<{ Body: Record<string, unknown> | undefined }>(
    "/profiles",
    async (request, reply) => {
      const body = request.body ?? {};
      const text = (key: string): string =>
        typeof body[key] === "string" ? (body[key] as string).trim() : "";

      const required = ["alias", "host", "client", "username", "abapRelease"];
      for (const key of required) {
        if (!text(key)) {
          return reply.code(400).send({ error: `body.${key} is required`, field: key });
        }
      }
      // Not trimmed: a password may legitimately begin or end with a space.
      const password =
        typeof body.password === "string" ? (body.password as string) : "";

      try {
        const outcome = await createProfile(manager, {
          alias: text("alias"),
          tier: text("tier") || "DEV",
          host: text("host"),
          client: text("client"),
          username: text("username"),
          password,
          version: text("version") || "S4",
          abapRelease: text("abapRelease"),
          language: text("language") || "EN",
          industry: text("industry") || "other",
          description: text("description"),
        });
        if (!outcome.ok) {
          // 409 for "it is already here": the request was well-formed and the
          // caller has nothing to correct, which is not what 400 means. The
          // web app turns this one into a sentence and a way back, rather than
          // into a field error on a form nobody needs to fix.
          return reply
            .code(outcome.duplicateAlias ? 409 : 400)
            .send({
              error: outcome.error,
              field: outcome.field,
              duplicateAlias: outcome.duplicateAlias,
            });
        }
        app.log.info(
          `added SAP profile ${text("alias")} and switched to it; ` +
            `closed ${outcome.closedSessions} session(s), ` +
            `re-discovered ${manager.policy.summary.read} read-class tool(s)`,
        );
        return reply.code(201).send({
          active: outcome.list.active,
          profiles: outcome.list.profiles,
          closedSessions: outcome.closedSessions,
        });
      } catch (err) {
        app.log.error({ err }, "profile create failed");
        return reply
          .code(503)
          .send({ error: `could not add the system: ${(err as Error).message}` });
      }
    },
  );

  /**
   * Point the workspace at another SAP system.
   *
   * Every open session is closed by this, including other people's — the
   * workspace is process-wide, so this is a server-wide switch however it is
   * dressed. The count of what was closed comes back so the caller can say so
   * rather than leaving a reader wondering where their chat went.
   */
  app.post<{ Body: { alias?: string } | undefined }>(
    "/profiles/active",
    async (request, reply) => {
      const alias = request.body?.alias;
      if (typeof alias !== "string" || alias === "") {
        return reply.code(400).send({ error: "body.alias is required" });
      }
      try {
        const outcome = await switchProfile(manager, alias);
        if (!outcome.ok) return reply.code(400).send({ error: outcome.error });
        app.log.info(
          `active SAP profile is now ${alias}; ` +
            `closed ${outcome.closedSessions} session(s), ` +
            `re-discovered ${manager.policy.summary.read} read-class tool(s)`,
        );
        return {
          active: outcome.list.active,
          profiles: outcome.list.profiles,
          closedSessions: outcome.closedSessions,
        };
      } catch (err) {
        app.log.error({ err }, "profile switch failed");
        return reply
          .code(503)
          .send({ error: `could not switch profile: ${(err as Error).message}` });
      }
    },
  );

  app.post<{
    Body:
      | {
          resume?: string;
          priorTurns?: number;
          priorCostUsd?: number;
          /** A USD ceiling for the run. Zero or absent means none. */
          maxBudgetUsd?: number;
          /** Sub-agents on Sonnet whatever the skill asked for. */
          economy?: boolean;
          /**
           * Whether the session may dispatch sub-agents. Absent means no,
           * which is what a chat turn wants: the `Agent` tool's description
           * carries every agent the plugin declares and costs 17,665 tokens
           * of every turn's context. The skill screen asks for it.
           */
          subagents?: boolean;
          /** One of the models this backend offers — see `/health`. */
          model?: string;
        }
      | undefined;
  }>("/sessions", async (request, reply) => {
    // The running totals of the conversation this session is picking up, sent
    // by the web app when it revives a stored chat. Only a finite number is
    // worth carrying: a bad one would be added to every later figure, so it
    // is refused here rather than poisoning the count downstream.
    const { priorTurns, priorCostUsd, maxBudgetUsd, economy, subagents } =
      request.body ?? {};
    for (const [name, value] of [
      ["priorTurns", priorTurns],
      ["priorCostUsd", priorCostUsd],
      ["maxBudgetUsd", maxBudgetUsd],
    ] as const) {
      if (value === undefined) continue;
      if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
        return reply
          .code(400)
          .send({ error: `body.${name} must be a non-negative number` });
      }
    }
    if (economy !== undefined && typeof economy !== "boolean") {
      return reply.code(400).send({ error: "body.economy must be a boolean" });
    }
    if (subagents !== undefined && typeof subagents !== "boolean") {
      return reply.code(400).send({ error: "body.subagents must be a boolean" });
    }
    const model = request.body?.model;
    if (model !== undefined && !MODELS.some((entry) => entry.id === model)) {
      return reply.code(400).send({ error: "body.model is not one this backend offers" });
    }

    const session = manager.create({
      resume: request.body?.resume,
      priorTurns,
      priorCostUsd,
      maxBudgetUsd: maxBudgetUsd ? maxBudgetUsd : undefined,
      economy,
      subagents,
      model,
      userId: userOf(request.headers),
      approval: approvalOf(request.headers),
    });
    return reply.code(201).send({ session });
  });

  /**
   * Every tool call this account runs, as it happens, across every session.
   *
   * Opens with the account's recent calls from the in-memory ring as a
   * `recent` event, so the page has something to draw before the next call
   * lands; then one event per start and per finish. No `Last-Event-ID`
   * replay: the ring is the replay, and history older than it is the web
   * app's to read from Mongo.
   */
  app.get("/monitor/stream", async (request, reply) => {
    const userId = userOf(request.headers);
    if (!userId) {
      return reply.code(400).send({ error: "x-sc4sap-user header is required" });
    }

    reply.hijack();
    const { raw } = reply;
    raw.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    });

    const write = (event: string, data: unknown): void => {
      raw.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    };

    write("recent", {
      calls: manager.toolLog.recent(userId),
      persistent: manager.toolLog.persistent,
    });
    const unsubscribe = manager.toolLog.subscribe(userId, (event) =>
      write(event.type, event.call),
    );

    const heartbeat = setInterval(() => raw.write(": ping\n\n"), HEARTBEAT_MS);
    const stop = (): void => {
      clearInterval(heartbeat);
      unsubscribe();
    };
    request.raw.on("close", stop);
    request.raw.on("error", stop);
  });

  /**
   * Listing is what the chat page does on load, so it is also the moment to
   * open a session ahead of the "+" that usually follows. Only for a caller
   * with an account: the shape includes the approval level, and a session
   * warmed under the wrong one would never be claimed.
   */
  app.get("/sessions", async (request) => {
    const userId = userOf(request.headers);
    if (userId) manager.warm({ userId, approval: approvalOf(request.headers) });
    return { sessions: manager.list() };
  });

  app.get<{ Params: IdParams }>("/sessions/:id", async (request, reply) => {
    const session = manager.get(request.params.id);
    if (!session) return reply.code(404).send({ error: "unknown session" });
    return { session };
  });

  app.delete<{ Params: IdParams }>("/sessions/:id", async (request, reply) => {
    const closed = await manager.close(request.params.id);
    if (!closed) return reply.code(404).send({ error: "unknown session" });
    return reply.code(204).send();
  });

  app.post<{
    Params: IdParams;
    Body: { text?: string; context?: string; attachments?: unknown };
  }>(
    "/sessions/:id/messages",
    async (request, reply) => {
      const text = request.body?.text ?? "";
      if (typeof text !== "string") {
        return reply.code(400).send({ error: "body.text must be a string" });
      }
      // Files the reader sent with the prompt — checked for type and size
      // here, so an unreadable one is refused before it costs a model call.
      const checked = validateAttachments(request.body?.attachments);
      if (!checked.ok) {
        return reply.code(400).send({ error: checked.error });
      }
      // A prompt can be a file on its own, but it cannot be nothing.
      if (text.trim() === "" && checked.attachments.length === 0) {
        return reply.code(400).send({ error: "body.text is required" });
      }
      // Optional prior-conversation preamble, sent by the web app when it
      // revives a stored chat whose session died with the last server. It
      // reaches the model and never the transcript — see `send()`.
      const context = request.body?.context;
      if (context !== undefined && typeof context !== "string") {
        return reply.code(400).send({ error: "body.context must be a string" });
      }
      if (!manager.get(request.params.id)) {
        return reply.code(404).send({ error: "unknown session" });
      }
      if (
        !manager.send(request.params.id, text, context, checked.attachments)
      ) {
        return reply.code(409).send({ error: "session is closed" });
      }
      // Accepted, not answered — the reply streams over SSE.
      return reply.code(202).send({ accepted: true });
    },
  );

  /**
   * Abandon the turn in flight. The session stays; only this answer stops.
   *
   * 409 rather than 200 for a session that is not busy: "there was nothing to
   * stop" is a different outcome from "stopped", and a client that pressed the
   * button on a turn which had just finished should be able to tell.
   */
  app.post<{ Params: IdParams }>(
    "/sessions/:id/stop",
    async (request, reply) => {
      const outcome = await manager.stop(request.params.id);
      if (outcome === "unknown") {
        return reply.code(404).send({ error: "unknown session" });
      }
      if (outcome === "not-busy") {
        return reply.code(409).send({ error: "session is not running a turn" });
      }
      return { ok: true };
    },
  );

  /**
   * Stop asking about SAP read-class tools for this session, or start again.
   *
   * A session-scoped switch rather than a config setting: it is granted by the
   * person watching this conversation, dies with it, and cannot widen what the
   * tool policy already considers a read.
   */
  app.post<{ Params: IdParams; Body: { enabled?: boolean } | undefined }>(
    "/sessions/:id/auto-approve",
    async (request, reply) => {
      const enabled = request.body?.enabled;
      if (typeof enabled !== "boolean") {
        return reply
          .code(400)
          .send({ error: "body.enabled must be a boolean" });
      }
      if (manager.setAutoApprove(request.params.id, enabled) === "unknown-session") {
        return reply.code(404).send({ error: "unknown session" });
      }
      return { ok: true, enabled };
    },
  );

  app.get<{ Params: IdParams }>(
    "/sessions/:id/permissions",
    async (request, reply) => {
      const pending = manager.pendingApprovals(request.params.id);
      if (!pending) return reply.code(404).send({ error: "unknown session" });
      return { pending };
    },
  );

  app.post<{
    Params: IdParams & { reqId: string };
    Body: PermissionResponse | undefined;
  }>("/sessions/:id/permissions/:reqId", async (request, reply) => {
    const body = request.body;
    if (body?.behavior !== "allow" && body?.behavior !== "deny") {
      return reply
        .code(400)
        .send({ error: 'body.behavior must be "allow" or "deny"' });
    }

    const outcome = manager.respondToPermission(
      request.params.id,
      request.params.reqId,
      body,
    );
    if (outcome === "unknown-session") {
      return reply.code(404).send({ error: "unknown session" });
    }
    if (outcome === "unknown-request") {
      // Already settled by another client, by the timeout, or never existed.
      return reply
        .code(409)
        .send({ error: "no such pending request (already settled?)" });
    }
    return { ok: true };
  });

  app.get<{ Params: IdParams }>(
    "/sessions/:id/stream",
    async (request, reply) => {
      if (!manager.get(request.params.id)) {
        return reply.code(404).send({ error: "unknown session" });
      }

      // Resume replay where this client left off, so a browser refresh does
      // not lose the turn that ran while it was disconnected.
      const lastEventId = Number(request.headers["last-event-id"]);
      const afterSeq = Number.isFinite(lastEventId) ? lastEventId : 0;

      reply.hijack();
      const { raw } = reply;
      raw.writeHead(200, {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
        "X-Accel-Buffering": "no",
      });

      const write = ({ seq, event }: SequencedEvent): void => {
        raw.write(`id: ${seq}\nevent: ${event.type}\n`);
        raw.write(`data: ${JSON.stringify(event)}\n\n`);
      };

      const unsubscribe = manager.subscribe(
        request.params.id,
        write,
        afterSeq,
      );
      if (!unsubscribe) {
        raw.end();
        return;
      }

      const heartbeat = setInterval(() => raw.write(": ping\n\n"), HEARTBEAT_MS);
      const stop = (): void => {
        clearInterval(heartbeat);
        unsubscribe();
      };
      request.raw.on("close", stop);
      request.raw.on("error", stop);
    },
  );

  return app;
}
