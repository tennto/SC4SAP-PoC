/**
 * Display IMG — the connected system's SPRO tree, read live.
 *
 * This file is the guard and the heading; `ImgBrowser` is the client island
 * under it and does all the reading, through the backend's `/img/*` routes.
 * The route stays `/config` so links and favourites made to the old
 * Configuration Setting page keep working.
 */
import type { Metadata } from "next";
import { requireAccount } from "@/lib/auth/session";
import { readMessages } from "@/lib/i18n/server";
import { Icon } from "@/components/Icon";
import { ImgBrowser } from "@/components/ImgBrowser";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await readMessages();
  return { title: `${t.configuration.title} · SC4SAP` };
}

export default async function DisplayImgPage() {
  await requireAccount();
  const { t: messages } = await readMessages();
  const t = messages.configuration;

  return (
    <div className="page config">
      <header className="page-head rise">
        <div className="skill-head">
          <div>
            <p className="eyebrow">{t.eyebrow}</p>
            {/* The skill's glyph beside its name, unboxed and grey — a boxed
                tile pinned to the first of three lines sat off the title's
                axis. */}
            <h1 className="skill-title">
              <Icon name="tree-structure" className="skill-title-icon" />
              {t.title}
            </h1>
            <p className="page-lede">{t.lede}</p>
          </div>
        </div>
      </header>

      <div className="cfg-frame rise" style={{ "--delay": "110ms" } as React.CSSProperties}>
        <ImgBrowser />
      </div>
    </div>
  );
}
