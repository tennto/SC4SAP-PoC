"use client";

/**
 * What the chat screen's two lists share — the rail's Recents and the main
 * area's View all / project page: the row shape, the date buckets, the
 * filter-and-group choice, and the row's ⋯ menu.
 */
import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Icon } from "@/components/Icon";
import { useLocale } from "@/lib/i18n/client";
import type { Project } from "@/lib/types";

/**
 * One conversation. Not a `Session` and not a `Chat`: a conversation may be
 * stored, live, or both — `Chat.tsx` merges the two lists and hands the
 * result down, so the lists need no idea which is which beyond `stored`.
 */
export type RailItem = {
  id: string;
  title: string | null;
  turns: number;
  totalCostUsd: number;
  kind: "chat" | "task";
  projectId: string | null;
  createdAt: string;
  /** Last write, for "last active". Falls back to `createdAt`. */
  updatedAt: string;
  /** Pinned to the top of the rail; when, or null. */
  pinnedAt: string | null;
  /**
   * Has a stored row. A live session nobody has saved yet cannot be renamed
   * or filed — there is nothing on the server to change.
   */
  stored: boolean;
};

export type ListPrefs = {
  group: "date" | "none";
  show: "all" | "chat" | "task";
};

const PREFS_KEY = "sc4sap.chat.list-prefs";
const DEFAULT_PREFS: ListPrefs = { group: "date", show: "all" };

/** The filter-and-group choice, remembered per browser. */
export function useListPrefs(): [ListPrefs, (next: ListPrefs) => void] {
  const [prefs, setPrefs] = useState<ListPrefs>(DEFAULT_PREFS);
  useEffect(() => {
    try {
      const raw = localStorage.getItem(PREFS_KEY);
      if (raw) setPrefs({ ...DEFAULT_PREFS, ...(JSON.parse(raw) as Partial<ListPrefs>) });
    } catch {
      // Storage refused or garbled: the defaults are the right answer.
    }
  }, []);
  const save = (next: ListPrefs): void => {
    setPrefs(next);
    try {
      localStorage.setItem(PREFS_KEY, JSON.stringify(next));
    } catch {
      // Not remembered; still applied for this visit.
    }
  };
  return [prefs, save];
}

export function applyShow(items: RailItem[], show: ListPrefs["show"]): RailItem[] {
  return show === "all" ? items : items.filter((item) => item.kind === show);
}

type Bucket = "today" | "yesterday" | "previous7" | "previous30" | "older";

/**
 * Rows bucketed by when they began, in the order given. Started rather than
 * last touched, because the list is ordered that way: bucketing by another
 * date would put a row under a heading it is not next to.
 */
export function groupByDate(items: RailItem[]): { bucket: Bucket; items: RailItem[] }[] {
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const day = 86_400_000;
  const bucketOf = (iso: string): Bucket => {
    const at = Date.parse(iso);
    if (at >= startOfToday.getTime()) return "today";
    if (at >= startOfToday.getTime() - day) return "yesterday";
    if (at >= startOfToday.getTime() - 7 * day) return "previous7";
    if (at >= startOfToday.getTime() - 30 * day) return "previous30";
    return "older";
  };
  const groups: { bucket: Bucket; items: RailItem[] }[] = [];
  for (const item of items) {
    const bucket = bucketOf(item.createdAt);
    const last = groups[groups.length - 1];
    if (last && last.bucket === bucket) last.items.push(item);
    else groups.push({ bucket, items: [item] });
  }
  return groups;
}

/** "3 hours ago", in the screen's language. */
export function ago(iso: string, tag: string): string {
  const seconds = Math.round((Date.parse(iso) - Date.now()) / 1000);
  const format = new Intl.RelativeTimeFormat(tag, { numeric: "auto" });
  const steps: [Intl.RelativeTimeFormatUnit, number][] = [
    ["year", 31_536_000],
    ["month", 2_592_000],
    ["week", 604_800],
    ["day", 86_400],
    ["hour", 3_600],
    ["minute", 60],
  ];
  for (const [unit, size] of steps) {
    if (Math.abs(seconds) >= size) return format.format(Math.round(seconds / size), unit);
  }
  return format.format(0, "minute");
}

/** The icon that tells a chat from a task at a glance. */
export function kindIcon(kind: RailItem["kind"]): string {
  return kind === "task" ? "lightning" : "chat-circle";
}

/**
 * The filter-and-group popover. Two entries, each naming its current choice;
 * the choices themselves open in a second panel beside the first, so the
 * top level stays a short menu rather than every option at once.
 */
