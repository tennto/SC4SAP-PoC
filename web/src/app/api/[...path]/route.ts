import { NextRequest } from "next/server";
import { BACKEND } from "@/lib/backend";
import { apiConnected } from "@/lib/auth/api-guard";

/**
 * Same-origin proxy to the Fastify backend: `/api/<anything>` →
 * `BACKEND/<anything>`.
 *
 * Guarded, and that is the second reason it is a Route Handler. `proxy.ts` can
 * only see that a session cookie exists; this is the one place that can ask
 * whether the account behind it has finished setup. Without that check a
 * signed-in but unconfigured account could open a real agent session by
 * calling `/api/sessions` from a URL bar — every *page* redirects it to the
 * wizard, but a `fetch` is not a page, and the session it starts spends the
 * operator's key.
 *
 * A Route Handler rather than a `next.config` rewrite, also because one of the
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
  // Before anything is forwarded, and before the request body is even read.
  const auth = await apiConnected();
  if ("response" in auth) return auth.response;

  const { path = [] } = await context.params;
  const target = `${BACKEND}/${path.join("/")}${request.nextUrl.search}`;

  const headers = new Headers();
  for (const name of FORWARD_REQUEST_HEADERS) {
    const value = request.headers.get(name);
    if (value) headers.set(name, value);
  }
  // Who is asking. The backend keys its tool-call log on this; it does not
  // verify it, and does not need to — nothing but this proxy reaches the
  // backend, and this proxy has just checked the cookie. Set, never copied
  // from the incoming request, so a browser cannot claim another account.
  headers.set("x-sc4sap-user", auth.account.id);
  // And how much their sessions ask. Read from the row on every request, so
  // a change in Settings reaches the next session without a sign-out.
  headers.set("x-sc4sap-approval", auth.account.approval);

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
