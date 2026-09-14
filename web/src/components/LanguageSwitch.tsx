"use client";

/**
 * The language control for screens that have no rail.
 *
 * Sign-in, sign-up, the password reset and the setup wizard all render
 * without the app shell, and the account menu — where the language normally
 * lives — is in the shell. Someone who cannot read the sign-in screen has no
 * way to change it, so these screens carry their own control: three names,
 * each in its own language, pinned to the top-right corner where a language
 * switch conventionally sits.
 *
 * Same cookie, same provider as the account menu, so a choice made here is
 * the one the app opens in once signed in.
 */
import { Icon } from "@/components/Icon";
import { useLocale } from "@/lib/i18n/client";
import { LOCALES } from "@/lib/i18n/locale";

export function LanguageSwitch() {
  const { locale, t, setLocale } = useLocale();
  return (
    <div className="lang-switch" role="group" aria-label={t.auth.language}>
      <Icon name="translate" />
      {LOCALES.map((option) => (
        <button
          key={option.code}
          type="button"
          lang={option.code}
          className={`lang-option${locale === option.code ? " is-on" : ""}`}
          aria-pressed={locale === option.code}
          onClick={() => setLocale(option.code)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
