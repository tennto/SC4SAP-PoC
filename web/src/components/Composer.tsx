"use client";

import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/Icon";
import { FileChip } from "@/components/FileChip";
import { Select } from "@/components/Select";
import { useLocale } from "@/lib/i18n/client";
import {
  ACCEPT,
  LIMITS,
  prepare,
  toMeta,
  type Draft,
} from "@/lib/attachments";

/**
 * `claude-sonnet-5` reads as `Sonnet 5`, `claude-haiku-4-5-20251001` as
 * `Haiku 4.5`. Used for the chip under the box, which is a picker when the
 * caller passes the list the backend offers and a plain label when it does
 * not — a running session's model is fixed at the moment it was opened.
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
  /** From `/health`. Null while the snapshot is missing. */
  model: string | null;
  /**
   * What the backend will open a session on. Given, the chip becomes a
   * picker; omitted, it stays the label it was.
   *
   * Worth offering rather than leaving to server config: reading a table or a
   * program is work Haiku does, and it costs half what Sonnet does on input —
   * which is most of what a turn is billed for.
   */
  models?: { id: string; label: string; note: string }[];
  /** Called with the chosen id. The next session opened uses it. */
  onModelChange?: (id: string) => void;
  /** Focus on mount — true on the empty state, where the box is the screen. */
  autoFocus?: boolean;
  /**
   * A turn is running. The send button becomes a stop button for as long as
   * it is, which is the only control this screen has over a turn already
   * handed over.
   */
  running?: boolean;
  /** `files` is what was attached, already read and checked. Often empty. */
  onSend: (text: string, files: Draft[]) => void;
  /** Only called while `running`. */
  onStop?: () => void;
  /** A file could not be attached, and this is why. */
  onReject?: (message: string) => void;
  /**
   * Text to open with, typed and not sent. The monitor hands a question
   * about a tool call over this way. Applied whenever it changes; the reader
   * edits or sends it from there.
   */
  seed?: string | null;
};

