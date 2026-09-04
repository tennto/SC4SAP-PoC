import "server-only";
import { getAccount } from "@/lib/auth/session";
import type { Account } from "@/lib/account";

/**
 * The Route Handler counterpart to `requireAccount`.
 *
 * Pages redirect; endpoints answer with a status. A `fetch` that follows a 307
 * to an HTML page surfaces at the call site as a JSON parse error, which says
 * nothing about what actually happened — so the two guards cannot be the same
 * function even though they ask the same two questions.
 *
 * Why they are asked here at all, given `proxy.ts` runs first: that middleware
 * only sees whether a session cookie is *present*. It does not know whether the
 * cookie still names a live session, and it cannot know whether the account has
 * finished setup — reading either would mean a database round trip on every
 * request, from a file Next documents as possibly running outside this app's
 * runtime. So the cheap check is there and the real one is here.
 */

export function apiError(status: number, message: string): Response {
  return Response.json({ error: message }, { status });
}

/** Signed in. The account, or the response to return instead. */
export async function apiSignedIn(): Promise<
  { account: Account } | { response: Response }
> {
  const account = await getAccount();
  if (!account) return { response: apiError(401, "Not signed in.") };
  return { account };
}

/**
 * Signed in *and* set up.
 *
 * The gate that matters for anything touching the agent. Without it, an
 * account that never finished `/setup` can still drive the backend by calling
 * `/api/sessions` directly — every page redirects it to the wizard, but a URL
 * bar and a `fetch` are not pages, and the session it opens spends the
 * operator's key.
 *
 * 403 and not 401: the caller is authenticated, and re-authenticating would
 * not help. `setup: true` is in the body so a client can tell this apart from
 * an ordinary refusal and send the reader somewhere useful.
 */
export async function apiConnected(): Promise<
  { account: Account } | { response: Response }
> {
  const auth = await apiSignedIn();
  if ("response" in auth) return auth;

  if (!auth.account.hasConnection) {
    return {
      response: Response.json(
        {
          error: "This account has no connection yet. Finish setup first.",
          setup: true,
        },
        { status: 403 },
      ),
    };
  }
  return auth;
}
