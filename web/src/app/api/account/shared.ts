import "server-only";
import { getAccount } from "@/lib/auth/session";
import type { Account } from "@/lib/account";

/**
 * What the three `/api/account` endpoints share.
 *
 * The same shape as `api/setup/shared.ts`, and deliberately a separate copy
 * rather than an import across the two: these endpoints change an existing
 * account where those establish one, and the day one of them needs a different
 * guard — a re-authentication window on a password change, say — a shared
 * helper would have to grow a flag to say which caller it was serving.
 *
 * Like `/api/setup/*` and unlike `/api/auth/*`, this prefix is not exempted in
 * `proxy.ts`, so a request with no session cookie never arrives. `signedIn`
 * below is the second check: that the cookie still names a live session.
 */

export function jsonError(
  status: number,
  message: string,
  field?: string,
): Response {
  return Response.json({ error: message, ...(field ? { field } : {}) }, { status });
}

/** The account, or the response to return instead. */
export async function signedIn(): Promise<
  { account: Account } | { response: Response }
> {
  const account = await getAccount();
  // A status, not a redirect: these are all `fetch` calls, and a fetch that
  // follows a 307 to an HTML page surfaces at the call site as a JSON parse
  // error, which says nothing about what actually happened.
  if (!account) return { response: jsonError(401, "Not signed in.") };
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

/** A trimmed string field, or `""` when it is absent or the wrong type. */
export function readString(body: Record<string, unknown>, key: string): string {
  const value = body[key];
  return typeof value === "string" ? value.trim() : "";
}

/**
 * A secret, read without trimming and without a length floor — a password may
 * legitimately begin or end with a space. The ceiling is here only to stop
 * something pathological reaching the hash function.
 */
export function readSecret(body: Record<string, unknown>, key: string): string {
  const value = body[key];
  return typeof value === "string" && value.length <= 4096 ? value : "";
}
