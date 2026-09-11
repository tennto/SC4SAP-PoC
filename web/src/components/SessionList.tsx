"use client";

import { useCallback, useEffect, useRef, useState } from "react";
/**
 * One row. Not a `Session` and not a `Chat`: the rail shows conversations, and
 * a conversation may be stored, live, or both — `Chat.tsx` merges the two
 * lists and hands the result here, so this file needs no idea which is which.
 */
export type RailItem = {
  id: string;
  title: string | null;
  turns: number;
  totalCostUsd: number;
};
import { Icon } from "@/components/Icon";
import { DragScrollBar } from "@/components/DragScrollBar";

/** Matches the exit animation in `globals.css`. */
const LEAVE_MS = 420;

type Props = {
  items: RailItem[];
  activeId: string | null;
  busy: boolean;
  onSelect: (id: string) => void;
  onCreate: () => void;
  onClose: (id: string) => void;
};

/**
 * A second rail, inside the chat screen — distinct from the app-wide skill rail
 * in `AppShell`, which is why it carries its own class names.
 *
 * A row is the question that started the session, not its uuid: the id was a
 * label nobody could tell apart from the next one, and the status badge beside
 * it repeated what the transcript already showed. Turns and cost stay — they
 * are the two things about a session you cannot read off its transcript.
 */
export function SessionList({
  items,
  activeId,
  busy,
  onSelect,
  onCreate,
  onClose,
}: Props) {
  /**
   * React unmounts a removed row on the same frame it disappears from props,
   * which leaves nothing for an exit animation to run on. So the row is held
   * here for the length of that animation and dropped afterwards.
   *
   * Keyed by id, not a list: closing a session removes the row optimistically
   * and the `refresh()` behind it can briefly hand back a list that still
   * contains it, so the same id arrives here twice — which, as a list, put two
   * rows with one key into the same render.
   */
  const [leaving, setLeaving] = useState<Map<string, RailItem>>(new Map());
  const previous = useRef<RailItem[]>(items);
  // Timers live outside the effect: they must survive the re-render that the
  // optimistic removal and its refresh both cause, and a cleanup tied to
  // `sessions` cancelled them before the row was ever dropped.
  const timers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  useEffect(() => {
    const ids = new Set(items.map((item) => item.id));
    const gone = previous.current.filter((item) => !ids.has(item.id));
    previous.current = items;

    // A row that came back — the close failed, or the refresh raced it — is a
    // live row again, and must not still be counting down to removal.
    for (const id of ids) {
      const timer = timers.current.get(id);
      if (timer) {
        clearTimeout(timer);
        timers.current.delete(id);
      }
    }
    if (ids.size > 0) {
      setLeaving((current) => {
        if (![...ids].some((id) => current.has(id))) return current;
        const next = new Map(current);
        for (const id of ids) next.delete(id);
        return next;
      });
    }

    if (gone.length === 0) return;

    setLeaving((current) => {
      const next = new Map(current);
      for (const session of gone) next.set(session.id, session);
      return next;
    });

    for (const session of gone) {
      timers.current.set(
        session.id,
        setTimeout(() => {
          timers.current.delete(session.id);
          setLeaving((current) => {
            if (!current.has(session.id)) return current;
            const next = new Map(current);
            next.delete(session.id);
            return next;
          });
        }, LEAVE_MS),
      );
    }
  }, [items]);

  useEffect(() => {
    const pending = timers.current;
    return () => {
      for (const timer of pending.values()) clearTimeout(timer);
      pending.clear();
    };
  }, []);

  /**
   * Live rows, then the ones still playing their exit.
   *
   * The leaving set is filtered against the live ids *here*, during the
   * render, and not only by the effect that maintains it — because the effect
   * runs after. Closing a session removes its row optimistically and the
   * `refresh()` behind it can hand the same id straight back; for the one
   * render between that arriving and the effect tidying up, the id was in both
   * halves and React saw two children with the same key.
   *
   * A row that is live again is live: it belongs in the first half and has no
   * business also playing an exit.
   */
  const liveIds = new Set(items.map((item) => item.id));
  const rows = [
    ...items.map((item) => ({ session: item, isLeaving: false })),
    ...[...leaving.values()]
      .filter((item) => !liveIds.has(item.id))
      .map((item) => ({ session: item, isLeaving: true })),
  ];

  const listRef = useRef<HTMLElement | null>(null);

  /**
   * Back to the newest conversation when one is added.
   *
   * The list is newest-first, so a new conversation arrives at the start — and
   * on the narrow-screen strip the scroll position stayed where it was, which
   * left the row that was just created clipped off the left edge. The one row
   * the reader is certainly looking for was the one they could not see.
   *
   * Keyed on the first row's id rather than on the count: a list that gained
   * one and lost one in the same render has the same length and a different
   * head, and it is the head that moved out of view.
   */
  const firstId = rows[0]?.session.id ?? null;
  const lastFirstId = useRef<string | null>(firstId);

  useEffect(() => {
    if (firstId === lastFirstId.current) return;
    lastFirstId.current = firstId;
    // Both axes: the strip scrolls sideways on a phone and the rail scrolls
    // down everywhere else, and "the newest is out of view" is the same
    // problem in either direction.
    listRef.current?.scrollTo({
      left: 0,
      top: 0,
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "auto"
        : "smooth",
    });
  }, [firstId]);

  return (
    <aside className="session-rail">
      <div className="session-rail-head">
        <h2>
          {/* A stack, not a speech bubble. What is listed under this is
              sessions — runs against the backend, live or revived from
              storage — and a bubble would name the thing inside one rather
              than the several the rail is holding. */}
          <Icon name="stack" /> Sessions
        </h2>
        <button
          className="session-add"
          onClick={onCreate}
          disabled={busy}
          title="New conversation"
          aria-label="New conversation"
        >
          <Icon name="plus" />
        </button>
      </div>

      <nav className="session-list" ref={listRef}>
        {rows.length === 0 && <p className="empty">No conversations yet.</p>}

        {rows.map(({ session, isLeaving }) => {
          const active = session.id === activeId && !isLeaving;
          return (
            <div
              key={session.id}
              className={`session-item${active ? " active" : ""}${
                isLeaving ? " leaving" : ""
              }`}
            >
              <button
                className="session-open"
                onClick={() => onSelect(session.id)}
                title={session.title ?? session.id}
                disabled={isLeaving}
              >
                {/* A session created but never asked anything has no first
                    prompt to be named after yet. */}
                <span className="session-title">
                  {session.title ?? "New conversation"}
                </span>
                <span className="session-meta">
                  {session.turns} turn{session.turns === 1 ? "" : "s"} ·{" "}
                  {/* Sub-cent turns are the norm; 4 places keeps them visible. */}
                  ${session.totalCostUsd.toFixed(4)}
                </span>
              </button>
              <button
                className="session-close"
                onClick={() => onClose(session.id)}
                title="Delete this conversation"
                aria-label="Delete this conversation"
                disabled={isLeaving}
              >
                ×
              </button>
            </div>
          );
        })}
      </nav>

      {/* The strip is the one place in the app a reader has to know they can
          scroll before they try, and on a phone nothing else says so. */}
      <DragScrollBar targetRef={listRef} className="session-scrollbar" />
    </aside>
  );
}
