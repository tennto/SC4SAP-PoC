/**
 * Plan item 3-1 — chat layout over the Phase 2 backend.
 *
 * Scope boundary worth stating plainly: this shell owns session lifecycle
 * (create / list / select / close) and the outbound half of a turn. The
 * *inbound* half — assistant text, tool chips, approvals — is 3-2 and 3-3, and
 * lands on the SSE stream. Until then a sent turn shows as accepted and the
 * answer is only visible in the server log.
 *
 * The seams that 3-2 fills, kept explicit so it is a small diff:
 *   - `pushItem` / `TranscriptItem` already model an assistant bubble.
 *   - `refresh()` polling exists only because there is no `status` event
 *     subscriber yet; SSE replaces it rather than adding to it.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "./api/client.ts";
import type { Health, Session, TranscriptItem } from "./api/types.ts";
import { SessionList } from "./components/SessionList.tsx";
import { Transcript } from "./components/Transcript.tsx";
import { Composer } from "./components/Composer.tsx";

/** Status/turn/cost refresh interval. Deleted in 3-2 — the stream pushes these. */
const POLL_MS = 2_000;

/** Survives a browser refresh, which is one of the 3-5 QA cases. */
const ACTIVE_KEY = "sc4sap.activeSession";

export function App() {
  const [health, setHealth] = useState<Health | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [activeId, setActiveId] = useState<string | null>(() =>
    localStorage.getItem(ACTIVE_KEY),
  );
  const [transcripts, setTranscripts] = useState<
    Record<string, TranscriptItem[]>
  >({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const active = useMemo(
    () => sessions.find((session) => session.id === activeId) ?? null,
    [sessions, activeId],
  );

  const pushItem = useCallback((sessionId: string, item: TranscriptItem) => {
    setTranscripts((current) => ({
      ...current,
      [sessionId]: [...(current[sessionId] ?? []), item],
    }));
  }, []);

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
    api.health().then(setHealth).catch((err: Error) => setError(err.message));
    void refresh();
    const timer = setInterval(() => void refresh(), POLL_MS);
    return () => clearInterval(timer);
  }, [refresh]);

  useEffect(() => {
    if (activeId) localStorage.setItem(ACTIVE_KEY, activeId);
    else localStorage.removeItem(ACTIVE_KEY);
  }, [activeId]);

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

  const send = async (text: string): Promise<void> => {
    if (!activeId) return;
    const sessionId = activeId;
    pushItem(sessionId, {
      kind: "user",
      id: crypto.randomUUID(),
      text,
      pending: true,
    });
    setError(null);

    try {
      await api.sendMessage(sessionId, text);
      // One standing note per session rather than one per turn.
      setTranscripts((current) => {
        const items = current[sessionId] ?? [];
        if (items.some((item) => item.kind === "notice")) return current;
        return {
          ...current,
          [sessionId]: [
            ...items,
            {
              kind: "notice",
              id: crypto.randomUUID(),
              text:
                "Accepted. The reply streams over SSE, which the UI subscribes " +
                "to in plan item 3-2 — until then it is visible in the server log.",
            },
          ],
        };
      });
    } catch (err) {
      setError((err as Error).message);
    }
    void refresh();
  };

  const composerDisabled =
    !active || active.status === "closed" || active.status === "error";

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
            <strong>{active ? `Session ${active.id.slice(0, 8)}` : "No session"}</strong>
            {active && <span className={`badge ${active.status}`}>{active.status}</span>}
          </div>
          {health && (
            <div className="health" title={`workspace ${health.workspace}`}>
              {health.model} · {health.toolPolicy.autoAllowed} read tools
              auto-allowed · {health.toolPolicy.denyPatterns.length} deny patterns
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

        <Transcript
          items={activeId ? (transcripts[activeId] ?? []) : []}
          idle={!active}
        />

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
