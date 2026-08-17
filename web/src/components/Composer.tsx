import { useState } from "react";

type Props = {
  disabled: boolean;
  hint: string;
  onSend: (text: string) => void;
};

export function Composer({ disabled, hint, onSend }: Props) {
  const [text, setText] = useState("");

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
        value={text}
        rows={2}
        placeholder={hint}
        disabled={disabled}
        onChange={(event) => setText(event.target.value)}
        onKeyDown={(event) => {
          // Enter sends, Shift+Enter breaks the line — the chat convention.
          if (event.key === "Enter" && !event.shiftKey) {
            event.preventDefault();
            submit();
          }
        }}
      />
      <button className="primary" type="submit" disabled={disabled || !text.trim()}>
        Send
      </button>
    </form>
  );
}
