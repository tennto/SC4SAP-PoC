"use client";

/**
 * Display IMG — the live SPRO tree, its configured / empty status, and each
 * activity's maintenance screen with the system's real values.
 *
 * Two panes: the module's IMG tree on the left, the overview or one activity
 * on the right. Everything is read from `/api/img/*` (see
 * `src/server/img.ts`), which reads SAP directly — no model, no cost. The
 * tree and the status check are background jobs on the backend, so both are
 * polled: the first open of a module takes about half a minute, a status
 * check about as long again, and every open after that is instant.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ThinkingOrb } from "thinking-orbs";
import { Icon } from "@/components/Icon";
import { SapScreens } from "@/components/SapScreen";
import { useLocale } from "@/lib/i18n/client";
import {
  abbreviation,
  activityStatus,
  emptyTally,
  moduleNames,
  parentMap,
  pick,
  tallyTree,
  type ActStatus,
  type ImgModule,
  type ImgNode,
  type ImgStatus,
  type ImgTree,
  type Progress,
  type Screen,
  type Tally,
} from "@/lib/img";

const POLL_MS = 1500;
const MODULE_KEY = "sc4sap.img.module";
// How long the reading pane keeps the previous activity while the next one's
// screens are read. A cached read lands well inside it, so the pane swaps once
// to the finished page; a slow one shows its loading state after this.
const HOLD_MS = 250;

type Filter = "all" | "set" | "empty";

async function getJson<T>(path: string, init?: RequestInit): Promise<{ status: number; body: T }> {
  const response = await fetch(`/api${path}`, init);
  const body = (await response.json().catch(() => ({}))) as T & { error?: string };
  if (!response.ok && response.status !== 202) {
    throw new Error(body.error ?? `${response.status} ${response.statusText}`);
  }
  return { status: response.status, body };
}

function readStored(): string | null {
  try {
    return localStorage.getItem(MODULE_KEY);
  } catch {
    return null;
  }
}

/* ------------------------------------------------------------------ */

/**
 * The status mark: a filled dot, an outlined ring, or — for an activity with
 * nothing to count — a question mark in a circle, which says "cannot tell"
 * where a dash read as "nothing".
 */
function StatusDot({ status }: { status: ActStatus }) {
  if (status === "unknown") return <Icon name="question" className="img-dot is-unknown" />;
  return <span className={`img-dot is-${status}`} aria-hidden="true" />;
}

/** A thin bar split into configured / empty / not checkable. */
function TallyBar({ tally }: { tally: Tally }) {
  const total = Math.max(tally.total, 1);
  return (
    <span className="img-bar" aria-hidden="true">
      <span className="is-set" style={{ width: `${(tally.set / total) * 100}%` }} />
      <span className="is-unknown" style={{ width: `${(tally.unknown / total) * 100}%` }} />
      <span className="is-empty" style={{ width: `${(tally.empty / total) * 100}%` }} />
    </span>
  );
}

