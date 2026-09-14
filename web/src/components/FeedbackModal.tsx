"use client";

/**
 * Feedback capture.
 *
 * The rating is icons only — no labels under the faces, on purpose. A face
 * scale is read left-to-right as a gradient, and printing "Very poor / Poor /
 * Okay …" underneath makes people read five words instead of picking a face.
 * The words still exist for anyone who cannot see the faces: each button
 * carries the label as `aria-label` and as a `title`, so a screen reader
 * announces it and a hover tooltip spells it out.
 *
 * Nothing is submitted yet. There is no feedback endpoint on the backend, and
 * inventing one here would mean picking where feedback lands before anyone has
 * decided that.
 *
 * A backdrop click does not dismiss it. There is typed text in here, and
 * losing a half-written paragraph to a misplaced click is a worse outcome than
 * making someone reach for Cancel. Escape still closes it.
 */
import { useEffect, useState } from "react";
import { Icon } from "@/components/Icon";
import { useLocale } from "@/lib/i18n/client";

/** Worst to best, which is also the order they are rendered in. The words
    are `feedback.ratings` in the dictionary, in the same order. */
const RATINGS = [
  { value: 1, icon: "smiley-angry" },
  { value: 2, icon: "smiley-sad" },
  { value: 3, icon: "smiley-meh" },
  { value: 4, icon: "smiley" },
  { value: 5, icon: "smiley-wink" },
] as const;

export function FeedbackModal({ onClose }: { onClose: () => void }) {
  const { t: messages } = useLocale();
  const t = messages.feedback;
  const [rating, setRating] = useState<number | null>(null);
  const [text, setText] = useState("");

  useEffect(() => {
    const onKey = (event: KeyboardEvent): void => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="modal-backdrop">
      <div
        className="modal feedback"
        role="dialog"
        aria-modal="true"
        aria-labelledby="feedback-heading"
      >
        <div className="modal-head">
          <span className="modal-kind">{t.kind}</span>
        </div>

        <h2 id="feedback-heading" className="feedback-question">
          {t.question}
        </h2>

        <div className="rating" role="radiogroup" aria-label={t.overall}>
          {RATINGS.map((option) => (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={rating === option.value}
              aria-label={t.ratings[option.value - 1]}
              title={t.ratings[option.value - 1]}
              className={`rating-face${rating === option.value ? " picked" : ""}`}
              onClick={() => setRating(option.value)}
            >
              <Icon name={option.icon} />
            </button>
          ))}
        </div>

        <label className="field">
          <span className="field-label">{t.anythingElse}</span>
          <textarea
            rows={5}
            value={text}
            placeholder={t.placeholder}
            onChange={(event) => setText(event.target.value)}
          />
        </label>

        <div className="modal-actions">
          <p className="modal-note">{t.notWired}</p>
          <button className="ghost" onClick={onClose}>
            {t.cancel}
          </button>
          <button className="primary" disabled={rating === null && !text.trim()}>
            {t.send}
          </button>
        </div>
      </div>
    </div>
  );
}
