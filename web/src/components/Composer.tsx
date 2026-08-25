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
  onSend: (text: string) => void;
};

export function Composer({
  disabled,
  hint,
  model,
  autoFocus = false,
  onSend,
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
        <button
          className="composer-send"
          type="submit"
          disabled={disabled || !text.trim()}
          aria-label="Send"
        >
          <Icon name="arrow-up" />
        </button>
      </div>
    </form>
  );
}
