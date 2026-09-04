import "server-only";
import { getAccount } from "@/lib/auth/session";
import type { Account } from "@/lib/account";

/**
 * What the four `/api/setup` endpoints share.
 *
 * These sit above `app/api/[...path]/route.ts`, the catch-all that forwards to
 * the Fastify backend — a concrete segment wins over a catch-all in the App
 * Router, so nothing here ever reaches it. That is the point: the backend has
 * no idea users exist, and these endpoints are entirely about one.
 *
 * Unlike `/api/auth/*`, this prefix is *not* exempted in `proxy.ts`, so a
 * request with no session cookie is turned away before it arrives. `signedIn`
 * below is the second check — that the cookie still names a live session —
 * for the same reason every protected page calls `requireAccount`.
 */

export function jsonError(status: number, message: string): Response {
  return Response.json({ error: message }, { status });
}

/** The account, or the response to return instead. */
export async function signedIn(): Promise<
  { account: Account } | { response: Response }
> {
  const account = await getAccount();
  if (!account) {
    // A status, not a redirect. These are all `fetch` calls, and a fetch that
    // follows a 307 to an HTML page surfaces at the call site as a JSON parse
    // error, which says nothing about what actually happened.
    return { response: jsonError(401, "Not signed in.") };
  }
  return { account };
}

/** `null` when the request had no parseable JSON object in it. */
export async function readJson(
  request: Request,
): Promise<Record<string, unknown> | null> {
  try {
    const body: unknown = await request.json();
    return body && typeof body === "object" && !Array.isArray(body)
      ? (body as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}

/**
 * A secret, read without trimming and without a length floor.
 *
 * Not `readString` from the auth helpers: that one trims, and a password may
 * legitimately begin or end with a space. The ceiling is here only to stop
 * something pathological reaching the cipher.
 */
export function readSecret(
  body: Record<string, unknown>,
  key: string,
): string | null {
  const value = body[key];
  if (typeof value !== "string" || value.length === 0) return null;
  return value.length <= 4096 ? value : null;
}
