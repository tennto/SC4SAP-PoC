"use client";

import { useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Icon } from "@/components/Icon";
import {
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

export type { RailItem } from "@/components/ChatRows";

/** How many conversations the rail lists before "View all" takes over. */
const RECENT_LIMIT = 30;

/** What the main area is showing, so the rail can mark it. */
export type ChatView =
  | { kind: "chat" }
  | { kind: "all" }
  | { kind: "project"; id: string };

/** Where a dragged conversation can land. */
type DropTarget = "pinned" | "recents" | `project:${string}`;

type Props = {
  items: RailItem[];
  projects: Project[];
  activeId: string | null;
  view: ChatView;
  busy: boolean;
  onSelect: (id: string) => void;
  onCreate: () => void;
  onOpenAll: () => void;
  onOpenProject: (id: string) => void;
  onCreateProject: (name: string) => void;
} & RowActions;

/**
 * The chat screen's own rail — distinct from the app-wide skill rail in
 * `AppShell`, which is why it carries its own class names.
 *
 * Laid out the way the chat products people already use lay theirs out: a
 * New chat button, Projects, Pinned, then Recents as plain one-line rows with
 * a ⋯ menu that appears on hover. Turns and cost moved off the row and into
 * View all — a list read at a glance is a list of names.
 *
 * A saved conversation can be dragged: onto a project to file it there, onto
 * Pinned to pin it, back onto Recents to unpin it. While one is in the air
 * every place it can land is outlined, the one under the pointer fills, and a
 * card with its title follows the pointer. Escape puts it back.
 */
export function SessionList({
  items,
  projects,
  activeId,
  view,
  busy,
  onSelect,
  onCreate,
  onOpenAll,
  onOpenProject,
  onCreateProject,
  onRename,
  onMove,
  onPin,
  onDelete,
}: Props) {
  const { t: messages } = useLocale();
  const t = messages.sessions;
  const [prefs, setPrefs] = useListPrefs();
  const [renaming, setRenaming] = useState<string | null>(null);
  const [naming, setNaming] = useState(false);
  const [projectName, setProjectName] = useState("");
  const [dragging, setDragging] = useState<RailItem | null>(null);
  const [over, setOver] = useState<DropTarget | null>(null);

  const pinned = items
    .filter((item) => item.pinnedAt)
    .sort((a, b) => Date.parse(b.pinnedAt!) - Date.parse(a.pinnedAt!));
  const recent = applyShow(
    items.filter((item) => !item.pinnedAt),
    prefs.show,
  ).slice(0, RECENT_LIMIT);
  const groups =
    prefs.group === "date" ? groupByDate(recent) : [{ bucket: null, items: recent }];
  const actions: RowActions = { onRename, onMove, onPin, onDelete };

  const addProject = (): void => {
    const name = projectName.trim();
    setNaming(false);
    setProjectName("");
    if (name) onCreateProject(name);
  };

  /** The ghost's position, following the pointer while a row is carried. */
  const [ghostAt, setGhostAt] = useState<{ x: number; y: number } | null>(null);
  /**
   * Where in the row it was grabbed, and how wide the row is: the card keeps
   * that point under the pointer, so the row is held where it was picked up
   * instead of trailing beside the cursor.
   */
  const grab = useRef({ dx: 0, dy: 0, width: 0 });
  /** Set when a drag ends on a row, so the click that follows is not an open. */
  const swallowClick = useRef(false);

  /**
   * What each landing place does with a conversation, by its target key —
   * read when the pointer is released over one. Rebuilt every render, so it
   * always holds the current projects and handlers.
   */
  const landings = useRef(new Map<DropTarget, { accepts: (item: RailItem) => boolean; land: (item: RailItem) => void }>());
  landings.current.clear();

  /**
   * Props that make an element a landing place. `accepts` says whether this
   * conversation would change by landing here — a pinned one dropped on
   * Pinned would not — so a no-op target neither lights up nor takes it.
   */
  const dropZone = (target: DropTarget, accepts: (item: RailItem) => boolean, land: (item: RailItem) => void) => {
    landings.current.set(target, { accepts, land });
    const live = dragging !== null && accepts(dragging);
    return {
      "data-drop-target": target,
      "data-drop": live ? (over === target ? "over" : "ready") : undefined,
    };
  };

  /** The landing place under a point, if the carried conversation fits it. */
  const targetAt = (x: number, y: number, item: RailItem): DropTarget | null => {
    let element = document.elementFromPoint(x, y) as HTMLElement | null;
    while (element) {
      const key = element.dataset?.dropTarget as DropTarget | undefined;
      if (key) return landings.current.get(key)?.accepts(item) ? key : null;
      element = element.parentElement;
    }
    return null;
  };

  /**
   * Drag by pointer events rather than the browser's own drag and drop.
   *
   * Native HTML5 drag gave no control over what the pointer carries, and
   * Chrome cancelled it outright when the Pinned section opened above the row
   * at the moment of pickup — so a row could not be dragged at all. Here the
   * row is picked up after the pointer has moved a few pixels (a press that
   * does not move is still a click), a small card with its title follows the
   * pointer, and releasing over a landing place files it there.
   */
  const pointerDown = (event: React.PointerEvent, item: RailItem): void => {
    if (event.button !== 0 || !item.stored || renaming === item.id) return;
    if ((event.target as HTMLElement).closest(".row-menu")) return;
    const startX = event.clientX;
    const startY = event.clientY;
    const box = (event.currentTarget as HTMLElement).getBoundingClientRect();
    grab.current = { dx: startX - box.left, dy: startY - box.top, width: box.width };
    let carrying = false;
    let target: DropTarget | null = null;

    const move = (moved: PointerEvent): void => {
      if (!carrying) {
        if (Math.hypot(moved.clientX - startX, moved.clientY - startY) < 5) return;
        carrying = true;
        setDragging(item);
        document.body.classList.add("is-dragging-chat");
      }
      moved.preventDefault();
      setGhostAt({ x: moved.clientX, y: moved.clientY });
      target = targetAt(moved.clientX, moved.clientY, item);
      setOver(target);
    };

    const finish = (): void => {
      document.removeEventListener("pointermove", move);
      document.removeEventListener("pointerup", up);
      document.removeEventListener("keydown", cancel);
      document.body.classList.remove("is-dragging-chat");
      setDragging(null);
      setOver(null);
      setGhostAt(null);
    };

    const up = (released: PointerEvent): void => {
      if (carrying) {
        swallowClick.current = true;
        // Judged again where the pointer was let go: the Pinned section opens
        // once the drag starts and moves what is under a given point, so a
        // target worked out before that frame painted can be stale.
        target = targetAt(released.clientX, released.clientY, item) ?? target;
        if (target) landings.current.get(target)?.land(item);
      }
      finish();
    };

    const cancel = (key: KeyboardEvent): void => {
      if (key.key === "Escape") {
        target = null;
        finish();
      }
    };

    document.addEventListener("pointermove", move);
    document.addEventListener("pointerup", up);
    document.addEventListener("keydown", cancel);
  };

  const row = (item: RailItem) => {
    const active = view.kind === "chat" && item.id === activeId;
    return (
      <div
        key={item.id}
        className={`rail-row rail-chat${active ? " is-active" : ""}${
          dragging?.id === item.id ? " is-dragging" : ""
        }`}
        role="button"
        tabIndex={0}
        title={`${item.kind === "task" ? t.task : t.chat} · ${item.title ?? t.newConversation}`}
        onPointerDown={(event) => pointerDown(event, item)}
        onClick={() => {
          if (swallowClick.current) {
            swallowClick.current = false;
            return;
          }
          if (renaming !== item.id) onSelect(item.id);
        }}
        onKeyDown={(event) => {
          if (event.key === "Enter" && renaming !== item.id) onSelect(item.id);
        }}
      >
        <Icon name={kindIcon(item.kind)} className="row-kind" />
        <RowTitle
          item={item}
          renaming={renaming === item.id}
          onDone={() => setRenaming(null)}
          onRename={onRename}
          fallback={t.newConversation}
        />
        <RowMenu
          item={item}
          projects={projects}
          actions={actions}
          onStartRename={() => setRenaming(item.id)}
        />
      </div>
    );
  };

  return (
    <aside className={`chat-rail${dragging ? " is-dragging" : ""}`}>
      <div className="chat-rail-top">
        <button className="rail-new" onClick={onCreate} disabled={busy}>
          <Icon name="plus-circle" /> {t.newChat}
        </button>
      </div>

      <nav className="chat-rail-scroll">
        <section className="rail-section">
          <div className="rail-section-head">
            <h2>{t.projects}</h2>
            <button
              type="button"
              className="rail-icon-button"
              title={t.newProject}
              aria-label={t.newProject}
              onClick={() => setNaming(true)}
            >
              <Icon name="plus" />
            </button>
          </div>
          {naming && (
            <input
              className="rail-project-input"
              autoFocus
              maxLength={80}
              placeholder={t.projectName}
              value={projectName}
              onChange={(event) => setProjectName(event.target.value)}
              onBlur={addProject}
              onKeyDown={(event) => {
                if (event.key === "Enter") addProject();
                if (event.key === "Escape") {
                  setNaming(false);
                  setProjectName("");
                }
              }}
            />
          )}
          {projects.map((project) => {
            const active = view.kind === "project" && view.id === project.id;
            return (
              <button
                key={project.id}
                className={`rail-row rail-project${active ? " is-active" : ""}`}
                onClick={() => onOpenProject(project.id)}
                title={project.name}
                {...dropZone(
                  `project:${project.id}`,
                  (item) => item.projectId !== project.id,
                  (item) => onMove(item.id, project.id),
                )}
              >
                <Icon name="folder-simple" />
                <span className="row-title">{project.name}</span>
              </button>
            );
          })}
        </section>

        {/* Always mounted, opened by a class: with nothing pinned it exists
            only while a conversation is carried, and an element that mounts
            and unmounts cannot ease in and out — it popped. */}
        <section
          className={`rail-section rail-drop-section rail-pinned${
            pinned.length > 0 || dragging ? " is-open" : ""
          }`}
          aria-hidden={pinned.length === 0 && !dragging}
          {...dropZone("pinned", (item) => !item.pinnedAt, (item) => onPin(item.id, true))}
        >
          <div className="rail-pinned-inner">
            <div className="rail-section-head">
              <h2>{t.pinned}</h2>
            </div>
            {pinned.map(row)}
            {pinned.length === 0 && <p className="rail-drop-hint">{t.dropToPin}</p>}
          </div>
        </section>

        <section
          className="rail-section rail-drop-section"
          {...dropZone("recents", (item) => item.pinnedAt !== null, (item) => onPin(item.id, false))}
        >
          <div className="rail-section-head">
            <h2>{t.recents}</h2>
            <div className="rail-section-tools">
              <FilterGroupMenu prefs={prefs} onChange={setPrefs} />
              <button
                type="button"
                className={`rail-link${view.kind === "all" ? " is-active" : ""}`}
                onClick={onOpenAll}
              >
                {t.viewAll}
              </button>
            </div>
          </div>

          {recent.length === 0 && <p className="rail-empty">{t.empty}</p>}

          {groups.map((group) => (
            <div key={group.bucket ?? "all"} className="rail-group">
              {group.bucket && <p className="rail-group-label">{t[group.bucket]}</p>}
              {group.items.map(row)}
            </div>
          ))}
        </section>
      </nav>

      {/* Into the body, not here: an ancestor of the rail animates in with a
          transform, and a fixed element inside a transformed one is placed
          against that element instead of the window — the card trailed far
          to the right of the pointer. */}
      {dragging &&
        ghostAt &&
        createPortal(
          <div
            className="rail-drag-ghost"
            style={{
              width: grab.current.width,
              transform: `translate(${ghostAt.x - grab.current.dx}px, ${ghostAt.y - grab.current.dy}px)`,
            }}
            aria-hidden
          >
            <Icon name={kindIcon(dragging.kind)} />
            <span>{dragging.title ?? t.newConversation}</span>
          </div>,
          document.body,
        )}
    </aside>
  );
}