export function FilterGroupMenu({
  prefs,
  onChange,
}: {
  prefs: ListPrefs;
  onChange: (next: ListPrefs) => void;
}) {
  const { t: messages } = useLocale();
  const t = messages.sessions;
  const [open, setOpen] = useState(false);
  const [sub, setSub] = useState<"group" | "show" | null>(null);
  const box = useRef<HTMLDivElement>(null);

  const close = (): void => {
    setOpen(false);
    setSub(null);
  };

  const groupLabel = prefs.group === "date" ? t.groupDate : t.groupNone;
  const showLabel =
    prefs.show === "chat" ? t.showChats : prefs.show === "task" ? t.showTasks : t.showAll;

  const entry = (key: "group" | "show", label: string, value: string) => (
    <button
      type="button"
      role="menuitem"
      aria-haspopup="menu"
      aria-expanded={sub === key}
      className={`list-menu-item${sub === key ? " is-open" : ""}`}
      onClick={() => setSub((current) => (current === key ? null : key))}
      onMouseEnter={() => setSub(key)}
    >
      <span>{label}</span>
      <span className="list-menu-value">{value}</span>
      <Icon name="caret-right" className="list-menu-trail" />
    </button>
  );

  const option = (label: string, active: boolean, pick: () => void) => (
    <button
      type="button"
      role="menuitemradio"
      aria-checked={active}
      className={`list-menu-item${active ? " is-on" : ""}`}
      onClick={() => {
        pick();
        close();
      }}
    >
      <span>{label}</span>
      {active && <Icon name="check" className="list-menu-trail" />}
    </button>
  );

  return (
    <div className="list-menu-anchor" ref={box}>
      <button
        type="button"
        className={`rail-icon-button${open ? " is-open" : ""}`}
        title={t.filterGroup}
        aria-label={t.filterGroup}
        aria-expanded={open}
        onClick={() => (open ? close() : setOpen(true))}
      >
        <Icon name="sliders-horizontal" />
      </button>
      {open && (
        <FloatingMenu anchor={box} onClose={close}>
          {entry("group", t.groupBy, groupLabel)}
          {entry("show", t.show, showLabel)}
          {sub && (
            <div
              className="list-menu list-submenu"
              role="menu"
              style={{ top: sub === "group" ? 4 : 38 }}
            >
              {sub === "group" ? (
                <>
                  {option(t.groupDate, prefs.group === "date", () => onChange({ ...prefs, group: "date" }))}
                  {option(t.groupNone, prefs.group === "none", () => onChange({ ...prefs, group: "none" }))}
                </>
              ) : (
                <>
                  {option(t.showAll, prefs.show === "all", () => onChange({ ...prefs, show: "all" }))}
                  {option(t.showChats, prefs.show === "chat", () => onChange({ ...prefs, show: "chat" }))}
                  {option(t.showTasks, prefs.show === "task", () => onChange({ ...prefs, show: "task" }))}
                </>
              )}
            </div>
          )}
        </FloatingMenu>
      )}
    </div>
  );
}

export type RowActions = {
  onRename: (id: string, title: string) => void;
  onMove: (id: string, projectId: string | null) => void;
  onPin: (id: string, pinned: boolean) => void;
  /** Asks first — the caller owns the confirmation dialog. */
  onDelete: (item: RailItem) => void;
};

/**
 * A row's ⋯ menu: rename, move to a project, delete. Rename is answered in
 * the row itself, so the menu hands it back through `onStartRename`.
 */
export function RowMenu({
  item,
  projects,
  actions,
  onStartRename,
}: {
  item: RailItem;
  projects: Project[];
  actions: RowActions;
  onStartRename: () => void;
}) {
  const { t: messages } = useLocale();
  const t = messages.sessions;
  const [open, setOpen] = useState(false);
  const [moving, setMoving] = useState(false);
  const box = useRef<HTMLDivElement>(null);

  const close = (): void => {
    setOpen(false);
    setMoving(false);
  };

  return (
    <div className="list-menu-anchor row-menu" ref={box}>
      <button
        type="button"
        className={`row-more${open ? " is-open" : ""}`}
        title={t.more}
        aria-label={t.more}
        aria-expanded={open}
        onClick={(event) => {
          event.stopPropagation();
          setOpen((value) => !value);
          setMoving(false);
        }}
      >
        <Icon name="dots-three" />
      </button>
      {open && (
        <FloatingMenu anchor={box} onClose={close}>
          {!moving ? (
            <>
              <button
                type="button"
                role="menuitem"
                className="list-menu-item"
                disabled={!item.stored}
                title={item.stored ? undefined : t.notSaved}
                onClick={() => {
                  close();
                  actions.onPin(item.id, !item.pinnedAt);
                }}
              >
                <Icon name={item.pinnedAt ? "push-pin-slash" : "push-pin"} />{" "}
                <span>{item.pinnedAt ? t.unpin : t.pin}</span>
              </button>
              <button
                type="button"
                role="menuitem"
                className="list-menu-item"
                disabled={!item.stored}
                title={item.stored ? undefined : t.notSaved}
                onClick={() => {
                  close();
                  onStartRename();
                }}
              >
                <Icon name="pencil-simple" /> <span>{t.rename}</span>
              </button>
              <button
                type="button"
                role="menuitem"
                className="list-menu-item"
                disabled={!item.stored}
                title={item.stored ? undefined : t.notSaved}
                onClick={() => setMoving(true)}
              >
                <Icon name="folder-simple" /> <span>{t.moveTo}</span>
                <Icon name="caret-right" className="list-menu-trail" />
              </button>
              <div className="list-menu-rule" />
              <button
                type="button"
                role="menuitem"
                className="list-menu-item is-danger"
                onClick={() => {
                  close();
                  actions.onDelete(item);
                }}
              >
                <Icon name="trash" /> <span>{t.deleteItem}</span>
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                className="list-menu-item list-menu-back"
                onClick={() => setMoving(false)}
              >
                <Icon name="caret-left" /> <span>{t.moveTo}</span>
              </button>
              <div className="list-menu-rule" />
              {[{ id: null as string | null, name: t.noProject }, ...projects].map((project) => {
                const current = item.projectId === project.id;
                return (
                  <button
                    key={project.id ?? "none"}
                    type="button"
                    role="menuitemradio"
                    aria-checked={current}
                    className={`list-menu-item${current ? " is-on" : ""}`}
                    onClick={() => {
                      close();
                      if (!current) actions.onMove(item.id, project.id);
                    }}
                  >
                    <Icon name={project.id ? "folder-simple" : "minus"} />
                    <span>{project.name}</span>
                    {current && <Icon name="check" className="list-menu-trail" />}
                  </button>
                );
              })}
            </>
          )}
        </FloatingMenu>
      )}
    </div>
  );
}

