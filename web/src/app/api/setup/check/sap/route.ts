import { checkSap, CheckError } from "@/lib/setup-checks";
import { isAdtUrlValid, isClientValid } from "@/lib/setup";
import { jsonError, readJson, readSecret, signedIn } from "../../shared";

/**
 * `POST /api/setup/check/sap` — is that ABAP stack reachable with that logon?
 *
 * A check and nothing else: it stores nothing and returns nothing derived from
 * what it was given. The values arrive here again at save time, which is one
 * more trip over the wire than a single combined endpoint would make — and is
 * the price of the wizard being able to say which of the three checks failed
 * while it is still running.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request): Promise<Response> {
  const auth = await signedIn();
  if ("response" in auth) return auth.response;

  const body = await readJson(request);
  if (!body) return jsonError(400, "Expected a JSON object.");

  const adtUrl = typeof body.adtUrl === "string" ? body.adtUrl : "";
  const sapUser = typeof body.sapUser === "string" ? body.sapUser.trim() : "";
  const sapPassword = readSecret(body, "sapPassword");
  const client = typeof body.client === "string" ? body.client.trim() : "";

  // The same rules the wizard runs as you type, re-run here. The browser's
  // copy shapes what gets typed; this one is what actually decides.
  if (!isAdtUrlValid(adtUrl)) return jsonError(400, "That is not a usable ADT URL.");
  if (!sapUser) return jsonError(400, "A SAP user is required.");
  if (!sapPassword) return jsonError(400, "A password is required.");
  if (!isClientValid(client)) return jsonError(400, "The client must be three digits.");

  try {
    const { detail } = await checkSap({ adtUrl, sapUser, sapPassword, client });
    return Response.json({ ok: true, detail });
  } catch (err) {
    // 502: this endpoint worked, the system behind it did not. A 500 would
    // read as "the app is broken" when the answer is "check your host".
    if (err instanceof CheckError) return jsonError(502, err.message);
    throw err;
  }
}
