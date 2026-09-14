"use client";

/**
 * The application frame: a persistent left rail plus whatever the current route
 * renders. Wraps every page, so the rail survives navigation instead of being
 * torn down and rebuilt per screen.
 *
 * Two independent collapse states, because the rail means two different things
 * at two widths:
 *
 *   - wide  — a grid column that shrinks to an icon rail. Sticky, remembered
 *             in localStorage, never covers the content.
 *   - narrow — an off-canvas drawer over the content, closed by default and
 *             dismissed by the backdrop, by Escape, or by navigating.
 *
 * One button drives both; `matchMedia` decides which state it flips. The
 * breakpoint lives in `--rail-breakpoint`-adjacent CSS and is repeated here as
 * `NARROW` — the two must stay in step.
 */
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { SkillNav } from "@/components/SkillNav";
import { AccountMenu } from "@/components/AccountMenu";
import type { Account } from "@/lib/account";
import { Icon } from "@/components/Icon";
import { useLocale } from "@/lib/i18n/client";
import { syncTheme } from "@/lib/theme";
import { LanguageSwitch } from "@/components/LanguageSwitch";

/** Must match the `@media (max-width: …)` breakpoint in globals.css. */
const NARROW = "(max-width: 900px)";

const COLLAPSE_KEY = "sc4sap.railCollapsed";

/**
 * Routes that render without the shell.
 *
 * Sign-in is the screen you reach *before* there is a session to navigate, so
 * a rail full of skills behind it would offer a way around the very gate the
 * page exists to be. The shell lives in the root layout, which cannot opt a
 * child route out, so the opt-out is here.
 *
 * `/setup` is the one entry here that *does* have a session behind it. It is
 * bare for the same reason rather than a different one: it exists because
 * nothing in the rail can run yet, and offering the rail beside it is an offer
 * the screen cannot honour.
 */
const BARE_ROUTES = ["/signin", "/signup", "/forgot", "/setup"];

/**
 * Reachable both signed in and signed out, and the only routes for which that
 * is true. Signed in they are ordinary screens inside the rail, reached from
 * the account menu; signed out they are reached from the footer of the auth
 * screens, and wrapping them in the app's navigation would put someone who has
 * not signed in inside the application chrome. So they get their own shell —
 * see `legalStandalone` below.
 */
const LEGAL_ROUTES = ["/terms", "/privacy"];

/**
 * `account` is read from the session in the root layout and threaded down
 * rather than fetched here, because the shell is a Client Component and the
 * session lives behind `server-only` code. It is `null` on the bare routes,
 * where there is no session yet by definition.
 */
