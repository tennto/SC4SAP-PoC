import { authenticate, toAccount } from "@/lib/auth/users";
import { startSession } from "@/lib/auth/session";
import { jsonError, readJson, readString } from "../shared";

/**
 * `POST /api/auth/signin`.
 *
 * One failure message for every way this can fail — unknown address, wrong
 * password, malformed address — and no `field` on it, so the form cannot mark
 * one input as the culprit. Telling the caller *which* half was wrong turns
 * this endpoint into a way to enumerate who has an account here. The matching
 * timing defence lives in `authenticate`.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const REJECTED = "Email or password is incorrect.";

export async function POST(request: Request): Promise<Response> {
  const body = await readJson(request);
  if (!body) return jsonError(400, "Expected a JSON object.");

  const email = readString(body, "email");
  const password = typeof body.password === "string" ? body.password : "";

  // Not even a shape check is reported separately, for the same reason.
  if (!email || password.length === 0) return jsonError(401, REJECTED);

  let user;
  try {
    user = await authenticate(email, password);
  } catch (err) {
    return jsonError(503, `Could not reach the user store: ${(err as Error).message}`);
  }

  if (!user) return jsonError(401, REJECTED);

  const account = toAccount(user);
  await startSession(account.id);
  return Response.json({ account });
}
