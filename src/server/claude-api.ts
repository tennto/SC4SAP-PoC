/**
 * Is the Anthropic API key this process is holding actually good?
 *
 * The dashboard used to answer that with a hardcoded green light, which meant
 * an expired or mistyped key read as healthy right up until the first turn
 * failed. This asks.
 *
 * `GET /v1/models` is what it asks with. It is authenticated exactly like a
 * turn is — a bad key fails it with the same 401 — but it runs no inference,
 * so nothing is generated and nothing is billed. That is the whole reason to
 * probe with it rather than with a one-token message.
 *
 * Nothing derived from the key is ever returned. The reported detail is the
 * outcome and the configured model, and the key does not appear in either;
 * a masked secret is still a secret leaking its shape, and this travels to a
 * browser.
 */
import Anthropic from "@anthropic-ai/sdk";

/** How long an answer stands before the next caller pays for a fresh one. */
const TTL_MS = 30_000;

/**
 * A health check that hangs is worse than one that fails: the dashboard is
 * waiting on this. Short, and with the SDK's retries off — retrying turns one
 * slow probe into three.
 */
const TIMEOUT_MS = 4_000;

export type ClaudeApiHealth = {
  /** `unknown` is "the question could not be answered", not "bad". */
  state: "up" | "down" | "unknown";
  /** One line for the dashboard row. Never anything derived from the key. */
  detail: string;
  /** When the answer being reported was obtained, not when it was asked for. */
  checkedAt: string;
};

let cached: { at: number; health: ClaudeApiHealth } | null = null;
/** The probe already running, so a burst of renders makes one request. */
let inFlight: Promise<ClaudeApiHealth> | null = null;

/**
 * The last answer if it is still fresh, otherwise a new one.
 *
 * `/health` is hit on every render of the dashboard, and a page that reloads
 * three times in a second should not be three round trips to Anthropic — so
 * an answer stands for `TTL_MS`, and concurrent callers share one probe
 * rather than each starting their own.
 *
 * `fresh` is for the caller who asked for this on purpose. Someone pressing a
 * button labelled Reconnect is owed an actual check, not the answer from
 * twenty seconds ago — the cache exists to spare incidental renders, and that
 * press is not one. An in-flight probe is still shared: it started just now,
 * so it is already the fresh answer being asked for.
 */
export function claudeApiHealth(
  model: string,
  fresh = false,
): Promise<ClaudeApiHealth> {
  if (!fresh && cached && Date.now() - cached.at < TTL_MS) {
    return Promise.resolve(cached.health);
  }
  if (inFlight) return inFlight;

  inFlight = probe(model)
    .then((health) => {
      cached = { at: Date.now(), health };
      return health;
    })
    .finally(() => {
      inFlight = null;
    });

  return inFlight;
}

async function probe(model: string): Promise<ClaudeApiHealth> {
  const checkedAt = new Date().toISOString();
  const at = (state: ClaudeApiHealth["state"], detail: string) => ({
    state,
    detail,
    checkedAt,
  });

  // Not a failure — there is nothing to test. The SDK would fall back to an
  // `ant` login profile here, but the Agent SDK this server runs on takes the
  // key and only the key, so a profile would answer for a credential the rest
  // of the process cannot use.
  if (!process.env.ANTHROPIC_API_KEY) {
    return at("unknown", "no ANTHROPIC_API_KEY set");
  }

  const client = new Anthropic({ timeout: TIMEOUT_MS, maxRetries: 0 });

  try {
    // One row. The list is not read — reaching it at all is the answer.
    await client.models.list({ limit: 1 });
    return at("up", `key accepted · ${model}`);
  } catch (error) {
    // Most specific first. The distinction that matters is between a key that
    // was refused — which is the dashboard's business — and a check that could
    // not be completed, which is not the same thing and must not be drawn as
    // if it were.
    if (error instanceof Anthropic.AuthenticationError) {
      return at("down", "key rejected (401)");
    }
    if (error instanceof Anthropic.PermissionDeniedError) {
      return at("down", "key has no access to this API (403)");
    }
    // Authenticated, or it would never have been counted against a limit.
    if (error instanceof Anthropic.RateLimitError) {
      return at("up", `key accepted · rate limited · ${model}`);
    }
    if (error instanceof Anthropic.APIConnectionError) {
      return at("unknown", "could not reach api.anthropic.com");
    }
    if (error instanceof Anthropic.APIError) {
      return at("unknown", `api.anthropic.com answered ${error.status}`);
    }
    return at("unknown", (error as Error).message);
  }
}
