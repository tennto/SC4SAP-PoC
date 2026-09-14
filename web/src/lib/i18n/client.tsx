"use client";

/**
 * The language on the React side: a context that carries the current locale
 * and its dictionary, and the one function that changes it.
 *
 * The provider is seeded from the server — the root layout reads the cookie
 * and hands the value down — so the first client render agrees with the HTML
 * it hydrates. Changing the language writes the cookie and asks the router to
 * refresh, which re-renders every Server Component with the new value; the
 * state here flips at the same time so the client side does not wait for the
 * round trip to catch up.
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import {
  LOCALE_COOKIE,
  LOCALE_COOKIE_MAX_AGE,
  localeTag,
  type Locale,
} from "./locale";
import { MESSAGES, type Messages } from "./messages";

type LocaleContextValue = {
  locale: Locale;
  /** The BCP 47 tag for `Intl`, e.g. `ko-KR`. */
  tag: string;
  t: Messages;
  setLocale: (locale: Locale) => void;
};

const LocaleContext = createContext<LocaleContextValue | null>(null);

export function LocaleProvider({
  initial,
  children,
}: {
  initial: Locale;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [locale, setLocaleState] = useState<Locale>(initial);

  // The server is the source of truth once it has re-rendered; if the cookie
  // was changed in another tab, the next navigation brings this in line.
  useEffect(() => {
    setLocaleState(initial);
  }, [initial]);

  const setLocale = useCallback(
    (next: Locale): void => {
      setLocaleState(next);
      // Not `httpOnly`: this is written by the browser, and holds nothing a
      // script should not see — the value is one of three public codes.
      document.cookie = `${LOCALE_COOKIE}=${next}; path=/; max-age=${LOCALE_COOKIE_MAX_AGE}; samesite=lax`;
      // `<html lang>` is set by the server from the same cookie; flipping it
      // here too means the font stack and line-breaking rules that key off it
      // switch with the text instead of one refresh later.
      document.documentElement.lang = next;
      router.refresh();
    },
    [router],
  );

  const value = useMemo<LocaleContextValue>(
    () => ({ locale, tag: localeTag(locale), t: MESSAGES[locale], setLocale }),
    [locale, setLocale],
  );

  return (
    <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>
  );
}

export function useLocale(): LocaleContextValue {
  const value = useContext(LocaleContext);
  if (!value) {
    throw new Error("useLocale must be used inside <LocaleProvider>");
  }
  return value;
}
