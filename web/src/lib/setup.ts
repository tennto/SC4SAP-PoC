/**
 * The connection a new account has to supply before anything can run.
 *
 * Two unrelated secrets arrive in the same wizard because they gate the same
 * thing: a session needs a system to talk to *and* a key to think with, and an
 * account holding one but not the other cannot do any more than an account
 * holding neither. `/setup` collects both; this file is the shape they take
 * and the rules each field is held to.
 *
 * Deliberately free of `server-only` and of any import that pulls Mongo in —
 * the wizard is a Client Component and validates as you type, so the same
 * predicates have to run in the browser. The endpoint behind it re-runs them;
 * a rule enforced only in the client is a rule a `curl` walks past.
 *
 * The field names are the draft's, not SAP's. Where each one lands:
 *
 *   adtUrl       -> SAP_URL          in `~/.sc4sap/profiles/<alias>/sap.env`
 *   sapUser      -> SAP_USERNAME     ditto
 *   sapPassword  -> SAP_PASSWORD     ditto
 *   sapVersion   -> SAP_VERSION      ditto, and `sapVersion` in config.json
 *   abapRelease  -> ABAP_RELEASE     ditto, and `abapRelease` in config.json
 *   client       -> SAP_CLIENT       ditto, and `systemInfo.client`
 *   language     -> SAP_LANGUAGE     ditto, and `systemInfo.language`
 *   apiKey       -> ANTHROPIC_API_KEY, which is the backend's, not the
 *                   profile's — see `lib/account.ts` for that split.
 *   industry     -> SAP_INDUSTRY     in sap.env, and `industry` in config.json
 *   blocklist    -> MCP_BLOCKLIST_PROFILE in sap.env, and `blocklistProfile`
 *                   in config.json
 *   allowTables  -> MCP_ALLOW_TABLE  in sap.env
 *
 * The last three are stored per account and not yet applied: the backend
 * still runs one plugin profile for every session, so what is saved here
 * waits for per-account sessions to land. See `docs/roadmap-per-user-
 * credentials.md`. They are collected now so that the row is complete the
 * day the backend starts reading it, rather than every account then being
 * sent back through a wizard it has already finished.
 */

/** Everything the wizard collects, in the order it asks for it. */
export type SetupDraft = {
  /** ADT base URL — scheme, host and port. No path. */
  adtUrl: string;
  /** SAP GUI user, e.g. `SVT_000214`. */
  sapUser: string;
  sapPassword: string;
  /** Decides which tables and TCodes the plugin considers in scope. */
  sapVersion: "S4" | "ECC";
  /** SAP_BASIS release as three digits, e.g. `758`. */
  abapRelease: string;
  /** Three digits, `000`–`999`. */
  client: string;
  /** Two-letter SAP logon language. */
  language: string;
  /** An Anthropic Console key, `sk-ant-…`. */
  apiKey: string;
  /**
   * Which industry reference the consultant agents read. One of `INDUSTRIES`;
   * `other` means none, and the agents fall back to industry-agnostic advice.
   */
  industry: string;
  /**
   * How hard the MCP server refuses row extraction from sensitive tables.
   *
   * The plugin also knows `off`, which disables every guard and makes the
   * plugin demand a typed "I UNDERSTAND" first. Not offered here: a PoC served
   * to a browser is not the place to switch the guards off.
   */
  blocklist: BlocklistProfile;
  /**
   * Tables the blocklist lets through anyway, upper case, `*` as a glob.
   * Kept as a list; the plugin reads it comma-joined.
   */
  allowTables: string[];
};

export type BlocklistProfile = "minimal" | "standard" | "strict";

export const EMPTY_DRAFT: SetupDraft = {
  adtUrl: "",
  sapUser: "",
  sapPassword: "",
  sapVersion: "S4",
  abapRelease: "",
  client: "",
  language: "EN",
  apiKey: "",
  industry: "other",
  blocklist: "standard",
  allowTables: [],
};

/**
 * The plugin's `industry/` folder, one entry per reference file, plus `other`.
 *
 * Listed here rather than read from the plugin: this runs in the browser,
 * and the folder is on the backend's disk. Adding a reference there means
 * adding a line here — see `plugin_module/industry/README.md`.
 */
export const INDUSTRIES: { value: string; label: string }[] = [
  { value: "other", label: "Not industry-specific" },
  { value: "automotive", label: "Automotive" },
  { value: "banking", label: "Banking" },
  { value: "chemical", label: "Chemical" },
  { value: "construction", label: "Construction / E&C" },
  { value: "cosmetics", label: "Cosmetics" },
  { value: "electronics", label: "Electronics / High-Tech" },
  { value: "fashion", label: "Fashion / Apparel" },
  { value: "food-beverage", label: "Food & Beverage" },
  { value: "pharmaceutical", label: "Pharmaceutical" },
  { value: "public-sector", label: "Public Sector" },
  { value: "retail", label: "Retail" },
  { value: "steel", label: "Steel" },
  { value: "tire", label: "Tire" },
  { value: "utilities", label: "Utilities" },
];

