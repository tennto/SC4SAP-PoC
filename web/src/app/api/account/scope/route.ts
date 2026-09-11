import { saveScope } from "@/lib/setup-store";
import { isBlocklistValid, isIndustryValid, parseAllowTables } from "@/lib/setup";
import { jsonError, readJson, readString, signedIn } from "../shared";

/**
 * `POST /api/account/scope` — change the plugin-side scope of this account.
 *
 * Industry, blocklist profile and the tables allowed through it. Nothing here
 * touches the SAP system, so unlike the connection endpoint there is no probe
 * and no confirmation: these are choices about how the plugin behaves, not
 * claims about a host that has to be checked before they are believed.
 *
 * What is saved is not yet applied. The backend runs one plugin profile for
 * every session until per-account sessions land, and the settings screen
 * says so beside these rows. The endpoint stores the values now so the row
 * is complete on that day rather than every account being asked again.
 *
 * `allowTables` arrives as the comma-separated text the field holds, and is
 * parsed here with the same function the field validates with — so what is
 * refused on the server is exactly what the browser already marked.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request): Promise<Response> {
  const auth = await signedIn();
  if ("response" in auth) return auth.response;

  const body = await readJson(request);
  if (!body) return jsonError(400, "Expected a JSON object.");

  const industry = readString(body, "industry");
  const blocklist = readString(body, "blocklist");
  const allowTables = parseAllowTables(readString(body, "allowTables"));

  if (!isIndustryValid(industry)) {
    return jsonError(400, "Pick an industry.", "industry");
  }
  if (!isBlocklistValid(blocklist)) {
    return jsonError(400, "Pick a blocklist profile.", "blocklist");
  }
  if (allowTables === null) {
    return jsonError(
      400,
      "Allowed tables must be upper-case names or globs, comma-separated.",
      "allowTables",
    );
  }

  let saved: boolean;
  try {
    saved = await saveScope(auth.account.id, { industry, blocklist, allowTables });
  } catch (err) {
    // Mongo unreachable. It throws with a message that names itself.
    return jsonError(503, (err as Error).message);
  }
  if (!saved) {
    return jsonError(409, "This account has no connection yet. Run setup first.");
  }

  return Response.json({ ok: true, allowTables });
}
