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

const LANGUAGES = [
  { code: "KR", label: "한국어" },
  { code: "EN", label: "English" },
  { code: "JP", label: "日本語" },
] as const;

type Language = (typeof LANGUAGES)[number]["code"];

const LEGAL_PAGES = [
  { href: "/terms", label: "Terms of use", icon: "scroll" },
  { href: "/privacy", label: "Privacy policy", icon: "shield-check" },
] as const;

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
  const [nested, setNested] = useState<"language" | "legal" | null>(null);
  const [feedback, setFeedback] = useState(false);
  const [confirmLogout, setConfirmLogout] = useState(false);
  const [language, setLanguage] = useState<Language>("EN");
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
          <span className="account-name">{account?.name ?? "Signed out"}</span>
          <span className="account-sub">{account?.email ?? "No session"}</span>
        </span>
        <Icon name="caret-right" />
      </button>

      {open && (
        <div className="account-menu" role="menu">
          <Link className="account-item" href="/settings" role="menuitem">
            <Icon name="gear" />
            Settings
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
            Feedback
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
              Language
              <span className="account-value">{language}</span>
              <Icon name="caret-right" />
            </button>

            {nested === "language" && (
              <div className="account-submenu" role="menu">
                {LANGUAGES.map((option) => (
                  <button
                    key={option.code}
                    className="account-item"
                    role="menuitemradio"
                    aria-checked={language === option.code}
                    onClick={() => {
                      setLanguage(option.code);
                      setNested(null);
                    }}
                  >
                    <span className="account-check">
                      {language === option.code && <Icon name="check" />}
                    </span>
                    {option.label}
                    <span className="account-value">{option.code}</span>
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
              Legal
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
                    {page.label}
                  </Link>
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
            Log out
          </button>
        </div>
      )}

      {feedback && <FeedbackModal onClose={() => setFeedback(false)} />}

      {confirmLogout && (
        <ConfirmModal
          kind="Log out"
          heading="Log out of SC4SAP?"
          description="Running sessions keep going on the backend, and their transcripts are waiting when you sign back in."
          confirmLabel="Log out"
          confirmIcon="sign-out"
          onConfirm={logOut}
          onCancel={() => setConfirmLogout(false)}
          busy={loggingOut}
        />
      )}
    </div>
  );
}
