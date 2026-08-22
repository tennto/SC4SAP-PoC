import { getAccount } from "@/lib/auth/session";

/**
 * `GET /api/auth/me` — the session, as the browser can see it.
 *
 * The Server Components read the session directly through `getAccount`, so
 * nothing in the app needs this to render. It exists for the client-side
 * checks that do not have that option, and as the endpoint to curl when
 * working out whether a cookie is live.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(): Promise<Response> {
  const account = await getAccount();
  if (!account) {
    return Response.json({ error: "Not signed in." }, { status: 401 });
  }
  return Response.json({ account });
}
