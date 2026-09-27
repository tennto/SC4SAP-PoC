/**
 * MCP Monitor — every tool call this account's sessions make.
 *
 * Two sources, joined on the client. The backend streams calls as they start
 * and finish (`/monitor/stream`, through the proxy), opening with the last
 * two hundred it still holds in memory; Mongo holds the thirty days before
 * that, and is what "load older" pages through. This file renders the frame,
 * the summary tiles, and the first page of history; `MonitorFeed` is the
 * client island that owns the stream and the list.
 *
 * The summary is computed here, on the server, once per render — not kept
 * live. Counts that tick up while you watch are the feed's job; the tiles are
 * the shape of the week, and a reload is how they catch up.
 *
 * Mongo being down is drawn, not thrown. The live half of the page works
 * without it, and a monitor that crashes because its history is unreachable
 * is a monitor that goes dark exactly when something is wrong.
 */
import type { Metadata } from "next";
import { requireAccount } from "@/lib/auth/session";
import { listToolCalls, summarizeToolCalls, type ToolCallSummary } from "@/lib/monitor-store";
import type { ToolCall } from "@/lib/types";
import { Icon } from "@/components/Icon";
import { MonitorFeed } from "@/components/MonitorFeed";
import { readMessages } from "@/lib/i18n/server";
import { localeTag } from "@/lib/i18n/locale";
import type { Messages } from "@/lib/i18n/messages";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await readMessages();
  return { title: `${t.monitor.title} · SC4SAP` };
}

const PAGE = 50;

/** `1.2 s`, `840 ms` — a duration at the precision a glance wants. */
function duration(ms: number | null): string {
  if (ms === null) return "—";
  if (ms < 1000) return `${ms} ms`;
  return `${(ms / 1000).toFixed(ms < 10_000 ? 1 : 0)} s`;
}

export default async function MonitorPage() {
  const account = await requireAccount();
  const { locale, t: messages } = await readMessages();
  const t = messages.monitor;
  const tag = localeTag(locale);

  let summary: ToolCallSummary | null = null;
  let history: ToolCall[] = [];
  let historyError: string | null = null;
  try {
    [summary, history] = await Promise.all([
      summarizeToolCalls(account.id),
      listToolCalls(account.id, { limit: PAGE }),
    ]);
  } catch (err) {
    historyError = (err as Error).message;
  }

  return (
    <div className="page monitor">
      <header className="page-head rise">
        <div>
          <p className="eyebrow">{t.eyebrow}</p>
          <h1>{t.title}</h1>
          <p className="page-lede">{t.lede}</p>
        </div>
      </header>

      <section
        className="panel rise"
        style={{ "--delay": "110ms" } as React.CSSProperties}
        aria-labelledby="monitor-week"
      >
        <div className="panel-head">
          <h2 id="monitor-week">
            <Icon name="calendar-dots" /> {t.last7Days}
          </h2>
          {summary === null ? (
            <p className="panel-note">
              {t.historyUnavailable(historyError ?? t.dbDidNotAnswer)}
            </p>
          ) : null}
        </div>

        {summary ? (
          <div className="mon-tiles">
            <CallsTile summary={summary} t={t} tag={tag} />

            <OutcomeTile summary={summary} t={t} tag={tag} />

            <div className="mon-tile">
              <span className="mon-tile-label">{t.medianDuration}</span>
              <span className="mon-tile-value">{duration(summary.medianMs)}</span>
              <span className="mon-tile-detail">
                {t.callToResult(duration(summary.p95Ms), summary.mcpWeek.toLocaleString(tag))}
              </span>
            </div>

            <TopToolsTile summary={summary} t={t} tag={tag} />
          </div>
        ) : null}
      </section>

      <MonitorFeed initial={history} pageSize={PAGE} historyAvailable={summary !== null} />
    </div>
  );
}

type MonitorText = Messages["monitor"];

