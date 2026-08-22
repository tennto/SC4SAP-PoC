import { cookies } from "next/headers";
import {
  HANDSHAKE_MAX_AGE,
  NONCE_COOKIE,
  STATE_COOKIE,
  VERIFIER_COOKIE,
  authorizeUrl,
  googleConfig,
  randomToken,
  redirectUri,
} from "@/lib/auth/google";

/**
 * `GET /api/auth/google` — begin Google sign-in.
 *
 * A GET because it is reached by a link the browser follows, and it changes
 * nothing on this side beyond setting three one-shot cookies. The thing that
 * actually creates a session is the callback, and that one cannot be driven
 * from another origin without the `state` this plants here.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request): Promise<Response> {
  const config = googleConfig();
  // Not configured is a supported state, not a crash: the app works without
  // Google, and the sign-in screen explains rather than showing a dead button.
  if (!config) {
    return Response.redirect(
      new URL("/signin?error=google-unconfigured", request.url),
      302,
    );
  }

  const state = randomToken();
  const nonce = randomToken();
  const verifier = randomToken();

  const jar = await cookies();
  const options = {
    httpOnly: true,
    // Must be `lax`, not `strict`: the callback arrives as a top-level GET
    // navigation from accounts.google.com, and `strict` would withhold these
    // three cookies from exactly the request that needs them.
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: HANDSHAKE_MAX_AGE,
  };
  jar.set(STATE_COOKIE, state, options);
  jar.set(NONCE_COOKIE, nonce, options);
  jar.set(VERIFIER_COOKIE, verifier, options);

  return Response.redirect(
    authorizeUrl({
      config,
      redirectUri: redirectUri(request.url),
      state,
      nonce,
      verifier,
    }),
    302,
  );
}