/** In the order the plugin's own docs list them: loosest to tightest. */
export const BLOCKLIST_PROFILES: {
  value: BlocklistProfile;
  label: string;
  hint: string;
}[] = [
  {
    value: "minimal",
    label: "Minimal",
    hint: "Only the tables that hold credentials and personal data are refused.",
  },
  {
    value: "standard",
    label: "Standard",
    hint: "The plugin's default. Adds HR, payroll and finance line-item tables.",
  },
  {
    value: "strict",
    label: "Strict",
    hint: "Refuses every table row read. Metadata and source code still work.",
  },
];

/** The four the wizard offers. The plugin accepts any two-letter code. */
export const LANGUAGES: { code: string; label: string }[] = [
  { code: "EN", label: "English (EN)" },
  { code: "KO", label: "한국어 (KO)" },
  { code: "JA", label: "日本語 (JA)" },
  { code: "DE", label: "Deutsch (DE)" },
];

export const SAP_VERSIONS: { value: SetupDraft["sapVersion"]; label: string }[] = [
  { value: "S4", label: "S/4HANA" },
  { value: "ECC", label: "ECC 6.0" },
];

/**
 * Shown under each field, and reused as that field's rejection message.
 *
 * None of them repeats its own placeholder: the example is already on screen
 * in the input, and saying it twice makes the hint read as filler rather than
 * as the rule it is.
 */
export const ADT_URL_RULE =
  "Scheme, host and port. No path — the client appends its own.";
export const CLIENT_RULE = "Three digits, 000–999.";
export const ABAP_RELEASE_RULE = "The SAP_BASIS release — three digits.";
export const API_KEY_RULE = "A Console key, starting sk-ant-.";
export const ALLOW_TABLES_RULE =
  "Table names, comma-separated. Upper case, * as a wildcard. Leave empty to allow nothing extra.";

/**
 * `http` is allowed as well as `https`, because a development ABAP stack is
 * routinely reached over plain HTTP on the ICM's 50000-range port and refusing
 * that would make the wizard unusable against exactly the systems a PoC runs
 * on. What is refused is anything that is not one of the two — `file:`,
 * `javascript:` and the rest — and anything carrying a path, which is the
 * shape of somebody pasting a whole ADT request instead of the host.
 */
export function isAdtUrlValid(value: string): boolean {
  const trimmed = value.trim();
  if (trimmed.length === 0) return false;
  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    return false;
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") return false;
  if (url.hostname.length === 0) return false;
  // A trailing slash is what a browser's address bar hands back and is not a
  // path anybody typed, so it passes; anything longer does not.
  return url.pathname === "" || url.pathname === "/";
}

export function isClientValid(value: string): boolean {
  return /^\d{3}$/.test(value.trim());
}

export function isAbapReleaseValid(value: string): boolean {
  return /^\d{3}$/.test(value.trim());
}

/**
 * Prefix and a floor on the length, and nothing more.
 *
 * The alternative — matching the whole key against a pattern — is a rule that
 * outlives the format it was written for: Anthropic has changed the tail of
 * these before, and a wizard that refuses a working key is worse than one that
 * accepts a broken one, since the backend's own key check catches the second
 * case a moment later and nothing catches the first.
 */
export function isApiKeyValid(value: string): boolean {
  const trimmed = value.trim();
  return trimmed.startsWith("sk-ant-") && trimmed.length >= 20;
}

export function isIndustryValid(value: string): boolean {
  return INDUSTRIES.some((industry) => industry.value === value);
}

export function isBlocklistValid(value: string): value is BlocklistProfile {
  return BLOCKLIST_PROFILES.some((profile) => profile.value === value);
}

/** One table name or glob, the way the plugin's own reader accepts it. */
const TABLE = /^[A-Z0-9_*]+$/;

/**
 * `"MARA, vbak ,, *_LOG"` becomes `["MARA", "VBAK", "*_LOG"]`.
 *
 * Upper-cased and de-duplicated on the way in, so what is stored is what
 * the plugin would have read after its own trimming. `null` when an entry
 * is not a table name at all — the caller reports which.
 */
export function parseAllowTables(value: string): string[] | null {
  const tables: string[] = [];
  for (const raw of value.split(",")) {
    const table = raw.trim().toUpperCase();
    if (table === "") continue;
    if (!TABLE.test(table)) return null;
    if (!tables.includes(table)) tables.push(table);
  }
  return tables;
}

/** Every step's gate, so the wizard and the endpoint agree on what is complete. */
export function isStepComplete(step: number, draft: SetupDraft): boolean {
  switch (step) {
    case 0:
      return isAdtUrlValid(draft.adtUrl);
    case 1:
      return draft.sapUser.trim().length > 0 && draft.sapPassword.length > 0;
    case 2:
      return isAbapReleaseValid(draft.abapRelease) && isClientValid(draft.client);
    case 3:
      // Both have defaults, so this step is complete from the moment it is
      // reached. It exists to be seen, not to be filled in.
      return isIndustryValid(draft.industry) && isBlocklistValid(draft.blocklist);
    case 4:
      return isApiKeyValid(draft.apiKey);
    default:
      return false;
  }
}
