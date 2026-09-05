"use client";

import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/Icon";

/**
 * `claude-sonnet-5` reads as `Sonnet 5`, `claude-haiku-4-5-20251001` as
 * `Haiku 4.5`. The chip is a label, not a control: the model is server
 * configuration (`SC4SAP_MODEL`), so offering a picker here would promise a
 * choice the backend does not take.
 */
export function modelLabel(model: string): string {
  const parts = model
    .replace(/^claude-/, "")
    // Trailing release date — `-20251001`.
    .replace(/-\d{8}$/, "")
    .split("-");

  const name = parts[0] ?? model;
  const version = parts.slice(1).join(".");
  const display = name.charAt(0).toUpperCase() + name.slice(1);
  return version ? `${display} ${version}` : display;
}

type Props = {
  disabled: boolean;
  hint: string;
  /** From `/health`. Rendered read-only; null while the snapshot is missing. */
  model: string | null;
  /** Focus on mount — true on the empty state, where the box is the screen. */
  autoFocus?: boolean;
  /**
   * A turn is running. The send button becomes a stop button for as long as
   * it is, which is the only control this screen has over a turn already
   * handed over.
   */
  running?: boolean;
  onSend: (text: string) => void;
  /** Only called while `running`. */
  onStop?: () => void;
};

export function Composer({
  disabled,
  hint,
  model,
  autoFocus = false,
  running = false,
  onSend,
  onStop,
}: Props) {
  const [text, setText] = useState("");
  const area = useRef<HTMLTextAreaElement>(null);

  // Grows with the prompt to a ceiling, then scrolls. A fixed two rows read as
  // inert on the empty state, where this box is the only thing on the page.
  useEffect(() => {
    const el = area.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 220)}px`;
  }, [text]);

  const submit = (): void => {
    // The same key and the same button both stop a running turn — pressing
    // Enter with a half-typed follow-up should not queue it behind an answer
    // being abandoned.
    if (running) {
      onStop?.();
      return;
    }
    const trimmed = text.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setText("");
  };

  return (
    <form
      className="composer"
      onSubmit={(event) => {
        event.preventDefault();
        submit();
      }}
    >
      <textarea
        ref={area}
        value={text}
        rows={1}
        placeholder={hint}
        disabled={disabled}
        autoFocus={autoFocus}
        onChange={(event) => setText(event.target.value)}
        onKeyDown={(event) => {
          // Enter sends, Shift+Enter breaks the line — the chat convention.
          if (event.key === "Enter" && !event.shiftKey) {
            event.preventDefault();
            submit();
          }
        }}
      />

      <div className="composer-foot">
        <span className="composer-model" title={model ?? undefined}>
          {model ? modelLabel(model) : "—"}
        </span>
        {/* One button, two jobs. A separate stop control beside the send one
            would sit dead for the whole time it is not needed, and the two are
            never both available: there is nothing to send while a turn is
            running, and nothing to stop while one is not.

            Not disabled by an empty box while running — what it acts on then
            is the turn, not the text. */}
        <button
          className={`composer-send${running ? " is-stop" : ""}`}
          type="submit"
          disabled={running ? false : disabled || !text.trim()}
          aria-label={running ? "Stop" : "Send"}
          title={running ? "Stop this answer" : undefined}
        >
          <Icon name={running ? "stop" : "arrow-up"} weight={running ? "fill" : "regular"} />
        </button>
      </div>
    </form>
  );
}
