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
 * **Filters apply twice, and agree.** Everything held is filtered here before
 * it is drawn, so a live call that matches appears the moment it lands; and
 * the same filter goes to `/api/monitor` when a filter changes or "load
 * older" is pressed, so history is searched rather than only what happens to
 * be loaded. The cursor for older pages is the oldest call *shown*, not the
 * oldest held — paging a filtered list past calls that were never going to be
 * drawn would page nothing.
 *
 * The filter defaults to MCP only, which is what the page is named for. The
 * built-in calls are one switch away because the doctor and the workspace
 * reads are also where things go wrong, but a list that opens with forty
 * `Read` calls before the first `GetProgram` is a list about the wrong thing.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Icon } from "@/components/Icon";
import { Select } from "@/components/Select";
import { DateRangePicker } from "@/components/DateRangePicker";
import type { ToolCall } from "@/lib/types";

/** How many calls the list keeps once live ones start piling up. */
const LIST_LIMIT = 1000;
/** Typing pauses this long before the search goes to the server. */
const SEARCH_DEBOUNCE_MS = 300;

type Feed = "connecting" | "live" | "offline";
type Status = "all" | "ok" | "failed" | "running";
type Order = "newest" | "oldest";

type Filters = {
  mcpOnly: boolean;
  status: Status;
  q: string;
  /** `YYYY-MM-DD` in local time, or empty. */
  from: string;
  to: string;
  order: Order;
};

const DEFAULT_FILTERS: Filters = {
  mcpOnly: true,
  status: "all",
  q: "",
  from: "",
  to: "",
  order: "newest",
};

const STATUS_OPTIONS: { value: Status; label: string }[] = [
  { value: "all", label: "Any status" },
  { value: "ok", label: "Succeeded" },
  { value: "failed", label: "Failed or refused" },
  { value: "running", label: "Running" },
];

const ORDER_OPTIONS: { value: Order; label: string }[] = [
  { value: "newest", label: "Newest first" },
  { value: "oldest", label: "Oldest first" },
];

/**
 * Times are the reader's, not the server's. The rows are stamped in UTC, and
 * the first version showed them that way; a call made at ten past midnight
 * in Seoul then sat under yesterday's date, and a range picked for "today"
 * missed it. Everything here — the clock, the day, the range — is local.
 */
const two = (value: number): string => String(value).padStart(2, "0");

/** `14:09:44` — the time only; the full stamp is in the row's title. */
function clock(iso: string): string {
  const at = new Date(iso);
  return `${two(at.getHours())}:${two(at.getMinutes())}:${two(at.getSeconds())}`;
}

/** `2026-09-12`, in local time. The shape the range filter holds. */
function localDay(iso: string): string {
  const at = new Date(iso);
  return `${at.getFullYear()}-${two(at.getMonth() + 1)}-${two(at.getDate())}`;
}

/** `09-12` — the day, shown when the list spans more than one. */
function day(iso: string): string {
  return localDay(iso).slice(5);
}

