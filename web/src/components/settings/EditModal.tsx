"use client";

/**
 * A dialog that edits something.
 *
 * The third of the app's three: `ConfirmModal` asks a yes-or-no question,
 * `NoticeModal` states something, and this one holds fields and a Save. They
 * are not modes of one component because the differences are behavioural, not
 * cosmetic — this one owns a submit, can refuse what it was given and has to
 * stay open to say so, which neither of the others can do.
 *
 * A backdrop click does not dismiss it. There is typed text in here, and
 * losing an edit to a misplaced click is worse than making someone reach for
 * Cancel. Escape closes it, and not while a save is in flight.
 *
 * It renders into `document.body`. A dialog covers the window, and
 * `position: fixed` only means the window while no ancestor has a transform —
 * the panels on this screen animate in on arrival, so a dialog declared inside
 * one would be laid out against the card rather than the viewport.
 */
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

export function EditModal({
  kind,
  heading,
  description,
  submitLabel,
  busy = false,
  disabled = false,
  error,
  children,
  onSubmit,
  onCancel,
}: {
  /** The uppercase pill at the top of the dialog. */
  kind: string;
  heading: string;
  description?: string;
  submitLabel: string;
  /** The save is in flight: every control locks, including Cancel. */
  busy?: boolean;
  /** Nothing to save yet — the form is incomplete or unchanged. */
  disabled?: boolean;
  /** What the last attempt was refused for, shown above the buttons. */
  error?: string | null;
  children: React.ReactNode;
  onSubmit: () => void;
  onCancel: () => void;
}) {
  // Portals need a DOM, and this is rendered on the server first.
  const [mounted, setMounted] = useState(false);
  const first = useRef<HTMLDivElement>(null);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent): void => {
      if (event.key === "Escape" && !busy) onCancel();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onCancel, busy]);

  // The first field, not the Save button: this dialog is opened to type in,
  // and landing on Save would mean tabbing backwards to reach the thing the
  // dialog is for.
  useEffect(() => {
    if (!mounted) return;
    first.current?.querySelector<HTMLElement>("input, select, button")?.focus();
  }, [mounted]);

  if (!mounted) return null;

  return createPortal(
    <div className="modal-backdrop">
      <form
        className="modal edit"
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-heading"
        onSubmit={(event) => {
          event.preventDefault();
          if (!busy && !disabled) onSubmit();
        }}
        noValidate
      >
        <div className="modal-head">
          <span className="modal-kind">{kind}</span>
        </div>

        <h2 id="edit-heading" className="confirm-question">
          {heading}
        </h2>

        {description && <p className="modal-description">{description}</p>}

        <div className="fields" ref={first}>
          {children}
        </div>

        <div className="modal-actions">
          {error && <p className="modal-error">{error}</p>}
          <button
            type="button"
            className="ghost"
            onClick={onCancel}
            disabled={busy}
          >
            Cancel
          </button>
          <button type="submit" className="primary" disabled={busy || disabled}>
            {busy ? "Saving…" : submitLabel}
          </button>
        </div>
      </form>
    </div>,
    document.body,
  );
}

/**
 * One line of a settings panel: what the setting is, what it currently says,
 * and the pencil that opens the dialog to change it.
 *
 * A row rather than an input, because these are read far more often than they
 * are changed — most visits to this screen are someone checking which client
 * they are pointed at. A form of live inputs answers that question too, but it
 * also asks one on every field: is this a value, or a value I am in the middle
 * of changing.
 */
export function SettingRow({
  label,
  value,
  hint,
  action,
}: {
  label: string;
  value: React.ReactNode;
  hint?: string;
  /** The control on the right. Omitted for a row that cannot be changed. */
  action?: React.ReactNode;
}) {
  return (
    <div className="setting-row">
      <div className="setting-main">
        <span className="setting-label">{label}</span>
        <span className="setting-value">{value}</span>
        {hint && <span className="setting-hint">{hint}</span>}
      </div>
      {action}
    </div>
  );
}

/** The pencil. Icon-only, so the label it would have carried is its name. */
export function EditButton({
  label,
  onClick,
}: {
  /** Announced and shown on hover — "Edit name", not "Edit". */
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className="icon-button"
      onClick={onClick}
      aria-label={label}
      title={label}
    >
      <i className="ph ph-pencil-simple" aria-hidden="true" />
    </button>
  );
}
