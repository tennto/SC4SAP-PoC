import { NextResponse, type NextRequest } from "next/server";

/**
 * The route guard — Next 16's `proxy.ts`, which is what `middleware.ts` was
 * renamed to in this version. Not to be confused with the *other* proxy in
 * this app, `app/api/[...path]/route.ts`, which forwards to the Fastify
 * backend; that one is a Route Handler and unrelated to this file.
 *
 * This runs before every request that the matcher below lets through, and does
 * exactly one cheap thing: look at whether a session cookie is *present*, and
 * redirect if it is not. It does not check that the cookie names a live
 * session, even though Next 16 runs this on the Node runtime and it could.
 *
 * Two reasons not to. A database round trip on every request buys nothing the
 * page is not about to do anyway; and Next documents this file as something
 * that may run outside the app's own runtime and must not lean on shared
 * modules or globals — which is precisely what the pooled Mongo client in
 * `lib/mongo.ts` is.
 *
 * So the authoritative check lives in `requireAccount()`
 * (`lib/auth/session.ts`), which every protected Server Component calls before
 * it renders anything. The split is the design, not a compromise: this keeps
 * anonymous traffic off protected URLs for free, and a stale or forged cookie
 * that gets past it is stopped by the page before it reaches data.
 *
 * The cookie name is repeated here rather than imported from
 * `lib/auth/session.ts`, which is `server-only` and would drag the Mongo
 * client into this bundle. Both spellings must stay in step.
 */
const SESSION_COOKIE = "sc4sap_session";

/** Reachable signed out. Everything not listed needs a session. */
const PUBLIC_ROUTES = ["/signin", "/signup", "/forgot", "/terms", "/privacy"];

/**
 * The two that a signed-in user has no business being on, and is redirected
 * away from.
 *
 * `/forgot` is deliberately not one of them: someone who is signed in and has
 * forgotten their password is a real case, and the reset revokes every session
 * they have — including the one that let them reach the screen — which is the
 * right outcome rather than something to prevent.
 */
const AUTH_ROUTES = ["/signin", "/signup"];

function matches(pathname: string, routes: string[]): boolean {
  return routes.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  );
}

export function proxy(request: NextRequest): NextResponse {
  const { pathname, search } = request.nextUrl;

  // The auth endpoints are how a session is obtained, so guarding them would
  // make signing in impossible. Everything else under /api — including the
  // forwarder to the Fastify backend — is protected like a page is, because
  // that forwarder is a way to drive the agent and must not be open to
  // anonymous callers just for living under a different prefix.
  if (pathname.startsWith("/api/auth/")) return NextResponse.next();

  const signedIn = request.cookies.has(SESSION_COOKIE);

  if (signedIn) {
    // Landing on the sign-in form while already signed in is a dead end,
    // usually reached with the back button. Send them to the dashboard.
    if (matches(pathname, AUTH_ROUTES)) {
      return NextResponse.redirect(new URL("/", request.url));
    }
    return NextResponse.next();
  }

  if (matches(pathname, PUBLIC_ROUTES)) return NextResponse.next();

  // An API call gets a status, not a redirect — a fetch following a 307 to an
  // HTML page surfaces at the call site as a JSON parse error, which says
  // nothing about what actually happened.
  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const target = new URL("/signin", request.url);
  // So the form can send them back to what they asked for. Path and query
  // only, rebuilt from parts, so no absolute URL can be smuggled into the
  // parameter for the sign-in screen to redirect to.
  //
  // Skipped for the dashboard, which is where signing in lands by default:
  // `/signin?next=%2F` and `/signin` do exactly the same thing, and the first
  // is a URL somebody has to read past to see they are being asked to sign in.
  const wanted = `${pathname}${search}`;
  if (wanted !== "/") target.searchParams.set("next", wanted);
  return NextResponse.redirect(target);
}

export const config = {
  /**
   * Everything except Next's own build output, the icons a browser asks for
   * unprompted, and `public/`. `_next/static` and `_next/image` in particular
   * are requested dozens of times per page and have nothing to guard.
   */
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|assets/|.*\.(?:png|jpg|jpeg|gif|svg|webp|ico|woff2?)$).*)",
  ],
};
