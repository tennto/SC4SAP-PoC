"use client";

/**
 * The account control at the foot of the rail, and the menu it opens.
 *
 * It sits at the bottom because that is where an account lives in a rail — the
 * navigation above is what you came for, the account is what you occasionally
 * need. It replaced a chip in the home page's top-right corner, which put a
 * global control on exactly one screen.
 *
 * The menu opens sideways out of the rail rather than upward over it, so the
 * navigation stays readable while it is open. On a narrow screen the rail is
 * already an overlay, so there is nothing to open sideways into and the menu
 * rises above the button instead.
 *
 * Language and Legal each open a submenu one step further right, in the same
 * direction the menu itself came from. They open on click, never on hover — a
 * hover-opened submenu is unreachable on touch and easy to lose on the way to
 * it — and only one is open at a time, so the second never lands on top of the
 * first.
 */
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { Account } from "@/lib/account";
import { Icon } from "@/components/Icon";
import { FeedbackModal } from "@/components/FeedbackModal";
import { ConfirmModal } from "@/components/ConfirmModal";
import { applyTheme, readTheme, type Theme } from "@/lib/theme";
import { useLocale } from "@/lib/i18n/client";
import { LOCALES } from "@/lib/i18n/locale";
import type { Messages } from "@/lib/i18n/messages";

/**
 * `system` first, because it is the default and the one most people should
 * stay on — the app following the machine is not a compromise between the
 * other two, it is the answer for anyone whose machine already knows.
 *
 * `label` names the dictionary key rather than the word, so the row reads in
 * whatever language the menu is in.
 */
const APPEARANCES: {
  value: Theme;
  label: keyof Messages["account"];
  icon: string;
}[] = [
  { value: "system", label: "system", icon: "circle-half" },
  { value: "light", label: "light", icon: "sun" },
  { value: "dark", label: "dark", icon: "moon" },
];

const LEGAL_PAGES: {
  href: string;
  label: keyof Messages["account"];
  icon: string;
}[] = [
  { href: "/terms", label: "termsOfUse", icon: "scroll" },
  { href: "/privacy", label: "privacyPolicy", icon: "shield-check" },
];

