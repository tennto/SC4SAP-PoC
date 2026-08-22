import { completeReset } from "@/lib/auth/reset";
import { PASSWORD_RULE } from "@/lib/password";
import {
  jsonError,
  readJson,
  readString,
  validEmail,
  validPassword,
} from "../shared";

/**
 * `POST /api/auth/reset` — spend a code and set a new password.
 *
 * The address is required alongside the code. Six digits on their own would be
 * a code that any account might match, which turns a million-wide space into a
 * much smaller one as soon as there are many accounts; pinning it to one
 * address keeps the odds at five guesses in 10^6.
 *
 * No session comes back. Every session that user had is revoked by
 * `completeReset`, this device included, so the next step is signing in with
 * the password they just chose — which is also the proof they can.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Wrong, expired, already spent, never issued — the caller learns only this. */
const INVALID = "That code is not valid. It may have expired — request a new one.";
const EXHAUSTED =
  "Too many incorrect attempts. That code has been cancelled; request a new one.";

export async function POST(request: Request): Promise<Response> {
  const body = await readJson(request);
  if (!body) return jsonError(400, "Expected a JSON object.");

  const email = readString(body, "email");
  const code = readString(body, "code", 12);
  const password = typeof body.password === "string" ? body.password : "";

  if (!email || !validEmail(email)) {
    return jsonError(400, "Enter a valid email address.", "email");
  }
  if (!code || !/^\d{6}$/.test(code)) {
    return jsonError(400, "The code is six digits.", "code");
  }
  // Checked before the code is spent, so a password the rule would reject does
  // not burn the one code they have.
  if (!validPassword(password)) {
    return jsonError(400, PASSWORD_RULE, "password");
  }

  let outcome;
  try {
    outcome = await completeReset(email, code, password);
  } catch (err) {
    return jsonError(503, `Could not reach the user store: ${(err as Error).message}`);
  }

  if (!outcome.ok) {
    return outcome.reason === "exhausted"
      ? jsonError(429, EXHAUSTED, "code")
      : jsonError(400, INVALID, "code");
  }

  return Response.json({ reset: true });
}
