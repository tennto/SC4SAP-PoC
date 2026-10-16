"use client";

/**
 * The activity panel's trend: the account's spend month by month, the last
 * six months, as a line — opened from the chart button beside ‹ 26/09 ›.
 *
 * One series, so no legend: the title names it. The months come through the
 * panel's own loader (`load`), so a month the panel has already fetched is not
 * asked for again, and the six requests go out together. A month before the
 * account's first is not a zero — there was nothing to spend in yet — and is
 * left off the line rather than drawn at the bottom.
 *
 * Read by hovering (or focusing) a month: a crosshair and a tooltip with the
 * month's spend, conversations and turns. The figures above the chart — six
 * months together, the monthly average, the change on the month before — are
 * the headline; the same numbers are in a table for a screen reader.
 */
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Icon } from "@/components/Icon";
import { useLocale } from "@/lib/i18n/client";
import { localeTag } from "@/lib/i18n/locale";
import type { MonthSpend } from "@/lib/chat-store";

const MONTHS = 6;

const money = (value: number): string =>
  value
    .toLocaleString("en-US", { style: "currency", currency: "USD" })
    .replace("$", "$ ");

/** The month before or after a `YYYY-MM`. Same as `shiftMonth` in the panel. */
function shiftMonth(month: string, by: number): string {
  const [year, index] = month.split("-").map(Number) as [number, number];
  const at = new Date(year, index - 1 + by, 1);
  return `${at.getFullYear()}-${String(at.getMonth() + 1).padStart(2, "0")}`;
}

/** An axis top a little above the largest value, on a round number. */
function niceMax(value: number): number {
  if (value <= 0) return 1;
  const power = 10 ** Math.floor(Math.log10(value));
  const step = [1, 2, 2.5, 5, 10].find((s) => s * power >= value / 4)! * power;
  return Math.ceil(value / step) * step;
}

type Point = { month: string; totals: MonthSpend["totals"]; before: boolean };

// The drawing's own coordinates; the SVG scales to the dialog's width.
const W = 560;
const H = 240;
const PAD = { left: 56, right: 20, top: 18, bottom: 34 };

/**
 * The line is drawn once the dialog has risen into place (`trend-in`, 320ms),
 * so the drawing is seen rather than half over before the dialog settles.
 * Kept in step with `.trend-line` in globals.css.
 */
const DRAW_DELAY = 380;
const DRAW_MS = 1100;

