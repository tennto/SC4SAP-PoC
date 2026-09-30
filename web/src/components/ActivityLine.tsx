"use client";

/**
 * The line that says what the agent is doing, and what it has done so far.
 *
 * Two rows. The first is the orb, the current state and the turn's clock —
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
import { useEffect, useRef, useState } from "react";
import { ThinkingOrb, type OrbState } from "thinking-orbs";
import type { TranscriptItem } from "@/lib/types";
import type { Activity, ActivityKind } from "@/lib/activity";
import { describeActivity } from "@/lib/activity";
import { useLocale } from "@/lib/i18n/client";

/** Which of the library's orbs says what the agent is doing. */
const ORB: Record<ActivityKind, OrbState> = {
  starting: "breathing",
  waiting: "breathing",
  working: "working",
  thinking: "working",
  tool: "searching",
  writing: "composing",
  retrying: "solving",
};

/** A shape stays at least this long, so a turn flicking between states does not flicker. */
const DWELL_MS = 1500;
/** How long one shape takes to hand over to the next; matches `.orb-layer` in globals.css. */
const FADE_MS = 320;

/**
 * The working mark: a dotted orb at the size of a line of text, its shape
 * following what the agent is doing.
 *
 * The library swaps a shape on the frame its state changes. Here the outgoing
 * one stays drawn and fades while the next fades in over it, and a shape is
 * held for `DWELL_MS` before the next may replace it — a turn goes from tool
 * to thinking to tool inside a second, and every one of those as a cut would
 * read as the mark glitching. Ink only; it follows the app's theme by itself.
 */
function Orb({ kind }: { kind: ActivityKind }) {
  const wanted = ORB[kind];
  // Every shape still on screen, newest last; all but the last are leaving.
  const [layers, setLayers] = useState<{ state: OrbState; key: number }[]>(() => [
    { state: wanted, key: 0 },
  ]);
  const shownAt = useRef(Date.now());
  const next = useRef(1);
  const shown = layers[layers.length - 1]!.state;

  useEffect(() => {
    if (wanted === shown) return;
    const wait = Math.max(0, shownAt.current + DWELL_MS - Date.now());
    const swap = setTimeout(() => {
      shownAt.current = Date.now();
      const key = next.current++;
      setLayers((current) => [...current.slice(-1), { state: wanted, key }]);
    }, wait);
    return () => clearTimeout(swap);
  }, [wanted, shown]);

  useEffect(() => {
    if (layers.length < 2) return;
    const done = setTimeout(() => setLayers((current) => current.slice(-1)), FADE_MS);
    return () => clearTimeout(done);
  }, [layers]);

  return (
    <span className="orb-stack" aria-hidden="true">
      {layers.map((layer, i) => (
        <ThinkingOrb
          key={layer.key}
          state={layer.state}
          size={20}
          className={`orb-layer${i < layers.length - 1 ? " is-leaving" : ""}`}
        />
      ))}
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
          <Orb kind={activity?.kind ?? "starting"} />
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
