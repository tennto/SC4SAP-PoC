import { endSession } from "@/lib/auth/session";

/**
 * `POST /api/auth/signout`.
 *
 * POST rather than GET, so a link — or an image tag on another site — cannot
 * sign someone out by being loaded. Combined with the session cookie's
 * `SameSite=Lax`, a cross-site form post carries no cookie either, so there is
 * nothing here for a third party to trigger.
 *
 * Answers 204 whether or not there was a session to end: "you are signed out"
 * is true either way, and reporting the difference would tell an anonymous
 * caller whether the cookie it sent was live.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(): Promise<Response> {
  try {
    await endSession();
  } catch {
    // The row could not be deleted — the cookie clear inside `endSession`
    // may not have run either, but the client is navigating away regardless
    // and a 500 here would only strand it on the screen it is leaving.
  }
  return new Response(null, { status: 204 });
}
