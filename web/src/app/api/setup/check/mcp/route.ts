import { checkMcp, CheckError } from "@/lib/setup-checks";
import { jsonError, signedIn } from "../../shared";

/**
 * `POST /api/setup/check/mcp` — is the agent backend up and configured?
 *
 * Takes no body: there is nothing per-account to check yet. See `checkMcp` for
 * exactly how much this establishes, which is less than its label on the
 * screen implies.
 *
 * POST rather than GET despite reading nothing, so all three checks are the
 * same shape at the call site and none of them is cacheable by accident.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(): Promise<Response> {
  const auth = await signedIn();
  if ("response" in auth) return auth.response;

  try {
    const { detail } = await checkMcp();
    return Response.json({ ok: true, detail });
  } catch (err) {
    if (err instanceof CheckError) return jsonError(502, err.message);
    throw err;
  }
}
