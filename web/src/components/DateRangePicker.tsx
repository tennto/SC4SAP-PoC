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
 * Days are UTC days. The rows this filters are stamped in UTC and the times
 * shown beside them are UTC, so a range drawn in local days would not line up
 * with what is on screen.
 */
import { useEffect, useId, useRef, useState } from "react";
import { Icon } from "@/components/Icon";

/** `YYYY-MM-DD`, or empty for an open end. */
export type DateRange = { from: string; to: string };

const DAYS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function iso(year: number, month: number, day: number): string {
  return new Date(Date.UTC(year, month, day)).toISOString().slice(0, 10);
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function shiftDays(date: string, days: number): string {
  const value = new Date(`${date}T00:00:00.000Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}

/** `Sep 12` — enough to read a range at a glance; the year is the current one. */
function short(date: string): string {
  const [, month, day] = date.split("-");
  return `${MONTHS[Number(month) - 1].slice(0, 3)} ${Number(day)}`;
}

function label(range: DateRange): string {
  if (!range.from && !range.to) return "Any date";
  if (range.from && range.to) {
    return range.from === range.to ? short(range.from) : `${short(range.from)} – ${short(range.to)}`;
  }
  return range.from ? `From ${short(range.from)}` : `Until ${short(range.to)}`;
}

const PRESETS: { label: string; range: () => DateRange }[] = [
  { label: "Today", range: () => ({ from: todayIso(), to: todayIso() }) },
  { label: "Last 7 days", range: () => ({ from: shiftDays(todayIso(), -6), to: todayIso() }) },
  { label: "Last 30 days", range: () => ({ from: shiftDays(todayIso(), -29), to: todayIso() }) },
];

/** The 6×7 grid of a month: leading and trailing days of the neighbours included. */
function gridOf(year: number, month: number): { date: string; inMonth: boolean }[] {
  const first = new Date(Date.UTC(year, month, 1));
  // Monday-first: JS Sunday is 0, so shift it to the end.
  const lead = (first.getUTCDay() + 6) % 7;
  const cells: { date: string; inMonth: boolean }[] = [];
  for (let i = 0; i < 42; i++) {
    const day = i - lead + 1;
    const value = new Date(Date.UTC(year, month, day));
    cells.push({
      date: value.toISOString().slice(0, 10),
      inMonth: value.getUTCMonth() === month,
    });
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
      const value = new Date(Date.UTC(current.year, current.month + months, 1));
      return { year: value.getUTCFullYear(), month: value.getUTCMonth() };
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
        <span className="select-value">{label(value)}</span>
        <Icon name="caret-down" className="select-caret" />
      </button>

      {open ? (
        <div
          id={`${id}-panel`}
          className="daterange-panel"
          role="dialog"
          aria-label="Pick a date range"
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
                {preset.label}
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
                Any date
              </button>
            ) : null}
          </div>

          <div className="daterange-head">
            <button
              type="button"
              className="daterange-nav"
              aria-label="Previous month"
              onClick={() => step(-1)}
            >
              <Icon name="caret-left" />
            </button>
            <span className="daterange-month">
              {MONTHS[view.month]} {view.year}
            </span>
            <button
              type="button"
              className="daterange-nav"
              aria-label="Next month"
              onClick={() => step(1)}
            >
              <Icon name="caret-right" />
            </button>
          </div>

          <div className="daterange-grid" role="grid" onMouseLeave={() => setHover(null)}>
            {DAYS.map((day) => (
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
            {pending
              ? `From ${short(pending)} — pick the last day.`
              : "Pick the first day, then the last. UTC."}
          </p>
        </div>
      ) : null}
    </div>
  );
}