export function AccountMenu({
  collapsed,
  account,
}: {
  collapsed: boolean;
  /**
   * `null` when the session cookie did not resolve to a user — a cookie that
   * expired between the middleware waving the request through and the layout
   * looking it up. The button then names the state instead of a person, and
   * the only thing in the menu worth pressing is Log out, which clears it.
   */
  account: Account | null;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  /** Which nested submenu is showing, if any. */
  const [nested, setNested] = useState<
    "language" | "legal" | "appearance" | null
  >(null);
  const [feedback, setFeedback] = useState(false);
  const [confirmLogout, setConfirmLogout] = useState(false);
  /**
   * The language is not this component's state. It lives in a cookie the
   * server reads, and the provider in the root layout is what owns it —
   * this menu only shows the current choice and hands over a new one.
   */
  const { locale, t: messages, setLocale } = useLocale();
  const t = messages.account;
  const current = LOCALES.find((option) => option.code === locale);
  /**
   * Mirrors what is already on the document — the boot script in `app/layout`
   * put it there before React existed. Read after mount rather than during
   * render, because the server has no `localStorage` and a differing first
   * render is a hydration mismatch.
   */
  const [theme, setTheme] = useState<Theme>("system");

  useEffect(() => {
    setTheme(readTheme());
  }, []);
  const [loggingOut, setLoggingOut] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // Collapsing the menu with a submenu still flagged open would reopen both
  // together the next time the account button is pressed.
  useEffect(() => {
    if (!open) setNested(null);
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: MouseEvent): void => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent): void => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("mousedown", onPointerDown);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  /**
   * Clear the session, then leave for the sign-in screen.
   *
   * `replace` rather than `push`, so the back button cannot return to a
   * rendered copy of a screen this account no longer has, and `refresh` so the
   * layout re-reads a session that is now gone.
   *
   * A failed request still navigates: `/api/auth/signout` answers 204 whether
   * or not it found a row, so the realistic failure is the network, and
   * stranding someone inside the app because a fetch did not land is the worse
   * outcome — the middleware will bounce them right back here.
   */
  async function logOut(): Promise<void> {
    if (loggingOut) return;
    setLoggingOut(true);
    try {
      await fetch("/api/auth/signout", { method: "POST" });
    } catch {
      // Deliberately swallowed; see above.
    }
    setConfirmLogout(false);
    router.replace("/signin");
    router.refresh();
  }

  return (
    <div className="account" ref={root}>
      <button
        className={`account-button${open ? " open" : ""}`}
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
        aria-haspopup="menu"
        title={
          collapsed && account ? `${account.name} — ${account.email}` : undefined
        }
      >
        {/* A person in a ring. Round, where every other icon container in the
            app is a rounded square, because this slot stands for a person
            rather than a control — and deliberately not the company mark,
            which already identifies the product at the top of the rail. */}
        <span className="avatar">
          <Icon name="user" />
        </span>
        <span className="account-main">
          <span className="account-name">{account?.name ?? t.signedOut}</span>
          <span className="account-sub">{account?.email ?? t.noSession}</span>
        </span>
        <Icon name="caret-right" />
      </button>

      {open && (
        <div className="account-menu" role="menu">
          <Link className="account-item" href="/settings" role="menuitem">
            <Icon name="gear" />
            {t.settings}
          </Link>

          <button
            className="account-item"
            role="menuitem"
            onClick={() => {
              setFeedback(true);
              setOpen(false);
            }}
          >
            <Icon name="chat-dots" />
            {t.feedback}
          </button>

          <div className="account-nest">
            <button
              className={`account-item${nested === "language" ? " open" : ""}`}
              role="menuitem"
              aria-haspopup="menu"
              aria-expanded={nested === "language"}
              onClick={() =>
                setNested((current) =>
                  current === "language" ? null : "language",
                )
              }
            >
              <Icon name="translate" />
              {t.language}
              <span className="account-value">{current?.badge}</span>
              <Icon name="caret-right" />
            </button>

            {nested === "language" && (
              <div className="account-submenu" role="menu">
                {LOCALES.map((option) => (
                  <button
                    key={option.code}
                    className="account-item"
                    role="menuitemradio"
                    aria-checked={locale === option.code}
                    // Each name in its own language, whatever the menu is in:
                    // the row is for the reader who cannot read the rest.
                    lang={option.code}
                    onClick={() => {
                      setLocale(option.code);
                      setNested(null);
                    }}
                  >
                    <span className="account-check">
                      {locale === option.code && <Icon name="check" />}
                    </span>
                    {option.label}
                    <span className="account-value">{option.badge}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Two documents rather than one, so they fold into a submenu the
              same way the languages do instead of adding a second flat row to
              a menu that is mostly account controls. */}
          <div className="account-nest">
            <button
              className={`account-item${nested === "legal" ? " open" : ""}`}
              role="menuitem"
              aria-haspopup="menu"
              aria-expanded={nested === "legal"}
              onClick={() =>
                setNested((current) => (current === "legal" ? null : "legal"))
              }
            >
              <Icon name="scales" />
              {t.legal}
              <Icon name="caret-right" />
            </button>

            {nested === "legal" && (
              <div className="account-submenu" role="menu">
                {LEGAL_PAGES.map((page) => (
                  <Link
                    key={page.href}
                    className="account-item"
                    href={page.href}
                    role="menuitem"
                  >
                    <Icon name={page.icon} />
                    {t[page.label]}
                  </Link>
                ))}
              </div>
            )}
          </div>

          <div className="account-nest">
            <button
              className={`account-item${nested === "appearance" ? " open" : ""}`}
              role="menuitem"
              aria-haspopup="menu"
              aria-expanded={nested === "appearance"}
              onClick={() =>
                setNested((current) =>
                  current === "appearance" ? null : "appearance",
                )
              }
            >
              <Icon name="circle-half" />
              {t.appearance}
              <span className="account-value">
                {t[APPEARANCES.find((option) => option.value === theme)!.label]}
              </span>
              <Icon name="caret-right" />
            </button>

            {nested === "appearance" && (
              // Upward: this is the last row of a menu that already opens from
              // the bottom-left corner, and a panel growing down from here
              // leaves the screen.
              <div className="account-submenu up" role="menu">
                {APPEARANCES.map((option) => (
                  <button
                    key={option.value}
                    className="account-item"
                    role="menuitemradio"
                    aria-checked={theme === option.value}
                    onClick={() => {
                      // The document first, then the state that reflects it.
                      // The attribute is what actually changes the screen; this
                      // component only draws the tick beside it.
                      applyTheme(option.value);
                      setTheme(option.value);
                      setNested(null);
                    }}
                  >
                    <span className="account-check">
                      {theme === option.value && <Icon name="check" />}
                    </span>
                    <Icon name={option.icon} />
                    {t[option.label]}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="account-divider" />

          {/* Asks first: signing out is cheap to confirm and annoying to do
              by accident on the way to Legal. */}
          <button
            className="account-item"
            role="menuitem"
            onClick={() => {
              setConfirmLogout(true);
              setOpen(false);
            }}
          >
            <Icon name="sign-out" />
            {t.logOut}
          </button>
        </div>
      )}

      {feedback && <FeedbackModal onClose={() => setFeedback(false)} />}

      {confirmLogout && (
        <ConfirmModal
          kind={t.logOut}
          heading={t.logOutHeading}
          description={t.logOutBody}
          confirmLabel={t.logOut}
          cancelLabel={t.cancel}
          confirmIcon="sign-out"
          onConfirm={logOut}
          onCancel={() => setConfirmLogout(false)}
          busy={loggingOut}
        />
      )}
    </div>
  );
}