export function Composer({
  disabled,
  hint,
  model,
  models,
  onModelChange,
  autoFocus = false,
  running = false,
  onSend,
  onStop,
  onReject,
  seed = null,
}: Props) {
  const { t: messages } = useLocale();
  const t = messages.composer;
  const [text, setText] = useState("");

  useEffect(() => {
    if (!seed) return;
    setText(seed);
    // Put the caret at the end, so typing continues the question rather than
    // prepending to it.
    const el = area.current;
    if (el) {
      el.focus();
      el.setSelectionRange(seed.length, seed.length);
    }
  }, [seed]);
  /**
   * Files chosen and not yet sent. Read into memory on the click, so the
   * size check and the image downscale happen while the reader is still
   * typing rather than on the send.
   */
  const [files, setFiles] = useState<Draft[]>([]);
  /** Files still being read — the chip row shows a placeholder for each. */
  const [reading, setReading] = useState(0);
  /**
   * Files are being dragged over the window — anywhere in it. The drop
   * target is the whole screen, and a veil says so; asking the reader to
   * find the composer with a file in hand was the one thing a drag should
   * not need.
   */
  const [over, setOver] = useState(false);
  // Enter/leave fire for every element the drag crosses; the veil stays up
  // while the count is above zero and comes down when the file leaves the
  // window or lands.
  const dragDepth = useRef(0);
  /**
   * The plus menu is showing. One row today; a menu rather than a bare
   * picker button so the next thing that belongs here has a place to go.
   */
  const [menu, setMenu] = useState(false);
  const area = useRef<HTMLTextAreaElement>(null);
  const picker = useRef<HTMLInputElement>(null);
  const tools = useRef<HTMLDivElement>(null);

  // The menu closes on a click anywhere else, and on Escape — the same two
  // exits the account menu has, so the two feel like one product.
  useEffect(() => {
    if (!menu) return;
    const onPointerDown = (event: MouseEvent): void => {
      if (!tools.current?.contains(event.target as Node)) setMenu(false);
    };
    const onKey = (event: KeyboardEvent): void => {
      if (event.key === "Escape") setMenu(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [menu]);

  const pick = (): void => {
    setMenu(false);
    picker.current?.click();
  };

  /**
   * Window-level drag handling. Only file drags count — a selection of text
   * dragged across the page is not an attachment — and nothing is accepted
   * while the box is closed or a turn is running.
   */
  const acceptingDrops = !disabled && !running;
  useEffect(() => {
    if (!acceptingDrops) return;

    const hasFiles = (event: DragEvent): boolean =>
      [...(event.dataTransfer?.types ?? [])].includes("Files");

    const onEnter = (event: DragEvent): void => {
      if (!hasFiles(event)) return;
      event.preventDefault();
      dragDepth.current += 1;
      setOver(true);
    };
    const onOver = (event: DragEvent): void => {
      if (!hasFiles(event)) return;
      // Without this the browser opens the file instead of handing it over.
      event.preventDefault();
      if (event.dataTransfer) event.dataTransfer.dropEffect = "copy";
    };
    const onLeave = (event: DragEvent): void => {
      if (!hasFiles(event)) return;
      dragDepth.current = Math.max(0, dragDepth.current - 1);
      if (dragDepth.current === 0) setOver(false);
    };
    const onDrop = (event: DragEvent): void => {
      dragDepth.current = 0;
      setOver(false);
      if (!hasFiles(event)) return;
      event.preventDefault();
      const dropped = event.dataTransfer?.files;
      if (dropped && dropped.length > 0) void attachRef.current(dropped);
    };
    // A drag cancelled with Escape sends no leave; `dragend` is what arrives.
    const onEnd = (): void => {
      dragDepth.current = 0;
      setOver(false);
    };

    window.addEventListener("dragenter", onEnter);
    window.addEventListener("dragover", onOver);
    window.addEventListener("dragleave", onLeave);
    window.addEventListener("drop", onDrop);
    window.addEventListener("dragend", onEnd);
    return () => {
      window.removeEventListener("dragenter", onEnter);
      window.removeEventListener("dragover", onOver);
      window.removeEventListener("dragleave", onLeave);
      window.removeEventListener("drop", onDrop);
      window.removeEventListener("dragend", onEnd);
    };
  }, [acceptingDrops]);
  // Read inside `attach`, which is async and would otherwise see the list
  // as it was when the read started.
  const filesRef = useRef<Draft[]>([]);
  useEffect(() => {
    filesRef.current = files;
  }, [files]);

  // Grows with the prompt to a ceiling, then scrolls. A fixed two rows read as
  // inert on the empty state, where this box is the only thing on the page.
  useEffect(() => {
    const el = area.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 220)}px`;
  }, [text]);

  // Object URLs are not garbage collected; whatever is still previewed when
  // the box goes is released with it.
  useEffect(
    () => () => {
      for (const file of filesRef.current) {
        if (file.preview) URL.revokeObjectURL(file.preview);
      }
    },
    [],
  );

  /**
   * Reads a batch of chosen files into chips, one at a time so the ceilings
   * are checked against what the earlier ones in the same batch added.
   */
  const attachRef = useRef<(chosen: Iterable<File>) => Promise<void>>(
    async () => {},
  );
  const attach = async (chosen: Iterable<File>): Promise<void> => {
    const list = [...chosen];
    if (list.length === 0) return;
    setReading((count) => count + list.length);
    try {
      for (const file of list) {
        const result = await prepare(file, filesRef.current);
        if (!result.ok) {
          onReject?.(result.error);
        } else {
          const next = [...filesRef.current, result.draft];
          filesRef.current = next;
          setFiles(next);
        }
        setReading((count) => count - 1);
      }
    } finally {
      // Whatever was counted and not decremented — a throw mid-batch.
      setReading(0);
    }
    area.current?.focus();
  };
  attachRef.current = attach;

  const remove = (id: string): void => {
    setFiles((current) => {
      const gone = current.find((file) => file.id === id);
      if (gone?.preview) URL.revokeObjectURL(gone.preview);
      return current.filter((file) => file.id !== id);
    });
  };

  const canSend = !disabled && (text.trim() !== "" || files.length > 0);

  const submit = (): void => {
    // The same key and the same button both stop a running turn — pressing
    // Enter with a half-typed follow-up should not queue it behind an answer
    // being abandoned.
    if (running) {
      onStop?.();
      return;
    }
    if (!canSend || reading > 0) return;
    onSend(text.trim(), files);
    setText("");
    // The chips' previews belong to the transcript now, which does not use
    // them — the stored row keeps only names — so they can go.
    for (const file of files) {
      if (file.preview) URL.revokeObjectURL(file.preview);
    }
    setFiles([]);
  };

  const full = files.length >= LIMITS.maxFiles;

  return (
    <form
      className={`composer${over ? " is-over" : ""}`}
      onSubmit={(event) => {
        event.preventDefault();
        submit();
      }}
    >
      {(files.length > 0 || reading > 0) && (
        <div className="composer-files">
          {files.map((file) => (
            <FileChip
              key={file.id}
              file={toMeta(file)}
              preview={file.preview}
              onRemove={() => remove(file.id)}
            />
          ))}
          {Array.from({ length: reading }, (_, index) => (
            <span key={`reading-${index}`} className="file-chip is-reading">
              <span className="file-chip-glyph">
                <Icon name="circle-notch" />
              </span>
              <span className="file-chip-name">{t.reading}</span>
            </span>
          ))}
        </div>
      )}

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
        // A screenshot pasted from the clipboard is a file like any other.
        onPaste={(event) => {
          if (disabled || running) return;
          const pasted = [...event.clipboardData.items]
            .filter((item) => item.kind === "file")
            .map((item) => item.getAsFile())
            .filter((file): file is File => file !== null);
          if (pasted.length === 0) return;
          event.preventDefault();
          void attach(pasted);
        }}
      />

      {/* The veil over the whole window while a file is in the air. Inert to
          the pointer, so the drop still reaches the window listener, and
          only ever a message: what it says is where the file may go. */}
      {over && (
        <div className="drop-veil" aria-hidden>
          <div className="drop-veil-card">
            <Icon name="upload-simple" />
            <span className="drop-veil-title">{t.dropTitle}</span>
            <span className="drop-veil-hint">{t.dropHint(LIMITS.maxFiles)}</span>
          </div>
        </div>
      )}

      <div className="composer-foot">
        <div className="composer-tools" ref={tools}>
          <input
            ref={picker}
            type="file"
            multiple
            accept={ACCEPT}
            hidden
            onChange={(event) => {
              const chosen = event.target.files;
              if (chosen) void attach(chosen);
              // So the same file can be chosen again after being removed.
              event.target.value = "";
            }}
          />
          <button
            type="button"
            className={`composer-attach${menu ? " open" : ""}`}
            disabled={disabled || running || full}
            onClick={() => setMenu((current) => !current)}
            aria-label={t.add}
            aria-haspopup="menu"
            aria-expanded={menu}
            title={full ? t.atMostFiles(LIMITS.maxFiles) : t.add}
          >
            <Icon name="plus" />
          </button>
          {menu && (
            <div className="composer-menu" role="menu">
              <button
                type="button"
                className="composer-menu-item"
                role="menuitem"
                onClick={pick}
              >
                <Icon name="paperclip" />
                <span className="composer-menu-text">
                  <span className="composer-menu-label">{t.addFiles}</span>
                  <span className="composer-menu-hint">{t.addFilesHint}</span>
                </span>
              </button>
            </div>
          )}
          {models && models.length > 1 && onModelChange ? (
            <span className="composer-model-pick">
              <Select
                name="model"
                value={model ?? models[0]!.id}
                options={models.map((entry) => ({
                  value: entry.id,
                  label: entry.label,
                }))}
                onChange={onModelChange}
              />
            </span>
          ) : (
            <span className="composer-model" title={model ?? undefined}>
              {model ? modelLabel(model) : "—"}
            </span>
          )}
        </div>
        {/* One button, two jobs. A separate stop control beside the send one
            would sit dead for the whole time it is not needed, and the two are
            never both available: there is nothing to send while a turn is
            running, and nothing to stop while one is not.

            Not disabled by an empty box while running — what it acts on then
            is the turn, not the text. */}
        <button
          className={`composer-send${running ? " is-stop" : ""}`}
          type="submit"
          disabled={running ? false : !canSend || reading > 0}
          aria-label={running ? t.stop : t.send}
          title={running ? t.stopTitle : undefined}
        >
          <Icon name={running ? "stop" : "arrow-up"} weight={running ? "fill" : "regular"} />
        </button>
      </div>
    </form>
  );
}
