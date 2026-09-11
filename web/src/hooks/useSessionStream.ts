"use client";

/**
 * Plan item 3-2 — subscribes to a session's SSE stream and folds it into a
 * transcript.
 *
 * Two event classes arrive and they overlap on purpose:
 *
 *   - `text_delta` / `thinking_delta` are ephemeral tokens. They are appended
 *     to an open bubble for the typing effect and are NOT in the replay buffer.
 *   - the complete `message` is authoritative. When it lands it *replaces* the
 *     text of the bubble the deltas were building, rather than appending, so a
 *     live viewer and a viewer who reconnected mid-turn end up with identical
 *     transcripts.
 *
 * `EventSource` is the right client here rather than a hand-rolled fetch reader:
 * the browser sends `Last-Event-ID` automatically when it reconnects, which is
 * exactly the replay contract the backend implements — a fresh subscription
 * replays the whole session, a reconnect resumes where it stopped.
 */
import { useEffect, useMemo, useReducer } from "react";
import { api } from "@/lib/client";
import type { Activity, ActivityKind } from "@/lib/activity";
import type {
  AttachmentMeta,
  PendingApproval,
  SdkMessage,
  SessionEvent,
  SessionStatus,
  TranscriptItem,
} from "@/lib/types";

type State = {
  items: TranscriptItem[];
  status: SessionStatus | null;
  /** Approvals blocking the turn. 3-3 renders these; 3-2 only tracks them. */
  pending: PendingApproval[];
  /**
   * Whether SAP reads are being waved through.
   *
   * Read from the stream rather than from the button that set it, so a second
   * tab watching the same session shows the switch someone flipped in the
   * first one instead of its own stale idea of it.
   */
  autoApprove: boolean;
  /**
   * What the turn is doing, or null between turns.
   *
   * Kept here rather than derived in the view because it is a fold over the
   * stream — the newest signal wins — and the view only ever sees the current
   * items. Every transition below is driven by an event that arrived; none of
   * them is a guess made from a clock.
   */
  activity: Activity | null;
  error: string | null;
  /**
   * How many errors have arrived.
   *
   * The message alone is not enough to notice one: stopping a turn twice
   * reports the same sentence both times, and a screen watching the string
   * sees no change and says nothing the second time. This changes on every
   * one, whatever it says.
   */
  errorSeq: number;
  connected: boolean;
  /** `tool_end` carries only a content-block index, so the id is looked up here. */
  toolIdByIndex: Record<number, string>;
  /** Bumped per turn so bubble ids stay unique without a clock or a counter. */
  serial: number;
};

const EMPTY: State = {
  items: [],
  status: null,
  pending: [],
  autoApprove: false,
  activity: null,
  error: null,
  errorSeq: 0,
  connected: false,
  toolIdByIndex: {},
  serial: 0,
};

type Action =
  | { kind: "reset" }
  | { kind: "connected"; connected: boolean }
  | { kind: "event"; event: SessionEvent };

/**
 * Move to an activity, carrying the clock across.
 *
 * `since` is set once, when the turn first shows any activity, and every
 * transition after that keeps it. It measures the wait, not the step — which
 * is the number being asked for. Restarting it per step was tried and is
 * useless in practice: a turn that calls `Read` eight times in four seconds
 * re-enters the same state eight times, and the display never leaves 0s at
 * exactly the moment someone is wondering whether anything is happening.
 *
 * `status` clearing it on anything but `busy` is what ends the clock.
 */
function moveTo(
  state: State,
  kind: ActivityKind,
  detail?: string,
): State {
  const current = state.activity;
  if (current && current.kind === kind && current.detail === detail) return state;
  return {
    ...state,
    activity: { kind, detail, since: current?.since ?? Date.now() },
  };
}

/** Text blocks of an SDK assistant/user message, joined. */
function textOf(message: SdkMessage): string {
  const content = message.message?.content;
  if (typeof content === "string") return content;
  if (!Array.isArray(content)) return "";
  return content
    .filter((block): block is { type: "text"; text: string } => {
      const candidate = block as { type?: string };
      return candidate.type === "text";
    })
    .map((block) => block.text)
    .join("\n\n");
}

/**
 * True only for the human's own prompt.
 *
 * `type: "user"` is not the same thing as "the person typed this". The SDK
 * puts tool results on user messages, and loading a skill injects the whole
 * skill file the same way — which is how a page of `sap-doctor` markdown
 * appeared in the transcript as something the reader had supposedly sent.
 *
 * The one user message that is genuinely theirs is the echo `session-manager`
 * emits from `send()`, and it is the only one whose content is a plain string:
 * everything the SDK generates is a block array. So the test is the shape,
 * which needs no allow-list of the block types to reject.
 */
function isHumanPrompt(message: SdkMessage): boolean {
  return typeof message.message?.content === "string";
}

/**
 * The files that went with the reader's prompt — names and sizes, put on the
 * echo by `session-manager.send()`. The bytes went to the model and are not
 * on the stream.
 */
