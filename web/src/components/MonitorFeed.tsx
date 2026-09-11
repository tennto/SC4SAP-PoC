"use client";

/**
 * The monitor's list: live calls on top, history underneath, one list.
 *
 * Two sources with one shape (`ToolCall`), merged by id. The stream opens with
 * a `recent` event — the backend's in-memory ring, the last two hundred calls
 * — and then delivers `call_started` and `call_finished` one at a time; the
 * server render hands in the first page of Mongo history. A call can arrive
 * from both (the ring and the page overlap on purpose: nothing is lost across
 * a backend restart, and nothing is lost across a Mongo outage), so the id is
 * the join and the later version of a call wins.
 *
 * `EventSource` for the same reason the transcript uses it: it reconnects on
 * its own. The backend does not replay this stream — the ring is the replay,
 * re-sent as `recent` on every connect — so nothing is carried across a
 * reconnect but the id.
 *
 * The filter defaults to MCP only, which is what the page is named for. The
 * built-in calls are one switch away because the doctor and the workspace
 * reads are also where things go wrong, but a list that opens with forty
 * `Read` calls before the first `GetProgram` is a list about the wrong thing.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Icon } from "@/components/Icon";
import type { ToolCall } from "@/lib/types";

/** How many calls the list keeps once live ones start piling up. */
const LIST_LIMIT = 1000;

type Feed = "connecting" | "live" | "offline";

/** `14:09:44` — the time only; the date is in the row's title. */
function clock(iso: string): string {
  return iso.slice(11, 19);
}

function duration(ms: number | null): string {
  if (ms === null) return "";
  if (ms < 1000) return `${ms} ms`;
  return `${(ms / 1000).toFixed(ms < 10_000 ? 1 : 0)} s`;
}

