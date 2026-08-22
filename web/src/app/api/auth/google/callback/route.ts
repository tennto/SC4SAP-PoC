import { cookies } from "next/headers";
import {
  NONCE_COOKIE,
  STATE_COOKIE,
  VERIFIER_COOKIE,
  exchangeCode,
  googleConfig,
  redirectUri,
  safeEqual,
  splitName,
} from "@/lib/auth/google";
import {
  createGoogleUser,
  findByEmail,
  findByGoogleSub,
  linkGoogle,
  toAccount,
} from "@/lib/auth/users";
import { startSession } from "@/lib/auth/session";
import { isReservedEmail } from "@/lib/reserved-accounts";

/**
 * `GET /api/auth/google/callback` — finish Google sign-in.
 *
 * Everything that can go wrong here ends the same way: back at `/signin` with
 * an `error` code the form turns into a sentence. A JSON body would be wrong —
 * this URL is reached by a browser navigation, and what it renders has to be a
 * page.
 *
 * Account resolution, in order:
 *
 *   1. a row already linked to this Google `sub` — sign in
 *   2. a row with this address — link and sign in, which is safe only because
 *      Google says it verified the address, the same proof the password reset
 *      relies on
 *   3. nothing — create the account
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function back(request: Request, error: string): Response {
  return Response.redirect(
    new URL(`/signin?error=${encodeURIComponent(error)}`, request.url),
    302,
  );
}

export async function GET(request: Request): Promise<Response> {
  const config = googleConfig();
  if (!config) return back(request, "google-unconfigured");

  const url = new URL(request.url);
  const jar = await cookies();

  // Spent whatever happens, so a failed attempt cannot be retried with the
  // same three secrets.
  const state = jar.get(STATE_COOKIE)?.value;
  const nonce = jar.get(NONCE_COOKIE)?.value;
  const verifier = jar.get(VERIFIER_COOKIE)?.value;
  for (const name of [STATE_COOKIE, NONCE_COOKIE, VERIFIER_COOKIE]) {
    jar.delete(name);
  }

  // The user pressed Cancel on Google's screen, or Google refused outright.
  const denied = url.searchParams.get("error");
  if (denied) {
    return back(
      request,
      denied === "access_denied" ? "google-cancelled" : "google-failed",
    );
  }

  const code = url.searchParams.get("code");
  const returnedState = url.searchParams.get("state");
  if (!code || !returnedState) return back(request, "google-failed");

  // The login-CSRF check. Without it, somebody can hand this browser their own
  // authorization code and have it sign in as them.
  if (!state || !safeEqual(state, returnedState)) {
    return back(request, "google-state");
  }
  if (!verifier || !nonce) return back(request, "google-state");

  const exchanged = await exchangeCode({
    config,
    code,
    verifier,
    redirectUri: redirectUri(request.url),
  });
  if (!exchanged.ok) {
    // Logged rather than shown: it names the client and the endpoint, which is
    // operator material, and the visitor can do nothing with it.
    console.error(`[google] ${exchanged.error}`);
    return back(request, "google-failed");
  }

  const identity = exchanged.identity;

  // Binds this token to the request that started the flow.
  if (!identity.nonce || !safeEqual(nonce, identity.nonce)) {
    return back(request, "google-state");
  }

  // An unverified address is not proof of anything, and linking on one would
  // hand over an existing account to whoever claimed the address.
  if (!identity.emailVerified) return back(request, "google-unverified");

  try {
    // 1. Already linked. Matched on `sub` first because an address can change
    //    on Google's side and `sub` cannot.
    const linked = await findByGoogleSub(identity.sub);
    if (linked) {
      await startSession(String(linked._id));
      return Response.redirect(new URL("/", request.url), 302);
    }

    // The same rule the sign-up form enforces. Applied here too, or Google
    // would be the way around it.
    if (isReservedEmail(identity.email)) {
      return back(request, "google-reserved");
    }

    // 2. Same address, registered with a password. Link the two.
    const existing = await findByEmail(identity.email);
    if (existing) {
      const updated = await linkGoogle(String(existing._id), identity.sub);
      if (!updated) return back(request, "google-failed");
      await startSession(String(updated._id));
      return Response.redirect(new URL("/", request.url), 302);
    }

    // 3. New account.
    const { lastName, firstName } = splitName(identity);
    const created = await createGoogleUser({
      lastName,
      firstName,
      email: identity.email,
      sub: identity.sub,
    });
    if (!created.ok) {
      // Another request registered this address in between. The row exists
      // now, so the next attempt takes branch 2.
      return back(request, "google-retry");
    }

    await startSession(toAccount(created.user).id);
    return Response.redirect(new URL("/", request.url), 302);
  } catch (err) {
    console.error(`[google] user store: ${(err as Error).message}`);
    return back(request, "google-store");
  }
}
