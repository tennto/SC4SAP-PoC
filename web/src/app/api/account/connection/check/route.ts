import { recordCheck } from "@/lib/setup-store";
import { BACKEND } from "@/lib/backend";
import { jsonError, signedIn } from "../../shared";

/**
 * `POST /api/account/connection/check` — is the SAP system alive?
 *
 * The dashboard's Reconnect calls this. It probes the system every session
 * actually runs on: the backend's active profile, asked through
 * `POST /profiles/check`, which resolves the `keychain:` password with the
 * same module the running sessions use.
 *
 * It used to probe this account's own stored connection instead. That was the
 * right shape when the backend had one system and the account's copy of it was
 * the only description anyone had. It stopped being true the moment Settings
 * could switch systems: the stored row kept describing whichever stack setup
 * was run against, and a green SAP row about a system nothing is running on is
 * worse than no row, because it is believed.
 *
 * The result is still written to this account's row. It is the dashboard's own
 * memory of the last check — the row is server-rendered and reads the stored
 * result rather than this response — and what was checked is now a property of
 * the server rather than of the account.
 *
 * 502 on a system that did not answer: this endpoint worked, the thing behind
 * it did not.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(): Promise<Response> {
  const auth = await signedIn();
  if ("response" in auth) return auth.response;
  const userId = auth.account.id;

  let response: Response;
  try {
    response = await fetch(`${BACKEND}/profiles/check`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{}",
      cache: "no-store",
    });
  } catch (err) {
    // The backend itself is unreachable, which is a different outage from the
    // SAP system being unreachable and is not recorded as one: writing it to
    // the row would leave the dashboard claiming SAP is down when it may be
    // perfectly healthy.
    return jsonError(503, `The backend did not answer: ${(err as Error).message}`);
  }

  const body = (await response.json().catch(() => null)) as
    | { ok?: boolean; detail?: string; error?: string }
    | null;

  if (!response.ok) {
    const detail = body?.error ?? `The system answered ${response.status}.`;
    await recordCheck(userId, { ok: false, detail });
    return jsonError(502, detail);
  }

  const detail = body?.detail ?? "The system answered.";
  await recordCheck(userId, { ok: true, detail });
  return Response.json({ ok: true, detail });
}
