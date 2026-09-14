"use client";

/**
 * A date range, picked from a calendar the app draws itself.
 *
 * Not `<input type="date">`, for the reason `Select` is not `<select>`: the
 * browser hands the picker to the operating system, and no CSS in this app
 * reaches inside it. Two of those beside the app's own controls looked like
 * two windows from another program had been left open on the page.
 *
 * One control for both ends. A range is one choice, not two, and a reader
 * setting one usually wants "that day" or "those days" — so a first click
 * starts the range, a second finishes it, and clicking the same day twice
 * gives that single day. Presets cover the ranges people actually reach for.
 *
 * Days are the reader's local days, like every time the monitor shows. The
 * rows are stamped in UTC underneath; the feed converts at the edges.
 */
import { useEffect, useId, useRef, useState } from "react";
import { Icon } from "@/components/Icon";
import { useLocale } from "@/lib/i18n/client";
import type { Messages } from "@/lib/i18n/messages";

/** `YYYY-MM-DD`, or empty for an open end. */
export type DateRange = { from: string; to: string };

/** The day and month names, and every sentence, in the reader's language. */
type Text = Messages["dateRange"];

const two = (value: number): string => String(value).padStart(2, "0");

/** `YYYY-MM-DD` of a local date. */
function iso(value: Date): string {
  return `${value.getFullYear()}-${two(value.getMonth() + 1)}-${two(value.getDate())}`;
}

function todayIso(): string {
  return iso(new Date());
}

function shiftDays(date: string, days: number): string {
  const value = new Date(`${date}T00:00:00`);
  value.setDate(value.getDate() + days);
  return iso(value);
}

/** `Sep 12` — enough to read a range at a glance; the year is the current one. */
function short(date: string, t: Text): string {
  const [, month, day] = date.split("-");
  return t.short(Number(month) - 1, Number(day), t.months);
}

function label(range: DateRange, t: Text): string {
  if (!range.from && !range.to) return t.anyDate;
  if (range.from && range.to) {
    return range.from === range.to
      ? short(range.from, t)
      : `${short(range.from, t)} – ${short(range.to, t)}`;
  }
  return range.from ? t.from(short(range.from, t)) : t.until(short(range.to, t));
}

/** `label` names the key in `dateRange`. */
const PRESETS: { label: "today" | "last7" | "last30"; range: () => DateRange }[] = [
  { label: "today", range: () => ({ from: todayIso(), to: todayIso() }) },
  { label: "last7", range: () => ({ from: shiftDays(todayIso(), -6), to: todayIso() }) },
  { label: "last30", range: () => ({ from: shiftDays(todayIso(), -29), to: todayIso() }) },
];

/** The 6×7 grid of a month: leading and trailing days of the neighbours included. */
function gridOf(year: number, month: number): { date: string; inMonth: boolean }[] {
  const first = new Date(year, month, 1);
  // Monday-first: JS Sunday is 0, so shift it to the end.
  const lead = (first.getDay() + 6) % 7;
  const cells: { date: string; inMonth: boolean }[] = [];
  for (let i = 0; i < 42; i++) {
    const day = i - lead + 1;
    const value = new Date(year, month, day);
    cells.push({ date: iso(value), inMonth: value.getMonth() === month });
  }
  return cells;
}

