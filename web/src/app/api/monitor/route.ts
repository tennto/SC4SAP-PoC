import { listToolCalls } from "@/lib/monitor-store";
import { apiError, apiSignedIn } from "@/lib/auth/api-guard";

/**
 * `GET /api/monitor?before=<iso>&limit=<n>&mcp=1` — a page of this account's
 * tool calls, newest first.
 *
 * The monitor page's "load older". The live half of that page comes from the
 * backend's `/monitor/stream` through the proxy; this is the half that
 * outlives the backend's memory. Signed-in is enough — the rows are the
 * account's own, and an account without a connection has none.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request): Promise<Response> {
  const auth = await apiSignedIn();
  if ("response" in auth) return auth.response;

  const url = new URL(request.url);
  const beforeRaw = url.searchParams.get("before");
  const before = beforeRaw ? new Date(beforeRaw) : undefined;
  if (before && Number.isNaN(before.getTime())) {
    return apiError(400, "before must be an ISO timestamp.");
  }
  const limit = Number(url.searchParams.get("limit") ?? 50);
  if (!Number.isInteger(limit) || limit < 1) {
    return apiError(400, "limit must be a positive integer.");
  }

  try {
    const calls = await listToolCalls(auth.account.id, {
      before,
      limit,
      mcpOnly: url.searchParams.get("mcp") === "1",
    });
    return Response.json({ calls });
  } catch (err) {
    // Mongo unreachable. It throws with a message that names itself.
    return apiError(503, (err as Error).message);
  }
}
