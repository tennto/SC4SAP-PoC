/**
 * Privacy policy.
 *
 * Written to the disclosure list the Personal Information Protection Act
 * (개인정보 보호법) puts on a controller — purposes, categories, retention,
 * third-party provision, delegated processing, overseas transfer, destruction,
 * data-subject rights, automated decisions, safeguards, the protection officer,
 * and where to complain — because that statute is what governs a service
 * operated from Korea, whoever the customer is.
 *
 * The split that shapes the whole document: for account data we are the
 * controller, and for what a Session reads out of a customer's SAP system we
 * are a processor acting on that customer's instruction. Those two halves have
 * different legal bases, different retention and different rights attached, so
 * they are kept apart rather than blended into one list.
 *
 * Original text for this product, laid out against the statute's headings —
 * not another service's policy with the names swapped. The text lives in
 * `content/`, one file per language, and this page renders whichever matches
 * the reader's locale cookie; the constants counsel and the operator have to
 * settle sit at the top of each of those files, and the DRAFT notice stays
 * until that review has happened.
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

export default async function PrivacyPage() {
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