/** `12 KB`, `1.4 MB` — the size of what came back. */
function size(bytes: number | null): string {
  if (bytes === null) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * What the row's dot means. Running is the only state without a verdict; a
 * refusal is drawn as a failure because from the SAP system's point of view
 * that call never happened, and from the reader's it is the thing to look at.
 */
function stateOf(call: ToolCall): "running" | "ok" | "bad" {
  if (call.decision === "denied" || call.decision === "expired") return "bad";
  if (call.ok === null) return "running";
  return call.ok ? "ok" : "bad";
}

const DECISION_LABEL: Record<NonNullable<ToolCall["decision"]>, string> = {
  auto: "auto-approved",
  allowed: "approved",
  denied: "denied",
  expired: "unanswered",
};

/** Newest first, by start time, then by id so the order is stable. */
function sortCalls(calls: Iterable<ToolCall>): ToolCall[] {
  return [...calls].sort(
    (a, b) => b.startedAt.localeCompare(a.startedAt) || b.id.localeCompare(a.id),
  );
}

export function MonitorFeed({
  initial,
  pageSize,
  historyAvailable,
}: {
  /** The first page of Mongo history, newest first. */
  initial: ToolCall[];
  pageSize: number;
  /** Mongo answered on the server. When it did not, "load older" is not offered. */
  historyAvailable: boolean;
}) {
  const [calls, setCalls] = useState<Map<string, ToolCall>>(
    () => new Map(initial.map((call) => [call.id, call])),
  );
  const [feed, setFeed] = useState<Feed>("connecting");
  /** Whether the backend is writing history — from the stream's opening event. */
  const [persistent, setPersistent] = useState<boolean | null>(null);
  const [mcpOnly, setMcpOnly] = useState(true);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [olderError, setOlderError] = useState<string | null>(null);
  /** History ran out: the last page came back short. */
  const [exhausted, setExhausted] = useState(initial.length < pageSize);
  /** Ids of calls that arrived live, so they can be marked as they land. */
  const arrived = useRef(new Set<string>());

  const merge = useCallback((incoming: ToolCall[]): void => {
    setCalls((current) => {
      const next = new Map(current);
      for (const call of incoming) next.set(call.id, call);
      // Cap from the old end. What falls off is still in Mongo.
      if (next.size > LIST_LIMIT) {
        const keep = sortCalls(next.values()).slice(0, LIST_LIMIT);
        return new Map(keep.map((call) => [call.id, call]));
      }
      return next;
    });
  }, []);

  useEffect(() => {
    const source = new EventSource("/api/monitor/stream");
    const onCall = (event: MessageEvent<string>): void => {
      const call = JSON.parse(event.data) as ToolCall;
      arrived.current.add(call.id);
      merge([call]);
    };
    source.addEventListener("recent", (event: MessageEvent<string>) => {
      const { calls, persistent } = JSON.parse(event.data) as {
        calls: ToolCall[];
        persistent: boolean;
      };
      setPersistent(persistent);
      merge(calls);
      setFeed("live");
    });
    source.addEventListener("call_started", onCall);
    source.addEventListener("call_finished", onCall);
    source.onopen = () => setFeed("live");
    // EventSource reconnects on its own; this only reports the gap.
    source.onerror = () => setFeed("offline");
    return () => source.close();
  }, [merge]);

  const visible = useMemo(() => {
    const sorted = sortCalls(calls.values());
    return mcpOnly ? sorted.filter((call) => call.kind === "mcp") : sorted;
  }, [calls, mcpOnly]);

  /** The oldest call the list holds, which is where the next page starts. */
  const oldest = useMemo(() => {
    let min: string | null = null;
    for (const call of calls.values()) {
      if (min === null || call.startedAt < min) min = call.startedAt;
    }
    return min;
  }, [calls]);

  async function loadOlder(): Promise<void> {
    if (loadingOlder || exhausted || !oldest) return;
    setLoadingOlder(true);
    setOlderError(null);
    try {
      const query = new URLSearchParams({ before: oldest, limit: String(pageSize) });
      const response = await fetch(`/api/monitor?${query.toString()}`);
      const body = (await response.json().catch(() => ({}))) as {
        calls?: ToolCall[];
        error?: string;
      };
      if (!response.ok) throw new Error(body.error ?? `The server answered ${response.status}.`);
      const page = body.calls ?? [];
      merge(page);
      if (page.length < pageSize) setExhausted(true);
    } catch (err) {
      setOlderError((err as Error).message);
    } finally {
      setLoadingOlder(false);
    }
  }

  return (
    <section
      className="panel mon rise"
      style={{ "--delay": "180ms" } as React.CSSProperties}
      aria-labelledby="monitor-feed"
    >
      <div className="panel-head panel-head-row">
        <div>
          <h2 id="monitor-feed">
            <Icon name="pulse" /> Calls
          </h2>
          <p className="panel-note">
            {feed === "live"
              ? "Live. New calls appear at the top as the agent makes them."
              : feed === "connecting"
                ? "Connecting to the agent backend…"
                : "The agent backend is not answering. The list is what was loaded; it will resume on its own."}
            {persistent === false
              ? " The backend has no database configured, so only its recent memory is shown."
              : ""}
          </p>
        </div>
        <div className="mon-controls">
          <span className={`mon-feed is-${feed}`}>
            <span className="mon-feed-dot" aria-hidden="true" />
            {feed}
          </span>
          <label className="mon-switch">
            <input
              type="checkbox"
              checked={mcpOnly}
              onChange={(event) => setMcpOnly(event.target.checked)}
            />
            MCP only
          </label>
        </div>
      </div>

      {visible.length === 0 ? (
        <p className="mon-empty">
          {calls.size === 0
            ? "Nothing yet. Run a skill or ask something in chat, and the calls it makes will show up here."
            : "No MCP calls in what is loaded. Switch the filter off to see the agent's own reads."}
        </p>
      ) : (
        <ol className="mon-list">
          {visible.map((call) => {
            const state = stateOf(call);
            return (
              <li
                key={call.id}
                className={`mon-row is-${state}${arrived.current.has(call.id) ? " is-new" : ""}`}
                title={`${call.startedAt.replace("T", " ").slice(0, 19)} UTC · session ${call.sessionId}`}
              >
                <span className="mon-dot" aria-hidden="true" />
                <span className="mon-time">{clock(call.startedAt)}</span>
                <span className="mon-name">
                  <code>{call.tool}</code>
                  {call.kind === "mcp" ? (
                    <span className="mon-server">{call.server?.replace(/^plugin_/, "")}</span>
                  ) : (
                    <span className="mon-server">built-in</span>
                  )}
                </span>
                <span className="mon-input">{call.inputPreview}</span>
                <span className="mon-meta">
                  {call.decision && call.decision !== "auto" ? (
                    <span className="mon-decision">{DECISION_LABEL[call.decision]}</span>
                  ) : null}
                  {state === "running" ? (
                    <span className="mon-running">running</span>
                  ) : (
                    <>
                      <span>{duration(call.durationMs)}</span>
                      <span>{size(call.resultBytes)}</span>
                    </>
                  )}
                </span>
              </li>
            );
          })}
        </ol>
      )}

      {historyAvailable ? (
        <div className="mon-foot">
          {olderError ? <p className="mon-error">{olderError}</p> : null}
          <button
            type="button"
            className="ghost"
            onClick={() => void loadOlder()}
            disabled={loadingOlder || exhausted}
          >
            <Icon name={loadingOlder ? "circle-notch" : "arrow-down"} />
            {exhausted ? "That is everything kept" : loadingOlder ? "Loading…" : "Load older"}
          </button>
        </div>
      ) : null}
    </section>
  );
}
