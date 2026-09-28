import { recordRun } from "@/lib/chat-store";
import { apiError, apiSignedIn } from "@/lib/auth/api-guard";

/**
 * `POST /api/activity/runs/:id` — a run's running totals, and nothing else.
 *
 * For skill runs that keep no transcript (Program → Spec): the cost still
 * belongs in the month's spend and the account's totals. Body:
 * `{ turns, totalCostUsd }`, sent when the run settles.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const auth = await apiSignedIn();
  if ("response" in auth) return auth.response;

  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return apiError(400, "Not a run id.");
  const body = (await request.json().catch(() => null)) as {
    turns?: unknown;
    totalCostUsd?: unknown;
  } | null;
  const turns = Number(body?.turns);
  const totalCostUsd = Number(body?.totalCostUsd);
  if (!Number.isFinite(turns) || turns < 0 || !Number.isFinite(totalCostUsd) || totalCostUsd < 0) {
    return apiError(400, "turns and totalCostUsd must be non-negative numbers.");
  }
  await recordRun(auth.account.id, id, { turns, totalCostUsd });
  return Response.json({ ok: true });
}
