import { checkSap, CheckError } from "@/lib/setup-checks";
import { readConnection, readConnectionSecrets, saveConnection } from "@/lib/setup-store";
import {
  EMPTY_DRAFT,
  isAbapReleaseValid,
  isAdtUrlValid,
  isClientValid,
  type SetupDraft,
} from "@/lib/setup";
import { jsonError, readJson, readSecret, readString, signedIn } from "../shared";

/**
 * `POST /api/account/connection` — change where this account is pointed.
 *
 * Checks, then saves, in one request. The wizard splits its three checks
 * across three endpoints so it can name the one that failed while the run is
 * still going; there is one check here and nothing to narrate, so splitting it
 * would only add a round trip and a window in which the browser could save
 * without having checked.
 *
 * The check is the point. A stored connection is what every screen behind the
 * gate assumes is reachable, so a save that skipped it could put the whole app
 * behind a host that answers nothing — and the failure would surface later, in
 * a skill run, as something that reads like a bug in the skill.
 *
 * An omitted `sapPassword` means "keep the stored one", which is what makes
 * changing a client number a one-field edit rather than a reason to go and
 * find the password again. The stored key is always kept: this endpoint edits
 * the SAP side of the connection, and the Console key belongs to the flow that
 * can also verify it.
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

  const adtUrl = readString(body, "adtUrl");
  const sapUser = readString(body, "sapUser");
  const typed = readSecret(body, "sapPassword");
  const sapVersion = body.sapVersion as SetupDraft["sapVersion"];
  const abapRelease = readString(body, "abapRelease");
  const client = readString(body, "client");
  const language = readString(body, "language").toUpperCase();

  if (!isAdtUrlValid(adtUrl)) {
    return jsonError(400, "That is not a usable ADT URL.", "adtUrl");
  }
  if (!sapUser) return jsonError(400, "A SAP user is required.", "sapUser");
  if (!VERSIONS.has(sapVersion)) {
    return jsonError(400, "Pick a release.", "sapVersion");
  }
  if (!isAbapReleaseValid(abapRelease)) {
    return jsonError(400, "The ABAP release must be three digits.", "abapRelease");
  }
  if (!isClientValid(client)) {
    return jsonError(400, "The client must be three digits.", "client");
  }
  if (!LANGUAGE.test(language)) {
    return jsonError(400, "Pick a logon language.", "language");
  }

  // This edits a connection; it does not establish one. An account with
  // nothing stored has no key to carry forward and belongs in the wizard,
  // which is the only flow that asks for one.
  // Two reads of the same row, because one returns only what a screen may
  // see and the other only what a screen must not — and this needs both:
  // the sealed values to carry forward, and the scope (industry, blocklist)
  // that this endpoint does not edit and must not reset to defaults.
  const [stored, current] = await Promise.all([
    readConnectionSecrets(auth.account.id),
    readConnection(auth.account.id),
  ]);
  if (!stored || !current) {
    return jsonError(409, "This account has no connection yet. Run setup first.");
  }

  const sapPassword = typed || stored.sapPassword;
  if (!sapPassword) return jsonError(400, "A password is required.", "sapPassword");

  let detail: string;
  try {
    ({ detail } = await checkSap({ adtUrl, sapUser, sapPassword, client }));
  } catch (err) {
    // 502: this endpoint worked, the system behind it did not. A 500 would
    // read as "the app is broken" when the answer is "check your host". The
    // stored connection is untouched, which is the whole reason the check
    // comes first.
    if (err instanceof CheckError) return jsonError(502, err.message);
    throw err;
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
    apiKey: stored.apiKey,
    industry: current.industry,
    blocklist: current.blocklist,
    allowTables: current.allowTables,
  };

  try {
    await saveConnection(auth.account.id, draft, detail);
  } catch (err) {
    // Two ordinary causes, both the operator's to fix and neither worth hiding
    // behind a generic 500: Mongo is unreachable, or SETUP_SECRET is missing.
    // Each throws with a message that names itself.
    return jsonError(503, (err as Error).message);
  }

  return Response.json({ ok: true, detail });
}