function attachmentsOf(message: SdkMessage): AttachmentMeta[] {
  const list = message.attachments;
  if (!Array.isArray(list)) return [];
  return list.filter(
    (file): file is AttachmentMeta =>
      typeof file === "object" &&
      file !== null &&
      typeof (file as AttachmentMeta).name === "string",
  );
}

/**
 * Appends to the open bubble of `kind`, or opens one. Deltas can arrive before
 * any message has, so this must be able to create as well as extend.
 */
function appendDelta(
  state: State,
  kind: "assistant" | "thinking",
  text: string,
): State {
  // The API opens a content block with an empty delta, and relaying it raw
  // meant a bubble existed — and counted as an answer in progress — before a
  // single character of the answer did. The transcript stood its "working"
  // indicator down against that bubble, so the screen went blank for as long
  // as the model took to produce its first real token.
  if (text === "") return state;

  const last = state.items[state.items.length - 1];
  if (last && last.kind === kind && last.streaming) {
    const items = state.items.slice(0, -1);
    items.push({ ...last, text: last.text + text });
    return { ...state, items };
  }
  return {
    ...state,
    items: [
      ...state.items,
      { kind, id: `${kind}-${state.serial}-${state.items.length}`, text, streaming: true },
    ],
  };
}

/** Closes any bubble still marked as streaming. */
function closeOpenBubbles(state: State): State {
  if (!state.items.some((item) => "streaming" in item && item.streaming)) {
    return state;
  }
  return {
    ...state,
    items: state.items.map((item) =>
      "streaming" in item && item.streaming ? { ...item, streaming: false } : item,
    ),
  };
}

function reduce(state: State, action: Action): State {
  if (action.kind === "reset") return EMPTY;
  if (action.kind === "connected") {
    return { ...state, connected: action.connected };
  }

  const event = action.event;
  switch (event.type) {
    case "status": {
      // Anything that is not a running turn has no activity to report, and
      // leaving a stale label up would be the exact lie this is here to stop.
      if (event.status !== "busy") {
        return { ...state, status: event.status, activity: null };
      }
      /*
       * Busy arrives before `turn_start` — the backend accepts the prompt, and
       * the model's first `message_start` comes later, sometimes much later if
       * a skill is loading. That gap is the most anxious moment in the whole
       * turn and it was the one with no label at all, so it gets the generic
       * one until something more specific arrives.
       */
      return moveTo({ ...state, status: event.status }, "working");
    }

    case "turn_start":
      return moveTo({ ...state, serial: state.serial + 1 }, "working");

    case "text_delta":
      return moveTo(appendDelta(state, "assistant", event.text), "writing");

    case "thinking_delta":
      return moveTo(appendDelta(state, "thinking", event.text), "thinking");

    case "tool_start": {
      // A chunked read fires the same tool many times in a row; folding a run
      // into one chip keeps that from reading as a fault. Only *consecutive*
      // calls fold — anything the model says in between splits the run.
      const last = state.items[state.items.length - 1];
      if (last && last.kind === "tool" && last.name === event.name) {
        const items = state.items.slice(0, -1);
        items.push({ ...last, calls: last.calls + 1, active: last.active + 1 });
        // A folded run keeps its clock: thirty chunked reads of one program
        // are one wait, and restarting the count on each would say nothing is
        // taking long when the whole read is.
        return moveTo(
          {
            ...state,
            items,
            toolIdByIndex: { ...state.toolIdByIndex, [event.index]: last.id },
          },
          "tool",
          event.name,
        );
      }
      return moveTo(
        {
        ...state,
        toolIdByIndex: { ...state.toolIdByIndex, [event.index]: event.toolUseId },
        items: [
          ...state.items,
          {
            kind: "tool",
            id: event.toolUseId,
            name: event.name,
            calls: 1,
            active: 1,
          },
        ],
        },
        "tool",
        event.name,
      );
    }

    case "tool_end": {
      const id = state.toolIdByIndex[event.index];
      if (!id) return state;
      // Back to the generic label rather than leaving the tool's name up: the
      // call is over, and the model is between things until it says otherwise.
      return moveTo({
        ...state,
        items: state.items.map((item) =>
          item.kind === "tool" && item.id === id
            ? { ...item, active: Math.max(0, item.active - 1) }
            : item,
        ),
      }, "working");
    }

    case "turn_end":
      /*
       * Not the end of the turn — the end of one assistant *message*. A turn
       * that calls a tool emits several, and clearing here blanked the label
       * for seconds at a stretch while the work carried on. Only `status`
       * leaving `busy` ends the activity.
       */
      return moveTo(closeOpenBubbles(state), "working");

    case "message": {
      const message = event.message;

      if (message.type === "user") {
        // Tool results and injected skill files arrive as user messages too.
        if (!isHumanPrompt(message)) return state;
        const text = textOf(message);
        const attachments = attachmentsOf(message);
        // A prompt can be a file with nothing typed; a turn with neither is
        // nothing to draw.
        if (!text && attachments.length === 0) return state;
        return {
          ...state,
          items: [
            ...state.items,
            {
              kind: "user",
              id: `user-${state.serial}-${state.items.length}`,
              text,
              ...(attachments.length > 0 ? { attachments } : {}),
            },
          ],
        };
      }

      if (message.type === "assistant") {
        const text = textOf(message);
        // A tool-only assistant message has no text; the chip is the render.
        if (!text) return state;

        const openIndex = state.items.findIndex(
          (item) => item.kind === "assistant" && item.streaming,
        );
        if (openIndex === -1) {
          return {
            ...state,
            items: [
              ...state.items,
              {
                kind: "assistant",
                id: `assistant-${state.serial}-${state.items.length}`,
                text,
                streaming: false,
              },
            ],
          };
        }
        // Replace, never append: the deltas already built this same text.
        const items = state.items.slice();
        items[openIndex] = {
          kind: "assistant",
          id: state.items[openIndex]!.id,
          text,
          streaming: false,
        };
        return { ...state, items };
      }

      if (message.type === "result") return closeOpenBubbles(state);

      /*
       * The SDK says out loud when the API refused it and it is going to try
       * again: `system` / `api_retry`, carrying the attempt and the ceiling.
       * That is the difference between an agent in trouble and an agent that
       * died, and without it a 529 storm is indistinguishable from a hang —
       * which is the whole reason this line exists.
       */
      if (message.type === "system" && message.subtype === "api_retry") {
        const attempt = Number(message.attempt);
        const max = Number(message.max_retries);
        const detail =
          Number.isFinite(attempt) && Number.isFinite(max)
            ? `attempt ${attempt} of ${max}`
            : undefined;
        return moveTo(state, "retrying", detail);
      }

      // system/init and hook responses are diagnostics, not conversation.
      return state;
    }

    case "permission_request":
      // Parked on a person, which is not the same as parked on nothing — and
      // it is the one wait the reader can end themselves.
      return moveTo(
        { ...state, pending: [...state.pending, event.request] },
        "waiting",
      );

    case "permission_resolved": {
      const pending = state.pending.filter((r) => r.reqId !== event.reqId);
      return moveTo(
        { ...state, pending },
        pending.length > 0 ? "waiting" : "working",
      );
    }

    case "auto_approve":
      return { ...state, autoApprove: event.enabled };

    case "error":
      return { ...state, error: event.error, errorSeq: state.errorSeq + 1 };

    default:
      return state;
  }
}

