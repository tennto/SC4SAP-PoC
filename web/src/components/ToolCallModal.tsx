"use client";

/**
 * One tool call, opened from the monitor's list.
 *
 * Everything the row holds, laid out to be read rather than scanned: the
 * facts as a list, the input as a highlighted JSON block. And, on a call that
 * failed or was refused, one way onward — "Ask in chat". A reader looking at
 * a failed `GetTypeInfo` wants to ask why, and the conversation the call
 * happened in is where the agent still remembers the answer. A call that
 * succeeded raises no question, so it gets no button.
 *
 * That hand-off works the way a skill run's "Continue in chat" does: the
 * session id goes into `localStorage` under the key the chat screen reads on
 * load, and the question goes in beside it as a draft for the composer. The
 * chat opens on that conversation with the question typed and not sent. If
 * the backend has since let the session go, the chat still opens on its
 * stored transcript, and the question is asked of a fresh session with that
 * transcript as context — which is what the chat does for any revived
 * conversation.
 *
 * What is not here is the result. The log keeps its size and whether it
 * failed, never its body — a table read is tens of kilobytes, and a log that
 * kept them would be the largest thing in the database within a day. The
 * modal says so rather than leaving a gap.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/Icon";
import { Markdown } from "@/components/Markdown";
import type { ToolCall } from "@/lib/types";
import { useLocale } from "@/lib/i18n/client";

/** Where the chat screen looks for the conversation to open on load. */
const ACTIVE_KEY = "sc4sap.activeSession";
/** Where the chat screen looks for text to put in the composer on load. */
const DRAFT_KEY = "sc4sap.chatDraft";

const two = (value: number): string => String(value).padStart(2, "0");

/** `2026-09-12 00:17:56`, local. */
function stamp(iso: string): string {
  const at = new Date(iso);
  return `${at.getFullYear()}-${two(at.getMonth() + 1)}-${two(at.getDate())} ${two(at.getHours())}:${two(at.getMinutes())}:${two(at.getSeconds())}`;
}

function duration(ms: number | null): string {
  if (ms === null) return "—";
  if (ms < 1000) return `${ms} ms`;
  return `${(ms / 1000).toFixed(ms < 10_000 ? 1 : 0)} s`;
}

function size(bytes: number | null): string {
  if (bytes === null) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}


/**
 * The stored preview, pretty-printed when it is whole JSON.
 *
 * The backend keeps the first two thousand characters of the input. Most
 * inputs are far shorter and parse; a long one ends in an ellipsis and is
 * shown as it was kept, with a line saying so.
 */
function inputBlock(preview: string): { text: string; truncated: boolean } {
  const truncated = preview.endsWith("…");
  if (!truncated) {
    try {
      return { text: JSON.stringify(JSON.parse(preview), null, 2), truncated: false };
    } catch {
      // Not JSON after all. Shown as kept.
    }
  }
  return { text: preview, truncated };
}

/**
 * What the composer opens with. A question, not a report — the reader edits
 * it. Only failed and refused calls get the button, so those are the two
 * questions there are.
 */
function questionFor(call: ToolCall): string {
  const when = stamp(call.startedAt);
  const about = `the ${call.tool} call at ${when}`;
  const input = call.inputPreview && call.inputPreview !== "{}" ? ` with input ${call.inputPreview}` : "";
  if (call.decision === "denied" || call.decision === "expired") {
    return `About ${about}${input}: it was not approved. What would it have read, and is it safe to allow?`;
  }
  return `About ${about}${input}: it failed. Why, and what should I check?`;
}

