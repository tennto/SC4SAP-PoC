import "server-only";
import { cookies } from "next/headers";
import { DEFAULT_LOCALE, LOCALE_COOKIE, isLocale, type Locale } from "./locale";
import { MESSAGES, type Messages } from "./messages";

/**
 * The reader's chosen language, from the cookie the account menu writes.
 *
 * Anything unrecognised — no cookie, a value from a build that spelled the
 * codes differently — falls back to the default rather than throwing, for the
 * same reason the theme does: a page in the wrong language is a small
 * disappointment, a page that does not render is not.
 */
export async function readLocale(): Promise<Locale> {
  const value = (await cookies()).get(LOCALE_COOKIE)?.value;
  return isLocale(value) ? value : DEFAULT_LOCALE;
}

/** The locale and its dictionary together, which is what a page wants. */
export async function readMessages(): Promise<{
  locale: Locale;
  t: Messages;
}> {
  const locale = await readLocale();
  return { locale, t: MESSAGES[locale] };
}
