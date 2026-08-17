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
import type {
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
  error: string | null;
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
  error: null,
  connected: false,
  toolIdByIndex: {},
  serial: 0,
};

type Action =
  | { kind: "reset" }
  | { kind: "connected"; connected: boolean }
  | { kind: "event"; event: SessionEvent };

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

/** True for the synthetic user messages that carry tool results, not human input. */
function isToolResult(message: SdkMessage): boolean {
  const content = message.message?.content;
  return (
    Array.isArray(content) &&
    content.some((block) => (block as { type?: string }).type === "tool_result")
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
    case "status":
      return { ...state, status: event.status };

    case "turn_start":
      return { ...state, serial: state.serial + 1 };

    case "text_delta":
      return appendDelta(state, "assistant", event.text);

    case "thinking_delta":
      return appendDelta(state, "thinking", event.text);

    case "tool_start": {
      // A chunked read fires the same tool many times in a row; folding a run
      // into one chip keeps that from reading as a fault. Only *consecutive*
      // calls fold — anything the model says in between splits the run.
      const last = state.items[state.items.length - 1];
      if (last && last.kind === "tool" && last.name === event.name) {
        const items = state.items.slice(0, -1);
        items.push({ ...last, calls: last.calls + 1, active: last.active + 1 });
        return {
          ...state,
          items,
          toolIdByIndex: { ...state.toolIdByIndex, [event.index]: last.id },
        };
      }
      return {
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
      };
    }

    case "tool_end": {
      const id = state.toolIdByIndex[event.index];
      if (!id) return state;
      return {
        ...state,
        items: state.items.map((item) =>
          item.kind === "tool" && item.id === id
            ? { ...item, active: Math.max(0, item.active - 1) }
            : item,
        ),
      };
    }

    case "turn_end":
      return closeOpenBubbles(state);

    case "message": {
      const message = event.message;

      if (message.type === "user") {
        // Tool results also arrive as user messages; the chips already show those.
        if (isToolResult(message)) return state;
        const text = textOf(message);
        if (!text) return state;
        return {
          ...state,
          items: [
            ...state.items,
            { kind: "user", id: `user-${state.serial}-${state.items.length}`, text },
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
      // system/init and hook responses are diagnostics, not conversation.
      return state;
    }

    case "permission_request":
      return { ...state, pending: [...state.pending, event.request] };

    case "permission_resolved":
      return {
        ...state,
        pending: state.pending.filter((request) => request.reqId !== event.reqId),
      };

    case "error":
      return { ...state, error: event.error };

    default:
      return state;
  }
}

/** Every event name the backend emits; `EventSource` dispatches by name. */
const EVENT_TYPES: SessionEvent["type"][] = [
  "message",
  "permission_request",
  "permission_resolved",
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
  error: string | null;
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
    error: state.error,
    connected: state.connected,
    streaming,
  };
}
