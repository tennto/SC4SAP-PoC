/**
 * Placeholder data for the home dashboard.
 *
 * NONE OF THIS IS REAL. Sign-up, sign-in and per-user credential intake do not
 * exist yet — they are Phase 5 (5-2 credential intake, 5-5 authentication) — so
 * the dashboard is laid out against fixtures instead of waiting on them.
 *
 * The shapes are deliberately the shapes of the real sources, so swapping each
 * one is a matter of changing where the object comes from rather than
 * rewriting the screen:
 *
 *   account     → the session's authenticated user            (Phase 5-5)
 *   sapSystem   → `~/.sc4sap/profiles/<alias>/config.json`
 *                 plus `sap.env`                              (Phase 5-2/5-3)
 *   credits     → the Anthropic Console usage/credit endpoint, keyed by the
 *                 user's own API key                          (Phase 5-4)
 *
 * The backend connection on this page is the one thing that is NOT fixture
 * data: it comes from the real `/health` call in `app/page.tsx`.
 */

export type Account = {
  name: string;
  email: string;
  role: string;
  organization: string;
  plan: string;
  memberSince: string;
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
  industry: string;
  country: string;
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
  keyLabel: string;
  /** Last four characters of the key, which is all the Console ever shows. */
  keyTail: string;
};

export const ACCOUNT: Account = {
  name: "Kim Sihoon",
  email: "s2hoon326@gmail.com",
  role: "SAP ABAP Developer",
  organization: "SC4SAP",
  plan: "PoC — bring your own key",
  memberSince: "2026-08-06",
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
  industry: "Other",
  country: "KR",
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
  keyTail: "16Q",
};
