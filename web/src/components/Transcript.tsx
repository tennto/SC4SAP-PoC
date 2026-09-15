"use client";

import { useEffect, useRef, useState } from "react";
import type { AttachmentMeta, TranscriptItem } from "@/lib/types";
import type { Activity } from "@/lib/activity";
import { ActivityLine } from "@/components/ActivityLine";
import { Markdown } from "@/components/Markdown";
import { FileChip } from "@/components/FileChip";
import { useLocale } from "@/lib/i18n/client";

type Props = {
  items: TranscriptItem[];
  /** No session selected yet — show the placeholder instead of an empty scroller. */
  idle: boolean;
  /** The session is mid-turn: `status === "busy"`. */
  busy: boolean;
  /**
   * This turn's own prompt is not on screen yet — the backend has not echoed
   * it back. Distinct from `busy`, which stays true for the whole turn: this
   * is only the gap at the front of one, and it is the gap in which the last
   * row on screen still belongs to the *previous* answer.
   */
  pending: boolean;
  /**
   * What the turn is doing, for the line beside the dots.
   *
   * The dots say "something is happening"; they cannot say whether it has
   * been happening for two seconds or two minutes, and that is the difference
   * between waiting and reloading the page.
   */
  activity: Activity | null;
};

/**
 * What actually gets drawn. One agent row per answer, not per SDK message: a
 * turn that says "let me check" and then calls a tool arrives as two assistant
 * messages with the tool between them, and rendering that literally gave one
 * question two AGENT labels and two blocks — which reads as two answers rather
 * than one answer that took a detour.
 */
export type Row =
  | { kind: "user"; id: string; text: string; attachments?: AttachmentMeta[] }
  | { kind: "notice"; id: string; text: string }
  | { kind: "agent"; id: string; text: string; streaming: boolean };

/**
 * Folds the stream's items into rows: tool and thinking items are dropped, and
 * the assistant messages between two of the reader's own turns become one row.
 */
/**
 * What the plugin's skills print for their own bookkeeping, and nobody
 * else's: the `[Model: … · Dispatched: …]` prefix every skill answer opens
 * with, and the `▶ phase=…` banner before each sub-agent dispatch. Kept out
 * of the transcript; the tool log and the monitor say the same things.
 */
