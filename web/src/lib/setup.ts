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
};

export const EMPTY_DRAFT: SetupDraft = {
  adtUrl: "",
  sapUser: "",
  sapPassword: "",
  sapVersion: "S4",
  abapRelease: "",
  client: "",
  language: "EN",
  apiKey: "",
};

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
      return isApiKeyValid(draft.apiKey);
    default:
      return false;
  }
}