export function ToolCallModal({
  call,
  onClose,
}: {
  call: ToolCall;
  onClose: () => void;
}) {
  const router = useRouter();
  const { t: messages } = useLocale();
  const t = messages.monitor;
  const closeRef = useRef<HTMLButtonElement>(null);
  const [leaving, setLeaving] = useState(false);
  /** The copy button just worked, and says so for a moment. */
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    closeRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 1500);
    return () => clearTimeout(timer);
  }, [copied]);

  const dismiss = useCallback((): void => {
    if (leaving) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      onClose();
      return;
    }
    setLeaving(true);
  }, [leaving, onClose]);

  // The exit waits for `animationend`, and a background tab does not run CSS
  // animations — so a dialog dismissed while the tab was hidden stayed
  // mounted, invisible, over the whole page, eating every click until the
  // tab was looked at again. A deadline a little past the animation's length
  // closes it either way.
  useEffect(() => {
    if (!leaving) return;
    const timer = setTimeout(onClose, 400);
    return () => clearTimeout(timer);
  }, [leaving, onClose]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent): void => {
      if (event.key === "Escape") dismiss();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [dismiss]);

  function askInChat(): void {
    try {
      localStorage.setItem(ACTIVE_KEY, call.sessionId);
      localStorage.setItem(DRAFT_KEY, questionFor(call));
    } catch {
      // Private mode, or storage refused. The chat opens on whatever it was
      // last on with nothing typed, which is worse than intended and not
      // broken.
    }
    router.push("/chat");
  }

  if (typeof document === "undefined") return null;

  const state =
    call.decision === "denied" || call.decision === "expired"
      ? "refused"
      : call.ok === null
        ? "running"
        : call.ok
          ? "succeeded"
          : "failed";
  const input = inputBlock(call.inputPreview);
  // The way onward is offered only when there is something to ask about. A
  // call that succeeded has nothing to explain, and a button on every dialog
  // teaches the reader to stop seeing it on the one where it matters.
  const troubled = state === "failed" || state === "refused";

  return createPortal(
    <div
      className={`modal-backdrop${leaving ? " leaving" : ""}`}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) dismiss();
      }}
      onAnimationEnd={(event) => {
        if (leaving && event.target === event.currentTarget) onClose();
      }}
    >
      <div
        className="modal toolcall"
        role="dialog"
        aria-modal="true"
        aria-labelledby="toolcall-heading"
      >
        <div className="modal-head">
          <span className="modal-kind">{t.toolCall}</span>
          <code className="modal-tool">{call.name}</code>
          <span className={`toolcall-state is-${state}`}>{t.state[state]}</span>
        </div>

        <h2 id="toolcall-heading" className="toolcall-heading">
          {call.tool}
          {call.server ? (
            <span className="toolcall-server">{call.server.replace(/^plugin_/, "")}</span>
          ) : (
            <span className="toolcall-server">{t.builtIn}</span>
          )}
        </h2>

        <dl className="facts toolcall-facts">
          <div>
            <dt>{t.started}</dt>
            <dd>{stamp(call.startedAt)}</dd>
          </div>
          <div>
            <dt>{t.duration}</dt>
            <dd>{duration(call.durationMs)}</dd>
          </div>
          <div>
            <dt>{t.result}</dt>
            <dd>
              {call.ok === null
                ? t.notBackYet
                : t.resultLine(call.ok, size(call.resultBytes))}
            </dd>
          </div>
          <div>
            <dt>{t.approval}</dt>
            <dd>{call.decision ? t.decision[call.decision] : t.notGated}</dd>
          </div>
          <div>
            <dt>{t.sessionLabel}</dt>
            <dd>
              <code>{call.sessionId}</code>
            </dd>
          </div>
        </dl>

        <div className="toolcall-input-head">
          <p className="modal-label">{t.input}</p>
          <button
            type="button"
            className="icon-button toolcall-copy"
            aria-label={copied ? t.copied : t.copyInput}
            title={copied ? t.copied : t.copyInput}
            onClick={() => {
              void navigator.clipboard
                .writeText(input.text)
                .then(() => setCopied(true))
                .catch(() => {
                  // No clipboard access (an insecure origin, or refused).
                  // The text is on screen to select; nothing else to do.
                });
            }}
          >
            <Icon name={copied ? "check" : "copy"} />
          </button>
        </div>
        <div className="toolcall-json">
          <Markdown>{`\`\`\`json\n${input.text}\n\`\`\``}</Markdown>
        </div>
        {input.truncated ? (
          <p className="toolcall-note">{t.truncated}</p>
        ) : null}
        <p className="toolcall-note">{t.resultNotKept}</p>

        <div className="modal-actions">
          <button
            type="button"
            className={troubled ? "ghost" : "primary"}
            ref={closeRef}
            onClick={dismiss}
          >
            {t.close}
          </button>
          {troubled ? (
            <button type="button" className="primary" onClick={askInChat}>
              <Icon name="chat-teardrop-text" /> {t.askInChat}
            </button>
          ) : null}
        </div>
      </div>
    </div>,
    document.body,
  );
}
