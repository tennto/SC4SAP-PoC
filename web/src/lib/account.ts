/**
 * The home dashboard's data shapes.
 *
 * `Account` is now real: it is derived from the signed-in user's row by
 * `lib/auth/users.ts` and reaches the screens through `lib/auth/session.ts`.
 * There is no `ACCOUNT` constant any more — a page that needs one asks the
 * session for it.
 *
 * The other two are still fixtures, and still deliberately the shape of their
 * real sources so that swapping each one is a matter of changing where the
 * object comes from rather than rewriting the screen:
 *
 *   sapSystem   -> `~/.sc4sap/profiles/<alias>/config.json`
 *                  plus `sap.env`                            (Phase 5-2/5-3)
 *   credits     -> the Anthropic Console usage/credit endpoint, keyed by the
 *                  user's own API key                        (Phase 5-4)
 *
 * The backend connection on this page is not fixture data either: it comes
 * from the real `/health` call in `app/page.tsx`.
 */

/**
 * How much a session asks before it acts. Mirrors the backend's
 * `ApprovalLevel`; the proxy sends it with every request as
 * `x-sc4sap-approval`, and the backend reads it when it opens a session.
 */
export type ApprovalLevel = "all" | "writes" | "never";

export const APPROVAL_LEVELS: { value: ApprovalLevel; label: string; hint: string }[] = [
  {
    value: "writes",
    label: "Ask for writes only",
    hint: "SAP reads, the agent's own reads and read-only shell commands go through. Anything that changes a file, pulls table rows, or leaves the machine asks.",
  },
  {
    value: "all",
    label: "Ask for everything",
    hint: "Every gated call is put to you. Slowest, and the only level where nothing runs unseen.",
  },
  {
    value: "never",
    label: "Never ask",
    hint: "Nothing asks. For a proof of concept on your own machine — SAP write tools are still out of the agent's reach altogether.",
  },
];

export type Account = {
  /** The user row's `_id`, stringified. */
  id: string;
  /** See `ApprovalLevel`. */
  approval: ApprovalLevel;
  /** Family name first, the order sign-up asks for the two parts in. */
  name: string;
  /**
   * The given name on its own, for greetings.
   *
   * Carried rather than split off `name` where it is needed: that string puts
   * the family name first, so every greeting that reached for "the first word"
   * was addressing people by their surname.
   */
  firstName: string;
  email: string;
  /** Not collected at sign-up. `null` until the settings screen can set it. */
  role: string | null;
  /** As above. */
  organization: string | null;
  plan: string;
  /** `YYYY-MM-DD`, from the row's `createdAt`. */
  memberSince: string;
  /** Starred skill slugs, oldest first. See `lib/favorites.tsx`. */
  favorites: string[];
  /**
   * Whether `/setup` has been completed for this account.
   *
   * A boolean and not the connection itself, deliberately. `Account` is handed
   * to Client Components — the rail reads it in the root layout — and the
   * connection carries two sealed secrets plus a logon user. What the client
   * actually needs to know is whether the app is usable yet, and that is one
   * bit. Anything wanting the rest asks the server for it.
   */
  hasConnection: boolean;
};

export type SapSystem = {
  alias: string;
  description: string;
  /** `SAP_URL` in sap.env. */
  host: string;
  sid: string;
  client: string;
  user: string;
  language: string;
  /** `S4` or `ECC` — decides which tables and TCodes are in scope. */
  sapVersion: string;
  abapRelease: string;
  tier: "DEV" | "QAS" | "PRD";
  activeModules: string[];
  blocklistProfile: string;
};

export type Credits = {
  /** USD remaining on the key's balance. */
  balanceUsd: number;
  /** USD consumed inside the current billing window. */
  usedUsd: number;
  /** The cap configured in the Console, if one is set. */
  limitUsd: number;
  periodLabel: string;
  /** Output tokens spent in the same window. */
  tokensUsed: number;
  /**
   * The key's *name* in the Console. Never any part of the key itself — no
   * prefix, no tail, no length. A masked secret is still a secret leaking its
   * shape, and this dashboard is served to a browser.
   */
  keyLabel: string;
};

export const SAP_SYSTEM: SapSystem = {
  alias: "KR-DEV",
  description: "Development system",
  host: "https://sap-dev.example.com:44300",
  sid: "S4D",
  client: "100",
  user: "SVT_000214",
  language: "EN",
  sapVersion: "S/4HANA",
  abapRelease: "758",
  tier: "DEV",
  activeModules: ["MM", "SD", "FI", "CO"],
  blocklistProfile: "standard",
};

export const CREDITS: Credits = {
  balanceUsd: 41.28,
  usedUsd: 8.72,
  limitUsd: 50,
  periodLabel: "August 2026",
  tokensUsed: 1_284_310,
  keyLabel: "sc4sap-web-poc",
};
