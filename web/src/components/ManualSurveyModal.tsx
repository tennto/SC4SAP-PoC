"use client";

/**
 * Program → Manual's cover, asked when Run is pressed.
 *
 * The plugin's skill asks for these once and saves them into the profile's
 * config.json; here they are asked before anything starts — no session, no
 * model, no cost — and go into the manual itself (`meta`), so a run writes
 * nothing outside its own folder. Every field may stay empty: the skill
 * leaves an empty one off the cover rather than inventing it.
 *
 * Opens on what this browser gave last time, so a second manual is Run, then
 * Run.
 */
import { useEffect, useState } from "react";
import { EditModal } from "@/components/settings/EditModal";
import { useLocale } from "@/lib/i18n/client";
import type { ManualCover } from "@/lib/manual-prompt";

const REMEMBERED = "sc4sap.manualCover";

const EMPTY: ManualCover = { author: "", team: "", company: "", confidentiality: "" };

function remembered(): ManualCover {
  try {
    const raw = localStorage.getItem(REMEMBERED);
    if (!raw) return EMPTY;
    const stored = JSON.parse(raw) as Partial<ManualCover>;
    const text = (value: unknown): string => (typeof value === "string" ? value : "");
    return {
      author: text(stored.author),
      team: text(stored.team),
      company: text(stored.company),
      confidentiality: text(stored.confidentiality),
    };
  } catch {
    return EMPTY;
  }
}

export function ManualSurveyModal({
  program,
  onRun,
  onCancel,
}: {
  program: string;
  onRun: (cover: ManualCover) => void;
  onCancel: () => void;
}) {
  const { t: messages } = useLocale();
  const t = messages.manualSurvey;
  const [cover, setCover] = useState<ManualCover>(EMPTY);

  // What this browser gave last time, read once the page is live.
  useEffect(() => setCover(remembered()), []);

  const run = (): void => {
    const trimmed: ManualCover = {
      author: cover.author.trim(),
      team: cover.team.trim(),
      company: cover.company.trim(),
      confidentiality: cover.confidentiality.trim(),
    };
    try {
      localStorage.setItem(REMEMBERED, JSON.stringify(trimmed));
    } catch {
      // Storage refused: the next manual opens on empty fields instead.
    }
    onRun(trimmed);
  };

  const field = (key: keyof ManualCover, label: string, placeholder: string) => (
    <label className="field" key={key}>
      <span className="field-label">{label}</span>
      <input
        type="text"
        value={cover[key]}
        placeholder={placeholder}
        maxLength={120}
        onChange={(event) => setCover((current) => ({ ...current, [key]: event.target.value }))}
      />
    </label>
  );

  return (
    <EditModal
      kind={t.kind}
      heading={t.title(program)}
      description={t.description}
      submitLabel={t.run}
      onSubmit={run}
      onCancel={onCancel}
    >
      {field("author", t.author, t.authorPlaceholder)}
      {field("team", t.team, t.teamPlaceholder)}
      {field("company", t.company, t.companyPlaceholder)}
      {field("confidentiality", t.confidentiality, t.confidentialityPlaceholder)}
    </EditModal>
  );
}
