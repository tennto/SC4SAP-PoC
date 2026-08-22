import { createUser, toAccount } from "@/lib/auth/users";
import { startSession } from "@/lib/auth/session";
import {
  jsonError,
  readJson,
  readString,
  validEmail,
  validPassword,
} from "../shared";
import { PASSWORD_RULE } from "@/lib/password";
import {
  RESERVED_EMAIL_MESSAGE,
  RESERVED_NAME_MESSAGE,
  isReservedEmail,
  isReservedName,
} from "@/lib/reserved-accounts";

/**
 * `POST /api/auth/signup` — create an account and sign it in.
 *
 * Signing the new user in immediately rather than bouncing them to the sign-in
 * form: they have just proved they know the password by typing it twice, and
 * making them type it a third time buys nothing.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request): Promise<Response> {
  const body = await readJson(request);
  if (!body) return jsonError(400, "Expected a JSON object.");

  const lastName = readString(body, "lastName");
  const firstName = readString(body, "firstName");
  const email = readString(body, "email");
  const password = typeof body.password === "string" ? body.password : "";

  if (!lastName) return jsonError(400, "Last name is required.", "lastName");
  if (!firstName) return jsonError(400, "First name is required.", "firstName");
  if (!email || !validEmail(email)) {
    return jsonError(400, "Enter a valid email address.", "email");
  }
  // Checked here and not only on the form: the form's copy of the rule saves a
  // round trip, this one is what actually decides.
  if (isReservedEmail(email)) {
    return jsonError(400, RESERVED_EMAIL_MESSAGE, "email");
  }
  if (isReservedName(lastName, firstName)) {
    // Blamed on the last name because the pair is checked together and one of
    // the two fields has to carry the mark; the message names the rule rather
    // than the field, so it reads correctly either way.
    return jsonError(400, RESERVED_NAME_MESSAGE, "lastName");
  }
  if (!validPassword(password)) {
    return jsonError(400, PASSWORD_RULE, "password");
  }

  let result;
  try {
    result = await createUser({ lastName, firstName, email, password });
  } catch (err) {
    // The database being unreachable is the ordinary failure here, and it is
    // the operator's problem to fix, so it is named rather than hidden behind
    // a generic 500 that would send them reading server logs.
    return jsonError(503, `Could not reach the user store: ${(err as Error).message}`);
  }

  if (!result.ok) {
    // Sign-up is the one place the existence of an account cannot be hidden —
    // the address either can be registered or cannot. So it is said plainly,
    // with the way forward, instead of failing vaguely.
    return jsonError(409, "That email is already registered. Sign in instead.", "email");
  }

  const account = toAccount(result.user);
  await startSession(account.id);
  return Response.json({ account }, { status: 201 });
}