/**
 * Failed and refused against everything else, as a ring.
 *
 * Three segments and a centre figure: the ring answers "how much of the week
 * went wrong" at a glance, the figure says exactly how much, and the legend
 * carries the counts so identity never rests on colour alone. Success is the
 * neutral track — the state worth seeing is the one that is not success.
 */
function OutcomeTile({
  summary,
  t,
  tag,
}: {
  summary: ToolCallSummary;
  t: MonitorText;
  tag: string;
}) {
  const total = summary.week;
  const bad = summary.failedWeek + summary.refusedWeek;
  const share = total > 0 ? (bad / total) * 100 : 0;
  const radius = 30;
  const circumference = 2 * Math.PI * radius;
  // No gap between segments. The ring sits on a grey track, so a gap showed
  // the track rather than the card and read as a crack, and at a few
  // percent a segment is only a few pixels long to begin with.
  const segments = [
    { key: "failed", value: summary.failedWeek, className: "is-failed" },
    { key: "refused", value: summary.refusedWeek, className: "is-refused" },
  ];
  let offset = 0;
  const arcs = segments.map((segment) => {
    const length = total > 0 ? (segment.value / total) * circumference : 0;
    const arc = { ...segment, drawn: length, offset };
    offset += length;
    return arc;
  });

  return (
    <div className="mon-tile mon-tile-chart">
      <span className="mon-tile-label">{t.failedOrRefused}</span>
      {total === 0 ? (
        <span className="mon-tile-detail">{t.nothingThisWeek}</span>
      ) : (
        <div className="mon-outcome">
          <svg
            className="mon-donut"
            viewBox="0 0 80 80"
            role="img"
            aria-label={`${t.failedOrRefused}: ${t.percentOfWeek(Math.round(share))}`}
          >
            <circle className="mon-donut-track" cx="40" cy="40" r={radius} />
            {arcs.map((arc) =>
              arc.drawn > 0 ? (
                <circle
                  key={arc.key}
                  className={`mon-donut-arc ${arc.className}`}
                  cx="40"
                  cy="40"
                  r={radius}
                  strokeDasharray={`${arc.drawn} ${circumference - arc.drawn}`}
                  // Clockwise from twelve o'clock.
                  strokeDashoffset={circumference / 4 - arc.offset}
                />
              ) : null,
            )}
            <text className="mon-donut-figure" x="40" y="40">
              {share < 10 && share > 0 ? share.toFixed(1) : Math.round(share)}%
            </text>
          </svg>
          <ul className="mon-legend">
            <li>
              <i className="mon-key is-failed" aria-hidden="true" />
              {t.outcomeFailed}
              <span>{summary.failedWeek.toLocaleString(tag)}</span>
            </li>
            <li>
              <i className="mon-key is-refused" aria-hidden="true" />
              {t.outcomeRefused}
              <span>{summary.refusedWeek.toLocaleString(tag)}</span>
            </li>
            <li>
              <i className="mon-key is-ok" aria-hidden="true" />
              {t.outcomeSucceeded}
              <span>{(total - bad).toLocaleString(tag)}</span>
            </li>
          </ul>
        </div>
      )}
    </div>
  );
}

/**
 * The five most-called MCP tools as columns.
 *
 * One series, so no legend. The leader is set in full ink and the rest a step
 * back — the tile's question is "what does the agent reach for most", and
 * that is one column, not five. The count sits on each column and a rank
 * under it; the name, too long for a column this narrow, comes up on hover
 * or focus and is each column's accessible name.
 */
