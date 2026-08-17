"use client";

/**
 * Plan items 3-1 / 3-2 — the interactive shell, hydrated from server-rendered
 * state and driven by the session's SSE stream.
 *
 * The transcript is not local state: it is folded out of the stream by
 * `useSessionStream`, so a reload, a second tab and a reconnect all rebuild the
 * same conversation from the backend's replay buffer rather than from anything
 * this component remembered.
 *
 * Still to come: 3-3 renders `stream.pending` as an approval modal (the queue
 * is already tracked here), 3-4 renders assistant text as markdown.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "@/lib/client";
import type { Health, Session } from "@/lib/types";
import { useSessionStream } from "@/hooks/useSessionStream";
import { SessionList } from "@/components/SessionList";
import { Transcript } from "@/components/Transcript";
import { Composer } from "@/components/Composer";

/**
 * Refresh of the session *list* — turns and cost for every session, including
 * ones this tab is not watching. The active session's status comes from its
 * stream, so this can be slow.
 */
const LIST_POLL_MS = 10_000;

/** Survives a browser refresh, which is one of the 3-5 QA cases. */
const ACTIVE_KEY = "sc4sap.activeSession";

type Props = {
  initialSessions: Session[];
  initialHealth: Health | null;
  initialError: string | null;
};

export function Chat({ initialSessions, initialHealth, initialError }: Props) {
  const [health, setHealth] = useState<Health | null>(initialHealth);
  const [sessions, setSessions] = useState<Session[]>(initialSessions);
  // Read from localStorage after mount, not during render: the server has no
  // localStorage and a differing first render is a hydration mismatch.
  const [activeId, setActiveId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(initialError);

  const stream = useSessionStream(activeId);

  const active = useMemo(
    () => sessions.find((session) => session.id === activeId) ?? null,
    [sessions, activeId],
  );

  // The stream is more current than the last list poll, so it wins.
  const status = activeId ? (stream.status ?? active?.status ?? null) : null;

  const refresh = useCallback(async () => {
    try {
      const list = await api.listSessions();
      setSessions(list);
      // A session evicted by another tab, a server restart, or the 3-5 QA
      // "close" case must not leave a dangling selection.
      setActiveId((current) =>
        current && list.some((session) => session.id === current)
          ? current
          : null,
      );
    } catch (err) {
      setError((err as Error).message);
    }
  }, []);

  useEffect(() => {
    const stored = localStorage.getItem(ACTIVE_KEY);
    if (stored) setActiveId(stored);
  }, []);

  useEffect(() => {
    // The server-rendered snapshot covers the first paint; from here the
    // client keeps itself current.
    if (!health) api.health().then(setHealth).catch(() => {});
    const timer = setInterval(() => void refresh(), LIST_POLL_MS);
    return () => clearInterval(timer);
  }, [refresh, health]);

  useEffect(() => {
    if (activeId) localStorage.setItem(ACTIVE_KEY, activeId);
    else localStorage.removeItem(ACTIVE_KEY);
  }, [activeId]);

  // A finished turn is when turns and cost actually change, so pull the list
  // once on the way back to idle rather than on a timer.
  useEffect(() => {
    if (stream.status === "idle") void refresh();
  }, [stream.status, refresh]);

  useEffect(() => {
    if (stream.error) setError(stream.error);
  }, [stream.error]);

  const createSession = async (): Promise<void> => {
    setBusy(true);
    setError(null);
    try {
      const session = await api.createSession();
      setSessions((current) => [...current, session]);
      setActiveId(session.id);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const closeSession = async (id: string): Promise<void> => {
    setBusy(true);
    try {
      await api.closeSession(id);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
      // Drops the selection and the now-unreachable session in one pass.
      await refresh();
    }
  };

  // No optimistic bubble: the backend echoes the prompt onto the stream, and
  // rendering it twice — once locally, once on replay — is worse than the few
  // milliseconds it takes to come back.
  const send = async (text: string): Promise<void> => {
    if (!activeId) return;
    setError(null);
    try {
      await api.sendMessage(activeId, text);
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const composerDisabled =
    !active || status === "closed" || status === "error";

  return (
    <div className="app">
      <SessionList
        sessions={sessions}
        activeId={activeId}
        busy={busy}
        onSelect={setActiveId}
        onCreate={() => void createSession()}
        onClose={(id) => void closeSession(id)}
      />

      <main className="main">
        <header className="topbar">
          <div>
            <strong>
              {active ? `Session ${active.id.slice(0, 8)}` : "No session"}
            </strong>
            {status && <span className={`badge ${status}`}>{status}</span>}
            {active && !stream.connected && (
              <span className="badge error">stream offline</span>
            )}
          </div>
          {health && (
            <div className="health" title={`workspace ${health.workspace}`}>
              {health.model} · {health.toolPolicy.autoAllowed} read tools
              auto-allowed · {health.toolPolicy.denyPatterns.length} deny
              patterns
            </div>
          )}
        </header>

        {error && (
          <div className="error" role="alert">
            {error}
            <button onClick={() => setError(null)} aria-label="Dismiss">
              ×
            </button>
          </div>
        )}

        <Transcript items={stream.items} idle={!active} />

        <Composer
          disabled={composerDisabled}
          hint={
            active
              ? "Ask the SC4SAP agent…  (Enter to send, Shift+Enter for a newline)"
              : "Create a session first"
          }
          onSend={(text) => void send(text)}
        />
      </main>
    </div>
  );
}
