import { checkClaude, CheckError } from "@/lib/setup-checks";
import { isApiKeyValid } from "@/lib/setup";
import { jsonError, readJson, readSecret, signedIn } from "../../shared";

/**
 * `POST /api/setup/check/claude` — does Anthropic accept that key?
 *
 * The key is checked on the server and never leaves it for anywhere but
 * api.anthropic.com. Nothing derived from it comes back in the response — not
 * a prefix, not a tail, not a length. A masked secret is still a secret leaking
 * its shape, and this answer is read by a browser.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request): Promise<Response> {
  const auth = await signedIn();
  if ("response" in auth) return auth.response;

  const body = await readJson(request);
  if (!body) return jsonError(400, "Expected a JSON object.");

  const apiKey = readSecret(body, "apiKey");
  if (!apiKey || !isApiKeyValid(apiKey)) {
    return jsonError(400, "That does not look like a Console key.");
  }

  try {
    const { detail } = await checkClaude(apiKey.trim());
    return Response.json({ ok: true, detail });
  } catch (err) {
    if (err instanceof CheckError) return jsonError(502, err.message);
    throw err;
  }
}