export function AppShell({
  children,
  account,
}: {
  children: React.ReactNode;
  account: Account | null;
}) {
  const { t: messages } = useLocale();
  const t = messages.nav;
  const [collapsed, setCollapsed] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [narrow, setNarrow] = useState(false);
  const pathname = usePathname();

  // Read after mount, not during render: the server has no localStorage and a
  // differing first render is a hydration mismatch.
  useEffect(() => {
    setCollapsed(localStorage.getItem(COLLAPSE_KEY) === "1");
  }, []);

  useEffect(() => {
    const query = window.matchMedia(NARROW);
    const sync = (): void => setNarrow(query.matches);
    sync();
    query.addEventListener("change", sync);
    return () => query.removeEventListener("change", sync);
  }, []);

  // Leaving narrow with the drawer open would otherwise strand it open as a
  // column that the toggle no longer controls.
  useEffect(() => {
    if (!narrow) setDrawerOpen(false);
  }, [narrow]);

  useEffect(() => {
    setDrawerOpen(false);
  }, [pathname]);

  // Screens with no theme control are always light — see `LIGHT_ONLY_ROUTES`
  // in `lib/theme.ts`. The boot script handles a full load; this handles the
  // router landing on one, and signing out, which turns the legal pages bare.
  useEffect(() => {
    syncTheme(pathname, account !== null);
  }, [pathname, account]);

  useEffect(() => {
    if (!drawerOpen) return;
    const onKey = (event: KeyboardEvent): void => {
      if (event.key === "Escape") setDrawerOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [drawerOpen]);

  const toggle = useCallback((): void => {
    if (narrow) {
      setDrawerOpen((open) => !open);
      return;
    }
    // Both directions flip the state in one go. Folding is meant to be a cut,
    // and unfolding is staged entirely in CSS — see `.shell` in globals.css.
    setCollapsed((current) => {
      const next = !current;
      localStorage.setItem(COLLAPSE_KEY, next ? "1" : "0");
      return next;
    });
  }, [narrow]);

  const matches = (routes: string[]): boolean =>
    routes.some(
      (route) => pathname === route || pathname.startsWith(`${route}/`),
    );

  const bare = matches(BARE_ROUTES);
  /**
   * A legal page with nobody signed in. `account` is the whole test: a stale
   * cookie that no longer resolves lands here too, which is right — that
   * reader has no session either.
   */
  const legalStandalone = !account && matches(LEGAL_ROUTES);

  const railCollapsed = !narrow && collapsed;
  const expanded = narrow ? drawerOpen : !collapsed;

  /**
   * The glyph states what the click does, and the two widths fold the menu in
   * different directions:
   *
   *   wide, open    — folds left into the edge          `<<`
   *   wide, folded  — the rail is a strip of icons; a hamburger is what reads
   *                   as "the menu is in here"          `☰`
   *   narrow, open  — the drawer dismisses downward     `⌄⌄`
   *
   * Narrow-and-closed never reaches this button: the whole rail is off-canvas
   * by then, and `.rail-fab` below is what brings it back — a hamburger, which
   * is the convention for opening a menu that is nowhere on screen.
   */
  const toggleIcon = narrow
    ? "caret-double-down"
    : collapsed
      ? "list"
      : "caret-double-left";

  if (bare) return <>{children}</>;

  if (legalStandalone) {
    return (
      <div className="legal-shell">
        {/* Same corner as on the sign-in screen: no rail here either, so no
            account menu to change the language from. */}
        <LanguageSwitch />
        <header className="legal-shell-head">
          <Link className="legal-shell-brand" href="/signin">
            <span className="rail-wordmark">
              <b>Super-Claude</b> for SAP
            </span>
          </Link>

          <Link className="link-button" href="/signin">
            <Icon name="arrow-left" /> {messages.auth.backToSignIn}
          </Link>
        </header>

        {/* The document itself is untouched — same markup, same classes as the
            signed-in screen. Only the frame around it differs, and the CSS
            hands `.page` back the scrolling it normally delegates to the
            shell's content column. */}
        <main className="legal-shell-body">{children}</main>

        {/* The document being read is not offered as somewhere to go: a link
            to the page you are on is a link to nowhere. */}
        <footer className="legal-shell-foot">
          {[
            { href: "/signin", label: messages.auth.signIn },
            { href: "/signup", label: messages.auth.signUp },
            { href: "/terms", label: messages.auth.terms },
            { href: "/privacy", label: messages.auth.privacy },
          ]
            .filter((link) => !matches([link.href]))
            .map((link, index) => (
              <span className="legal-shell-foot-item" key={link.href}>
                {index > 0 ? <span aria-hidden="true">·</span> : null}
                <Link href={link.href}>{link.label}</Link>
              </span>
            ))}
        </footer>
      </div>
    );
  }

  return (
    <div
      className="shell"
      data-collapsed={railCollapsed ? "true" : "false"}
      data-drawer={drawerOpen ? "open" : "closed"}
    >
      <aside className="rail" aria-label="Main navigation">
        <div className="rail-head">
          {/* Hidden by CSS once the rail collapses — the wordmark does not
              survive a 62px column. Set as text rather than as the banner
              image: it is the same wordmark sc4sap.dev puts at the left of its
              nav, and as text it inherits the app's own ink and type stack
              instead of carrying the site's baked-in ones. */}
          <Link
            className="rail-brand"
            href="/"
            aria-label={t.goHome}
            onClick={() => setDrawerOpen(false)}
          >
            <span className="rail-wordmark">
              <b>Super-Claude</b> for SAP
            </span>
          </Link>

          <button
            className="rail-toggle"
            onClick={toggle}
            aria-expanded={expanded}
            aria-label={expanded ? t.collapseMenu : t.expandMenu}
            title={expanded ? t.collapseMenu : t.expandMenu}
          >
            <Icon name={toggleIcon} />
          </button>
        </div>

        <SkillNav
          collapsed={railCollapsed}
          onNavigate={() => setDrawerOpen(false)}
        />

        <div className="rail-foot">
          <AccountMenu collapsed={railCollapsed} account={account} />
        </div>
      </aside>

      {/* Only interactive while the drawer is up; CSS hides it otherwise. */}
      <button
        className="rail-backdrop"
        aria-hidden={!drawerOpen}
        tabIndex={drawerOpen ? 0 : -1}
        aria-label={t.closeMenu}
        onClick={() => setDrawerOpen(false)}
      />

      {/* Narrow screens slide the whole rail off-canvas, taking its toggle with
          it — so the way back in has to live outside the rail. Hidden by CSS
          everywhere else. */}
      <button
        className="rail-fab"
        onClick={() => setDrawerOpen(true)}
        aria-label={t.openMenu}
        title={t.openMenu}
      >
        <Icon name="list" />
      </button>

      <div className="content">{children}</div>
    </div>
  );
}
