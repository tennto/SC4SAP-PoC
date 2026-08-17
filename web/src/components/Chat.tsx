"use client";

/**
 * Plan item 3-1 — the interactive shell, hydrated from server-rendered state.
 *
 * Scope boundary worth stating plainly: this owns session lifecycle (create /
 * list / select / close) and the *outbound* half of a turn. The inbound half —
 * assistant text, tool chips, approvals — is 3-2 and 3-3, and arrives on the
 * SSE stream at `api.streamUrl(id)`.
 *
 * The seams 3-2 fills, kept explicit so it stays a small diff:
 *   - `TranscriptItem` already models an assistant bubble.
 *   - `refresh()` polling exists only because nothing subscribes to the
 *     `status` event yet; SSE replaces that poll rather than adding to it.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "@/lib/client";
import type { Health, Session, TranscriptItem } from "@/lib/types";
import { SessionList } from "@/components/SessionList";
import { Transcript } from "@/components/Transcript";
import { Composer } from "@/components/Composer";

/** Status/turn/cost refresh interval. Deleted in 3-2 — the stream pushes these. */
const POLL_MS = 2_000;

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
  const [transcripts, setTranscripts] = useState<
    Record<string, TranscriptItem[]>
  >({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(initialError);

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
    const stored = localStorage.getItem(ACTIVE_KEY);
    if (stored) setActiveId(stored);
  }, []);

  useEffect(() => {
    // The server-rendered snapshot covers the first paint; from here the
    // client keeps itself current.
    if (!health) api.health().then(setHealth).catch(() => {});
    const timer = setInterval(() => void refresh(), POLL_MS);
    return () => clearInterval(timer);
  }, [refresh, health]);

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
                "Accepted. The reply is streaming over SSE, which this UI " +
                "subscribes to in plan item 3-2 — until then it is only " +
                `visible by reading the stream directly: curl -N ${api.streamUrl(sessionId)}`,
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
            <strong>
              {active ? `Session ${active.id.slice(0, 8)}` : "No session"}
            </strong>
            {active && (
              <span className={`badge ${active.status}`}>{active.status}</span>
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
