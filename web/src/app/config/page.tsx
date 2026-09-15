/**
 * Configuration Setting — the SAP PM SPRO configuration list, browsed in
 * place.
 *
 * A layout pass. The page is `web/config.html` brought into the app's frame:
 * this file is the guard and the heading, `ConfigBrowser` is the three-pane
 * client island under it, and the rows it draws are a sample from
 * `lib/config-catalog.ts`. Nothing here talks to the backend yet.
 */
import type { Metadata } from "next";
import { requireAccount } from "@/lib/auth/session";
import { readMessages } from "@/lib/i18n/server";
import { Icon } from "@/components/Icon";
import { ConfigBrowser } from "@/components/ConfigBrowser";
import { CONFIG_TOTAL } from "@/lib/config-catalog";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await readMessages();
  return { title: `${t.configuration.title} · SC4SAP` };
}

export default async function ConfigurationPage() {
  await requireAccount();
  const { t: messages } = await readMessages();
  const t = messages.configuration;

  return (
    <div className="page config">
      <header className="page-head rise">
        <div className="skill-head">
          <span className="skill-icon">
            <Icon name="sliders-horizontal" />
          </span>
          <div>
            <p className="eyebrow">{t.eyebrow}</p>
            <h1>{t.title}</h1>
            <p className="page-lede">{t.lede}</p>
          </div>
        </div>

        <span className="badge closed">{t.layoutOnly(CONFIG_TOTAL)}</span>
      </header>

      <div className="cfg-frame rise" style={{ "--delay": "110ms" } as React.CSSProperties}>
        <ConfigBrowser />
      </div>
    </div>
  );
}
