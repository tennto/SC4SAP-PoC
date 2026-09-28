"use client";

/**
 * The home screen's activity panel: a month's spend, stepped with ‹ 26/09 ›.
 *
 * Client-side, where the rest of the dashboard is rendered on the server,
 * because a month step used to reload the whole page — which also asks the
 * backend for its health and the SAP profile list — and the box jumped
 * height and waited seconds for a number that lives in one Mongo row. Here a
 * step fetches that row, keeps what it has already fetched, and fetches the
 * neighbouring months ahead of the click.
 *
 * The figure's slot has one height whether the month has spend or not, and a
 * change of month cross-fades inside it, so nothing below moves.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { Icon } from "@/components/Icon";
import { useLocale } from "@/lib/i18n/client";
import { localeTag } from "@/lib/i18n/locale";
import type { MonthSpend, UsageTotals } from "@/lib/chat-store";

// See `money` in `app/page.tsx`: always the en-US shape, with a non-breaking
// space so the symbol cannot end a line on its own.
const money = (value: number): string =>
  value
    .toLocaleString("en-US", { style: "currency", currency: "USD" })
    .replace("$", "$ ");

/** The month before or after a `YYYY-MM`. Same as `shiftMonth` on the server. */
function shiftMonth(month: string, by: number): string {
  const [year, index] = month.split("-").map(Number) as [number, number];
  const at = new Date(year, index - 1 + by, 1);
  return `${at.getFullYear()}-${String(at.getMonth() + 1).padStart(2, "0")}`;
}

export function ActivityPanel({
  initial,
  firstMonth,
  currentMonth,
  all,
  liveSessions,
  lastActivity,
}: {
  initial: MonthSpend;
  firstMonth: string;
  currentMonth: string;
  all: UsageTotals;
  /** Already worded on the server, which is where the backend is asked. */
  liveSessions: string;
  lastActivity: string;
}) {
  const { locale, t: messages } = useLocale();
  const t = messages.home;
  const tag = localeTag(locale);

  const [month, setMonth] = useState(initial.month);
  /** Every month fetched so far. A month steps back to instantly. */
  const cache = useRef(new Map<string, MonthSpend["totals"]>([[initial.month, initial.totals]]));
  const inflight = useRef(new Map<string, Promise<MonthSpend["totals"]>>());
  const [, rerender] = useState(0);
  const [failed, setFailed] = useState(false);

  const load = useCallback((key: string): Promise<MonthSpend["totals"]> => {
    if (cache.current.has(key)) return Promise.resolve(cache.current.get(key)!);
    const running = inflight.current.get(key);
    if (running) return running;
    const request = fetch(`/api/activity?month=${key}`, { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error(`answered ${response.status}`);
        const body = (await response.json()) as MonthSpend;
        cache.current.set(key, body.totals);
        return body.totals;
      })
      .finally(() => inflight.current.delete(key));
    inflight.current.set(key, request);
    return request;
  }, []);

  // The neighbours, ahead of the click, so a step is a swap and not a wait.
  useEffect(() => {
    if (month > firstMonth) void load(shiftMonth(month, -1)).catch(() => {});
    if (month < currentMonth) void load(shiftMonth(month, 1)).catch(() => {});
  }, [month, firstMonth, currentMonth, load]);

  const step = (by: number) => {
    const next = shiftMonth(month, by);
    if (next < firstMonth || next > currentMonth) return;
    setFailed(false);
    setMonth(next);
    // Kept in the address bar, so a reload lands on the same month. Replace,
    // not push: stepping through a year should not fill the Back button.
    window.history.replaceState(null, "", next === currentMonth ? "/" : `/?month=${next}`);
    if (!cache.current.has(next)) {
      load(next)
        .then(() => rerender((n) => n + 1))
        .catch(() => setFailed(true));
    }
  };

  const known = cache.current.has(month);
  const totals = known ? cache.current.get(month)! : null;
  const current = month === currentMonth;
  const canBack = month > firstMonth;
  const canForward = month < currentMonth;

  return (
    <section
      className="panel panel-activity rise"
      style={{ "--delay": "440ms" } as React.CSSProperties}
    >
      <div className="panel-head panel-head-row">
        <h2>
          <Icon name="pulse" /> {t.activity}
        </h2>
        <nav className="month-nav" aria-label={t.monthNav}>
          <button
            type="button"
            className="month-step"
            onClick={() => step(-1)}
            disabled={!canBack}
            aria-label={t.previousMonth}
          >
            <Icon name="caret-left" />
          </button>
          {/* `26/09`: the year short and quiet, the month carrying the
              weight — the month is what you are stepping through. */}
          <time className="month-label" dateTime={month} aria-live="polite">
            <span className="month-year">{month.slice(2, 4)}</span>
            <span className="month-sep">/</span>
            {month.slice(5)}
          </time>
          <button
            type="button"
            className="month-step"
            onClick={() => step(1)}
            disabled={!canForward}
            aria-label={t.nextMonth}
          >
            <Icon name="caret-right" />
          </button>
        </nav>
      </div>

      {/* One slot, one height, for the figure and for its absence. Keyed on
          the month so each change fades in rather than snapping. */}
      <div className="month-slot" aria-busy={!known && !failed}>
        <div key={`${month}:${known ? "in" : "wait"}`} className="month-slot-body">
          {failed ? (
            <p className="month-empty">{t.monthFailed}</p>
          ) : !known ? (
            <p className="figure is-waiting" aria-hidden="true">
              {money(0)}
              <span className="figure-unit">{t.spent}</span>
            </p>
          ) : totals ? (
            <>
              <p className="figure">
                {money(totals.costUsd)}
                <span className="figure-unit">{t.spent}</span>
              </p>
              <p className="field-note">{t.spendBasis}</p>
            </>
          ) : (
            <p className="month-empty">{t.noSpend}</p>
          )}
        </div>
      </div>

      <dl className="facts">
        <div>
          <dt>{t.conversations}</dt>
          <dd>
            {t.monthAndAllTime(
              (totals?.chats ?? 0).toLocaleString(tag),
              all.chats.toLocaleString(tag),
              current,
            )}
          </dd>
        </div>
        <div>
          <dt>{t.turnsLabel}</dt>
          <dd>
            {t.monthAndAllTime(
              (totals?.turns ?? 0).toLocaleString(tag),
              all.turns.toLocaleString(tag),
              current,
            )}
          </dd>
        </div>
        {/* All time only: the month's spend is the figure above, and
            repeating it here said the same number twice. */}
        <div>
          <dt>{t.totalSpend}</dt>
          <dd>{money(all.costUsd)}</dd>
        </div>
        <div>
          <dt>{t.liveSessions}</dt>
          <dd>{liveSessions}</dd>
        </div>
        <div>
          <dt>{t.lastActivity}</dt>
          <dd>{lastActivity}</dd>
        </div>
      </dl>
    </section>
  );
}