export function ActivityTrend({
  currentMonth,
  firstMonth,
  load,
  onClose,
}: {
  currentMonth: string;
  firstMonth: string;
  load: (month: string) => Promise<MonthSpend["totals"]>;
  onClose: () => void;
}) {
  const { locale, t: messages } = useLocale();
  const t = messages.home;
  const tag = localeTag(locale);
  const titleId = useId();

  const months = useMemo(
    () => Array.from({ length: MONTHS }, (_, i) => shiftMonth(currentMonth, i - (MONTHS - 1))),
    [currentMonth],
  );
  const [points, setPoints] = useState<Point[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [hover, setHover] = useState<number | null>(null);
  const [closing, setClosing] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    let live = true;
    Promise.all(
      months.map(async (month): Promise<Point> =>
        month < firstMonth ? { month, totals: null, before: true } : { month, totals: await load(month), before: false },
      ),
    )
      .then((result) => live && setPoints(result))
      .catch(() => live && setFailed(true));
    return () => {
      live = false;
    };
  }, [months, firstMonth, load]);

  // Escape closes, as every dialog here does; focus starts on the close button.
  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
    };
    addEventListener("keydown", onKey);
    return () => removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // The exit plays, then the dialog goes (`.leaving`, as `NoticeModal` does).
  // With motion reduced nothing plays, so nothing would end: it goes at once.
  const close = () =>
    matchMedia("(prefers-reduced-motion: reduce)").matches ? onClose() : setClosing(true);

  const shown = points?.filter((p) => !p.before) ?? [];
  const spend = (p: Point) => p.totals?.costUsd ?? 0;
  const total = shown.reduce((sum, p) => sum + spend(p), 0);
  const average = shown.length ? total / shown.length : 0;
  const last = shown.at(-1);
  const prior = shown.at(-2);
  const change = last && prior && spend(prior) > 0 ? (spend(last) - spend(prior)) / spend(prior) : null;

  const top = niceMax(Math.max(0, ...shown.map(spend)));
  const x = (i: number) => PAD.left + ((W - PAD.left - PAD.right) * i) / (MONTHS - 1);
  const y = (value: number) => PAD.top + (H - PAD.top - PAD.bottom) * (1 - value / top);
  const plotted = (points ?? []).map((p, i) => ({ p, i })).filter(({ p }) => !p.before);
  const line = plotted.map(({ p, i }, n) => `${n ? "L" : "M"}${x(i).toFixed(1)},${y(spend(p)).toFixed(1)}`).join("");
  const area = plotted.length
    ? `${line}L${x(plotted.at(-1)!.i).toFixed(1)},${y(0)}L${x(plotted[0]!.i).toFixed(1)},${y(0)}Z`
    : "";
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => top * f);
  const label = (month: string) => `${month.slice(2, 4)}/${month.slice(5)}`;
  const active = hover !== null && points && !points[hover]!.before ? points[hover]! : null;

  return createPortal(
    <div
      className={`modal-backdrop${closing ? " leaving" : ""}`}
      // Gone when the dialog has sunk out (`trend-out`), which ends after the dim.
      onAnimationEnd={(event) => closing && event.animationName === "trend-out" && onClose()}
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      onMouseDown={(event) => event.target === event.currentTarget && close()}
    >
      <div className="modal trend-modal">
        <header className="trend-head">
          <div>
            <h2 id={titleId}>{t.trendTitle}</h2>
            <p className="trend-sub">{t.trendSub(MONTHS)}</p>
          </div>
          <button ref={closeRef} type="button" className="trend-close" onClick={close} aria-label={t.trendClose}>
            <Icon name="x" />
          </button>
        </header>

        {failed ? (
          <p className="month-empty">{t.monthFailed}</p>
        ) : (
          <>
            <dl className="trend-figures" aria-busy={!points}>
              <div>
                <dt>{t.trendTotal(MONTHS)}</dt>
                <dd>{points ? money(total) : "—"}</dd>
              </div>
              <div>
                <dt>{t.trendAverage}</dt>
                <dd>{points ? money(average) : "—"}</dd>
              </div>
              <div>
                <dt>{t.trendChange}</dt>
                <dd className={change === null ? "" : change > 0 ? "is-up" : change < 0 ? "is-down" : ""}>
                  {change === null ? "—" : `${change > 0 ? "▲" : change < 0 ? "▼" : ""} ${Math.abs(change * 100).toFixed(0)}%`}
                </dd>
              </div>
            </dl>

            <div className="trend-chart" onMouseLeave={() => setHover(null)}>
              <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={t.trendTitle}>
                <defs>
                  <linearGradient id={`${titleId}-fill`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0" stopColor="currentColor" stopOpacity="0.14" />
                    <stop offset="1" stopColor="currentColor" stopOpacity="0" />
                  </linearGradient>
                </defs>
                {/* Recessive grid and axis: the line is what is read. */}
                {ticks.map((tick) => (
                  <g key={tick} className="trend-grid">
                    <line x1={PAD.left} x2={W - PAD.right} y1={y(tick)} y2={y(tick)} />
                    <text x={PAD.left - 10} y={y(tick)} textAnchor="end" dominantBaseline="central">
                      {tick === 0 ? "$0" : `$${tick >= 10 ? Math.round(tick) : tick.toFixed(tick < 1 ? 2 : 1)}`}
                    </text>
                  </g>
                ))}
                {months.map((month, i) => (
                  <text key={month} className="trend-month" x={x(i)} y={H - 10} textAnchor="middle">
                    {label(month)}
                  </text>
                ))}
                {points && (
                  <g className="trend-series">
                    {active && hover !== null && (
                      <line className="trend-cross" x1={x(hover)} x2={x(hover)} y1={PAD.top} y2={y(0)} />
                    )}
                    <path className="trend-area" d={area} fill={`url(#${titleId}-fill)`} />
                    <path className="trend-line" d={line} pathLength={1} />
                    {plotted.map(({ p, i }) => (
                      <circle
                        key={p.month}
                        className={`trend-dot${i === hover ? " is-active" : ""}${p.month === currentMonth ? " is-current" : ""}`}
                        // Each point lands as the line reaches it.
                        style={{ animationDelay: `${DRAW_DELAY + (i / (MONTHS - 1)) * DRAW_MS}ms` } as React.CSSProperties}
                        cx={x(i)}
                        cy={y(spend(p))}
                        r={i === hover ? 5.5 : 4}
                      />
                    ))}
                    {/* The one direct label: this month's spend. */}
                    {last && hover === null && (
                      <text className="trend-value" x={x(MONTHS - 1)} y={y(spend(last)) - 12} textAnchor="end">
                        {money(spend(last))}
                      </text>
                    )}
                  </g>
                )}
                {/* Hit areas a month wide, larger than the dots. */}
                {months.map((month, i) => (
                  <rect
                    key={month}
                    className="trend-hit"
                    x={x(i) - (W - PAD.left - PAD.right) / (MONTHS - 1) / 2}
                    y={PAD.top}
                    width={(W - PAD.left - PAD.right) / (MONTHS - 1)}
                    height={H - PAD.top - PAD.bottom}
                    tabIndex={points && !points[i]!.before ? 0 : -1}
                    onMouseEnter={() => setHover(i)}
                    onFocus={() => setHover(i)}
                    onBlur={() => setHover(null)}
                  />
                ))}
              </svg>
              {active && hover !== null && (
                <div
                  // At the top of the plot, following the crosshair across;
                  // the first and last months open it inward. Above a point
                  // it ran out of the dialog at the highest month.
                  className={`trend-tip${hover === 0 ? " is-start" : hover === MONTHS - 1 ? " is-end" : ""}`}
                  style={{
                    left: `${(x(hover) / W) * 100}%`,
                    top: 0,
                  }}
                >
                  <strong>{label(active.month)}</strong>
                  <span className="trend-tip-value">{money(spend(active))}</span>
                  <span className="trend-tip-meta">
                    {t.conversations} {(active.totals?.chats ?? 0).toLocaleString(tag)} · {t.turnsLabel}{" "}
                    {(active.totals?.turns ?? 0).toLocaleString(tag)}
                  </span>
                </div>
              )}
              {!points && <div className="trend-wait" aria-hidden="true" />}
            </div>
            <p className="field-note">{t.spendBasis}</p>

            {/* The same numbers for a screen reader. */}
            <table className="sr-only">
              <caption>{t.trendTitle}</caption>
              <thead>
                <tr>
                  <th>{t.monthNav}</th>
                  <th>{t.spent}</th>
                  <th>{t.conversations}</th>
                  <th>{t.turnsLabel}</th>
                </tr>
              </thead>
              <tbody>
                {shown.map((p) => (
                  <tr key={p.month}>
                    <td>{p.month}</td>
                    <td>{money(spend(p))}</td>
                    <td>{p.totals?.chats ?? 0}</td>
                    <td>{p.totals?.turns ?? 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}
      </div>
    </div>,
    document.body,
  );
}
