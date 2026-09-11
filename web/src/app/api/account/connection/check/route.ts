import { checkSap, CheckError } from "@/lib/setup-checks";
import { readConnection, readConnectionSecrets, recordCheck } from "@/lib/setup-store";
import { jsonError, signedIn } from "../../shared";

/**
 * `POST /api/account/connection/check` — is the stored SAP connection alive?
 *
 * The dashboard's Reconnect calls this. It takes no body: the values it probes
 * are the ones this account saved, unsealed here and never sent anywhere a
 * page could read them. That is the difference from `/api/setup/check/sap`,
 * which probes values that have been typed and not yet kept.
 *
 * What it finds is written to the row as well as returned, so the next render
 * of the dashboard shows the same answer this press showed — the SAP row is
 * server-rendered and reads the stored result, not this response.
 *
 * 502 on a system that did not answer, like the setup probe: this endpoint
 * worked, the thing behind it did not.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(): Promise<Response> {
  const auth = await signedIn();
  if ("response" in auth) return auth.response;
  const userId = auth.account.id;

  const [connection, secrets] = await Promise.all([
    readConnection(userId),
    readConnectionSecrets(userId),
  ]);
  if (!connection || !secrets) {
    return jsonError(409, "This account has not completed setup.");
  }

  try {
    const { detail } = await checkSap({
      adtUrl: connection.adtUrl,
      sapUser: connection.sapUser,
      sapPassword: secrets.sapPassword,
      client: connection.client,
    });
    await recordCheck(userId, { ok: true, detail });
    return Response.json({ ok: true, detail });
  } catch (err) {
    if (err instanceof CheckError) {
      await recordCheck(userId, { ok: false, detail: err.message });
      return jsonError(502, err.message);
    }
    throw err;
  }
}
