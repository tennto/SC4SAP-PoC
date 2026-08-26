"use client";

/**
 * A dialog that tells rather than asks.
 *
 * Separate from `ConfirmModal` on purpose, and not a mode of it: that one is
 * built around a question — two buttons and a busy state that locks both.
 * Neither applies to a statement; there is nothing to decide and nothing in
 * flight, so there is one button and it is always live.
 *
 * What it does share is that a click on the backdrop is not a way out. The
 * dialog is here because something is worth reading, and a stray click on the
 * way to it should not throw it away before it has been. The button dismisses
 * it, and Escape does the same thing from the keyboard.
 *
 * It borrows `.modal.confirm`'s styling, which is the size and rhythm a short
 * dialog wants and is worth sharing even though the behaviour is not.
 *
 * Two things here that the app's other modals do not do:
 *
 * It renders into `document.body` rather than where it was written. A dialog
 * covers the window, and `position: fixed` only means the window while no
 * ancestor has a transform, a filter or containment — properties that turn an
 * ancestor into the containing block and quietly shrink the overlay to the
 * card it was declared inside. The panels on the dashboard animate on
 * arrival, so this was not hypothetical. A portal takes the question off the
 * table wherever it is mounted.
 *
 * And it survives its own dismissal for as long as the exit animation runs.
 * Unmounting on the click removes the element the animation would have played
 * on, so a leaving class goes on first and the unmount waits for
 * `animationend`.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Icon } from "@/components/Icon";

export function NoticeModal({
  kind,
  heading,
  description,
  icon,
  dismissLabel = "OK",
  onDismiss,
}: {
  /** The uppercase pill at the top of the dialog. */
  kind: string;
  heading: string;
  description?: string;
  /** Phosphor name, without the `ph-` prefix. */
  icon?: string;
  dismissLabel?: string;
  onDismiss: () => void;
}) {
  const dismissRef = useRef<HTMLButtonElement>(null);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    dismissRef.current?.focus();
  }, []);

  const dismiss = useCallback((): void => {
    // Already on the way out. A second Escape or a click through the fading
    // backdrop should not restart the exit.
    if (leaving) return;
    // Reduced motion takes the exit animation away, and `animationend` with
    // it — waiting for an event that is not coming would leave the dialog on
    // screen for good. Nothing to play, so nothing to wait for.
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      onDismiss();
      return;
    }
    setLeaving(true);
  }, [leaving, onDismiss]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent): void => {
      if (event.key === "Escape") dismiss();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [dismiss]);

  // The portal target does not exist while this is being rendered on the
  // server. Nothing renders it there today — it only appears on a click — but
  // a null is a cheaper answer than a crash if that ever changes.
  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      className={`modal-backdrop${leaving ? " leaving" : ""}`}
      // The card's animation bubbles through here too, and the entrance ends
      // the same way the exit does — so this acts on the backdrop's own end,
      // and only once it is the exit that is ending.
      onAnimationEnd={(event) => {
        if (leaving && event.target === event.currentTarget) onDismiss();
      }}
    >
      <div
        className="modal confirm"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="notice-heading"
        aria-describedby={description ? "notice-description" : undefined}
      >
        <div className="modal-head">
          <span className="modal-kind">{kind}</span>
        </div>

        <h2 id="notice-heading" className="confirm-question">
          {icon ? <Icon name={icon} /> : null}
          {heading}
        </h2>

        {description ? (
          <p id="notice-description" className="modal-description">
            {description}
          </p>
        ) : null}

        <div className="modal-actions">
          {/* The only control in the dialog, and it is the affirmative one —
              `primary`, like the confirming button it stands in for. */}
          <button className="primary" ref={dismissRef} onClick={dismiss}>
            {dismissLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
