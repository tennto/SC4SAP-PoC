"use client";

/**
 * The left navigation: two fixed entries (Home, Chat) followed by the skill
 * catalog grouped by what the skills do.
 *
 * Collapsed, the rail keeps only the icons — the labels, group headings and
 * status dots go away, but every target stays reachable and keeps its tooltip.
 * That is the whole reason each entry carries a Phosphor name in the catalog:
 * at 62px the glyph is the entry.
 */
import Link from "next/link";
import { usePathname } from "next/navigation";
import { SKILLS_BY_GROUP } from "@/lib/skills";
import { useFavorites } from "@/lib/favorites";
import { Icon } from "@/components/Icon";
import { useLocale } from "@/lib/i18n/client";
import { groupDisplay, skillDisplay } from "@/lib/i18n/skills";
import type { Messages } from "@/lib/i18n/messages";

type Props = {
  collapsed: boolean;
  /** Called on navigation so the mobile drawer closes behind the click. */
  onNavigate: () => void;
};

/** `label` and `hint` name keys in `nav`, so the rows read in the menu's language. */
type NavKey = keyof Messages["nav"];

const FIXED: { href: string; icon: string; label: NavKey; hint: NavKey }[] = [
  { href: "/", icon: "house", label: "home", hint: "homeHint" },
  { href: "/chat", icon: "chats-circle", label: "chat", hint: "chatHint" },
];

/**
 * Pages that sit inside a skill group without being skills.
 *
 * The rail is grouped by what a thing does, and a page that watches the MCP
 * server belongs under System beside the doctor whether or not it is a slash
 * command. Not in `lib/skills.ts` because nothing there fits it: no command,
 * no fields, no run. Listed after the group's skills.
 */
const PAGES: { group: string; href: string; icon: string; label: NavKey; hint: NavKey }[] = [
  // The SPRO configuration list, browsed in place. Under Analyze because it
  // is read, not run: a catalog of what the system is set to, with no
  // command behind it.
  { group: "analyze", href: "/config", icon: "sliders-horizontal", label: "configuration", hint: "configurationHint" },
  { group: "system", href: "/monitor", icon: "pulse", label: "monitor", hint: "monitorHint" },
];

export function SkillNav({ collapsed, onNavigate }: Props) {
  const pathname = usePathname();
  const { isFavorite, toggle } = useFavorites();
  const { locale, t: messages } = useLocale();
  const t = messages.nav;
  /** Every dictionary key in `nav` is a string; the typed indexer says so. */
  const word = (key: NavKey): string => t[key] as string;

  const entry = (
    href: string,
    icon: string,
    label: string,
    title: string,
    extra?: React.ReactNode,
    /** Skills only. Home and Chat are always there; starring them says
        nothing. */
    favouriteSlug?: string,
  ) => {
    // `/` would otherwise prefix-match every route.
    const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
    const starred = favouriteSlug !== undefined && isFavorite(favouriteSlug);
    return (
      // The star is a sibling of the link rather than a child: a button inside
      // an anchor is invalid, and nesting it would put a second activation
      // target inside the navigation hit area.
      <div className="nav-row" key={href}>
        <Link
          href={href}
          className={`nav-item${active ? " active" : ""}`}
          title={collapsed ? title : undefined}
          aria-current={active ? "page" : undefined}
          onClick={onNavigate}
        >
          <span className="nav-icon">
            <Icon name={icon} />
          </span>
          <span className="nav-label">{label}</span>
          {extra}
        </Link>

        {favouriteSlug !== undefined ? (
          <button
            type="button"
            className="nav-fav"
            data-on={starred ? "true" : "false"}
            aria-pressed={starred}
            aria-label={starred ? t.removeFavorite(label) : t.addFavorite(label)}
            title={starred ? t.removeFavoriteTitle : t.addFavoriteTitle}
            onClick={() => toggle(favouriteSlug)}
          >
            <Icon name="star" weight={starred ? "fill" : "regular"} />
          </button>
        ) : null}
      </div>
    );
  };

  return (
    <nav className="nav" aria-label={t.skills}>
      <div className="nav-group">
        {FIXED.map((item) =>
          entry(
            item.href,
            item.icon,
            word(item.label),
            `${word(item.label)} — ${word(item.hint)}`,
          ),
        )}
      </div>

      {SKILLS_BY_GROUP.map(({ group, skills }) => {
        const heading = groupDisplay(locale, group);
        return (
          <div className="nav-group" key={group.id}>
            <p className="nav-heading">
              <span>{heading.label}</span>
              <span className="nav-heading-hint">{heading.hint}</span>
            </p>
            {skills.map((skill) => {
              const shown = skillDisplay(locale, skill);
              return entry(
                `/skills/${skill.slug}`,
                skill.icon,
                shown.title,
                `${shown.title} — ${shown.summary}`,
                skill.status === "blocked" ? (
                  <span
                    className="nav-flag"
                    title={shown.blockedReason}
                    aria-label={t.notRunnable}
                  >
                    ·
                  </span>
                ) : null,
                skill.slug,
              );
            })}
            {PAGES.filter((page) => page.group === group.id).map((page) =>
              entry(
                page.href,
                page.icon,
                word(page.label),
                `${word(page.label)} — ${word(page.hint)}`,
              ),
            )}
          </div>
        );
      })}
    </nav>
  );
}
