/**
 * Terms of use.
 *
 * Written against the *finished* product — the whole skill catalogue, per-user
 * accounts, per-user SAP connection profiles, per-user API keys and the write
 * tier — not against what the PoC can do today. That is deliberate: terms that
 * described only the current build would need rewriting at every phase, and
 * the obligations that matter (who may connect a system, who owns the change
 * that lands in it, what leaves the network) are the same on day one as they
 * are at GA.
 *
 * This is original text written for this product. The text lives in
 * `content/` — one file per language, the English one being the original and
 * the one that governs. The constants at the top of each are the only things
 * that vary by who ships it, and they are the parts counsel has to settle —
 * the DRAFT notice stays on the page until that review has happened. Delete
 * `DRAFT_NOTICE` from each content file and its render here to publish.
 */
import type { Metadata } from "next";
import type { LegalContent } from "@/lib/i18n/legal";
import type { Locale } from "@/lib/i18n/locale";
import { readLocale } from "@/lib/i18n/server";
import { en } from "./content/en";
import { ja } from "./content/ja";
import { ko } from "./content/ko";

const CONTENT: Record<Locale, LegalContent> = { en, ko, ja };

export async function generateMetadata(): Promise<Metadata> {
  const content = CONTENT[await readLocale()];
  return { title: `${content.title} · SC4SAP` };
}

export default async function TermsPage() {
  const content = CONTENT[await readLocale()];

  return (
    <div className="page">
      <header className="page-head rise">
        <div>
          <p className="eyebrow">{content.eyebrow}</p>
          <h1>{content.title}</h1>
          <p className="page-lede">{content.lede}</p>
        </div>
      </header>

      <div
        className="legal rise"
        style={{ "--delay": "110ms" } as React.CSSProperties}
      >
        <ul className="legal-meta">
          <li>
            <b>{content.metaLabels.effective}</b> {content.effective}
          </li>
          <li>
            <b>{content.metaLabels.version}</b> {content.version}
          </li>
          <li>
            <b>{content.metaLabels.party}</b> {content.party}
          </li>
        </ul>

        <p className="notice-block">{content.draftNotice}</p>

        <p className="legal-intro">{content.intro}</p>

        {content.sections.map((section, index) => (
          <section className="legal-section" id={section.id} key={section.id}>
            <h2>
              <span className="legal-num" aria-hidden="true">
                {index + 1}.
              </span>
              <span>{section.title}</span>
            </h2>
            {section.body}
          </section>
        ))}
      </div>
    </div>
  );
}
