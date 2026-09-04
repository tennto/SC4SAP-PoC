import { saveConnection } from "@/lib/setup-store";
import {
  EMPTY_DRAFT,
  isAbapReleaseValid,
  isAdtUrlValid,
  isApiKeyValid,
  isClientValid,
  type SetupDraft,
} from "@/lib/setup";
import { jsonError, readJson, readSecret, signedIn } from "./shared";

/**
 * `POST /api/setup` — store this account's connection.
 *
 * The last thing the wizard does, after the three checks have passed. It does
 * not re-run them: they were run against these exact values seconds ago, and
 * repeating them would double the wait for an answer nobody would see.
 *
 * It does re-run every *validation*, because that is a different thing. The
 * checks establish that a system answered; the rules below establish that what
 * is about to be written to a row is the right shape, and a caller that is not
 * the wizard has satisfied neither.
 *
 * The two secrets are sealed by `saveConnection` before they reach Mongo —
 * see `lib/secrets.ts`. Nothing about them comes back in the response.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** The two the type constrains, checked rather than cast. */
const VERSIONS = new Set<SetupDraft["sapVersion"]>(["S4", "ECC"]);
/** Two letters, upper case — the shape of a SAP logon language. */
const LANGUAGE = /^[A-Z]{2}$/;

export async function POST(request: Request): Promise<Response> {
  const auth = await signedIn();
  if ("response" in auth) return auth.response;

  const body = await readJson(request);
  if (!body) return jsonError(400, "Expected a JSON object.");

  const adtUrl = typeof body.adtUrl === "string" ? body.adtUrl : "";
  const sapUser = typeof body.sapUser === "string" ? body.sapUser.trim() : "";
  const sapPassword = readSecret(body, "sapPassword");
  const sapVersion = body.sapVersion as SetupDraft["sapVersion"];
  const abapRelease =
    typeof body.abapRelease === "string" ? body.abapRelease.trim() : "";
  const client = typeof body.client === "string" ? body.client.trim() : "";
  const language =
    typeof body.language === "string" ? body.language.trim().toUpperCase() : "";
  const apiKey = readSecret(body, "apiKey");

  if (!isAdtUrlValid(adtUrl)) return jsonError(400, "That is not a usable ADT URL.");
  if (!sapUser) return jsonError(400, "A SAP user is required.");
  if (!sapPassword) return jsonError(400, "A password is required.");
  if (!VERSIONS.has(sapVersion)) return jsonError(400, "Pick a release.");
  if (!isAbapReleaseValid(abapRelease)) {
    return jsonError(400, "The ABAP release must be three digits.");
  }
  if (!isClientValid(client)) return jsonError(400, "The client must be three digits.");
  if (!LANGUAGE.test(language)) return jsonError(400, "Pick a logon language.");
  if (!apiKey || !isApiKeyValid(apiKey)) {
    return jsonError(400, "That does not look like a Console key.");
  }

  // Built from the validated locals rather than spread from the body, so a
  // field the client invented cannot ride along into the document.
  const draft: SetupDraft = {
    ...EMPTY_DRAFT,
    adtUrl,
    sapUser,
    sapPassword,
    sapVersion,
    abapRelease,
    client,
    language,
    apiKey,
  };

  try {
    await saveConnection(auth.account.id, draft);
  } catch (err) {
    // Two ordinary causes, both the operator's to fix and neither worth
    // hiding behind a generic 500: Mongo is unreachable, or SETUP_SECRET is
    // missing. Each throws with a message that names itself.
    return jsonError(503, (err as Error).message);
  }

  return Response.json({ ok: true }, { status: 201 });
}
