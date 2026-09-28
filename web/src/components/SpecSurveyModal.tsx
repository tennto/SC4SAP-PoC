"use client";

/**
 * Program → Spec's survey, asked when Run is pressed in Standard mode.
 *
 * The questions the plugin's skill would otherwise ask mid-run — how deep,
 * and for whom — drawn the way the app
 * already draws a skill asking something (`ApprovalModal`'s question form),
 * but answered here before anything starts: no session, no model, no cost.
 *
 * Every question opens on an answer: the last one given in this browser, or
 * the recommended one. So a second run is Run, then Run.
 */
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useLocale } from "@/lib/i18n/client";
import type { SpecSurvey } from "@/lib/spec-prompt";

/** What this dialog asks. Package, program, files, language and mode are on the form. */
export type SpecAnswers = Pick<SpecSurvey, "depth" | "audience">;

const REMEMBERED = "sc4sap.specSurvey";

const DEFAULTS: SpecAnswers = {
  depth: "Detailed",
  audience: "Both",
};

function remembered(): SpecAnswers {
  try {
    const raw = localStorage.getItem(REMEMBERED);
    if (!raw) return DEFAULTS;
    const stored = JSON.parse(raw) as Partial<SpecAnswers>;
    return {
      depth: stored.depth === "Summary" ? "Summary" : "Detailed",
      audience: stored.audience ?? DEFAULTS.audience,
    };
  } catch {
    return DEFAULTS;
  }
}

type Choice<T extends string> = { value: T; label: string; description?: string };

export function SpecSurveyModal({
  program,
  onRun,
  onCancel,
}: {
  program: string;
  onRun: (answers: SpecAnswers) => void;
  onCancel: () => void;
}) {
  const { t: messages } = useLocale();
  const t = messages.specSurvey;
  const [answers, setAnswers] = useState<SpecAnswers>(DEFAULTS);

  // What this browser answered last time, read once the page is live.
  useEffect(() => setAnswers(remembered()), []);

  const set = <K extends keyof typeof answers>(key: K, value: (typeof answers)[K]): void =>
    setAnswers((current) => ({ ...current, [key]: value }));

  const run = (): void => {
    try {
      localStorage.setItem(REMEMBERED, JSON.stringify(answers));
    } catch {
      // Storage refused: the next run opens on the defaults instead.
    }
    onRun(answers);
  };

  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  useEffect(() => {
    const onKey = (event: KeyboardEvent): void => {
      if (event.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onCancel]);
  if (!mounted) return null;

  const depths: Choice<SpecSurvey["depth"]>[] = [
    { value: "Detailed", label: t.detailed, description: t.detailedNote },
    { value: "Summary", label: t.summary, description: t.summaryNote },
  ];
  const audiences: Choice<SpecSurvey["audience"]>[] = [
    { value: "Both", label: t.both },
    { value: "Functional", label: t.functional },
    { value: "Technical", label: t.technical },
  ];

  /**
   * One question: a small caps header, the question, and its answers side by
   * side. The answers are radio buttons drawn as plain tiles: the chosen one
   * takes an outline and a faint wash rather than turning solid, so the
   * choice reads without shouting over the text in it.
   */
  const group = <T extends string>(
    name: string,
    header: string,
    question: string,
    choices: Choice<T>[],
    picked: T,
    pick: (value: T) => void,
  ) => (
    <fieldset className="survey-question">
      <legend className="survey-legend">
        <span className="survey-header">{header}</span>
        <span className="survey-ask">{question}</span>
      </legend>
      <div
        className="survey-options"
        role="radiogroup"
        aria-label={question}
        style={{ "--cols": choices.length } as React.CSSProperties}
      >
        {choices.map((choice) => {
          const on = picked === choice.value;
          return (
            <button
              key={choice.value}
              type="button"
              role="radio"
              aria-checked={on}
              name={name}
              className={`survey-option${on ? " is-on" : ""}${choice.description ? " has-note" : ""}`}
              onClick={() => pick(choice.value)}
            >
              <span className="survey-option-text">
                <span className="survey-option-label">{choice.label}</span>
                {choice.description && (
                  <span className="survey-option-note">{choice.description}</span>
                )}
              </span>
            </button>
          );
        })}
      </div>
    </fieldset>
  );

  return createPortal(
    <div
      className="modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="spec-survey-title"
    >
      <div className="modal spec-survey">
        <header className="modal-head">
          <span className="modal-kind">{t.kind}</span>
          <strong id="spec-survey-title">{t.title(program)}</strong>
        </header>
        <p className="survey-description">{t.description}</p>

        <div className="survey-list">
          {group("depth", t.depthHeader, t.depthQuestion, depths, answers.depth, (v) => set("depth", v))}
          {group("audience", t.audienceHeader, t.audienceQuestion, audiences, answers.audience, (v) => set("audience", v))}
        </div>

        <footer className="modal-actions survey-actions">
          <button type="button" className="ghost" onClick={onCancel}>
            {t.cancel}
          </button>
          <button
            type="button"
            className="primary"
            onClick={run}
            autoFocus
          >
            {t.run}
          </button>
        </footer>
      </div>
    </div>,
    document.body,
  );
}