/** Every event name the backend emits; `EventSource` dispatches by name. */
const EVENT_TYPES: SessionEvent["type"][] = [
  "message",
  "permission_request",
  "permission_resolved",
  "auto_approve",
  "status",
  "turn_start",
  "turn_end",
  "text_delta",
  "thinking_delta",
  "tool_start",
  "tool_end",
  "error",
];

export type SessionStream = {
  items: TranscriptItem[];
  status: SessionStatus | null;
  pending: PendingApproval[];
  /** True while SAP read-class calls are being waved through. */
  autoApprove: boolean;
  /** What the turn is doing, or null between turns. */
  activity: Activity | null;
  error: string | null;
  /** Changes on every error, so two identical ones are still two. */
  errorSeq: number;
  connected: boolean;
  /** True while the model is producing output — drives the composer's state. */
  streaming: boolean;
};

export function useSessionStream(sessionId: string | null): SessionStream {
  const [state, dispatch] = useReducer(reduce, EMPTY);

  useEffect(() => {
    dispatch({ kind: "reset" });
    if (!sessionId) return;

    const source = new EventSource(api.streamUrl(sessionId));
    const handlers = EVENT_TYPES.map((type) => {
      const handler = (message: MessageEvent<string>): void => {
        try {
          dispatch({ kind: "event", event: JSON.parse(message.data) as SessionEvent });
        } catch {
          // A frame we cannot parse must not kill the subscription.
        }
      };
      source.addEventListener(type, handler as EventListener);
      return [type, handler] as const;
    });

    source.onopen = () => dispatch({ kind: "connected", connected: true });
    // EventSource reconnects on its own, carrying Last-Event-ID; this only
    // reports the gap rather than trying to re-open anything.
    source.onerror = () => dispatch({ kind: "connected", connected: false });

    return () => {
      for (const [type, handler] of handlers) {
        source.removeEventListener(type, handler as EventListener);
      }
      source.close();
    };
  }, [sessionId]);

  const streaming = useMemo(
    () => state.items.some((item) => "streaming" in item && item.streaming),
    [state.items],
  );

  return {
    items: state.items,
    status: state.status,
    pending: state.pending,
    autoApprove: state.autoApprove,
    activity: state.activity,
    error: state.error,
    errorSeq: state.errorSeq,
    connected: state.connected,
    streaming,
  };
}
