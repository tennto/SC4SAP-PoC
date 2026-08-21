"use client";

/**
 * The starred-skills shortcut row on the dashboard, above the connection
 * panel — the first thing on the screen because it is the only part of the
 * dashboard you act on rather than read.
 *
 * Empty until something is starred, and it says so rather than collapsing:
 * a panel that appears out of nowhere the first time you star something is
 * harder to connect to the star you just clicked than one that was already
 * there waiting.
 */
import Link from "next/link";
import { useFavorites } from "@/lib/favorites";
import { findSkill } from "@/lib/skills";
import { Icon } from "@/components/Icon";

export function FavoriteSkills() {
  const { favorites, toggle } = useFavorites();
  const skills = favorites
    .map((slug) => findSkill(slug))
    .filter((skill) => skill !== undefined);

  return (
    <section
      className="panel favorites rise"
      style={{ "--delay": "60ms" } as React.CSSProperties}
      aria-labelledby="favorites-heading"
    >
      <div className="panel-head panel-head-row">
        <div>
          <h2 id="favorites-heading">Favourites</h2>
          <p className="panel-note">
            {skills.length > 0
              ? "Starred in the rail. Lost on reload — there is nowhere to keep them yet."
              : "Star a skill in the rail and it lands here."}
          </p>
        </div>
      </div>

      {skills.length > 0 ? (
        <ul className="fav-list">
          {skills.map((skill) => (
            <li className="fav-card" key={skill.slug}>
              <Link className="fav-main" href={`/skills/${skill.slug}`}>
                <span className="fav-icon">
                  <Icon name={skill.icon} />
                </span>
                <span className="fav-text">
                  <span className="fav-title">{skill.title}</span>
                  <span className="fav-summary">{skill.summary}</span>
                </span>
              </Link>
              <button
                type="button"
                className="fav-remove"
                aria-label={`Remove ${skill.title} from favourites`}
                title="Remove from favourites"
                onClick={() => toggle(skill.slug)}
              >
                <Icon name="star" weight="fill" />
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="fav-empty">
          <Icon name="star" /> Nothing starred yet.
        </p>
      )}
    </section>
  );
}
