import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { sessions } from "@/lib/mongo";
import { findById, toAccount } from "@/lib/auth/users";
import type { Account } from "@/lib/account";

/**
 * Sessions: an opaque random token in an httpOnly cookie, resolved against a
 * row in Mongo.
 *
 * A database-backed session rather than a signed JWT, because this app needs
 * sign-out to actually end the session — a stateless token stays valid until it
 * expires no matter what the server thinks, and "log out" that does not log you
 * out is the kind of thing a PoC ships and a product then inherits.
 *
 * What is stored is the SHA-256 of the token, never the token. A leaked
 * database dump therefore hands over no usable cookies. A plain hash is enough
 * where a password would need scrypt: the token is 256 bits of CSPRNG output,
 * so there is no dictionary to run against it.
 */

/** Also spelled out in `proxy.ts`, which cannot import this file — see there. */
export const SESSION_COOKIE = "sc4sap_session";

const SESSION_DAYS = 30;
const SESSION_MS = SESSION_DAYS * 24 * 60 * 60 * 1000;

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/**
 * Mint a session for `userId` and put it in the response's `Set-Cookie`.
 *
 * `sameSite: "lax"` is the CSRF defence for the whole app: a cross-site POST
 * carries no cookie, so the state-changing endpoints cannot be driven from
 * another origin. `secure` is off on plain HTTP in dev, because a `Secure`
 * cookie over `http://localhost` is simply dropped and the session would
 * silently never stick.
 */
export async function startSession(userId: string): Promise<void> {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_MS);

  await (await sessions()).insertOne({
    tokenHash: hashToken(token),
    userId,
    createdAt: new Date(),
    expiresAt,
  });

  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
  });
}

/**
 * End the current session on both sides.
 *
 * The row is deleted as well as the cookie cleared, so a token copied out of
 * the browser before sign-out is dead too — clearing only the cookie would
 * leave it working.
 */
export async function endSession(): Promise<void> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) {
    await (await sessions()).deleteOne({ tokenHash: hashToken(token) });
  }
  jar.delete(SESSION_COOKIE);
}

/**
 * Drop every session belonging to one user, signing them out everywhere.
 *
 * Used by the password reset, which has to assume the old password is in
 * somebody else's hands.
 */
export async function revokeSessionsFor(userId: string): Promise<void> {
  await (await sessions()).deleteMany({ userId });
}

/**
 * Who is signed in, or `null`.
 *
 * Expiry is checked here as well as by Mongo's TTL index: the TTL monitor runs
 * about once a minute, so a row can outlive its deadline by that much and this
 * must not accept it in the meantime.
 *
 * Returns `null` rather than throwing when the database is unreachable — an
 * Atlas hiccup should read as "signed out", which is recoverable, not as a 500
 * on every page in the app.
 */
export async function getAccount(): Promise<Account | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;

  try {
    const session = await (await sessions()).findOne({
      tokenHash: hashToken(token),
    });
    if (!session || session.expiresAt.getTime() <= Date.now()) return null;

    const user = await findById(session.userId);
    return user ? toAccount(user) : null;
  } catch {
    return null;
  }
}

/**
 * The guard for a protected Server Component.
 *
 * `proxy.ts` already turns anonymous traffic away, but it only sees whether a
 * cookie is *present* — deliberately, so that no request costs a database round
 * trip before it reaches the code that was going to make one anyway. This is
 * the check that the cookie names a session that still exists, and it is what a
 * page should call when it is about to render someone's data.
 */
export async function requireAccount(): Promise<Account> {
  const account = await getAccount();
  if (!account) redirect("/signin");
  return account;
}
