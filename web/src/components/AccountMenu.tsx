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
 * Language opens a submenu one step further right, in the same direction the
 * menu itself came from. It opens on click, never on hover — a hover-opened
 * submenu is unreachable on touch and easy to lose on the way to it.
 */
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ACCOUNT } from "@/lib/account";
import { Icon } from "@/components/Icon";
import { FeedbackModal } from "@/components/FeedbackModal";

const LANGUAGES = [
  { code: "KR", label: "한국어" },
  { code: "EN", label: "English" },
  { code: "JP", label: "日本語" },
] as const;

type Language = (typeof LANGUAGES)[number]["code"];

export function AccountMenu({ collapsed }: { collapsed: boolean }) {
  const [open, setOpen] = useState(false);
  const [langOpen, setLangOpen] = useState(false);
  const [feedback, setFeedback] = useState(false);
  const [language, setLanguage] = useState<Language>("EN");
  const root = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // Collapsing the menu with the submenu still flagged open would reopen both
  // together the next time the account button is pressed.
  useEffect(() => {
    if (!open) setLangOpen(false);
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

  return (
    <div className="account" ref={root}>
      <button
        className={`account-button${open ? " open" : ""}`}
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
        aria-haspopup="menu"
        title={collapsed ? `${ACCOUNT.name} — ${ACCOUNT.email}` : undefined}
      >
        {/* A person in a ring. Round, where every other icon container in the
            app is a rounded square, because this slot stands for a person
            rather than a control — and deliberately not the company mark,
            which already identifies the product at the top of the rail. */}
        <span className="avatar">
          <Icon name="user" />
        </span>
        <span className="account-main">
          <span className="account-name">{ACCOUNT.name}</span>
          <span className="account-sub">{ACCOUNT.email}</span>
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
              className={`account-item${langOpen ? " open" : ""}`}
              role="menuitem"
              aria-haspopup="menu"
              aria-expanded={langOpen}
              onClick={() => setLangOpen((current) => !current)}
            >
              <Icon name="translate" />
              Language
              <span className="account-value">{language}</span>
              <Icon name="caret-right" />
            </button>

            {langOpen && (
              <div className="account-submenu" role="menu">
                {LANGUAGES.map((option) => (
                  <button
                    key={option.code}
                    className="account-item"
                    role="menuitemradio"
                    aria-checked={language === option.code}
                    onClick={() => {
                      setLanguage(option.code);
                      setLangOpen(false);
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

          <Link className="account-item" href="/terms" role="menuitem">
            <Icon name="scroll" />
            Terms of use
          </Link>

          <div className="account-divider" />

          {/* No auth to sign out of yet — Phase 5-5. Present so the menu is
              the shape it will keep. */}
          <button className="account-item" role="menuitem" title="Not wired up yet">
            <Icon name="sign-out" />
            Log out
          </button>
        </div>
      )}

      {feedback && <FeedbackModal onClose={() => setFeedback(false)} />}
    </div>
  );
}
