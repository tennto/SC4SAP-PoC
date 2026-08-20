"use client";

import type { Session } from "@/lib/types";

const STATUS_LABEL: Record<Session["status"], string> = {
  starting: "starting",
  idle: "idle",
  busy: "working",
  closed: "closed",
  error: "error",
};

function shortId(id: string): string {
  return id.slice(0, 8);
}

type Props = {
  sessions: Session[];
  activeId: string | null;
  busy: boolean;
  onSelect: (id: string) => void;
  onCreate: () => void;
  onClose: (id: string) => void;
};

/**
 * A second rail, inside the chat screen — distinct from the app-wide skill rail
 * in `AppShell`, which is why it carries its own class names.
 */
export function SessionList({
  sessions,
  activeId,
  busy,
  onSelect,
  onCreate,
  onClose,
}: Props) {
  return (
    <aside className="session-rail">
      <div className="session-rail-head">
        <h2>Sessions</h2>
        <button className="primary" onClick={onCreate} disabled={busy}>
          New session
        </button>
      </div>

      <nav className="session-list">
        {sessions.length === 0 && <p className="empty">No sessions yet.</p>}

        {sessions.map((session) => (
          <div
            key={session.id}
            className={`session-item${session.id === activeId ? " active" : ""}`}
          >
            <button
              className="session-open"
              onClick={() => onSelect(session.id)}
              title={session.id}
            >
              <span className="session-id">{shortId(session.id)}</span>
              <span className={`badge ${session.status}`}>
                {STATUS_LABEL[session.status]}
              </span>
              <span className="session-meta">
                {session.turns} turn{session.turns === 1 ? "" : "s"} ·{" "}
                {/* Sub-cent turns are the norm; 4 places keeps them visible. */}
                ${session.totalCostUsd.toFixed(4)}
              </span>
            </button>
            <button
              className="session-close"
              onClick={() => onClose(session.id)}
              title="Close and evict this session"
              aria-label={`Close session ${shortId(session.id)}`}
            >
              ×
            </button>
          </div>
        ))}
      </nav>
    </aside>
  );
}
