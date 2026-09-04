"use client";

/**
 * A select that can actually be styled.
 *
 * A native `<select>` hands its open list to the operating system to draw. No
 * CSS reaches inside it: no hover of our own, no radius, no animation, no
 * spacing — on Windows it is the same grey list Windows has drawn since 2009,
 * sitting under a card that is none of those things. The only way to have the
 * open state look like the rest of the app is to stop using the native
 * control, which is what this is.
 *
 * That trade has a real cost, and it is paid here rather than skipped: a native
 * select is keyboard-operable, screen-reader-announced and focus-managed for
 * free, so a replacement that only handles the mouse is a downgrade wearing a
 * nicer coat. This one implements the ARIA listbox pattern — arrow keys, Home
 * and End, Enter and Escape, `aria-activedescendant` so a screen reader
 * follows the highlight, and focus returned to the button on close.
 *
 * What it deliberately does not do is reposition itself when it would run off
 * the bottom of the window. Every use is inside a card that is vertically
 * centred with room below it; a flip-up would be machinery for a case this
 * screen does not have.
 */
import { useEffect, useId, useRef, useState } from "react";
import { Icon } from "@/components/Icon";

export type SelectOption = { value: string; label: string };

export function Select({
  value,
  options,
  onChange,
  name,
  labelledBy,
  disabled = false,
  autoFocus = false,
}: {
  value: string;
  options: readonly SelectOption[];
  onChange: (value: string) => void;
  /** Only so the control is findable by name, the way the inputs beside it are. */
  name?: string;
  /** Id of the field label above it. */
  labelledBy?: string;
  disabled?: boolean;
  autoFocus?: boolean;
}) {
  const id = useId();
  const [open, setOpen] = useState(false);
  /**
   * Which option the keyboard is on. Not the same as the selected one — moving
   * through the list with the arrows must not change the value until Enter,
   * or every pass through the list fires a change.
   */
  const [active, setActive] = useState(0);
  const root = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const list = useRef<HTMLUListElement>(null);

  const selected = options.findIndex((option) => option.value === value);
  const current = options[selected] ?? options[0];

  function openList(): void {
    if (disabled) return;
    // Open onto the current value, not onto the top of the list.
    setActive(selected >= 0 ? selected : 0);
    setOpen(true);
  }

  function close(focus = true): void {
    setOpen(false);
    if (focus) button.current?.focus();
  }

  function pick(index: number): void {
    const option = options[index];
    if (option) onChange(option.value);
    close();
  }

  // A click anywhere else is a dismissal. `mousedown` rather than `click`, so
  // pressing on something behind the list closes it before that thing reacts —
  // otherwise the first press outside is spent on closing.
  useEffect(() => {
    if (!open) return;
    const onDown = (event: MouseEvent): void => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    window.addEventListener("mousedown", onDown);
    return () => window.removeEventListener("mousedown", onDown);
  }, [open]);

  // Keep the highlighted row in view when the list is longer than its box.
  useEffect(() => {
    if (!open) return;
    list.current
      ?.querySelector(`[data-index="${active}"]`)
      ?.scrollIntoView({ block: "nearest" });
  }, [open, active]);

  function onKeyDown(event: React.KeyboardEvent): void {
    if (disabled) return;

    if (!open) {
      // The keys that open a native select, and only those. A plain letter
      // must not open it, or typing in the form becomes unpredictable.
      if (["Enter", " ", "ArrowDown", "ArrowUp"].includes(event.key)) {
        event.preventDefault();
        openList();
      }
      return;
    }

    switch (event.key) {
      case "Escape":
        event.preventDefault();
        close();
        break;
      case "Tab":
        // Let focus leave, but do not leave the list hanging open behind it.
        setOpen(false);
        break;
      case "Enter":
      case " ":
        event.preventDefault();
        pick(active);
        break;
      case "ArrowDown":
        event.preventDefault();
        setActive((i) => Math.min(options.length - 1, i + 1));
        break;
      case "ArrowUp":
        event.preventDefault();
        setActive((i) => Math.max(0, i - 1));
        break;
      case "Home":
        event.preventDefault();
        setActive(0);
        break;
      case "End":
        event.preventDefault();
        setActive(options.length - 1);
        break;
    }
  }

  return (
    <div className="select" ref={root}>
      {/* The value, so a form serialisation and an autofill both still see
          something — the button carries no value of its own. */}
      {name ? <input type="hidden" name={name} value={value} /> : null}

      <button
        className={`select-button${open ? " is-open" : ""}`}
        type="button"
        ref={button}
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={`${id}-list`}
        aria-activedescendant={open ? `${id}-option-${active}` : undefined}
        aria-labelledby={labelledBy}
        disabled={disabled}
        autoFocus={autoFocus}
        onClick={() => (open ? close() : openList())}
        onKeyDown={onKeyDown}
      >
        <span className="select-value">{current?.label ?? ""}</span>
        <Icon name="caret-down" className="select-caret" />
      </button>

      {open ? (
        <ul
          className="select-list"
          id={`${id}-list`}
          role="listbox"
          ref={list}
          tabIndex={-1}
          aria-labelledby={labelledBy}
        >
          {options.map((option, index) => (
            <li key={option.value}>
              <button
                className={`select-option${index === active ? " is-active" : ""}`}
                id={`${id}-option-${index}`}
                type="button"
                role="option"
                aria-selected={option.value === value}
                data-index={index}
                // Pointer moves drive the highlight so the mouse and the
                // keyboard cannot disagree about which row is live.
                onMouseEnter={() => setActive(index)}
                onClick={() => pick(index)}
              >
                <span>{option.label}</span>
                {option.value === value ? <Icon name="check" /> : null}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
