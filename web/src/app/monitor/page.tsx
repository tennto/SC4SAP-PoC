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
            <div className="mon-tile">
              <span className="mon-tile-value">{summary.week.toLocaleString(tag)}</span>
              <span className="mon-tile-label">{t.callsThisWeek}</span>
              <span className="mon-tile-detail">
                {t.inLast24h(summary.today.toLocaleString(tag))}
              </span>
            </div>
            <div className={`mon-tile${summary.failedWeek > 0 ? " is-bad" : ""}`}>
              <span className="mon-tile-value">{summary.failedWeek.toLocaleString(tag)}</span>
              <span className="mon-tile-label">{t.failedOrRefused}</span>
              <span className="mon-tile-detail">
                {summary.week > 0
                  ? t.percentOfWeek(Math.round((summary.failedWeek / summary.week) * 100))
                  : t.nothingThisWeek}
              </span>
            </div>
            <div className="mon-tile">
              <span className="mon-tile-value">{duration(summary.medianMs)}</span>
              <span className="mon-tile-label">{t.medianDuration}</span>
              <span className="mon-tile-detail">{t.callToResult}</span>
            </div>
            <div className="mon-tile mon-tile-list">
              <span className="mon-tile-label">{t.mostCalled}</span>
              {summary.topTools.length === 0 ? (
                <span className="mon-tile-detail">{t.noMcpYet}</span>
              ) : (
                <ol className="mon-top">
                  {summary.topTools.map((entry) => (
                    <li key={entry.tool}>
                      <code>{entry.tool}</code>
                      <span>{entry.calls.toLocaleString(tag)}</span>
                    </li>
                  ))}
                </ol>
              )}
            </div>
          </div>
        ) : null}
      </section>

      <MonitorFeed initial={history} pageSize={PAGE} historyAvailable={summary !== null} />
    </div>
  );
}
