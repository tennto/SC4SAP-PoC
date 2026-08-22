import "server-only";
import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

/**
 * Google sign-in, as OAuth 2.0 Authorization Code with PKCE.
 *
 * Hand-rolled rather than delegated to Auth.js, and that is the whole reason
 * this file is short: the app already has sessions, a user store, a route
 * guard and a password reset built around them. Auth.js would replace the
 * session layer and every one of those would have to be rebuilt against it.
 * What is actually needed from Google is a verified email address, and the
 * flow that produces one ends by calling the existing `startSession`.
 *
 * Three separate one-shot secrets ride along in cookies, each answering a
 * different attack:
 *
 *   state          the callback is a GET somebody else can point a browser at.
 *                  Without it, an attacker can hand you *their* code and have
 *                  your browser sign in as them — login CSRF.
 *   code_verifier  (PKCE) an authorization code intercepted between Google and
 *                  this server is useless without it.
 *   nonce          binds the returned ID token to this particular request, so
 *                  a token minted for some other session cannot be replayed
 *                  into this one.
 */

const AUTH_ENDPOINT = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";
const ISSUERS = ["https://accounts.google.com", "accounts.google.com"];

/** Cookie names for the three one-shot values. */
export const STATE_COOKIE = "sc4sap_oauth_state";
export const VERIFIER_COOKIE = "sc4sap_oauth_verifier";
export const NONCE_COOKIE = "sc4sap_oauth_nonce";

/** Long enough to sign in unhurried, short enough not to linger. */
export const HANDSHAKE_MAX_AGE = 10 * 60;

export type GoogleConfig = {
  clientId: string;
  clientSecret: string;
};

/**
 * `null` when Google sign-in has not been configured, which is a supported
 * state rather than a failure: the rest of the app works, and the button says
 * so instead of leading somewhere broken.
 */
export function googleConfig(): GoogleConfig | null {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  return clientId && clientSecret ? { clientId, clientSecret } : null;
}

/**
 * Must match a URI registered on the client, character for character. Derived
 * from the request so one client can serve dev and deployment, with an env
 * override for the case where this server sits behind a proxy and does not see
 * the address the browser used.
 */
export function redirectUri(requestUrl: string): string {
  return (
    process.env.GOOGLE_REDIRECT_URI ??
    new URL("/api/auth/google/callback", requestUrl).toString()
  );
}

function base64url(buffer: Buffer): string {
  return buffer.toString("base64url");
}

export function randomToken(): string {
  return base64url(randomBytes(32));
}

/** PKCE S256: the challenge is the hash, the verifier is what is kept back. */
export function codeChallenge(verifier: string): string {
  return base64url(createHash("sha256").update(verifier).digest());
}

/** Constant-time, because it compares a secret the caller supplied. */
export function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  // `timingSafeEqual` throws on a length mismatch, which would leak length by
  // way of the exception. Length alone is not the secret, so it is checked
  // first and reported as a plain mismatch.
  return left.length === right.length && timingSafeEqual(left, right);
}

export function authorizeUrl(input: {
  config: GoogleConfig;
  redirectUri: string;
  state: string;
  nonce: string;
  verifier: string;
}): string {
  const url = new URL(AUTH_ENDPOINT);
  url.searchParams.set("client_id", input.config.clientId);
  url.searchParams.set("redirect_uri", input.redirectUri);
  url.searchParams.set("response_type", "code");
  // Everything this app needs and nothing more: who they are and an address.
  url.searchParams.set("scope", "openid email profile");
  url.searchParams.set("state", input.state);
  url.searchParams.set("nonce", input.nonce);
  url.searchParams.set("code_challenge", codeChallenge(input.verifier));
  url.searchParams.set("code_challenge_method", "S256");
  // Always offer the chooser. Silently reusing whichever account the browser
  // happens to be signed into is how somebody ends up in the wrong account
  // without noticing.
  url.searchParams.set("prompt", "select_account");
  return url.toString();
}

/** The claims this app reads. Google sends more; none of it is wanted here. */
export type GoogleIdentity = {
  /** Google's stable id for the user. */
  sub: string;
  email: string;
  emailVerified: boolean;
  givenName: string | null;
  familyName: string | null;
  name: string | null;
  nonce: string | null;
};