const BOOKKEEPING = /^[ \t]*`?\[Model:[^\]]*\]`?[ \t]*$|^[ \t]*`?▶[ \t]*phase=.*$/gm;

/** The text with the skills' bookkeeping lines taken out. */
export function cleanText(text: string): string {
  return text.replace(BOOKKEEPING, "").replace(/^\n+/, "").replace(/\n{3,}/g, "\n\n");
}

/** Where the "show everything" choice is kept, across screens. */
export const EVERYTHING_KEY = "sc4sap.showEverything";

export function readShowEverything(): boolean {
  try {
    return localStorage.getItem(EVERYTHING_KEY) === "1";
  } catch {
    return false;
  }
}

export function writeShowEverything(value: boolean): void {
  try {
    if (value) localStorage.setItem(EVERYTHING_KEY, "1");
    else localStorage.removeItem(EVERYTHING_KEY);
  } catch {
    // Storage refused. The choice lasts the page, which is not nothing.
  }
}

/**
 * The transcript's rows.
 *
 * Only the *last* assistant message of each turn is shown, by default. The
 * plugin's skills talk while they work — "checking the dumps first", a phase
 * banner, a summary before the report — and a turn arrived as a column of
 * those with the report at the bottom. What was asked for was the report.
 * The message still streaming is always shown, so the screen is never blank
 * while the agent is mid-sentence; when the next message opens, the last one
 * gives way to it.
 *
 * `everything` puts the whole turn back, for reading how the answer was
 * reached. Either way the skills' bookkeeping lines are taken out.
 */
export function toRows(
  items: TranscriptItem[],
  options: { everything?: boolean } = {},
): Row[] {
  const rows: Row[] = [];
  const everything = options.everything === true;

  for (const item of items) {
    if (item.kind === "tool" || item.kind === "thinking") continue;

    if (item.kind === "user") {
      rows.push({
        kind: "user",
        id: item.id,
        text: item.text,
        ...(item.attachments && item.attachments.length > 0
          ? { attachments: item.attachments }
          : {}),
      });
      continue;
    }
    if (item.kind === "notice") {
      rows.push({ kind: "notice", id: item.id, text: item.text });
      continue;
    }

    const text = cleanText(item.text);
    const last = rows[rows.length - 1];
    if (last && last.kind === "agent") {
      if (everything) {
        // A blank line, so two blocks of markdown do not run into one paragraph.
        last.text = last.text ? `${last.text}\n\n${text}` : text;
      } else if (text.trim() !== "" || item.streaming) {
        // The newer message replaces the older one. An empty message that is
        // not streaming — a turn that ended on a tool call — leaves the last
        // words standing rather than blanking them.
        last.text = text;
        last.id = item.id;
      }
      last.streaming = item.streaming;
      continue;
    }

    rows.push({
      kind: "agent",
      id: item.id,
      text,
      streaming: item.streaming,
    });
  }

  return rows;
}

/**
 * Releases streamed text at a steady rate instead of in the bursts it arrives
 * in.
 *
 * The API does not send one token at a time and the network does not deliver
 * what it does send evenly, so a transcript rendered straight off the stream
 * lurches: nothing for 200ms, then a paragraph, then nothing. Every character
 * is on screen at the right time on average and the reading experience is
 * still bad, because what the eye follows is the *rate*.
 *
 * So the stream fills a buffer and this drains it on animation frames. The
 * amount taken each frame is a fraction of what is outstanding, which makes it
 * self-correcting rather than a fixed speed to be tuned: a burst drains fast, a
 * trickle draws down slowly, and the text never falls more than about a tenth
 * of a second behind whatever the model is producing. A fixed characters-per-
 * second would have to be either slower than the model — falling further behind
 * all answer — or faster, which is the stutter again.
 *
 * `null` means nothing is streaming, and the caller renders the finished text
 * itself: an answer that has arrived in full should be on screen in full, not
 * typed out.
 *
 * Exported because the skill screen renders the same stream as a document
 * rather than as a conversation, and an answer that lands there in bursts is
 * the same to read as one that lands here in bursts.
 */
export function useSmoothText(
  text: string,
  /** The row being paced. A change means a different answer, not more of one. */
  id: string | null,
  /** Whether that row was still arriving when it first appeared. */
  streaming: boolean,
): string {
  const [shown, setShown] = useState("");
  // The loop reads these rather than closing over the render's values, so it
  // does not have to be torn down and restarted on every delta.
  const shownRef = useRef("");
  const targetRef = useRef("");
  targetRef.current = text;

  /**
   * Someone who has asked the OS for stillness gets the text, not a
   * performance of it arriving. Read once: the loop below is keyed on whether
   * there is a row at all, and a media query that flipped mid-answer would
   * restart it.
   */
  const [still] = useState(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );

  /**
   * A new row starts from nothing if it is arriving, and whole if it is not.
   *
   * The second half is what keeps a reopened conversation from typing its
   * stored answers out again: those are finished text, and finished text
   * belongs on screen.
   */
  const [pacedId, setPacedId] = useState<string | null>(null);
  if (id !== pacedId) {
    setPacedId(id);
    const seed = streaming && !still ? "" : text;
    shownRef.current = seed;
    setShown(seed);
  }

  const active = id !== null && !still;

  useEffect(() => {
    if (!active) return;

    /**
     * A hidden tab does not get animation frames, so the loop stops and the
     * answer stops with it — and comes back to a row that has the label, the
     * caret and no words in it. Anyone who is not looking has no use for a
     * paced reveal anyway, so it hands over everything it is holding and
     * starts pacing again when they come back.
     */
    const onHidden = (): void => {
      if (!document.hidden) return;
      shownRef.current = targetRef.current;
      setShown(shownRef.current);
    };
    document.addEventListener("visibilitychange", onHidden);
    onHidden();

    let frame = requestAnimationFrame(function step(): void {
      const full = targetRef.current;

      // Rewritten rather than extended — the assistant `message` event
      // replaces what the deltas built. Catch up rather than retyping.
      if (!full.startsWith(shownRef.current)) {
        shownRef.current = full;
        setShown(full);
      } else if (shownRef.current.length < full.length) {
        const behind = full.length - shownRef.current.length;
        /**
         * Two limits, and the answer moves at whichever is lower.
         *
         * The flat one is what makes it readable: one character a frame, about
         * sixty a second, which is a hand writing rather than a buffer
         * emptying. Proportional pacing alone cannot be slower than the model —
         * the further behind it falls the faster it draws, so it converges on
         * the rate the tokens arrive at, which is the rate that was too fast to
         * read in the first place.
         *
         * The proportional one is the bound on the lag that buys. Past four
         * hundred characters outstanding — a long answer, or a tool that
         * dumped a block at once — it takes over and closes the gap instead of
         * trailing minutes behind for the rest of the turn.
         */
        const take = behind > 400 ? Math.ceil(behind / 20) : 1;
        shownRef.current = full.slice(0, shownRef.current.length + take);
        setShown(shownRef.current);
      }

      // Kept running even when caught up: `streaming` going false does not
      // mean the reveal is finished, only that nothing more is coming. Ending
      // the loop there dumped whatever was still held — most of the answer,
      // for anything the model wrote quickly.
      frame = requestAnimationFrame(step);
    });

    return () => {
      document.removeEventListener("visibilitychange", onHidden);
      cancelAnimationFrame(frame);
    };
  }, [active]);

  return active ? shown : text;
}

/**
 * Two speakers, one column, no bubbles. The transcript is mostly the agent's
 * long-form answers, and a chat bubble around a page of markdown fights it —
 * it narrows the measure, boxes the tables, and adds a border the reader has
 * to look past. What actually needs marking is who is talking, which is one
 * small label above the text.
 */
export function Transcript({ items, idle, busy, pending, activity }: Props) {
  const { t: messages } = useLocale();
  const t = messages.transcript;
  const bottom = useRef<HTMLDivElement>(null);
  // The turn always shows its final answer only; the whole-turn toggle was
  // removed from the chat view.
  const rows = toRows(items, { everything: false });
  const last = rows[rows.length - 1];

  /**
   * The turn is not over until the backend says it is. Tokens arriving are
   * their own progress, so the dots stand down while text is streaming and
   * come back the moment it stops — which is exactly the gap where a tool is
   * running and the screen used to look finished when it was not.
   *
   * "Streaming" is not enough on its own: a bubble can be open with nothing
   * in it yet — the first content block arrives before the first token, and a
   * block can open on whitespace. Standing the dots down against an empty
   * bubble left the screen with a heading and no answer under it, which is
   * the one thing this indicator exists to prevent. Visible text is the test,
   * because visible text is what makes the dots redundant.
   */
  const lastAgent = last?.kind === "agent" ? last : null;
  const smoothed = useSmoothText(
    lastAgent?.text ?? "",
    lastAgent?.id ?? null,
    lastAgent?.streaming ?? false,
  );

  // When the dots belong on screen.
  //
  // The rule is about what the reader is looking at, not about the stream's
  // low-level state:
  //   - If answer text is already on screen and the model is only producing
  //     more of it, the text is the progress. The dots would just flicker
  //     under it — while it streams, and in the beat between two text blocks
  //     where `streaming` briefly drops — so they stay down. This is the case
  //     the reader means by "don't show a loader while the answer is showing".
  //   - Real background work still shows them, even with an intro line already
  //     on screen: a tool running, an approval waiting, a retry, the session
  //     booting. That is the SAP-fetch wait the dots exist to cover.
  //   - With no answer text yet — an empty bubble, or a tool before the agent
  //     has said anything — they show, so the screen is never blank mid-turn.
  const hasAnswerText = lastAgent !== null && smoothed.trim() !== "";
  const workKind = activity?.kind;
  const backgroundWork =
    workKind === "tool" ||
    workKind === "waiting" ||
    workKind === "retrying" ||
    workKind === "starting";
  const waiting = busy && (!hasAnswerText || backgroundWork);
  /**
   * Inside the answer it already belongs to, rather than under a second label.
   *
   * Not while a prompt is outstanding, though. Until the backend echoes it
   * back there is no row for it, so the last row is still the *previous*
   * answer — and hanging the dots off that says the old answer has more to
   * come, under a label that has already finished speaking.
   *
   * That window is also where the flash came from, and it is why `pending` is
   * about the echo rather than about the status. The session reports `busy`
   * before it echoes the prompt, so a `pending` that ended at the status left
   * three renders in a row: the standalone row appears, the status arrives and
   * the dots jump inside the old answer — taking the label with them — and
   * then the echo lands and the standalone row comes back. Two mounts, two
   * entrances, and one indicator that looked like it could not make up its
   * mind.
   */
  const waitingInline = waiting && !pending && last?.kind === "agent";

  /**
   * Follow the tail as tokens arrive — and as the waiting row appears.
   *
   * Smoothly only when the number of rows changes, which is a message landing
   * and worth being carried to. Tokens are not: they change the scroll height
   * on nearly every frame, and a smooth scroll restarted that often never
   * finishes one — the browser re-aims mid-flight, over and over, and the
   * column visibly judders. Jumping is correct there because the distance is
   * a line at a time and there is nothing to follow.
   */
  const rowCount = useRef(0);
  useEffect(() => {
    const arrived = rows.length !== rowCount.current;
    rowCount.current = rows.length;
    bottom.current?.scrollIntoView({
      block: "end",
      behavior: arrived ? "smooth" : "auto",
    });
    // `rows` is rebuilt every render; its length is what actually decides.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, waiting, rows.length]);

  if (idle) {
    return (
      <div className="transcript placeholder">
        <p>{t.placeholder}</p>
      </div>
    );
  }

  /*
   * The dots, beside them what is happening and for how long, and under them
   * what the turn has done so far. See `ActivityLine`.
   */
  const dots = <ActivityLine activity={activity} items={items} />;

  return (
    <div className="transcript">

      {rows.length === 0 && !waiting && (
        <p className="empty">{t.empty}</p>
      )}

      {rows.map((row, index) => {
        const isLast = index === rows.length - 1;

        if (row.kind === "notice") {
          return (
            <p key={row.id} className="notice msg-in">
              {row.text}
            </p>
          );
        }

        if (row.kind === "user") {
          return (
            <article key={row.id} className="msg user msg-in">
              <span className="who">{t.you}</span>
              {/* What went with the prompt, above it: the material first and
                  the question about it second, the order it was sent in. */}
              {row.attachments && row.attachments.length > 0 && (
                <div className="files">
                  {row.attachments.map((file, at) => (
                    <FileChip key={`${row.id}-${at}`} file={file} />
                  ))}
                </div>
              )}
              {/* Shown as typed — rendering it as markdown would silently eat
                  characters they meant literally. */}
              {row.text.trim() !== "" && <div className="text">{row.text}</div>}
            </article>
          );
        }

        return (
          <article key={row.id} className="msg assistant msg-in">
            <span className="who">{t.agent}</span>
            <div className="text">
              <Markdown>{isLast ? smoothed : row.text}</Markdown>
              {row.streaming && <span className="caret" aria-hidden />}
              {isLast && waitingInline && (
                <div className="dots-row">{dots}</div>
              )}
            </div>
          </article>
        );
      })}

      {waiting && !waitingInline && (
        <article className="msg assistant waiting msg-in">
          <span className="who">{t.agent}</span>
          <div className="text">{dots}</div>
        </article>
      )}

      <div ref={bottom} />
    </div>
  );
}