function ModulePicker({
  modules,
  value,
  onChange,
}: {
  modules: ImgModule[];
  value: string;
  onChange: (id: string) => void;
}) {
  const { t: messages, locale } = useLocale();
  const t = messages.configuration;
  const [open, setOpen] = useState(false);
  const [term, setTerm] = useState("");
  // The keyboard's place in the list; Enter takes it, not the first row.
  const [active, setActive] = useState(0);
  const root = useRef<HTMLDivElement>(null);
  const list = useRef<HTMLUListElement>(null);
  const current = modules.find((m) => m.id === value);
  const names = useMemo(() => moduleNames(modules, locale), [modules, locale]);

  useEffect(() => {
    if (!open) return;
    const close = (event: MouseEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  const needle = term.trim().toLowerCase();
  const shown = modules.filter(
    (m) =>
      !needle ||
      `${m.text.ko ?? ""} ${m.text.ja ?? ""} ${m.text.en ?? ""} ${abbreviation(m) ?? ""}`.toLowerCase().includes(needle),
  );

  useEffect(() => {
    list.current?.querySelector<HTMLElement>(`[data-index="${active}"]`)?.scrollIntoView({ block: "nearest" });
  }, [active]);

  const openList = () => {
    setActive(Math.max(0, modules.findIndex((m) => m.id === value)));
    setOpen(true);
  };
  const choose = (id: string) => {
    onChange(id);
    setOpen(false);
    setTerm("");
  };

  return (
    <div className="img-picker" ref={root}>
      <button
        type="button"
        className={`img-picker-button${open ? " is-open" : ""}`}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => (open ? setOpen(false) : openList())}
      >
        <Icon name="squares-four" className="img-picker-icon" />
        <span className={`img-picker-value${current ? "" : " is-placeholder"}`}>
          {current ? names.get(current.id) : t.pickPlaceholder}
        </span>
        <Icon name="caret-down" className="img-picker-caret" />
      </button>
      {open ? (
        <div className="img-picker-pop">
          <label className="img-search">
            <Icon name="magnifying-glass" />
            <input
              autoFocus
              type="text"
              value={term}
              placeholder={t.moduleSearch}
              aria-label={t.moduleSearch}
              onChange={(event) => {
                setTerm(event.target.value);
                setActive(0);
              }}
              onKeyDown={(event) => {
                if (event.key === "Escape") setOpen(false);
                else if (event.key === "ArrowDown") {
                  event.preventDefault();
                  setActive((i) => Math.min(shown.length - 1, i + 1));
                } else if (event.key === "ArrowUp") {
                  event.preventDefault();
                  setActive((i) => Math.max(0, i - 1));
                } else if (event.key === "Enter" && shown[active]) choose(shown[active].id);
              }}
            />
            <span className="img-count">{shown.length}</span>
          </label>
          <ul role="listbox" aria-label={t.moduleLabel} ref={list}>
            {shown.map((m, i) => (
              <li key={m.id}>
                <button
                  type="button"
                  role="option"
                  data-index={i}
                  aria-selected={m.id === value}
                  className={i === active ? "is-active" : undefined}
                  onMouseEnter={() => setActive(i)}
                  onClick={() => choose(m.id)}
                >
                  <span className="img-option-text">
                    {names.get(m.id)}
                    {locale !== "en" && pick(m.text, locale) !== m.text.en && m.text.en ? <small>{m.text.en}</small> : null}
                  </span>
                  {m.id === value ? <Icon name="check" /> : null}
                </button>
              </li>
            ))}
            {shown.length === 0 ? <li className="img-empty">{t.noModuleMatch}</li> : null}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

/* ------------------------------------------------------------------ */

export function ImgBrowser() {
  const { t: messages, locale, tag } = useLocale();
  const t = messages.configuration;

  const [modules, setModules] = useState<ImgModule[] | null>(null);
  const [alias, setAlias] = useState("");
  // The modules the profile says are in use, offered first on the start screen.
  const [active, setActive] = useState<string[]>([]);
  const [moduleId, setModuleId] = useState<string | null>(null);
  const [tree, setTree] = useState<ImgTree | null>(null);
  const [treeProgress, setTreeProgress] = useState<Progress | null>(null);
  const [status, setStatus] = useState<ImgStatus | null>(null);
  const [statusProgress, setStatusProgress] = useState<Progress | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  const [selected, setSelected] = useState<string | null>(null);
  const [open, setOpen] = useState<Set<string>>(new Set());
  // While a search or filter is on, every folder with a match opens by
  // itself; this holds the ones the reader folded back up since. Kept apart
  // from `open` so clearing the search returns the tree as it was.
  const [folded, setFolded] = useState<Set<string>>(new Set());
  // The folder an overview row just jumped to, lit once so the eye finds it.
  const [flash, setFlash] = useState<string | null>(null);
  const flashTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(flashTimer.current), []);
  const [term, setTerm] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [screens, setScreens] = useState<Record<string, Screen[] | { error: string }>>({});

  /* ---- modules ---- */
  useEffect(() => {
    let live = true;
    setError(null);
    getJson<{ alias: string; active: string[]; modules: ImgModule[] }>("/img/modules")
      .then(({ body }) => {
        if (!live) return;
        setModules(body.modules);
        setAlias(body.alias);
        setActive(body.active);
        // The module last opened here, if any. A first visit opens nothing:
        // reading a module's IMG takes half a minute against SAP, so it waits
        // for the reader to say which one (the start screen below).
        const stored = readStored();
        // A Retry reloads the list too; it keeps the module that was open.
        setModuleId(
          (current) =>
            body.modules.find((m) => m.id === current)?.id ??
            body.modules.find((m) => m.id === stored)?.id ??
            null,
        );
      })
      .catch((err: Error) => live && setError(err.message));
    return () => {
      live = false;
    };
  }, [attempt]);

  /* ---- tree, polled while the backend builds it ---- */
  useEffect(() => {
    if (!moduleId) return;
    let live = true;
    let timer: ReturnType<typeof setTimeout>;
    setTree(null);
    setStatus(null);
    setTreeProgress(null);
    setSelected(null);
    setError(null);
    const poll = () =>
      getJson<ImgTree | { progress: Progress; error?: string }>(`/img/tree/${moduleId}`)
        .then(({ status: code, body }) => {
          if (!live) return;
          if (code === 202 && "progress" in body) {
            if (body.error) throw new Error(body.error);
            setTreeProgress(body.progress);
            timer = setTimeout(poll, POLL_MS);
            return;
          }
          const built = body as ImgTree;
          setTree(built);
          setAlias(built.alias);
          // Open the module's areas, as SPRO shows them on entry.
          setOpen(new Set([built.root.id]));
        })
        .catch((err: Error) => live && setError(err.message));
    void poll();
    return () => {
      live = false;
      clearTimeout(timer);
    };
  }, [moduleId, attempt]);

  /* ---- status: the last check, and a running one ---- */
  const pollStatus = useCallback(() => {
    if (!moduleId) return () => {};
    let live = true;
    let timer: ReturnType<typeof setTimeout>;
    const poll = () =>
      getJson<{ status: ImgStatus | null; progress?: Progress; error?: string }>(`/img/status/${moduleId}`)
        .then(({ body }) => {
          if (!live) return;
          setStatus(body.status);
          setStatusProgress(body.progress ?? null);
          if (body.error) setError(body.error);
          else if (body.progress) timer = setTimeout(poll, POLL_MS);
        })
        .catch((err: Error) => live && setError(err.message));
    void poll();
    return () => {
      live = false;
      clearTimeout(timer);
    };
  }, [moduleId]);

  useEffect(() => (tree ? pollStatus() : undefined), [tree, pollStatus]);

  const stopStatusPoll = useRef<() => void>(() => {});
  const runCheck = async () => {
    if (!moduleId) return;
    try {
      const { body } = await getJson<{ progress: Progress }>(`/img/status/${moduleId}`, { method: "POST" });
      setStatusProgress(body.progress);
      stopStatusPoll.current();
      stopStatusPoll.current = pollStatus();
    } catch (err) {
      setError((err as Error).message);
    }
  };
  // A check started on one module must not keep writing its counts once
  // another module is open.
  useEffect(() => () => stopStatusPoll.current(), [moduleId]);

  /* ---- derived ---- */
  const tallies = useMemo(() => (tree ? tallyTree(tree, status) : new Map<string, Tally>()), [tree, status]);
  const parents = useMemo(() => (tree ? parentMap(tree.root) : new Map<string, ImgNode>()), [tree]);
  const nodeById = useMemo(() => {
    const out = new Map<string, ImgNode>();
    const walk = (n: ImgNode) => {
      out.set(n.id, n);
      n.kids?.forEach(walk);
    };
    if (tree) walk(tree.root);
    return out;
  }, [tree]);

  const needle = term.trim().toLowerCase();
  const visible = useMemo(() => {
    // Which nodes survive search and filter; folders survive through a kid.
    const keep = new Set<string>();
    if (!tree) return keep;
    const walk = (n: ImgNode): boolean => {
      let hit = false;
      if (n.act) {
        const act = tree.acts[n.act];
        const s = activityStatus(act, status);
        const text = [
          n.text.ko, n.text.ja, n.text.en, n.act, act?.tcode,
          ...(act?.objects ?? []).flatMap((o) => [o.name, o.table]),
        ].join(" ").toLowerCase();
        hit = (!needle || text.includes(needle)) && (filter === "all" || s === filter);
      }
      for (const k of n.kids ?? []) if (walk(k)) hit = true;
      if (hit) keep.add(n.id);
      return hit;
    };
    walk(tree.root);
    return keep;
  }, [tree, status, needle, filter]);
  const matchCount = useMemo(
    () => [...visible].filter((id) => nodeById.get(id)?.act).length,
    [visible, nodeById],
  );
  const narrowing = needle.length > 0 || filter !== "all";
  // A new search or filter starts with everything that matches unfolded.
  useEffect(() => setFolded(new Set()), [needle, filter]);

  const pickModule = (id: string) => {
    try {
      localStorage.setItem(MODULE_KEY, id);
    } catch {
      // A private window: the choice simply is not remembered.
    }
    setModuleId(id);
    setTerm("");
    setFilter("all");
  };

  const toggle = (id: string) =>
    (narrowing ? setFolded : setOpen)((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const reveal = (id: string) =>
    setOpen((prev) => {
      const next = new Set(prev);
      for (let p = parents.get(id); p; p = parents.get(p.id)) next.add(p.id);
      next.add(id);
      return next;
    });

  const loadScreens = (act: string) => {
    if (!moduleId) return;
    setScreens((prev) => {
      const next = { ...prev };
      delete next[act];
      return next;
    });
    getJson<{ screens: Screen[] }>(`/img/screen/${moduleId}/${encodeURIComponent(act)}`)
      .then(({ body }) => setScreens((prev) => ({ ...prev, [act]: body.screens })))
      .catch((err: Error) => setScreens((prev) => ({ ...prev, [act]: { error: err.message } })));
  };

  const select = (node: ImgNode) => {
    setSelected(node.id);
    reveal(node.id);
    if (node.act && !screens[node.act]) loadScreens(node.act);
  };

  const when = status
    ? new Date(status.checkedAt).toLocaleString(tag, { dateStyle: "medium", timeStyle: "short" })
    : null;
  const rootTally = tree ? (tallies.get(tree.root.id) ?? emptyTally()) : emptyTally();

  /* ---- tree rows ---- */
  const renderNode = (node: ImgNode, level: number): React.ReactNode => {
    if (narrowing && !visible.has(node.id)) return null;
    if (node.act) {
      const s = activityStatus(tree!.acts[node.act], status);
      return (
        <li key={node.id}>
          <button
            type="button"
            className={`img-leaf${selected === node.id ? " is-active" : ""}`}
            style={{ paddingLeft: 12 + level * 14 }}
            aria-current={selected === node.id ? "true" : undefined}
            onClick={() => select(node)}
          >
            <StatusDot status={s} />
            <span className="img-leaf-text">{pick(node.text, locale)}</span>
          </button>
        </li>
      );
    }
    const isOpen = narrowing ? !folded.has(node.id) : open.has(node.id);
    const tally = tallies.get(node.id) ?? emptyTally();
    return (
      <li key={node.id} data-node={node.id}>
        <button
          type="button"
          className={`img-folder${flash === node.id ? " is-flash" : ""}`}
          style={{ paddingLeft: 6 + level * 14 }}
          aria-expanded={isOpen}
          onClick={() => toggle(node.id)}
        >
          <Icon name="caret-right" className="img-twist" />
          <Icon name={isOpen ? "folder-open" : "folder-simple"} weight="fill" className="img-folder-icon" />
          <span className="img-folder-text">{pick(node.text, locale)}</span>
          <span className="img-folder-count">
            {status ? `${tally.set}/${tally.total}` : tally.total}
          </span>
        </button>
        {isOpen ? <ul>{node.kids?.map((k) => renderNode(k, level + 1))}</ul> : null}
      </li>
    );
  };

  /* ---- right pane ---- */
  // The node the pane shows trails the tree's selection while the picked
  // activity's screens are still being read, so the pane does not flash a
  // half-built page (header, then a loading row, then the screens) between
  // two finished ones. It catches up during render once the screens are in,
  // which costs no extra painted frame, and after HOLD_MS at the latest.
  const [shown, setShown] = useState<string | null>(null);
  const wanted = selected ? nodeById.get(selected) : undefined;
  if (shown !== selected && (!wanted?.act || screens[wanted.act] !== undefined)) setShown(selected);
  useEffect(() => {
    if (shown === selected) return;
    const timer = setTimeout(() => setShown(selected), HOLD_MS);
    return () => clearTimeout(timer);
  }, [selected, shown]);
  const holding = shown !== selected;

  const node = shown ? nodeById.get(shown) : undefined;
  const act = node?.act && tree ? tree.acts[node.act] : undefined;
  const trail: ImgNode[] = [];
  for (let p = node ? parents.get(node.id) : undefined; p; p = parents.get(p.id)) trail.unshift(p);

  const loadingTree = moduleId !== null && !tree && !error;
  // Which page the pane is on. The pane is keyed by it, so each new page
  // mounts fresh and plays its entrance, while updates within one page (a
  // status check finishing, say) leave it still.
  const view = !tree
    ? loadingTree
      ? "loading"
      : "start"
    : rootTally.total === 0
      ? "none"
      : node && act
        ? `act:${node.id}`
        : "overview";
  // A count not taken yet: a dash, not a 0, which would read as "none
  // configured"; hovering it says why.
  const unchecked = (
    <span className="img-unchecked" data-tip={t.neverChecked} aria-label={t.neverChecked}>
      —
    </span>
  );
  const names = useMemo(() => moduleNames(modules ?? [], locale), [modules, locale]);
  // The modules in use on this system, in the profile's order, one card per
  // code: SAP has two "Financial Accounting" nodes (classic FI and the new
  // G/L), and the first, in SPRO order, is the one a reader means.
  const suggested = active
    .map((code) => (modules ?? []).find((m) => abbreviation(m) === code))
    .filter((m): m is ImgModule => m !== undefined);

  return (
    <div className="img">
      {/* ---------- top bar: module, status ---------- */}
      <div className="img-top">
        {modules ? (
          <ModulePicker modules={modules} value={moduleId ?? ""} onChange={pickModule} />
        ) : (
          error ? null : (
            <span className="img-progress">
              <span className="img-orb" aria-hidden="true">
                <ThinkingOrb state="connecting" size={20} />
              </span>
              {t.loadingModules}
            </span>
          )
        )}

        {tree && rootTally.total > 0 ? (
          <div className="img-summary">
            <span className="img-legend">
              <StatusDot status="set" /> {t.statusSet} <b>{status ? rootTally.set : unchecked}</b>
            </span>
            <span className="img-legend">
              <StatusDot status="unknown" /> {t.statusUnknown} <b>{rootTally.unknown}</b>
            </span>
            <span className="img-legend">
              <StatusDot status="empty" /> {t.statusEmpty} <b>{status ? rootTally.empty : unchecked}</b>
            </span>
            <span className="img-tip">
              <button type="button" className="img-icon-btn" aria-label={t.statusHelpLabel} aria-describedby="img-status-help">
                <Icon name="info" />
              </button>
              <span role="tooltip" id="img-status-help" className="img-tip-body">
                <span className="img-tip-title">{t.statusHelpLabel}</span>
                {(
                  [
                    ["set", t.statusSet, t.helpSet],
                    ["unknown", t.statusUnknown, t.helpUnknown],
                    ["empty", t.statusEmpty, t.helpEmpty],
                  ] as const
                ).map(([key, label, help]) => (
                  <span className="img-tip-row" key={key}>
                    <StatusDot status={key} />
                    <span>
                      <b>{label}</b>
                      <span>{help}</span>
                    </span>
                  </span>
                ))}
              </span>
            </span>
          </div>
        ) : null}

        {tree && rootTally.total > 0 ? (
          <div className="img-check">
            {statusProgress ? (
              <span className="img-progress">
                <span className="img-orb" aria-hidden="true">
                  <ThinkingOrb state="working" size={20} />
                </span>
                {t.counting(statusProgress.done, statusProgress.total)}
              </span>
            ) : (
              <span className="img-muted">{when ? t.checkedAt(when) : tree ? t.neverChecked : ""}</span>
            )}
            <button
              type="button"
              className={`img-btn${status ? "" : " is-primary"}`}
              disabled={!tree || statusProgress !== null}
              onClick={() => void runCheck()}
            >
              <Icon name="arrows-clockwise" /> {status ? t.recheck : t.check}
            </button>
          </div>
        ) : null}
      </div>

      {error ? (
        <div className="img-error" role="alert">
          <Icon name="warning-circle" />
          <span>
            <b>{t.failed}</b> {error}
          </span>
          <button type="button" className="img-btn" onClick={() => setAttempt((n) => n + 1)}>
            {t.retry}
          </button>
        </div>
      ) : null}

      <div className="img-body">
        {/* ---------- left: the tree ---------- */}
        <aside className="img-side" aria-label={t.treeLabel}>
          <div className="img-side-head">
            <label className="img-search">
              <Icon name="magnifying-glass" />
              <input
                type="text"
                value={term}
                placeholder={t.searchPlaceholder}
                aria-label={t.searchLabel}
                onChange={(event) => setTerm(event.target.value)}
                onKeyDown={(event) => event.key === "Escape" && setTerm("")}
              />
              {narrowing ? <span className="img-count">{matchCount}</span> : null}
              {term ? (
                <button type="button" className="img-clear" aria-label={t.clearSearch} onClick={() => setTerm("")}>
                  <Icon name="x" />
                </button>
              ) : null}
            </label>
            <div className="img-filter-row">
            <div className="img-seg" role="radiogroup" aria-label={t.filterLabel}>
              {(["all", "set", "empty"] as const).map((f) => (
                <button
                  type="button"
                  role="radio"
                  key={f}
                  aria-checked={filter === f}
                  disabled={f !== "all" && !status}
                  onClick={() => setFilter(f)}
                >
                  {f === "all" ? t.filterAll : f === "set" ? t.statusSet : t.statusEmpty}
                  <span className="img-seg-count">
                    {!tree ? "" : f === "all" ? rootTally.total : status ? rootTally[f] : unchecked}
                  </span>
                </button>
              ))}
            </div>
              <span className="img-tools">
                <button
                  type="button"
                  className="img-icon-btn"
                  title={t.expandAll}
                  aria-label={t.expandAll}
                  disabled={!tree}
                  onClick={() => (narrowing ? setFolded(new Set()) : setOpen(new Set(nodeById.keys())))}
                >
                  <Icon name="arrows-out-line-vertical" />
                </button>
                <button
                  type="button"
                  className="img-icon-btn"
                  title={t.collapseAll}
                  aria-label={t.collapseAll}
                  disabled={!tree}
                  onClick={() =>
                    narrowing
                      ? setFolded(new Set([...nodeById.values()].filter((n) => !n.act).map((n) => n.id)))
                      : setOpen(new Set(tree ? [tree.root.id] : []))
                  }
                >
                  <Icon name="arrows-in-line-vertical" />
                </button>
              </span>
            </div>
          </div>

          <div className="img-tree" role="tree">
            {tree ? (
              narrowing && visible.size === 0 ? (
                <p className="img-empty">{t.noMatch}</p>
              ) : (
                <ul>{tree.root.kids?.map((k) => renderNode(k, 0))}</ul>
              )
            ) : loadingTree ? (
              <div className="img-skeleton" aria-hidden="true">
                {Array.from({ length: 12 }, (_, i) => (
                  <span key={i} style={{ width: `${55 + ((i * 37) % 40)}%`, marginLeft: (i % 3) * 14 }} />
                ))}
              </div>
            ) : null}
          </div>
        </aside>

        {/* ---------- right: overview or the activity ---------- */}
        <main className="img-main" aria-busy={holding || undefined}>
          <div key={view} className={`img-pane${holding ? " is-holding" : ""}`}>
            {!tree ? (
              loadingTree && moduleId ? (
                <div className="img-loading">
                  <span className="img-orb is-large" aria-hidden="true">
                    <ThinkingOrb state="searching" size={64} />
                  </span>
                  <h2>{t.loadingTree}</h2>
                  <p className="img-muted">{t.loadingTreeNote}</p>
                  {treeProgress && treeProgress.total > 0 ? (
                    <p className="img-phase">{t.phase(treeProgress.phase, treeProgress.done, treeProgress.total)}</p>
                  ) : null}
                </div>
              ) : modules && !moduleId && !error ? (
                <div className="img-start">
                  <h2>{t.pickTitle}</h2>
                  <p className="img-lead">{t.pickLede}</p>

                  {suggested.length ? (
                    <>
                      <h3>{t.pickActive}</h3>
                      <div className="img-start-cards">
                        {suggested.map((m) => (
                          <button type="button" key={m.id} onClick={() => pickModule(m.id)}>
                            <span className="img-start-code">{abbreviation(m)}</span>
                            <span className="img-start-name">{pick(m.text, locale)}</span>
                            <Icon name="arrow-right" />
                          </button>
                        ))}
                      </div>
                    </>
                  ) : null}

                  <h3>{t.pickAll(modules.length)}</h3>
                  <ul className="img-start-all">
                    {modules.map((m) => (
                      <li key={m.id}>
                        <button type="button" onClick={() => pickModule(m.id)}>
                          {names.get(m.id)}
                        </button>
                      </li>
                    ))}
                  </ul>
                  <p className="img-foot">
                    <Icon name="lightning" /> {t.freeNote}
                  </p>
                </div>
              ) : null
            ) : rootTally.total === 0 ? (
              <div className="img-start">
                <h2>{pick(tree.root.text, locale)}</h2>
                <div className="img-notice">
                  <Icon name="tray" />
                  <div>
                    <b>{t.noActivitiesTitle}</b>
                    <p>{t.noActivitiesBody}</p>
                  </div>
                </div>
              </div>
            ) : !node || !act ? (
              <div className="img-overview">
                <p className="eyebrow">{t.overview}</p>
                <h2>{pick(tree.root.text, locale)}</h2>
                <p className="img-lead">{t.overviewLede}</p>

                {status && rootTally.set === 0 ? (
                  <div className="img-notice">
                    <Icon name="tray" />
                    <div>
                      <b>{t.noConfigTitle}</b>
                      <p>{t.noConfigBody(rootTally.total)}</p>
                    </div>
                  </div>
                ) : null}

                <div className="img-stats">
                  <div>
                    <b>{rootTally.total}</b>
                    <span>{t.activityWord}</span>
                  </div>
                  <div className="is-set">
                    <b>{status ? rootTally.set : unchecked}</b>
                    <span>{t.statusSet}</span>
                  </div>
                  <div className="is-unknown">
                    <b>{rootTally.unknown}</b>
                    <span>{t.statusUnknown}</span>
                  </div>
                  <div className="is-empty">
                    <b>{status ? rootTally.empty : unchecked}</b>
                    <span>{t.statusEmpty}</span>
                  </div>
                </div>
                <p className="img-help">
                  {(
                    [
                      [t.statusSet, t.helpSet],
                      [t.statusUnknown, t.helpUnknown],
                      [t.statusEmpty, t.helpEmpty],
                    ] as const
                  ).map(([label, help]) => (
                    <span key={label}>
                      <b>{label}</b> {help}
                    </span>
                  ))}
                </p>

                <h3>{t.areas}</h3>
                <ul className="img-areas">
                  {tree.root.kids?.map((area) => {
                    const tally = tallies.get(area.id) ?? emptyTally();
                    return (
                      <li key={area.id}>
                        <button
                          type="button"
                          onClick={() => {
                            reveal(area.id);
                            // After the unfold has rendered, so the row is where it lands.
                            requestAnimationFrame(() =>
                              document
                                .querySelector(`[data-node="${area.id}"]`)
                                ?.scrollIntoView({ block: "start", behavior: "smooth" }),
                            );
                            clearTimeout(flashTimer.current);
                            setFlash(null);
                            requestAnimationFrame(() => setFlash(area.id));
                            flashTimer.current = setTimeout(() => setFlash(null), 1600);
                          }}
                        >
                          <span className="img-area-name">{pick(area.text, locale)}</span>
                          <TallyBar tally={tally} />
                          <span className="img-area-count">
                            {status ? `${tally.set} / ${tally.total}` : t.activities(tally.total)}
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
                <p className="img-foot">
                  <Icon name="lightning" /> {t.freeNote}
                </p>
              </div>
            ) : (
              <article className="img-detail">
                <div className="img-detail-bar">
                  <button type="button" className="img-back" onClick={() => setSelected(null)}>
                    <Icon name="arrow-left" /> {t.back}
                  </button>
                  <nav className="img-crumbs" aria-label={t.imgPath}>
                    {trail.map((p) => (
                      <span key={p.id}>{pick(p.text, locale)}</span>
                    ))}
                  </nav>
                </div>
                <h2>
                  {pick(node.text, locale)}
                  <span className={`img-pill is-${activityStatus(act, status)}`}>
                    <StatusDot status={activityStatus(act, status)} />
                    {{
                      set: t.statusSet,
                      empty: t.statusEmpty,
                      unknown: t.statusUnknown,
                      unchecked: t.statusUnchecked,
                    }[activityStatus(act, status)]}
                  </span>
                </h2>
                {locale !== "en" && pick(node.text, locale) !== node.text.en && node.text.en ? (
                  <p className="img-sub">{node.text.en}</p>
                ) : null}

                <dl className="img-facts">
                  <div>
                    <dt>{t.activityId}</dt>
                    <dd className="mono">{node.act}</dd>
                  </div>
                  {act.tcode ? (
                    <div>
                      <dt>{t.tcode}</dt>
                      <dd className="mono">{act.tcode}</dd>
                    </div>
                  ) : null}
                  <div className="is-wide">
                    <dt>{t.objects}</dt>
                    <dd>
                      {act.objects.length === 0 ? <span className="img-muted">—</span> : null}
                      {act.objects.map((o, i) => {
                        const count = o.table && status ? status.counts[o.table] : undefined;
                        return (
                          <span className="img-obj" key={`${o.type}:${o.name}:${i}`}>
                            <span className="img-obj-type">{o.type}</span>
                            <span className="mono">{o.name}</span>
                            {o.table && o.table !== o.name ? <span className="mono img-muted">→ {o.table}</span> : null}
                            {typeof count === "number" ? (
                              <span className={`img-obj-count${count > 0 ? " is-set" : ""}`}>{t.rows(count)}</span>
                            ) : !o.table ? (
                              <span className="img-muted">{t.noTableObject}</span>
                            ) : null}
                          </span>
                        );
                      })}
                    </dd>
                  </div>
                </dl>

                {activityStatus(act, status) === "empty" ? (
                  <div className="img-notice is-compact">
                    <Icon name="tray" />
                    <div>
                      <b>{t.activityEmptyTitle}</b>
                      <p>{t.activityEmptyBody}</p>
                    </div>
                  </div>
                ) : null}

                <section className="img-screen">
                  <h3>
                    {t.screens} <span className="img-tag">{t.liveValues}</span>
                  </h3>
                  {(() => {
                    const loaded = screens[node.act!];
                    if (!loaded) {
                      return (
                        <div key="loading" className="img-screen-loading">
                          <span className="img-orb" aria-hidden="true">
                            <ThinkingOrb state="composing" size={20} />
                          </span>
                          {t.loadingScreen}
                        </div>
                      );
                    }
                    // Keyed apart from the loading row, so what arrives mounts
                    // fresh and fades in where the row was rather than cutting in.
                    return (
                      <div key="ready" className="img-arrive">
                        {"error" in loaded ? (
                          <div className="img-error" role="alert">
                            <Icon name="warning-circle" />
                            <span>
                              <b>{t.failed}</b> {loaded.error}
                            </span>
                            <button
                              type="button"
                              className="img-btn"
                              onClick={() => loadScreens(node.act!)}
                            >
                              {t.retry}
                            </button>
                          </div>
                        ) : loaded.length ? (
                          <SapScreens
                            key={node.act}
                            screens={loaded}
                            tcode={act.tcode || "SM30"}
                            alias={alias}
                          />
                        ) : (
                          <p className="img-empty">{t.noScreen}</p>
                        )}
                      </div>
                    );
                  })()}
                </section>
              </article>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
