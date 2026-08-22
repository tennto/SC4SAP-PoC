import { requestReset } from "@/lib/auth/reset";
import { jsonError, readJson, readString, validEmail } from "../shared";

/**
 * `POST /api/auth/forgot` — ask for a reset code.
 *
 * Answers 200 for any well-formed address, registered or not. Anything else
 * would turn this into a way to find out who has an account here, and it is
 * the one endpoint where that would be trivially scriptable.
 *
 * The same 200 covers a request refused by the one-a-minute cooldown and a
 * message that Resend rejected. The caller has nothing to do differently in
 * any of those cases: the screen tells them to check their mail either way,
 * and to ask again if nothing arrives.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request): Promise<Response> {
  const body = await readJson(request);
  if (!body) return jsonError(400, "Expected a JSON object.");

  const email = readString(body, "email");
  // The shape is worth reporting — it is about what they typed, not about
  // whether it matched anything.
  if (!email || !validEmail(email)) {
    return jsonError(400, "Enter a valid email address.", "email");
  }

  try {
    await requestReset(email);
  } catch (err) {
    // The database being down is the operator's problem and is worth naming;
    // it is also not something an attacker learns anything from.
    return jsonError(503, `Could not reach the user store: ${(err as Error).message}`);
  }

  return Response.json({ sent: true });
}