/**
 * A popover hung off its button, opening to the right of it.
 *
 * Rendered into `document.body` with fixed coordinates rather than inside the
 * row. The rail is a 244px scroll box, and a menu positioned inside it was
 * clipped by that box — the filter menu opened leftwards from a button at the
 * rail's right edge and most of it was cut off. Out here it lies over the
 * main area instead. It still turns back to the left when there is no room
 * to the right.
 */
function FloatingMenu({
  anchor,
  onClose,
  children,
}: {
  anchor: React.RefObject<HTMLElement | null>;
  onClose: () => void;
  children: ReactNode;
}) {
  const menu = useRef<HTMLDivElement>(null);
  const [place, setPlace] = useState<{ top: number; left: number } | null>(null);
  useDismiss(true, [anchor, menu], onClose);

  useLayoutEffect(() => {
    const measure = (): void => {
      const button = anchor.current?.getBoundingClientRect();
      const box = menu.current?.getBoundingClientRect();
      if (!button || !box) return;
      const gap = 8;
      let left = button.left;
      if (left + box.width > window.innerWidth - gap) left = button.right - box.width;
      let top = button.bottom + 4;
      if (top + box.height > window.innerHeight - gap) top = button.top - box.height - 4;
      setPlace({ top: Math.max(gap, top), left: Math.max(gap, left) });
    };
    measure();
    // Follows its button when the rail scrolls or the window resizes. Not
    // closed on scroll: the transcript scrolls itself as an answer streams,
    // and a menu that shut on any scroll anywhere shut the moment it opened.
    window.addEventListener("resize", measure);
    document.addEventListener("scroll", measure, true);
    return () => {
      window.removeEventListener("resize", measure);
      document.removeEventListener("scroll", measure, true);
    };
  }, [anchor]);

  return createPortal(
    <div
      ref={menu}
      className="list-menu"
      role="menu"
      style={
        place
          ? { top: place.top, left: place.left }
          : { top: 0, left: 0, visibility: "hidden" }
      }
      onClick={(event) => event.stopPropagation()}
    >
      {children}
    </div>,
    document.body,
  );
}

/**
 * The title, or an input in its place while it is being renamed. Enter saves,
 * Escape or leaving the field without a change puts the title back.
 */
export function RowTitle({
  item,
  renaming,
  onDone,
  onRename,
  fallback,
}: {
  item: RailItem;
  renaming: boolean;
  onDone: () => void;
  onRename: (id: string, title: string) => void;
  fallback: string;
}) {
  const [draft, setDraft] = useState(item.title ?? "");
  useEffect(() => {
    if (renaming) setDraft(item.title ?? "");
  }, [renaming, item.title]);

  if (!renaming) {
    return <span className="row-title">{item.title ?? fallback}</span>;
  }
  const commit = (): void => {
    const next = draft.trim();
    if (next !== "" && next !== item.title) onRename(item.id, next);
    onDone();
  };
  return (
    <input
      className="row-rename"
      value={draft}
      autoFocus
      maxLength={200}
      onFocus={(event) => event.currentTarget.select()}
      onClick={(event) => event.stopPropagation()}
      onChange={(event) => setDraft(event.target.value)}
      onBlur={commit}
      onKeyDown={(event) => {
        if (event.key === "Enter") {
          event.preventDefault();
          commit();
        } else if (event.key === "Escape") {
          event.preventDefault();
          onDone();
        }
      }}
    />
  );
}

/** Closes a popover on an outside click or Escape. */
export function useDismiss(
  open: boolean,
  boxes: React.RefObject<HTMLElement | null>[],
  close: () => void,
): void {
  const latest = useRef(close);
  latest.current = close;
  useEffect(() => {
    if (!open) return;
    const onPointer = (event: PointerEvent): void => {
      const target = event.target as Node;
      if (!boxes.some((box) => box.current?.contains(target))) latest.current();
    };
    const onKey = (event: KeyboardEvent): void => {
      if (event.key === "Escape") latest.current();
    };
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
    // The refs are stable objects; their contents are read at event time.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);
}
