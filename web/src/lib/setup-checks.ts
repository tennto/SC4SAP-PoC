import "server-only";
import { BACKEND } from "@/lib/backend";

/**
 * The three probes `/setup` runs before it saves anything.
 *
 * They run on the Next server, not in the browser, and that is not incidental:
 * an ABAP stack on a private network is reachable from here and not from a
 * laptop on the internet, and the Anthropic key must never be sent anywhere
 * that a page's own JavaScript could read it back.
 *
 * Each returns a sentence on success and throws one on failure. Sentences,
 * because every one of them is shown to the person who typed the values in —
 * "the system refused that user and password" tells them what to change;
 * `HTTP 401` does not.
 *
 * None of them names the step it belongs to. The wizard puts the message on
 * the card it is about (see `FAILED_STEP` in `SetupWizard`), so a message that
 * also said "on step 2" would be telling a reader already looking at step 2 to
 * go there.
 *
 * None of them ever puts a credential in a message. A failure that echoed the
 * password back is a failure that writes it into a log.
 */

/** Long enough for a cold ICM, short enough that a hang is still a failure. */
const SAP_TIMEOUT_MS = 12_000;
const BACKEND_TIMEOUT_MS = 6_000;
const ANTHROPIC_TIMEOUT_MS = 8_000;

/** The Anthropic REST version this app pins. */
const ANTHROPIC_VERSION = "2023-06-01";

export type CheckResult = { detail: string };

export class CheckError extends Error {}

/**
 * Can we reach that ABAP stack, and does it accept that logon?
 *
 * `/sap/bc/adt/discovery` is the ADT service document — the same thing an ADT
 * client fetches first, so a system that answers it is a system this app can
 * work against. It is a plain read that runs no ABAP and locks nothing, which
 * is why it is the probe rather than, say, reading a table.
 *
 * The client number goes in the query string rather than in a cookie because
 * this is a single stateless request; `sap-client` is what the ICM reads to
 * pick the client before any session exists.
 */
export async function checkSap(input: {
  adtUrl: string;
  sapUser: string;
  sapPassword: string;
  client: string;
}): Promise<CheckResult> {
  const base = input.adtUrl.trim().replace(/\/+$/, "");
  const url = `${base}/sap/bc/adt/discovery?sap-client=${encodeURIComponent(input.client)}`;

  // `utf8`, so a password with a non-ASCII character is encoded the way the
  // ICM decodes it rather than being mangled into a wrong-password answer.
  const credentials = Buffer.from(
    `${input.sapUser}:${input.sapPassword}`,
    "utf8",
  ).toString("base64");

  let response: Response;
  try {
    response = await fetch(url, {
      headers: {
        authorization: `Basic ${credentials}`,
        accept: "application/atomsvc+xml, application/xml",
      },
      signal: AbortSignal.timeout(SAP_TIMEOUT_MS),
      cache: "no-store",
    });
  } catch (err) {
    const error = err as Error;
    if (error.name === "TimeoutError") {
      throw new CheckError(
        `The SAP system did not answer within ${SAP_TIMEOUT_MS / 1000} seconds. Check the host and port, and that this machine can reach it.`,
      );
    }
    // Everything else is DNS, a refused connection, or TLS. Undici reports all
    // of them as the bare string "fetch failed" and hangs the real reason —
    // ECONNREFUSED, ENOTFOUND, a certificate error — off `cause`, so unwrap it
    // rather than handing the operator a message with nothing in it.
    const cause = (error as { cause?: Error }).cause;
    throw new CheckError(
      `Could not reach the SAP system: ${cause?.message ?? error.message}`,
    );
  }

  if (response.ok) {
    return { detail: `ADT answered at ${base}` };
  }

  // Ordered by what each one tells the person who typed the values in.
  if (response.status === 401) {
    throw new CheckError(
      "The SAP system refused that user and password.",
    );
  }
  if (response.status === 403) {
    throw new CheckError(
      "That user reached the system but is not authorised for ADT. It needs S_ADT_RES and S_DEVELOP.",
    );
  }
  if (response.status === 404) {
    throw new CheckError(
      "That host answered, but the ADT services are not published on it. In SICF, activate /sap/bc/adt.",
    );
  }
  throw new CheckError(
    `The SAP system answered ${response.status} ${response.statusText}.`,
  );
}

/**
 * Is the agent backend up, with the sc4sap plugin configured?
 *
 * Narrower than its label suggests, and worth being plain about: this asks the
 * Fastify server whether it is alive and which plugin path it was started
 * against. It does not open an MCP session — that costs an SDK subprocess and
 * a model handshake, which is not something to spend on a setup screen — so
 * what it establishes is that there is a process able to load the MCP servers,
 * not that they have loaded.
 *
 * It is also the one check that is not per-account: the backend runs one
 * plugin against one workspace for the whole app today. Per-user backend
 * configuration is the piece that has not been built yet.
 */
export async function checkMcp(): Promise<CheckResult> {
  let response: Response;
  try {
    response = await fetch(`${BACKEND}/health`, {
      signal: AbortSignal.timeout(BACKEND_TIMEOUT_MS),
      cache: "no-store",
    });
  } catch (err) {
    throw new CheckError(
      `The agent backend is not answering (${(err as Error).message}). Start it with \`npm run server\`.`,
    );
  }

  if (!response.ok) {
    throw new CheckError(`The agent backend answered ${response.status}.`);
  }

  const health = (await response.json().catch(() => null)) as {
    ok?: boolean;
    plugin?: string;
    model?: string;
  } | null;

  if (!health?.ok) {
    throw new CheckError("The agent backend reported itself unhealthy.");
  }
  if (!health.plugin) {
    throw new CheckError(
      "The agent backend is up but has no plugin configured. Set SC4SAP_PLUGIN_PATH and restart it.",
    );
  }

  return { detail: `Backend up · ${health.model ?? "model unset"}` };
}

/**
 * Is this Anthropic key real?
 *
 * `GET /v1/models` is authenticated exactly as a turn is — a bad key fails it
 * with the same 401 — but it runs no inference, so nothing is generated and
 * nothing is billed. The backend probes its own key the same way; see
 * `src/server/claude-api.ts`, which this deliberately mirrors rather than
 * imports, because that one reads `process.env` and this one is checking a key
 * that belongs to one account.
 *
 * Plain `fetch` rather than the Anthropic SDK: the SDK is a dependency of the
 * server package and not of `web/`, and one authenticated GET does not justify
 * adding it here.
 */
export async function checkClaude(apiKey: string): Promise<CheckResult> {
  let response: Response;
  try {
    response = await fetch("https://api.anthropic.com/v1/models?limit=1", {
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": ANTHROPIC_VERSION,
      },
      signal: AbortSignal.timeout(ANTHROPIC_TIMEOUT_MS),
      cache: "no-store",
    });
  } catch (err) {
    const error = err as Error;
    if (error.name === "TimeoutError") {
      throw new CheckError("api.anthropic.com did not answer in time.");
    }
    throw new CheckError(`Could not reach api.anthropic.com: ${error.message}`);
  }

  if (response.ok) return { detail: "Key accepted" };

  if (response.status === 401) {
    throw new CheckError(
      "Anthropic rejected that key. Check it was copied whole from the Console, and that it has not been revoked.",
    );
  }
  if (response.status === 403) {
    throw new CheckError(
      "That key was recognised but has no access to the API. Check the workspace it belongs to.",
    );
  }
  // Counted against a limit, which means it was authenticated first.
  if (response.status === 429) return { detail: "Key accepted · rate limited" };

  throw new CheckError(`api.anthropic.com answered ${response.status}.`);
}
