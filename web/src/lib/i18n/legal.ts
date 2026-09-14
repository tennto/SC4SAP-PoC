/**
 * The shape of a legal document in one language.
 *
 * The terms and the privacy policy are each a page frame around a list of
 * numbered sections, and the frame's own words — the eyebrow, the heading,
 * the meta row, the draft notice, the intro — vary by language as much as the
 * sections do. So a document is one object per language, and the page picks
 * the object for the reader's locale; `sections[i].id` is the same in every
 * language, so an anchor link lands on the same clause whatever the reader
 * has chosen.
 */
import type { ReactNode } from "react";

export type LegalSection = { id: string; title: string; body: ReactNode };

export type LegalContent = {
  /** The small label above the heading — "Legal". */
  eyebrow: string;
  /** The page heading and the browser-tab title. */
  title: string;
  lede: string;
  /** The three labels in the meta row. `party` is "Provider" or "Controller". */
  metaLabels: { effective: string; version: string; party: string };
  effective: string;
  version: string;
  party: string;
  draftNotice: string;
  /** The paragraph before the first section: which sections to read first. */
  intro: string;
  sections: LegalSection[];
};