/** `2026-09-12 14:09:44` — the row's title. */
function stamp(iso: string): string {
  return `${localDay(iso)} ${clock(iso)}`;
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

/** Local midnight at the start of a `YYYY-MM-DD` day, as an ISO instant. */
function dayStart(date: string): string {
  return new Date(`${date}T00:00:00`).toISOString();
}

/** The exclusive end of a `YYYY-MM-DD` day — the next local midnight. */
function dayAfter(date: string): string {
  const end = new Date(`${date}T00:00:00`);
  end.setDate(end.getDate() + 1);
  return end.toISOString();
}

/** The same test the server runs, on a call already held. */
function matches(call: ToolCall, filters: Filters): boolean {
  if (filters.mcpOnly && call.kind !== "mcp") return false;
  const state = stateOf(call);
  if (filters.status === "ok" && state !== "ok") return false;
  if (filters.status === "failed" && state !== "bad") return false;
  if (filters.status === "running" && state !== "running") return false;
  const at = Date.parse(call.startedAt);
  if (filters.from && at < Date.parse(dayStart(filters.from))) return false;
  if (filters.to && at >= Date.parse(dayAfter(filters.to))) return false;
  const q = filters.q.trim().toLowerCase();
  if (
    q &&
    !call.tool.toLowerCase().includes(q) &&
    !call.inputPreview.toLowerCase().includes(q)
  ) {
    return false;
  }
  return true;
}

/** The query string for the same filters, for `/api/monitor`. */
function queryOf(filters: Filters, extra: Record<string, string>): string {
  const query = new URLSearchParams(extra);
  if (filters.mcpOnly) query.set("mcp", "1");
  if (filters.status !== "all") query.set("status", filters.status);
  if (filters.q.trim()) query.set("q", filters.q.trim());
  if (filters.from) query.set("from", dayStart(filters.from));
  if (filters.to) query.set("to", dayAfter(filters.to));
  return query.toString();
}

/** By start time, then by id so the order is stable. */
function sortCalls(calls: Iterable<ToolCall>, order: Order): ToolCall[] {
  const sorted = [...calls].sort(
    (a, b) => b.startedAt.localeCompare(a.startedAt) || b.id.localeCompare(a.id),
  );
  return order === "newest" ? sorted : sorted.reverse();
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
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
  /** The search as typed; `filters.q` follows it after a pause. */
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  /** History ran out for these filters: the last page came back short. */
  const [exhausted, setExhausted] = useState(initial.length < pageSize);
  /** Ids of calls that arrived live, so they can be marked as they land. */
  const arrived = useRef(new Set<string>());
  /** Which fetch is current, so a slow one cannot land over a newer one. */
  const fetchSeq = useRef(0);

  const set = <K extends keyof Filters>(key: K, value: Filters[K]): void =>
    setFilters((current) => ({ ...current, [key]: value }));

  const merge = useCallback((incoming: ToolCall[]): void => {
    setCalls((current) => {
      const next = new Map(current);
      for (const call of incoming) next.set(call.id, call);
      // Cap from the old end. What falls off is still in Mongo.
      if (next.size > LIST_LIMIT) {
        const keep = sortCalls(next.values(), "newest").slice(0, LIST_LIMIT);
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

  // The search field is live; the filter it feeds is not. Sending a request
  // per keystroke would race the server against the typist.
  useEffect(() => {
    const timer = setTimeout(() => set("q", search), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [search]);

  /**
   * Fetch a page of history under the current filters.
   *
   * `before` unset asks for the newest page — what a filter change wants,
   * since what is held may hold nothing that matches. `before` set is "load
   * older". Both go through here so they cannot disagree on the query.
   */
  const fetchPage = useCallback(
    async (before: string | null): Promise<void> => {
      if (!historyAvailable) return;
      const seq = ++fetchSeq.current;
      setLoading(true);
      setLoadError(null);
      try {
        const query = queryOf(filters, {
          limit: String(pageSize),
          ...(before ? { before } : {}),
        });
        const response = await fetch(`/api/monitor?${query}`);
        const body = (await response.json().catch(() => ({}))) as {
          calls?: ToolCall[];
          error?: string;
        };
        if (!response.ok) {
          throw new Error(body.error ?? `The server answered ${response.status}.`);
        }
        if (seq !== fetchSeq.current) return;
        const page = body.calls ?? [];
        merge(page);
        setExhausted(page.length < pageSize);
      } catch (err) {
        if (seq === fetchSeq.current) setLoadError((err as Error).message);
      } finally {
        if (seq === fetchSeq.current) setLoading(false);
      }
    },
    [filters, pageSize, historyAvailable, merge],
  );

  // A filter change re-reads history from the top under the new filter. Not
  // on first render: the server already handed in the unfiltered first page.
  const firstRender = useRef(true);
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    void fetchPage(null);
    // `fetchPage` changes with `filters`, which is the dependency meant.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  const visible = useMemo(() => {
    const kept = [...calls.values()].filter((call) => matches(call, filters));
    return sortCalls(kept, filters.order);
  }, [calls, filters]);

  /** The oldest call shown, which is where the next page of history starts. */
  const oldestShown = useMemo(() => {
    let min: string | null = null;
    for (const call of visible) {
      if (min === null || call.startedAt < min) min = call.startedAt;
    }
    return min;
  }, [visible]);

  /** Whether the list crosses a day boundary, so rows say which day. */
  const spansDays = useMemo(() => {
    if (visible.length < 2) return false;
    const first = day(visible[0].startedAt);
    return visible.some((call) => day(call.startedAt) !== first);
  }, [visible]);

  const filtered =
    filters.mcpOnly !== DEFAULT_FILTERS.mcpOnly ||
    filters.status !== "all" ||
    filters.q.trim() !== "" ||
    filters.from !== "" ||
    filters.to !== "";

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
              ? "Live. New calls appear as the agent makes them."
              : feed === "connecting"
                ? "Connecting to the agent backend…"
                : "The agent backend is not answering. The list is what was loaded; it will resume on its own."}
            {persistent === false
              ? " The backend has no database configured, so only its recent memory is shown."
              : ""}
          </p>
        </div>
        <span className={`mon-feed is-${feed}`}>
          <span className="mon-feed-dot" aria-hidden="true" />
          {feed}
        </span>
      </div>

      <div className="mon-filters" role="search" aria-label="Filter calls">
        <label className="mon-search">
          <Icon name="magnifying-glass" />
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Tool name or input, e.g. GetTypeInfo or MARA"
            aria-label="Search calls by tool name or input"
            spellCheck={false}
            autoComplete="off"
          />
        </label>

        <div className="mon-filter">
          <Select
            name="status"
            value={filters.status}
            options={STATUS_OPTIONS}
            onChange={(next) => set("status", next as Status)}
          />
        </div>

        <div className="mon-filter mon-filter-dates">
          <DateRangePicker
            value={{ from: filters.from, to: filters.to }}
            onChange={(range) =>
              setFilters((current) => ({ ...current, from: range.from, to: range.to }))
            }
          />
        </div>

        <div className="mon-filter">
          <Select
            name="order"
            value={filters.order}
            options={ORDER_OPTIONS}
            onChange={(next) => set("order", next as Order)}
          />
        </div>

        <div className="mon-filters-end">
          {/* A button drawn like Clear beside it, with the tick inside. A
              pressed-state button rather than a checkbox: the two sit as a
              pair, and a bare tick next to a framed button read as a stray. */}
          <button
            type="button"
            className={`ghost mon-switch${filters.mcpOnly ? " is-on" : ""}`}
            aria-pressed={filters.mcpOnly}
            onClick={() => set("mcpOnly", !filters.mcpOnly)}
          >
            <span className="check-mark" aria-hidden="true" />
            MCP only
          </button>

          {/* Always here. Clearing puts every filter back to how the page
              opens, MCP only included, so there is never nothing to clear. */}
          <button
            type="button"
            className="ghost mon-clear"
            onClick={() => {
              setSearch("");
              setFilters(DEFAULT_FILTERS);
            }}
          >
            <Icon name="trash" /> Clear
          </button>
        </div>
      </div>

      {visible.length === 0 ? (
        <p className="mon-empty">
          {loading
            ? "Searching…"
            : calls.size === 0
              ? "Nothing yet. Run a skill or ask something in chat, and the calls it makes will show up here."
              : filtered
                ? "No calls match these filters."
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
                title={`${stamp(call.startedAt)} · session ${call.sessionId}`}
              >
                <span className="mon-dot" aria-hidden="true" />
                <span className="mon-time">
                  {spansDays ? <span className="mon-day">{day(call.startedAt)}</span> : null}
                  {clock(call.startedAt)}
                </span>
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
          {loadError ? <p className="mon-error">{loadError}</p> : null}
          <button
            type="button"
            className="ghost"
            onClick={() => void fetchPage(oldestShown)}
            disabled={loading || exhausted || oldestShown === null}
          >
            <Icon name={loading ? "circle-notch" : "arrow-down"} />
            {exhausted ? "That is everything kept" : loading ? "Loading…" : "Load older"}
          </button>
        </div>
      ) : null}
    </section>
  );
}
