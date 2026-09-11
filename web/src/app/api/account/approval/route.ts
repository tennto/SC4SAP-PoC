import { updateApproval } from "@/lib/auth/users";
import { APPROVAL_LEVELS, type ApprovalLevel } from "@/lib/account";
import { jsonError, readJson, readString, signedIn } from "../shared";

/**
 * `PATCH /api/account/approval` — how much this account's sessions ask.
 *
 * Takes effect on the next session opened: the proxy reads the account on
 * every request and sends the level along, so nothing here has to reach the
 * backend. A session already running keeps the level it was opened with.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PATCH(request: Request): Promise<Response> {
  const auth = await signedIn();
  if ("response" in auth) return auth.response;

  const body = await readJson(request);
  if (!body) return jsonError(400, "Expected a JSON object.");

  const approval = readString(body, "approval");
  if (!APPROVAL_LEVELS.some((level) => level.value === approval)) {
    return jsonError(400, "Pick an approval level.", "approval");
  }

  const updated = await updateApproval(auth.account.id, approval as ApprovalLevel);
  if (!updated) return jsonError(404, "That account no longer exists.");
  return Response.json({ ok: true, approval });
}
