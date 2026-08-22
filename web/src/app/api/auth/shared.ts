import "server-only";
import { isPasswordValid } from "@/lib/password";

/**
 * The bits every auth endpoint needs, in one place so the four routes cannot
 * drift apart on what a valid body looks like or what an error reads like.
 *
 * Note these routes sit *above* `app/api/[...path]/route.ts`, the proxy that
 * forwards `/api/*` to the Fastify backend. A concrete segment wins over a
 * catch-all in the App Router, so `/api/auth/...` is served here and never
 * reaches the backend — which is the point: the backend has no idea users
 * exist, and this phase does not teach it.
 */

/**
 * Deliberately loose. The address is a login key, not a claim about a
 * reachable mailbox, and the only way to establish the latter is to send mail
 * to it. A stricter regex here would reject valid addresses and still not
 * prove anything.
 */
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Long enough for anything real, short enough that nothing pathological is stored. */
const MAX_FIELD = 200;
const MAX_PASSWORD = 400;

export type BodyError = { field: string; message: string };

export function jsonError(
  status: number,
  message: string,
  field?: string,
): Response {
  return Response.json(field ? { error: message, field } : { error: message }, {
    status,
  });
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

export function readString(
  body: Record<string, unknown>,
  key: string,
  max = MAX_FIELD,
): string | null {
  const value = body[key];
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 && trimmed.length <= max ? trimmed : null;
}

export function validEmail(email: string): boolean {
  return EMAIL.test(email);
}

/**
 * The same rule the two forms enforce, re-run here.
 *
 * Not a duplicated check for its own sake: the browser's copy shapes what
 * someone types and can be skipped entirely by anything that is not the
 * browser, so this is the one that actually decides what gets stored.
 */
export function validPassword(password: string): boolean {
  return password.length <= MAX_PASSWORD && isPasswordValid(password);
}
