"use client";

import { useEffect, useRef } from "react";
import type { TranscriptItem } from "@/lib/types";
import { Markdown } from "@/components/Markdown";

type Props = {
  items: TranscriptItem[];
  /** No session selected yet — show the placeholder instead of an empty scroller. */
  idle: boolean;
  /** The session is mid-turn: `status === "busy"`. */
  busy: boolean;
};

/**
 * What actually gets drawn. One agent row per answer, not per SDK message: a
 * turn that says "let me check" and then calls a tool arrives as two assistant
 * messages with the tool between them, and rendering that literally gave one
 * question two AGENT labels and two blocks — which reads as two answers rather
 * than one answer that took a detour.
 */
export type Row =
  | { kind: "user"; id: string; text: string }
  | { kind: "notice"; id: string; text: string }
  | { kind: "agent"; id: string; text: string; streaming: boolean };

/**
 * Folds the stream's items into rows: tool and thinking items are dropped, and
 * the assistant messages between two of the reader's own turns become one row.
 */
export function toRows(items: TranscriptItem[]): Row[] {
  const rows: Row[] = [];

  for (const item of items) {
    if (item.kind === "tool" || item.kind === "thinking") continue;

    if (item.kind === "user" || item.kind === "notice") {
      rows.push({ kind: item.kind, id: item.id, text: item.text });
      continue;
    }

    const last = rows[rows.length - 1];
    if (last && last.kind === "agent") {
      // A blank line, so two blocks of markdown do not run into one paragraph.
      last.text = last.text ? `${last.text}\n\n${item.text}` : item.text;
      last.streaming = item.streaming;
      continue;
    }

    rows.push({
      kind: "agent",
      id: item.id,
      text: item.text,
      streaming: item.streaming,
    });
  }

  return rows;
}

/**
 * Two speakers, one column, no bubbles. The transcript is mostly the agent's
 * long-form answers, and a chat bubble around a page of markdown fights it —
 * it narrows the measure, boxes the tables, and adds a border the reader has
 * to look past. What actually needs marking is who is talking, which is one
 * small label above the text.
 */
export function Transcript({ items, idle, busy }: Props) {
  const bottom = useRef<HTMLDivElement>(null);
  const rows = toRows(items);
  const last = rows[rows.length - 1];

  /**
   * The turn is not over until the backend says it is. Tokens arriving are
   * their own progress, so the dots stand down while text is streaming and
   * come back the moment it stops — which is exactly the gap where a tool is
   * running and the screen used to look finished when it was not.
   */
  const waiting = busy && !(last?.kind === "agent" && last.streaming);
  // Inside the answer it already belongs to, rather than under a second label.
  const waitingInline = waiting && last?.kind === "agent";

  // Follow the tail as tokens arrive — and as the waiting row appears.
  useEffect(() => {
    bottom.current?.scrollIntoView({ block: "end", behavior: "smooth" });
  }, [items, waiting]);

  if (idle) {
    return (
      <div className="transcript placeholder">
        <p>Create or select a session to start.</p>
      </div>
    );
  }

  const dots = (
    <span className="dots" aria-label="Working">
      <span />
      <span />
      <span />
    </span>
  );

  return (
    <div className="transcript">
      {rows.length === 0 && !waiting && (
        <p className="empty">Ask the SC4SAP agent something.</p>
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
              <span className="who">You</span>
              {/* Shown as typed — rendering it as markdown would silently eat
                  characters they meant literally. */}
              <div className="text">{row.text}</div>
            </article>
          );
        }

        return (
          <article key={row.id} className="msg assistant msg-in">
            <span className="who">Agent</span>
            <div className="text">
              <Markdown>{row.text}</Markdown>
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
          <span className="who">Agent</span>
          <div className="text">{dots}</div>
        </article>
      )}

      <div ref={bottom} />
    </div>
  );
}
