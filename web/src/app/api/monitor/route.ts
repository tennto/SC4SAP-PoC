import { listToolCalls } from "@/lib/monitor-store";
import { apiError, apiSignedIn } from "@/lib/auth/api-guard";

/**
 * `GET /api/monitor` — a page of this account's tool calls, newest first.
 *
 * Query: `before` (ISO cursor), `limit`, `mcp=1`, `status` (ok | failed |
 * running), `q` (tool name or input text), `from` and `to` (dates, `to`
 * exclusive). All optional; all the same filters the page applies to what it
 * already holds, so a row the server sends is a row the page would show.
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
  const date = (name: string): Date | undefined | null => {
    const raw = url.searchParams.get(name);
    if (!raw) return undefined;
    const value = new Date(raw);
    return Number.isNaN(value.getTime()) ? null : value;
  };
  const before = date("before");
  const from = date("from");
  const to = date("to");
  if (before === null || from === null || to === null) {
    return apiError(400, "before, from and to must be ISO timestamps.");
  }
  const limit = Number(url.searchParams.get("limit") ?? 50);
  if (!Number.isInteger(limit) || limit < 1) {
    return apiError(400, "limit must be a positive integer.");
  }
  const statusRaw = url.searchParams.get("status");
  const status =
    statusRaw === "ok" || statusRaw === "failed" || statusRaw === "running"
      ? statusRaw
      : undefined;
  if (statusRaw && !status) {
    return apiError(400, "status must be ok, failed or running.");
  }

  try {
    const calls = await listToolCalls(auth.account.id, {
      before,
      from,
      to,
      limit,
      status,
      q: url.searchParams.get("q")?.slice(0, 200) ?? undefined,
      mcpOnly: url.searchParams.get("mcp") === "1",
    });
    return Response.json({ calls });
  } catch (err) {
    // Mongo unreachable. It throws with a message that names itself.
    return apiError(503, (err as Error).message);
  }
}
