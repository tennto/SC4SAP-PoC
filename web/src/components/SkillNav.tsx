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

type Props = {
  collapsed: boolean;
  /** Called on navigation so the mobile drawer closes behind the click. */
  onNavigate: () => void;
};

const FIXED = [
  { href: "/", icon: "house", label: "Home", hint: "Account, system, credits" },
  {
    href: "/chat",
    icon: "chats-circle",
    label: "Chat",
    hint: "Free-form prompting",
  },
];

export function SkillNav({ collapsed, onNavigate }: Props) {
  const pathname = usePathname();
  const { isFavorite, toggle } = useFavorites();

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
            aria-label={
              starred
                ? `Remove ${label} from favourites`
                : `Add ${label} to favourites`
            }
            title={starred ? "Remove from favourites" : "Add to favourites"}
            onClick={() => toggle(favouriteSlug)}
          >
            <Icon name="star" weight={starred ? "fill" : "regular"} />
          </button>
        ) : null}
      </div>
    );
  };

  return (
    <nav className="nav" aria-label="Skills">
      <div className="nav-group">
        {FIXED.map((item) =>
          entry(item.href, item.icon, item.label, `${item.label} — ${item.hint}`),
        )}
      </div>

      {SKILLS_BY_GROUP.map(({ group, skills }) => (
        <div className="nav-group" key={group.id}>
          <p className="nav-heading">
            <span>{group.label}</span>
            <span className="nav-heading-hint">{group.hint}</span>
          </p>
          {skills.map((skill) =>
            entry(
              `/skills/${skill.slug}`,
              skill.icon,
              skill.title,
              `${skill.title} — ${skill.summary}`,
              skill.status === "blocked" ? (
                <span
                  className="nav-flag"
                  title={skill.blockedReason}
                  aria-label="Not runnable in this PoC"
                >
                  ·
                </span>
              ) : null,
              skill.slug,
            ),
          )}
        </div>
      ))}
    </nav>
  );
}
