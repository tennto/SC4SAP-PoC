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
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { SkillNav } from "@/components/SkillNav";
import { AccountMenu } from "@/components/AccountMenu";
import { Icon } from "@/components/Icon";

/** Must match the `@media (max-width: …)` breakpoint in globals.css. */
const NARROW = "(max-width: 900px)";

const COLLAPSE_KEY = "sc4sap.railCollapsed";

export function AppShell({ children }: { children: React.ReactNode }) {
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
    setCollapsed((current) => {
      const next = !current;
      localStorage.setItem(COLLAPSE_KEY, next ? "1" : "0");
      return next;
    });
  }, [narrow]);

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

  return (
    <div
      className="shell"
      data-collapsed={railCollapsed ? "true" : "false"}
      data-drawer={drawerOpen ? "open" : "closed"}
    >
      <aside className="rail" aria-label="Main navigation">
        <div className="rail-head">
          {/* Hidden by CSS once the rail collapses — the wordmark is 2.8:1 and
              does not survive a 62px column. */}
          <Link
            className="rail-brand"
            href="/"
            aria-label="SC4 AX — go to home"
            onClick={() => setDrawerOpen(false)}
          >
            <Image
              src="/banner_ic.png"
              alt="SC4 AX"
              // Intrinsic dimensions, so the aspect ratio is right and the
              // header does not reflow once the file lands. CSS sets the
              // rendered height.
              width={2385}
              height={856}
              // Without this the optimizer ships the 3840px variant for an
              // ~84px slot. Pinning the slot lets it serve a small file that
              // is still 3x the rendered size.
              sizes="96px"
              priority
            />
          </Link>

          <button
            className="rail-toggle"
            onClick={toggle}
            aria-expanded={expanded}
            aria-label={expanded ? "Collapse the menu" : "Expand the menu"}
            title={expanded ? "Collapse the menu" : "Expand the menu"}
          >
            <Icon name={toggleIcon} />
          </button>
        </div>

        <SkillNav
          collapsed={railCollapsed}
          onNavigate={() => setDrawerOpen(false)}
        />

        <div className="rail-foot">
          <AccountMenu collapsed={railCollapsed} />
        </div>
      </aside>

      {/* Only interactive while the drawer is up; CSS hides it otherwise. */}
      <button
        className="rail-backdrop"
        aria-hidden={!drawerOpen}
        tabIndex={drawerOpen ? 0 : -1}
        aria-label="Close the menu"
        onClick={() => setDrawerOpen(false)}
      />

      {/* Narrow screens slide the whole rail off-canvas, taking its toggle with
          it — so the way back in has to live outside the rail. Hidden by CSS
          everywhere else. */}
      <button
        className="rail-fab"
        onClick={() => setDrawerOpen(true)}
        aria-label="Open the menu"
        title="Open the menu"
      >
        <Icon name="list" />
      </button>

      <div className="content">{children}</div>
    </div>
  );
}