function TopToolsTile({
  summary,
  t,
  tag,
}: {
  summary: ToolCallSummary;
  t: MonitorText;
  tag: string;
}) {
  const top = summary.topTools;
  const max = Math.max(1, ...top.map((entry) => entry.calls));
  return (
    <div className="mon-tile mon-tile-chart">
      <span className="mon-tile-label">{t.mostCalled}</span>
      {top.length === 0 ? (
        <span className="mon-tile-detail">{t.noMcpYet}</span>
      ) : (
        <>
          <div className="mon-bars" role="list">
            {top.map((entry, index) => (
              <div
                key={entry.tool}
                className={`mon-bar${index === 0 ? " is-top" : ""}`}
                role="listitem"
                tabIndex={0}
                aria-label={t.toolCalls(entry.tool, entry.calls.toLocaleString(tag))}
                style={{ "--h": `${(entry.calls / max) * 100}%` } as React.CSSProperties}
              >
                <span className="mon-bar-value" aria-hidden="true">
                  {entry.calls.toLocaleString(tag)}
                </span>
                <span className="mon-bar-fill" aria-hidden="true" />
                <span className="mon-bar-rank" aria-hidden="true">
                  {index + 1}
                </span>
                <span className="mon-bar-tip" aria-hidden="true">
                  {t.toolCalls(entry.tool, entry.calls.toLocaleString(tag))}
                </span>
              </div>
            ))}
          </div>
          <span className="mon-tile-detail mon-bars-lead">
            {t.topTool} <code>{top[0].tool}</code>
            {" · "}
            {t.topToolShare(
              top[0].calls.toLocaleString(tag),
              summary.mcpWeek > 0 ? Math.round((top[0].calls / summary.mcpWeek) * 100) : 0,
            )}
          </span>
        </>
      )}
    </div>
  );
}

/**
 * The week's count, the shape of the week, and what the calls were.
 *
 * A stat tile with a sparkline: the figure is the answer, the seven columns
 * say whether it came evenly or in one burst, and today's column is the one
 * in full ink. Under them, one thin bar splits the week into calls that
 * reached SAP and the agent reading its own workspace — the split that
 * decides whether a busy week was a busy week for the SAP system.
 */
function CallsTile({
  summary,
  t,
  tag,
}: {
  summary: ToolCallSummary;
  t: MonitorText;
  tag: string;
}) {
  const max = Math.max(1, ...summary.daily.map((day) => day.calls));
  const sapShare = summary.week > 0 ? (summary.mcpWeek / summary.week) * 100 : 0;
  // `9/27`: short enough for a tooltip, and read the same in every locale here.
  const dayLabel = (date: string) => {
    const [, month, day] = date.split("-");
    return `${Number(month)}/${Number(day)}`;
  };
  return (
    <div className="mon-tile">
      <span className="mon-tile-label">{t.callsThisWeek}</span>
      <div className="mon-count">
        <span className="mon-tile-value">
          {summary.week.toLocaleString(tag)}
          <span className="mon-unit">{t.callsUnit}</span>
        </span>
        <div className="mon-spark" role="list">
          {summary.daily.map((day, index) => (
            <div
              key={day.date}
              className={`mon-spark-day${index === summary.daily.length - 1 ? " is-today" : ""}`}
              role="listitem"
              tabIndex={0}
              aria-label={t.dayCalls(dayLabel(day.date), day.calls.toLocaleString(tag))}
              style={{ "--h": `${(day.calls / max) * 100}%` } as React.CSSProperties}
            >
              <span className="mon-spark-fill" aria-hidden="true" />
              <span className="mon-bar-tip" aria-hidden="true">
                {t.dayCalls(dayLabel(day.date), day.calls.toLocaleString(tag))}
              </span>
            </div>
          ))}
        </div>
      </div>
      <div className="mon-split" aria-hidden="true">
        <span className="mon-split-sap" style={{ width: `${sapShare}%` }} />
      </div>
      <span className="mon-tile-detail">
        {t.sapLocalSplit(
          summary.mcpWeek.toLocaleString(tag),
          (summary.week - summary.mcpWeek).toLocaleString(tag),
        )}
      </span>
      <span className="mon-tile-detail">{t.inLast24h(summary.today.toLocaleString(tag))}</span>
    </div>
  );
}