export function DateRangePicker({
  value,
  onChange,
}: {
  value: DateRange;
  onChange: (range: DateRange) => void;
}) {
  const id = useId();
  const { t: messages } = useLocale();
  const t = messages.dateRange;
  const [open, setOpen] = useState(false);
  /** The month on show. Starts on the range's end, or on today. */
  const [view, setView] = useState(() => {
    const anchor = value.to || value.from || todayIso();
    return { year: Number(anchor.slice(0, 4)), month: Number(anchor.slice(5, 7)) - 1 };
  });
  /** A range in progress: the first click landed, the second has not. */
  const [pending, setPending] = useState<string | null>(null);
  const [hover, setHover] = useState<string | null>(null);
  const root = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (event: MouseEvent): void => {
      if (!root.current?.contains(event.target as Node)) close(false);
    };
    const onKey = (event: KeyboardEvent): void => {
      if (event.key === "Escape") close();
    };
    window.addEventListener("mousedown", onDown);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("mousedown", onDown);
      window.removeEventListener("keydown", onKey);
    };
    // `close` is stable enough: it only touches refs and state setters.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  function close(focus = true): void {
    setOpen(false);
    setPending(null);
    setHover(null);
    if (focus) button.current?.focus();
  }

  function pick(date: string): void {
    if (pending === null) {
      setPending(date);
      return;
    }
    const [from, to] = pending <= date ? [pending, date] : [date, pending];
    onChange({ from, to });
    close();
  }

  function step(months: number): void {
    setView((current) => {
      const value = new Date(current.year, current.month + months, 1);
      return { year: value.getFullYear(), month: value.getMonth() };
    });
  }

  // What the grid highlights: the committed range, or the one being drawn.
  const shown: DateRange =
    pending !== null
      ? hover && hover < pending
        ? { from: hover, to: pending }
        : { from: pending, to: hover ?? pending }
      : value;
  const today = todayIso();
  const active = Boolean(value.from || value.to);

  return (
    <div className="daterange" ref={root}>
      <button
        type="button"
        ref={button}
        className={`select-button daterange-button${open ? " is-open" : ""}${active ? " is-set" : ""}`}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={`${id}-panel`}
        onClick={() => (open ? close() : setOpen(true))}
      >
        <Icon name="calendar-blank" className="daterange-icon" />
        <span className="select-value">{label(value, t)}</span>
        <Icon name="caret-down" className="select-caret" />
      </button>

      {open ? (
        <div
          id={`${id}-panel`}
          className="daterange-panel"
          role="dialog"
          aria-label={t.pickRange}
        >
          <div className="daterange-presets">
            {PRESETS.map((preset) => (
              <button
                key={preset.label}
                type="button"
                className="daterange-preset"
                onClick={() => {
                  onChange(preset.range());
                  close();
                }}
              >
                {t[preset.label]}
              </button>
            ))}
            {active ? (
              <button
                type="button"
                className="daterange-preset"
                onClick={() => {
                  onChange({ from: "", to: "" });
                  close();
                }}
              >
                {t.anyDate}
              </button>
            ) : null}
          </div>

          <div className="daterange-head">
            <button
              type="button"
              className="daterange-nav"
              aria-label={t.previousMonth}
              onClick={() => step(-1)}
            >
              <Icon name="caret-left" />
            </button>
            <span className="daterange-month">
              {t.monthTitle(t.months[view.month], view.year)}
            </span>
            <button
              type="button"
              className="daterange-nav"
              aria-label={t.nextMonth}
              onClick={() => step(1)}
            >
              <Icon name="caret-right" />
            </button>
          </div>

          <div className="daterange-grid" role="grid" onMouseLeave={() => setHover(null)}>
            {t.days.map((day) => (
              <span key={day} className="daterange-dow" role="columnheader">
                {day}
              </span>
            ))}
            {gridOf(view.year, view.month).map((cell) => {
              const inRange =
                Boolean(shown.from && shown.to) && cell.date >= shown.from && cell.date <= shown.to;
              const isEnd = cell.date === shown.from || cell.date === shown.to;
              return (
                <button
                  key={cell.date}
                  type="button"
                  role="gridcell"
                  className={[
                    "daterange-day",
                    cell.inMonth ? "" : "is-outside",
                    inRange ? "is-in-range" : "",
                    isEnd ? "is-end" : "",
                    cell.date === today ? "is-today" : "",
                    cell.date > today ? "is-future" : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  disabled={cell.date > today}
                  aria-selected={isEnd}
                  onClick={() => pick(cell.date)}
                  onMouseEnter={() => setHover(cell.date)}
                  onFocus={() => setHover(cell.date)}
                >
                  {Number(cell.date.slice(8, 10))}
                </button>
              );
            })}
          </div>

          <p className="daterange-hint">
            {pending ? t.pickLast(short(pending, t)) : t.pickFirst}
          </p>
        </div>
      ) : null}
    </div>
  );
}
