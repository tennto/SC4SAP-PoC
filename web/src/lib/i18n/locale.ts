/**
 * The UI language: which one is chosen, and where the choice is kept.
 *
 * Kept in a cookie rather than in `localStorage`, unlike the theme. The theme
 * is one attribute that CSS reacts to, so the browser can apply it before
 * React exists. The language is *text*, and most of the text on the dashboard
 * is rendered on the server — so the server has to know the choice before it
 * renders, and a cookie is the only client-side store it can read.
 *
 * Nothing in here imports from the server or the client side, so both can
 * import it. The dictionaries live in `messages.ts`; reading the cookie on the
 * server is `server.ts`; the React side is `client.tsx`.
 */

export const LOCALES = [
  { code: "ko", badge: "KR", label: "한국어", tag: "ko-KR" },
  { code: "en", badge: "EN", label: "English", tag: "en-US" },
  { code: "ja", badge: "JP", label: "日本語", tag: "ja-JP" },
] as const;

export type Locale = (typeof LOCALES)[number]["code"];

/**
 * English, because it is the language the app was written in and the one
 * every string exists in first — a key missing from another dictionary
 * cannot compile, but a reader who has said nothing gets the original.
 */
export const DEFAULT_LOCALE: Locale = "en";

/** Also spelled out in nothing else — read here and written in `client.tsx`. */
export const LOCALE_COOKIE = "sc4sap_locale";

/** A year. The choice is a preference, not a session, and should outlive one. */
export const LOCALE_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

export function isLocale(value: unknown): value is Locale {
  return (
    typeof value === "string" &&
    LOCALES.some((locale) => locale.code === value)
  );
}

/** The BCP 47 tag `Intl` wants for a locale, e.g. `ko-KR`. */
export function localeTag(locale: Locale): string {
  return LOCALES.find((entry) => entry.code === locale)?.tag ?? "en-US";
}
