"use client";

/**
 * The line that says what the agent is doing, and what it has done so far.
 *
 * Two rows. The first is the dots, the current state and the turn's clock —
 * "Looking up SAP · GetProgram · 42s". The second is the trail: every tool
 * the turn has called, folded by kind and counted — "Looking up SAP ×4 ·
 * Reading files ×2 · Sub-agent ×1". The first answers "is it alive"; the
 * second answers "is it getting anywhere", which a label that only ever shows
 * the present cannot. A turn that has sat on "Working" for a minute reads as
 * stuck; the same minute over "SAP ×6 · files ×3" reads as a turn doing its
 * job.
 *
 * Shared by the chat transcript and the skill result, which used to draw
 * their own dots — the skill page with no words beside them at all, on the
 * screen whose waits run to minutes.
 */
import { useEffect, useState } from "react";
import type { TranscriptItem } from "@/lib/types";
import type { Activity } from "@/lib/activity";
import { describeActivity } from "@/lib/activity";
import { useLocale } from "@/lib/i18n/client";

/**
 * Three dots in a row, each lifting and brightening a beat after the last.
 *
 * The wave is the whole design: one dot at its height while its neighbour is
 * on the way up and the third is at rest, on an easing that never stops
 * moving, so it reads as a pulse travelling along the row rather than as
 * three things blinking near each other. Ink only, and small — it sits at
 * the head of a line of text for the length of a turn.
 */
function Dots() {
  return (
    <span className="gdots" aria-hidden="true">
      <span />
      <span />
      <span />
    </span>
  );
}

/**
 * Re-renders once a second while an activity is live, so the clock beside the
 * label counts. Stops itself the moment there is nothing to count — a timer
 * left running behind a finished turn is a wakeup per second for nothing.
 */
export function useElapsed(since: number | null): number {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (since === null) return;
    setNow(Date.now());
    const tick = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(tick);
  }, [since]);

  return since === null ? 0 : Math.max(0, now - since);
}

export function ActivityLine({
  activity,
  items,
  placeholder,
}: {
  activity: Activity | null;
  /** The stream's items; the trail is folded from this turn's tool calls. */
  items: TranscriptItem[];
  /**
   * What to say when there is no activity yet — the skill page before its
   * session exists. Without one the dots stand alone with a screen-reader
   * label only.
   */
  placeholder?: string;
}) {
  const { t: messages } = useLocale();
  const t = messages.activity;
  const elapsed = useElapsed(activity?.since ?? null);
  const said = activity ? describeActivity(activity, elapsed, t) : null;

  return (
    <span className="activity-block">
      {/* `aria-live="polite"` rather than `assertive`: it updates every
          second, and a screen reader interrupting itself once a second is
          worse than silence. */}
      <span className="activity">
        {/* The mark, and beside it a label carrying a slow sheen, so the
            words themselves say "in motion" rather than only the thing next
            to them. */}
        <span className="activity-mark" aria-hidden="true">
          <Dots />
        </span>
        {said ? (
          <span className="activity-said" aria-live="polite">
            <span className="activity-label">{said.label}</span>
            {said.detail && <span className="activity-detail">{said.detail}</span>}
            <span className="activity-meta">{said.meta}</span>
          </span>
        ) : placeholder ? (
          <span className="activity-said">
            <span className="activity-label">{placeholder}</span>
          </span>
        ) : (
          <span className="sr-only">{t.working}</span>
        )}
      </span>
    </span>
  );
}
