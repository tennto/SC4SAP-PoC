import { NextRequest } from "next/server";
import { BACKEND } from "@/lib/backend";

/**
 * Same-origin proxy to the Fastify backend: `/api/<anything>` →
 * `BACKEND/<anything>`.
 *
 * A Route Handler rather than a `next.config` rewrite, because one of the
 * proxied routes is the SSE stream and this needs explicit control over it:
 * the upstream body is piped through untouched, `content-length` and
 * `content-encoding` are dropped (they describe the upstream framing, not
 * ours), and buffering is disabled so 3-2's token deltas arrive as they are
 * produced instead of in one lump at the end of the turn.
 */

// The stream must never be cached or statically evaluated.
export const dynamic = "force-dynamic";
// Streaming a response body needs the Node runtime, not the edge one.
export const runtime = "nodejs";

/** Request headers worth forwarding. Hop-by-hop and host headers are not. */
const FORWARD_REQUEST_HEADERS = [
  "content-type",
  "accept",
  // Drives SSE replay — without it a reconnect re-reads the whole history.
  "last-event-id",
];

/** Response headers worth returning. `content-length` would contradict a stream. */
const FORWARD_RESPONSE_HEADERS = ["content-type", "cache-control"];

async function proxy(
  request: NextRequest,
  context: { params: Promise<{ path?: string[] }> },
): Promise<Response> {
  const { path = [] } = await context.params;
  const target = `${BACKEND}/${path.join("/")}${request.nextUrl.search}`;

  const headers = new Headers();
  for (const name of FORWARD_REQUEST_HEADERS) {
    const value = request.headers.get(name);
    if (value) headers.set(name, value);
  }

  const hasBody = request.method !== "GET" && request.method !== "HEAD";

  let upstream: Response;
  try {
    upstream = await fetch(target, {
      method: request.method,
      headers,
      body: hasBody ? await request.text() : undefined,
      // The browser going away must tear down the upstream SSE subscription
      // too, or the backend keeps writing into a dead socket.
      signal: request.signal,
      cache: "no-store",
    });
  } catch (err) {
    // The backend being down is the ordinary case here (it is started
    // separately), so answer in the shape the client already parses.
    return Response.json(
      { error: `backend unreachable at ${BACKEND}: ${(err as Error).message}` },
      { status: 502 },
    );
  }

  const responseHeaders = new Headers();
  for (const name of FORWARD_RESPONSE_HEADERS) {
    const value = upstream.headers.get(name);
    if (value) responseHeaders.set(name, value);
  }
  if (upstream.headers.get("content-type")?.includes("text/event-stream")) {
    responseHeaders.set("cache-control", "no-cache, no-transform");
    responseHeaders.set("connection", "keep-alive");
    // Tells any proxy in front of Next not to buffer, same as the backend does.
    responseHeaders.set("x-accel-buffering", "no");
  }

  return new Response(upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers: responseHeaders,
  });
}

export {
  proxy as GET,
  proxy as POST,
  proxy as PUT,
  proxy as PATCH,
  proxy as DELETE,
};
