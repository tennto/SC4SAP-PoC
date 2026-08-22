"use client";

/**
 * A yes-or-no dialog.
 *
 * Written generic rather than as a logout-specific component: signing out is
 * the first thing that needed confirming, but closing a session and deleting a
 * connection profile are the same question with different words, and three
 * near-identical modals would drift apart.
 *
 * A backdrop click does NOT dismiss it. The dialog is asking a question, and a
 * stray click on the way to it is not an answer — cancelling has its own
 * button, and Escape is the keyboard equivalent. The confirm button takes
 * focus on mount so the keyboard path is Enter to agree, Escape to back out.
 */
import { useEffect, useRef } from "react";
import { Icon } from "@/components/Icon";

export function ConfirmModal({
  kind,
  heading,
  description,
  confirmLabel,
  confirmIcon,
  cancelLabel = "Cancel",
  note,
  busy = false,
  onConfirm,
  onCancel,
}: {
  /** The uppercase pill at the top of the dialog. */
  kind: string;
  heading: string;
  description?: string;
  confirmLabel: string;
  /** Phosphor name, without the `ph-` prefix. */
  confirmIcon?: string;
  cancelLabel?: string;
  /** Small print on the left of the button row. */
  note?: string;
  /**
   * The confirmed action is in flight. Both buttons lock, so a second press
   * cannot fire it twice and cancelling cannot race the thing it would be
   * cancelling.
   */
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const confirmRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    confirmRef.current?.focus();
  }, []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent): void => {
      if (event.key === "Escape" && !busy) onCancel();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onCancel, busy]);

  return (
    <div className="modal-backdrop">
      <div
        className="modal confirm"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-heading"
        aria-describedby={description ? "confirm-description" : undefined}
      >
        <div className="modal-head">
          <span className="modal-kind">{kind}</span>
        </div>

        <h2 id="confirm-heading" className="confirm-question">
          {heading}
        </h2>

        {description ? (
          <p id="confirm-description" className="modal-description">
            {description}
          </p>
        ) : null}

        <div className="modal-actions">
          {note ? <p className="modal-note">{note}</p> : null}
          <button className="ghost" onClick={onCancel} disabled={busy}>
            {cancelLabel}
          </button>
          <button
            className="primary"
            ref={confirmRef}
            onClick={onConfirm}
            disabled={busy}
          >
            {confirmIcon ? <Icon name={busy ? "circle-notch" : confirmIcon} /> : null}
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
