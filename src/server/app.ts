/**
 * Phase 2-1 — Fastify HTTP surface over the session registry.
 *
 *   POST   /sessions              create (optionally resuming an SDK session id)
 *   GET    /sessions              list
 *   GET    /sessions/:id          one
 *   DELETE /sessions/:id          close
 *   POST   /sessions/:id/messages queue a user turn (202; output arrives on the stream)
 *   GET    /sessions/:id/stream   SSE of everything the SDK emits
 *
 * The stream carries whole SDK messages. Token-level `text_delta` relay is
 * plan item 2-3, which turns on `includePartialMessages` and splits these into
 * finer events; clients written against this shape keep working because the
 * event name stays `message`.
 */
import Fastify, { type FastifyInstance } from "fastify";
import { SessionManager, type SequencedEvent } from "./session-manager.ts";

/** SSE comment heartbeat, so idle proxies do not drop the connection. */
const HEARTBEAT_MS = 15_000;

type IdParams = { id: string };

export function buildApp(manager: SessionManager): FastifyInstance {
  const app = Fastify({ logger: true });

  app.get("/health", async () => ({
    ok: true,
    plugin: manager.config.pluginPath,
    workspace: manager.config.workspace,
    model: manager.config.model,
    sessions: manager.list().length,
  }));

  app.post<{ Body: { resume?: string } | undefined }>(
    "/sessions",
    async (request, reply) => {
      const session = manager.create({ resume: request.body?.resume });
      return reply.code(201).send({ session });
    },
  );

  app.get("/sessions", async () => ({ sessions: manager.list() }));

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

  app.post<{ Params: IdParams; Body: { text?: string } }>(
    "/sessions/:id/messages",
    async (request, reply) => {
      const text = request.body?.text;
      if (typeof text !== "string" || text.trim() === "") {
        return reply.code(400).send({ error: "body.text is required" });
      }
      if (!manager.get(request.params.id)) {
        return reply.code(404).send({ error: "unknown session" });
      }
      if (!manager.send(request.params.id, text)) {
        return reply.code(409).send({ error: "session is closed" });
      }
      // Accepted, not answered — the reply streams over SSE.
      return reply.code(202).send({ accepted: true });
    },
  );

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