type IdTokenClaims = {
  iss?: string;
  aud?: string;
  exp?: number;
  sub?: string;
  email?: string;
  email_verified?: boolean | string;
  given_name?: string;
  family_name?: string;
  name?: string;
  nonce?: string;
};

/**
 * Read an ID token's payload.
 *
 * The signature is deliberately not checked. This token came back on the
 * response to a request this server made directly to Google over TLS,
 * authenticated with the client secret — there is no intermediary who could
 * have substituted it, which is the case Google's own documentation calls out
 * as not requiring verification. The claims below still are checked, because
 * they say what the token is *for*.
 */
function decodeIdToken(idToken: string): IdTokenClaims | null {
  const parts = idToken.split(".");
  if (parts.length !== 3) return null;
  try {
    return JSON.parse(
      Buffer.from(parts[1], "base64url").toString("utf8"),
    ) as IdTokenClaims;
  } catch {
    return null;
  }
}

export type ExchangeResult =
  | { ok: true; identity: GoogleIdentity }
  | { ok: false; error: string };

export async function exchangeCode(input: {
  config: GoogleConfig;
  code: string;
  verifier: string;
  redirectUri: string;
}): Promise<ExchangeResult> {
  let response: Response;
  try {
    response = await fetch(TOKEN_ENDPOINT, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code: input.code,
        client_id: input.config.clientId,
        client_secret: input.config.clientSecret,
        redirect_uri: input.redirectUri,
        grant_type: "authorization_code",
        code_verifier: input.verifier,
      }),
      signal: AbortSignal.timeout(10_000),
    });
  } catch (err) {
    return { ok: false, error: `could not reach Google: ${(err as Error).message}` };
  }

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    return {
      ok: false,
      error: `Google answered ${response.status}: ${detail.slice(0, 300)}`,
    };
  }

  const body = (await response.json().catch(() => null)) as {
    id_token?: string;
  } | null;
  if (!body?.id_token) return { ok: false, error: "no id_token in the response" };

  const claims = decodeIdToken(body.id_token);
  if (!claims) return { ok: false, error: "id_token was not readable" };

  if (!claims.iss || !ISSUERS.includes(claims.iss)) {
    return { ok: false, error: "id_token came from the wrong issuer" };
  }
  // A token minted for a different client is not proof of anything here.
  if (claims.aud !== input.config.clientId) {
    return { ok: false, error: "id_token was issued for another client" };
  }
  if (typeof claims.exp !== "number" || claims.exp * 1000 <= Date.now()) {
    return { ok: false, error: "id_token has expired" };
  }
  if (!claims.sub || !claims.email) {
    return { ok: false, error: "id_token carried no subject or address" };
  }

  return {
    ok: true,
    identity: {
      sub: claims.sub,
      email: claims.email,
      // Google has sent this as a string in the past; both spellings mean the
      // same thing and neither should be read as truthy-by-presence.
      emailVerified:
        claims.email_verified === true || claims.email_verified === "true",
      givenName: claims.given_name ?? null,
      familyName: claims.family_name ?? null,
      name: claims.name ?? null,
      nonce: claims.nonce ?? null,
    },
  };
}

/**
 * Split a Google profile into the two name fields this app stores.
 *
 * Google does not always send both parts — a single-field name is common
 * outside the Latin world, and some accounts carry only a display name. The
 * fallbacks walk down to the address rather than leaving a field empty, since
 * the rail renders both and a blank there reads as a broken account.
 */
export function splitName(identity: GoogleIdentity): {
  lastName: string;
  firstName: string;
} {
  if (identity.familyName && identity.givenName) {
    return { lastName: identity.familyName, firstName: identity.givenName };
  }

  const whole = (identity.name ?? "").trim();
  if (whole.includes(" ")) {
    const pieces = whole.split(/\s+/);
    // Western order is what Google sends for a Latin-script name: given first.
    return {
      firstName: pieces.slice(0, -1).join(" "),
      lastName: pieces[pieces.length - 1],
    };
  }

  const single = identity.givenName ?? identity.familyName ?? whole;
  if (single.length > 0) {
    // One name is a name. It goes in the given-name field and the family field
    // is left empty — `toAccount` joins the two and trims, so the rail shows
    // "Mononym" rather than "Mononym Mononym".
    return { lastName: "", firstName: single };
  }

  const local = identity.email.split("@")[0];
  return { lastName: local, firstName: local };
}
