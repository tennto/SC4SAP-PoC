"use client";

/**
 * The main area's list view: every conversation (View all), or one project's.
 *
 * Where the rail is names only, this is where a conversation's particulars
 * live — whether it was a chat or a task, its project, when it was last
 * active, its turns and cost — with a search over the titles.
 */
import { useEffect, useState } from "react";
import { api } from "@/lib/client";
import { Icon } from "@/components/Icon";
import {
  ago,
  applyShow,
  FilterGroupMenu,
  groupByDate,
  kindIcon,
  RowMenu,
  RowTitle,
  useListPrefs,
  type RailItem,
  type RowActions,
} from "@/components/ChatRows";
import { useLocale } from "@/lib/i18n/client";
import type { Project } from "@/lib/types";

export function ChatBrowser({
  items,
  projects,
  project,
  busy,
  onSelect,
  onCreate,
  onRenameProject,
  onDeleteProject,
  onDeleteMany,
  ...actions
}: {
  items: RailItem[];
  projects: Project[];
  /** The project being shown, or null for View all. */
  project: Project | null;
  busy: boolean;
  onSelect: (id: string) => void;
  /** A new chat — filed in `project` when there is one. */
  onCreate: () => void;
  onRenameProject: (id: string, name: string) => void;
  onDeleteProject: (project: Project) => void;
  /** Several at once; the caller asks first. */
  onDeleteMany: (items: RailItem[]) => void;
} & RowActions) {
  const { t: messages, tag } = useLocale();
  const t = messages.sessions;
  const [prefs, setPrefs] = useListPrefs();
  const [query, setQuery] = useState("");
  const [renaming, setRenaming] = useState<string | null>(null);
  const [renamingProject, setRenamingProject] = useState(false);
  const [projectDraft, setProjectDraft] = useState("");

  /** Select mode: rows tick instead of opening, and a bar offers Delete. */
  const [selecting, setSelecting] = useState(false);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  /**
   * What the server found in titles and saved messages, by conversation id,
   * with the text around the first hit. `null` while nothing has been asked.
   */
  const [hits, setHits] = useState<Map<string, string | null> | null>(null);

  const needle = query.trim().toLowerCase();
  useEffect(() => {
    if (needle === "") {
      setHits(null);
      return;
    }
    // A pause for the typing to settle, then one request; an answer to an
    // older query that lands late is dropped.
    let live = true;
    const timer = setTimeout(() => {
      api
        .searchChats(needle)
        .then((results) => {
          if (live) setHits(new Map(results.map((hit) => [hit.id, hit.snippet])));
        })
        .catch(() => {
          // Titles still match below; the contents simply are not searched.
        });
    }, 250);
    return () => {
      live = false;
      clearTimeout(timer);
    };
  }, [needle]);

  const scoped = project ? items.filter((item) => item.projectId === project.id) : items;
  const shown = applyShow(scoped, prefs.show).filter(
    (item) =>
      needle === "" ||
      (item.title ?? "").toLowerCase().includes(needle) ||
      (hits?.has(item.id) ?? false),
  );
  const pickable = shown.filter((item) => item.stored);
  const allPicked = pickable.length > 0 && pickable.every((item) => picked.has(item.id));

  const toggle = (id: string): void =>
    setPicked((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const stopSelecting = (): void => {
    setSelecting(false);
    setPicked(new Set());
  };
  const groups =
    prefs.group === "date" ? groupByDate(shown) : [{ bucket: null, items: shown }];
  const projectName = (id: string | null): string | null =>
    id ? (projects.find((other) => other.id === id)?.name ?? null) : null;

  const commitProjectName = (): void => {
    setRenamingProject(false);
    const next = projectDraft.trim();
    if (project && next && next !== project.name) onRenameProject(project.id, next);
  };

  return (
    <div className="browser">
      <header className="browser-head">
        <div className="browser-title">
          {project && <Icon name="folder-simple" />}
          {project && renamingProject ? (
            <input
              className="browser-rename"
              autoFocus
              maxLength={80}
              value={projectDraft}
              onChange={(event) => setProjectDraft(event.target.value)}
              onBlur={commitProjectName}
              onKeyDown={(event) => {
                if (event.key === "Enter") commitProjectName();
                if (event.key === "Escape") setRenamingProject(false);
              }}
            />
          ) : (
            <h1>{project ? project.name : t.allChats}</h1>
          )}
        </div>
        <div className="browser-actions">
          {project && (
            <>
              <button
                type="button"
                className="rail-icon-button"
                title={t.renameProject}
                aria-label={t.renameProject}
                onClick={() => {
                  setProjectDraft(project.name);
                  setRenamingProject(true);
                }}
              >
                <Icon name="pencil-simple" />
              </button>
              <button
                type="button"
                className="rail-icon-button is-danger"
                title={t.deleteProject}
                aria-label={t.deleteProject}
                onClick={() => onDeleteProject(project)}
              >
                <Icon name="trash" />
              </button>
            </>
          )}
          {/* Only on a project's page, where a new chat is filed into it. View
              all has the rail's New chat beside it already. */}
          {project && (
            <button className="browser-new" onClick={onCreate} disabled={busy}>
              <Icon name="plus" /> {t.newChatInProject}
            </button>
          )}
        </div>
      </header>

      <div className="browser-tools">
        <label className="browser-search">
          <Icon name="magnifying-glass" />
          <input
            type="search"
            placeholder={t.search}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>
        <FilterGroupMenu prefs={prefs} onChange={setPrefs} />
      </div>

      {/* The count, or — while selecting — what is ticked and what can be
          done with it, on the same line so the list does not jump. */}
      <div className={`browser-bar${selecting ? " is-selecting" : ""}`}>
        {selecting ? (
          <>
            <label className="browser-check">
              <input
                type="checkbox"
                checked={allPicked}
                onChange={() =>
                  setPicked(allPicked ? new Set() : new Set(pickable.map((item) => item.id)))
                }
              />
              <span>{picked.size > 0 ? t.selectedCount(picked.size) : t.selectAll}</span>
            </label>
            <div className="browser-bar-actions">
              <button type="button" className="ghost" onClick={stopSelecting}>
                {t.cancel}
              </button>
              <button
                type="button"
                className="browser-delete"
                disabled={picked.size === 0}
                onClick={() => {
                  onDeleteMany(shown.filter((item) => picked.has(item.id)));
                  stopSelecting();
                }}
              >
                <Icon name="trash" /> {t.deleteSelected}
              </button>
            </div>
          </>
        ) : (
          <>
            <p className="browser-count">{t.count(shown.length)}</p>
            {pickable.length > 0 && (
              <button type="button" className="browser-select" onClick={() => setSelecting(true)}>
                {t.select}
              </button>
            )}
          </>
        )}
      </div>

      {shown.length === 0 && (
        <p className="browser-empty">
          {project && scoped.length === 0 ? t.projectEmpty : t.nothingFound}
        </p>
      )}

      {groups.map((group) => (
        <section key={group.bucket ?? "all"} className="browser-group">
          {group.bucket && <h2 className="browser-group-label">{t[group.bucket]}</h2>}
          {group.items.map((item) => {
            const filed = project ? null : projectName(item.projectId);
            const snippet = needle !== "" ? (hits?.get(item.id) ?? null) : null;
            const ticked = picked.has(item.id);
            const open = (): void => {
              if (renaming === item.id) return;
              if (selecting) {
                if (item.stored) toggle(item.id);
              } else onSelect(item.id);
            };
            return (
              <div
                key={item.id}
                className={`browser-row${ticked ? " is-picked" : ""}${selecting ? " is-selecting" : ""}`}
                role="button"
                tabIndex={0}
                aria-pressed={selecting ? ticked : undefined}
                onClick={open}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || (selecting && event.key === " ")) {
                    event.preventDefault();
                    open();
                  }
                }}
              >
                {/* A tick box in place of the kind icon while selecting, and on
                    hover otherwise — pressing it starts a selection. */}
                <span
                  className={`browser-tick${ticked ? " is-on" : ""}${item.stored ? "" : " is-off"}`}
                  role="checkbox"
                  aria-checked={ticked}
                  aria-label={item.title ?? t.newConversation}
                  onClick={(event) => {
                    event.stopPropagation();
                    if (!item.stored) return;
                    if (!selecting) setSelecting(true);
                    toggle(item.id);
                  }}
                >
                  {ticked && <Icon name="check" />}
                </span>
                <Icon name={kindIcon(item.kind)} className="row-kind" />
                <div className="browser-row-text">
                  <RowTitle
                    item={item}
                    renaming={renaming === item.id}
                    onDone={() => setRenaming(null)}
                    onRename={actions.onRename}
                    fallback={t.newConversation}
                  />
                  <span className="browser-row-meta">
                    {item.pinnedAt && (
                      <span className="browser-row-pin" title={t.pinned}>
                        <Icon name="push-pin" weight="fill" />
                      </span>
                    )}
                    <span className={`kind-chip is-${item.kind}`}>
                      {item.kind === "task" ? t.task : t.chat}
                    </span>
                    {filed && (
                      <span className="browser-row-project">
                        <Icon name="folder-simple" /> {filed}
                      </span>
                    )}
                    <span>{t.lastActive(ago(item.updatedAt, tag))}</span>
                    <span>
                      {t.turns(item.turns)} · ${item.totalCostUsd.toFixed(4)}
                    </span>
                  </span>
                  {snippet && <span className="browser-row-snippet">{snippet}</span>}
                </div>
                {!selecting && (
                  <RowMenu
                    item={item}
                    projects={projects}
                    actions={actions}
                    onStartRename={() => setRenaming(item.id)}
                  />
                )}
              </div>
            );
          })}
        </section>
      ))}
    </div>
  );
}
