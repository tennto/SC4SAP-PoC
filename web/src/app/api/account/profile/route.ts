import { updateName } from "@/lib/auth/users";
import { isReservedName, RESERVED_NAME_MESSAGE } from "@/lib/reserved-accounts";
import { jsonError, readJson, readString, signedIn } from "../shared";

/**
 * `PATCH /api/account/profile` — rename this account.
 *
 * The two name parts and nothing else. Email is not editable here and is not
 * an oversight: it is the unique key every session, reset and Google link
 * hangs off, so changing it is a flow of its own — verify the new address
 * before it becomes the one that can receive a reset — rather than a field on
 * a settings form.
 *
 * The same rules sign-up runs, re-run here. The form's copy of them saves a
 * round trip; this one is what actually decides.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PATCH(request: Request): Promise<Response> {
  const auth = await signedIn();
  if ("response" in auth) return auth.response;

  const body = await readJson(request);
  if (!body) return jsonError(400, "Expected a JSON object.");

  const lastName = readString(body, "lastName");
  const firstName = readString(body, "firstName");

  if (!lastName) return jsonError(400, "Last name is required.", "lastName");
  if (!firstName) return jsonError(400, "First name is required.", "firstName");
  // Blamed on the last name because the pair is checked together and one of the
  // two fields has to carry the mark; the message names the rule rather than
  // the field, so it reads correctly either way.
  if (isReservedName(lastName, firstName)) {
    return jsonError(400, RESERVED_NAME_MESSAGE, "lastName");
  }

  // The session resolved to this row a moment ago, so a miss means it was
  // deleted underneath us — worth saying so rather than reporting a save that
  // did not happen.
  if (!(await updateName(auth.account.id, { lastName, firstName }))) {
    return jsonError(404, "That account no longer exists.");
  }

  return Response.json({ ok: true, name: `${lastName} ${firstName}`.trim() });
}
