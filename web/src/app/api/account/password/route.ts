import { findById, setPasswordHash } from "@/lib/auth/users";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { isPasswordValid, PASSWORD_RULE } from "@/lib/password";
import { revokeSessionsFor, startSession } from "@/lib/auth/session";
import { jsonError, readJson, readSecret, signedIn } from "../shared";

/**
 * `POST /api/account/password` — change this account's password.
 *
 * The current one is required, and knowing it is the whole point: a session
 * cookie says the browser was signed in at some point, which is exactly the
 * thing an unattended laptop also says. Re-typing the password is what turns
 * "this tab is signed in" into "the person at the keyboard is the owner".
 *
 * An account created through Google has no password at all, and this is where
 * it gets its first one. There is nothing to prove in that case beyond the
 * session, because there is no password to know — which is a smaller claim
 * than the flow above, and is why the row keeps its Google link either way:
 * setting a password adds a way in, it does not replace one.
 *
 * Every other session for the account is destroyed on success and this one is
 * re-issued. A password change is the control someone reaches for when they
 * think a session is not theirs, and leaving those sessions alive would make
 * it a control that does not do the one thing it is for.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request): Promise<Response> {
  const auth = await signedIn();
  if ("response" in auth) return auth.response;

  const body = await readJson(request);
  if (!body) return jsonError(400, "Expected a JSON object.");

  const current = readSecret(body, "current");
  const next = readSecret(body, "next");

  // Read back rather than trusting `Account`, which carries no hash — this is
  // the one place that needs to know whether the row has a password at all.
  const doc = await findById(auth.account.id);
  if (!doc) return jsonError(404, "That account no longer exists.");

  if (doc.passwordHash) {
    if (!current) {
      return jsonError(400, "Enter your current password.", "current");
    }
    if (!(await verifyPassword(current, doc.passwordHash))) {
      // Named for the field it belongs to, but deliberately not distinguished
      // from "no password set" — see the 401 below.
      return jsonError(400, "That is not your current password.", "current");
    }
  }

  if (!isPasswordValid(next)) return jsonError(400, PASSWORD_RULE, "next");
  // Only after the rule, so someone whose new password is too short is told
  // that rather than being told it is the same as the old one.
  if (doc.passwordHash && (await verifyPassword(next, doc.passwordHash))) {
    return jsonError(400, "That is already your password.", "next");
  }

  if (!(await setPasswordHash(auth.account.id, await hashPassword(next)))) {
    return jsonError(404, "That account no longer exists.");
  }

  // Order matters: revoke first, then re-issue. The reverse would leave a
  // window in which the new session is the one being deleted.
  await revokeSessionsFor(auth.account.id);
  await startSession(auth.account.id);

  return Response.json({ ok: true });
}
