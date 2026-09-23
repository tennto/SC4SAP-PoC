"use client";

/**
 * The interactive shell: a rail of conversations, a transcript, and a composer.
 *
 * Two things are called a "session" around here and they are not the same:
 *
 *   - a *backend session* is a live SDK subprocess. It is created on demand,
 *     evicted when closed, and does not survive a server restart.
 *   - a *chat* is the conversation itself, stored in Mongo against the
 *     signed-in account. It outlives every backend session it has ever had.
 *
 * A chat's id is the id of the backend session that first opened it, and it
 * never changes. Reviving a chat after a restart attaches a *new* backend
 * session to the same chat id — `attached` is that mapping — so the rail shows
 * one row and the history stays in one place.
 *
 * The transcript is not local state either: live turns are folded out of the
 * SSE stream by `useSessionStream`, and stored turns are read back from Mongo.
 * A reload, a second tab, and a fresh sign-in all rebuild the same
 * conversation rather than trusting anything this component remembered.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { api } from "@/lib/client";
import type {
  Chat as StoredChat,
  ChatMessage,
  Health,
  PermissionResponse,
  Session,
  TranscriptItem,
} from "@/lib/types";
import { useSessionStream } from "@/hooks/useSessionStream";
import { SessionList, type RailItem } from "@/components/SessionList";
import { Transcript, toRows } from "@/components/Transcript";
import { Composer } from "@/components/Composer";
import { ApprovalModal } from "@/components/ApprovalModal";
import { toAttachment, type Draft } from "@/lib/attachments";
import { useLocale } from "@/lib/i18n/client";

/** Survives a browser refresh, which is one of the 3-5 QA cases. */
const ACTIVE_KEY = "sc4sap.activeSession";
/**
 * Text the monitor left for the composer: a question about a tool call,
 * written before navigating here. Read once and removed, so a reload does
 * not put the same question back after it has been sent or thrown away.
 */
const DRAFT_KEY = "sc4sap.chatDraft";

/** The model this browser last chose for a new chat. See `model` below. */
const MODEL_KEY = "sc4sap.chatModel";
/** Which backend session is running which stored chat — see `attached`. */
const ATTACHED_KEY = "sc4sap.attached";

type Props = {
  initialSessions: Session[];
  initialHealth: Health | null;
  initialError: string | null;
  /** For the greeting on the empty state. Empty when the row has no name. */
  firstName: string;
};

type History = {
  chatId: string;
  messages: ChatMessage[];
  /** Prior conversation, shaped for the model. Built server-side. */
  context: string | null;
};

export function Chat({
  initialSessions,
  initialHealth,
  initialError,
  firstName,
}: Props) {
  const [health, setHealth] = useState<Health | null>(initialHealth);
  /**
   * The model the next session opens on.
   *
   * `null` means the backend's own default, which is what this screen used to
   * be fixed at. A running session's model cannot change — it is settled when
   * the process starts — so this applies to the next conversation, and the
   * chip under the composer shows the running one until then.
   *
   * Remembered per browser: someone who has decided their SAP reads run on
   * Haiku should not re-decide it every morning. A value the backend no
   * longer offers is ignored rather than sent.
   */
  const [model, setModel] = useState<string | null>(null);
  useEffect(() => {
    try {
      const stored = localStorage.getItem(MODEL_KEY);
      if (stored) setModel(stored);
    } catch {
      // Private window, blocked storage. The default is the right fallback.
    }
  }, []);
  const [sessions, setSessions] = useState<Session[]>(initialSessions);
  const [chats, setChats] = useState<StoredChat[]>([]);
  /** chat id → the backend session currently running it. */
  const [attachedState, setAttached] = useState<Record<string, string>>({});
  /**
   * The mapping survives a reload, two ways.
   *
   * It is remembered in `localStorage`, because it is decided here and nowhere
   * else: the backend does not know a session was opened *for* a stored chat.
   * Losing it on a refresh was not cosmetic — the revived session came back as
   * a row of its own, and the next write went under the session's id, so the
   * conversation was stored twice.
   *
   * And it is re-derived from what is stored, for a tab that never had it:
   * the chat keeps the SDK conversation id its last session ran, and a live
   * session with that same id is that chat's session under a different name.
   */
  const attached = useMemo<Record<string, string>>(() => {
    const derived: Record<string, string> = {};
    for (const session of sessions) {
      if (!session.sdkSessionId) continue;
      const chat = chats.find(
        (entry) =>
          entry.id !== session.id && entry.sdkSessionId === session.sdkSessionId,
      );
      if (chat) derived[chat.id] = session.id;
    }
    // A remembered link to a session the backend no longer has is worse than
    // none: it would point the transcript at a stream that 404s, where no link
    // at all reads the stored history and revives on the next prompt.
    const kept = Object.fromEntries(
      Object.entries(attachedState).filter(([, sessionId]) =>
        sessions.some((session) => session.id === sessionId),
      ),
    );
    return { ...derived, ...kept };
  }, [sessions, chats, attachedState]);

  /**
   * Not before the stored copy has been read. Effects run in the order they
   * are declared, and this one is declared first: writing the empty initial
   * state here would wipe what the mount effect below is about to read.
   */
  const attachedLoaded = useRef(false);
  useEffect(() => {
    if (!attachedLoaded.current) return;
    try {
      localStorage.setItem(ATTACHED_KEY, JSON.stringify(attachedState));
    } catch {
      // Storage full or blocked — the derivation above still covers a reload.
    }
  }, [attachedState]);
  const [history, setHistory] = useState<History | null>(null);
  // Read from localStorage after mount, not during render: the server has no
  // localStorage and a differing first render is a hydration mismatch.
  const [activeId, setActiveId] = useState<string | null>(null);

  const offered = health?.models ?? [];
  const chosen = offered.some((entry) => entry.id === model) ? model : null;

  /**
   * The model the conversation on screen is actually running on, if it has a
   * session. A session's model is settled when its process starts, so the
   * picker cannot change this one — only the next.
   */
  const activeBackendId = activeId ? (attached[activeId] ?? activeId) : null;
  const activeModel =
    sessions.find((session) => session.id === activeBackendId)?.model ?? null;

  /** What a new session is opened with. Undefined means the backend default. */
  const spend = (): { model: string } | undefined =>
    chosen ? { model: chosen } : undefined;

  function pickModel(id: string): void {
    setModel(id);
    try {
      localStorage.setItem(MODEL_KEY, id);
    } catch {
      // See above: remembering it is a convenience, not the feature.
    }
  }

  const [busy, setBusy] = useState(false);
  // Latches the empty state closed the instant a prompt is submitted from it,
  // so the composer starts gliding down on the keystroke rather than when the
  // backend's echo of the prompt comes back off the stream.
  const [submitted, setSubmitted] = useState(false);
  /**
   * How many stream items there were when a prompt was handed over, or `null`
   * when nothing is outstanding.
   *
   * The session is still `idle` between the press and the backend saying it
   * has started, so `status` alone left a gap at the front of every turn with
   * no indicator in it. This closes that gap from the press, and it holds a
   * count rather than a flag so it can tell "the backend has answered" from
   * "the backend answered something earlier" — the item count only moves past
   * this number when *this* prompt produces something.
   */
  const [awaitingAck, setAwaitingAck] = useState<number | null>(null);
  /** What `persist` last wrote — see the signature it builds. */
  const saved = useRef<string | null>(null);
  /**
   * Where the stream stood when the prompt was handed over, held until the
   * turn ends — or `null` between turns.
   *
   * A second mark rather than a second use of the one above, because the two
   * answer different questions and stop being true at different moments.
   * `awaitingAck` asks "is anything happening", and the session saying `busy`
   * settles that. This asks "is this turn's own prompt on screen yet", and the
   * only thing that settles *that* is the backend echoing it back — which
   * arrives after the status does.
   */
  const [sendMark, setSendMark] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(initialError);
  /**
   * The bar is saying something that goes away on its own.
   *
   * Only one thing does: the notice that a turn was stopped, which the reader
   * caused by pressing the button and does not need to dismiss as well. Every
   * other message in this bar is a failure they did not ask for and it stays
   * until they have read it.
   */
  const [passing, setPassing] = useState(false);
  /**
   * The last message the bar carried, kept through its exit.
   *
   * The bar is always mounted so that opening and closing can both be
   * animated — an element that unmounts on dismissal has no closing state to
   * animate. That means the text has to outlive `error` going null, or the bar
   * would collapse on an empty row.
   */
  const [errorShown, setErrorShown] = useState<string | null>(initialError);
  /**
   * A stop is in flight, so the "Stopped." coming back off the stream is the
   * answer to a button press rather than news.
   *
   * A flag rather than matching the message text: the wording belongs to the
   * backend, and a screen that decided how to treat a notice by reading its
   * prose would quietly change behaviour the next time that sentence was
   * edited.
   */
  const expectStop = useRef(false);

  /**
   * Three refs, all of them there for the same reason: creating and closing
   * sessions in quick succession puts several `GET /sessions` in flight at
   * once, and their answers do not come back in the order they were asked.
   *
   * `listSeq` drops a list that a newer one has already overtaken.
   * `closed` remembers what this tab has closed, so a list captured before the
   * close cannot put the row back on screen.
   * `closing` collapses a second close of the same id, which the backend
   * answers with a 404 that is not worth showing anyone.
   */
  const listSeq = useRef(0);
  const closed = useRef<Set<string>>(new Set());
  const closing = useRef<Set<string>>(new Set());
  /**
   * The same shadow, for stored conversations rather than backend sessions.
   *
   * `refreshChats` replaced the list with whatever the server said, and during
   * a run of quick closes the server is behind: the answer to the first close
   * still lists the conversations the second and third clicks have already
   * taken off screen, so they come back and go again. A chat is held here from
   * the click until the server stops listing it.
   */
  const removedChats = useRef<Set<string>>(new Set());
  const chatsSeq = useRef(0);
  /** Pending coalesced refresh — see `scheduleRefresh`. */
  const refreshTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Read inside async callbacks, where `sessions` would be the value it had
  // when the callback was created.
  const sessionsRef = useRef<Session[]>(initialSessions);
  useEffect(() => {
    sessionsRef.current = sessions;
  }, [sessions]);

  /** The backend session behind the selected chat, if one is running. */
  const backendId = activeId
    ? (attached[activeId] ??
      (sessions.some((session) => session.id === activeId) ? activeId : null))
    : null;

  const stream = useSessionStream(backendId);

  const live = useMemo(
    () => sessions.find((session) => session.id === backendId) ?? null,
    [sessions, backendId],
  );

  const storedChat = useMemo(
    () => chats.find((chat) => chat.id === activeId) ?? null,
    [chats, activeId],
  );

  // The stream is more current than the last list poll, so it wins.
  const status = backendId ? (stream.status ?? live?.status ?? null) : null;

  /** Stored turns, shaped like stream items so the transcript needs no branch. */
  const historyItems = useMemo<TranscriptItem[]>(() => {
    if (!history || history.chatId !== activeId) return [];
    let messages = history.messages;

    /**
     * A revived chat has two copies of its newest turns: the stored rows, and
     * the live session's replay of the same turns. Whichever stored rows the
     * stream's opening rows repeat are dropped, and the stream draws them.
     *
     * Matched from the end of the stored list against the start of the live
     * one, longest match first. A turn still in flight is not stored yet, so
     * it fails to match and the search shortens by one until the completed
     * turns line up — which also keeps `persist` numbering them as it did:
     * what is left of the stored list is the base its rows count from.
     */
    if (backendId && backendId !== activeId) {
      const live = toRows(stream.items).filter(
        (row) => row.kind !== "notice" && row.text.trim() !== "",
      );
      const same = (
        stored: (typeof messages)[number],
        row: (typeof live)[number],
      ): boolean =>
        stored.text === row.text &&
        (stored.role === "user") === (row.kind === "user");
      for (let k = Math.min(messages.length, live.length); k > 0; k -= 1) {
        const tail = messages.slice(messages.length - k);
        if (tail.every((stored, index) => same(stored, live[index]!))) {
          messages = messages.slice(0, messages.length - k);
          break;
        }
      }
    }

    return messages.map((message) =>
      message.role === "user"
        ? {
            kind: "user",
            id: `stored-${message.seq}`,
            text: message.text,
            ...(message.attachments && message.attachments.length > 0
              ? { attachments: message.attachments }
              : {}),
          }
        : {
            kind: "assistant",
            id: `stored-${message.seq}`,
            text: message.text,
            streaming: false,
          },
    );
  }, [history, activeId, backendId, stream.items]);

  const items = useMemo(
    () => [...historyItems, ...stream.items],
    [historyItems, stream.items],
  );

  const { t: messages } = useLocale();
  const t = messages.chat;

  /** Something went wrong and the reader has to dismiss it. */
  const fail = useCallback((message: string): void => {
    setPassing(false);
    setError(message);
  }, []);

  const refresh = useCallback(async () => {
    const seq = ++listSeq.current;
    // Anything created while this request is in flight cannot be in its
    // answer, so it is kept rather than being taken as deleted.
    const asked = new Set(sessionsRef.current.map((session) => session.id));

    try {
      const list = await api.listSessions();
      // A newer list has already been applied; this one is history.
      if (seq !== listSeq.current) return;

      // Once the backend stops reporting a session, there is nothing left to
      // shadow and the entry is dropped.
      for (const id of [...closed.current]) {
        if (!list.some((session) => session.id === id)) {
          closed.current.delete(id);
        }
      }

      const visible = list.filter((session) => !closed.current.has(session.id));
      setSessions((current) => [
        ...visible,
        ...current.filter(
          (session) =>
            !asked.has(session.id) &&
            !list.some((other) => other.id === session.id),
        ),
      ]);
    } catch (err) {
      fail((err as Error).message);
    }
  }, []);

  const refreshChats = useCallback(async () => {
    const seq = ++chatsSeq.current;
    try {
      const list = await api.listChats();
      // A newer list has already been applied; this one is history.
      if (seq !== chatsSeq.current) return;

      // A conversation the server has stopped listing is really gone, so the
      // shadow over it can be lifted. Kept, and the row stays off screen.
      for (const id of [...removedChats.current]) {
        if (!list.some((chat) => chat.id === id)) removedChats.current.delete(id);
      }

      setChats(list.filter((chat) => !removedChats.current.has(chat.id)));
    } catch (err) {
      // History being unavailable is not a reason to take the screen down:
      // live sessions still work without it.
      fail((err as Error).message);
    }
  }, []);

  /**
   * One refresh after a run of closes, rather than one per close.
   *
   * Each close ended with two list requests. Closing four conversations in as
   * many seconds fired eight, overlapping, each replacing the list from a
   * server at a different point in the deletions — which is what made a quick
   * run of × feel like the rail was arguing with itself. The work is the same
   * either way; only the last answer is worth drawing.
   */
  const scheduleRefresh = useCallback(() => {
    if (refreshTimer.current) clearTimeout(refreshTimer.current);
    refreshTimer.current = setTimeout(() => {
      refreshTimer.current = null;
      void refresh();
      void refreshChats();
    }, 250);
  }, [refresh, refreshChats]);

  useEffect(
    () => () => {
      if (refreshTimer.current) clearTimeout(refreshTimer.current);
    },
    [],
  );

  /** What the composer opens with, if the monitor left something. */
  const [seed, setSeed] = useState<string | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem(ACTIVE_KEY);
    if (stored) setActiveId(stored);
    try {
      const draft = localStorage.getItem(DRAFT_KEY);
      if (draft) {
        localStorage.removeItem(DRAFT_KEY);
        setSeed(draft);
      }
    } catch {
      // Storage refused. Nothing to seed.
    }
    try {
      const links = JSON.parse(
        localStorage.getItem(ATTACHED_KEY) ?? "{}",
      ) as Record<string, string>;
      // Only pairs of ids; anything else is a stale or hand-edited entry.
      const clean = Object.fromEntries(
        Object.entries(links).filter(
          ([chat, session]) =>
            typeof chat === "string" && typeof session === "string",
        ),
      );
      if (Object.keys(clean).length > 0) setAttached(clean);
    } catch {
      // Unreadable — start from nothing, as before.
    }
    attachedLoaded.current = true;
    void refreshChats();
  }, [refreshChats]);

  /**
   * Read a chat that was opened without going through the rail.
   *
   * `selectChat` loads the stored transcript when a row is clicked, and that
   * used to be the only way in. It is not any more: a reload restores the last
   * chat from `localStorage`, and a skill run hands one over the same way — and
   * both landed on a chat with an id, no history and no live session, which
   * draws as the greeting. The conversation was there the whole time; nothing
   * had asked for it.
   *
   * Skipped only when the chat *is* the live backend session — one that has
   * never been stored and revived — which rebuilds itself from that session's
   * replay buffer alone. A revived chat has a session under another id and
   * older turns that session never saw, so its stored copy is read too;
   * `historyItems` drops whatever the two have in common. `sessions` arrives
   * with the server render, so this is settled on the first pass rather than
   * racing it.
   */
  useEffect(() => {
    if (!activeId || backendId === activeId) return;
    if (history?.chatId === activeId) return;

    let cancelled = false;
    void (async () => {
      try {
        const found = await api.readChat(activeId);
        if (cancelled) return;
        setHistory({
          chatId: activeId,
          messages: found.messages,
          context: found.context,
        });
      } catch {
        // A chat id with nothing stored behind it — a session created and
        // never asked anything. The empty state is the right answer.
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [activeId, backendId, history?.chatId]);

  useEffect(() => {
    // The server-rendered snapshot covers the first paint.
    if (!health) api.health().then(setHealth).catch(() => {});
  }, [health]);

  /**
   * The session *list* is refreshed on events, never on a timer. The active
   * session's own state arrives on its stream; the only thing a poll could add
   * is another tab's or another session's turns and cost, which nobody is
   * looking at while this tab is in the background. So: on regaining focus,
   * and on the local actions that change the list.
   */
  useEffect(() => {
    const onFocus = (): void => {
      if (document.visibilityState === "visible") void refresh();
    };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onFocus);
    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onFocus);
    };
  }, [refresh]);

  useEffect(() => {
    // A different conversation has a different last-written state.
    saved.current = null;
    if (activeId) localStorage.setItem(ACTIVE_KEY, activeId);
    else localStorage.removeItem(ACTIVE_KEY);
    // Switching chats re-decides the empty state from that chat's own
    // transcript, so a latch left over from the last one must not carry.
    setSubmitted(false);
  }, [activeId]);

  // The echo has landed; the transcript itself now keeps the screen open.
  useEffect(() => {
    if (stream.items.length > 0) setSubmitted(false);
  }, [stream.items.length]);

  /**
   * The latch lets go once `status` can carry the indicator on its own.
   *
   * "Anything new on the stream" was the wrong test and it flickered. The
   * backend's echo of the prompt can arrive before its `status: busy` does,
   * and in the render between the two the latch had already let go while
   * status still said `idle` — so the waiting row unmounted and came back a
   * frame later, which is the flash of a label appearing twice.
   *
   * The tests below are each proof that the turn is under way or over: the
   * session said so, it failed, or an answer to *this* prompt is already on
   * the stream. Anything short of that and the latch keeps holding.
   */
  useEffect(() => {
    if (awaitingAck === null) return;
    const answered = stream.items
      .slice(awaitingAck)
      .some((item) => item.kind === "assistant");
    if (status === "busy" || status === "error" || status === "closed" || answered) {
      setAwaitingAck(null);
    }
  }, [awaitingAck, status, stream.items]);

  useEffect(() => {
    if (!stream.error) return;
    // The reader pressed the button; the bar already says so. This is the
    // backend agreeing, which is not news twice.
    if (expectStop.current) {
      expectStop.current = false;
      return;
    }
    fail(stream.error);
    // `errorSeq` and not just the message: two stops in a row report the same
    // sentence, and watching the string alone missed the second one entirely.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stream.error, stream.errorSeq, fail]);

  /**
   * A passing notice takes itself off after long enough to be read.
   *
   * Long enough, and no longer: it is confirming something the reader just
   * did, so it is read in a glance or not at all, and a bar that lingers past
   * that is a bar they have to think about dismissing.
   */
  useEffect(() => {
    if (!passing || !error) return;
    const timer = setTimeout(() => {
      setError(null);
      setPassing(false);
    }, 2600);
    return () => clearTimeout(timer);
  }, [passing, error]);

  // Held through the exit — see `errorShown`.
  useEffect(() => {
    if (error) setErrorShown(error);
  }, [error]);

  /**
   * Writes the rendered turns of the live session to the reader's account.
   *
   * Rows are keyed by their position in the conversation and upserted, so this
   * is safe to run repeatedly: the same turn lands in the same row, and a turn
   * whose text grew as it streamed is corrected rather than duplicated.
   */
  /**
   * A revived chat is written only once its stored copy has been read.
   *
   * The rows are numbered from how many stored turns come before them, and
   * a reload races that number: the live session replays its turns off the
   * stream in a moment, the stored copy takes a round trip to Mongo, and the
   * turn going idle between the two counted from zero — so the newest turn
   * was written over the oldest. The write is held instead, and released by
   * the effect below when the history arrives.
   */
  const pendingPersist = useRef(false);

  const persist = useCallback(async () => {
    if (!activeId) return;
    const revived = backendId !== null && backendId !== activeId;
    if (revived && history?.chatId !== activeId) {
      pendingPersist.current = true;
      return;
    }
    const rows = toRows(stream.items).filter(
      (row) =>
        row.kind !== "notice" &&
        // A prompt that was only a file has no text and is still a turn.
        (row.text.trim() !== "" ||
          (row.kind === "user" && (row.attachments?.length ?? 0) > 0)),
    );
    if (rows.length === 0) return;

    /**
     * Nothing has changed since the last write, so do not make it again.
     *
     * This is what breaks a loop, not an optimisation. Writing calls
     * `refreshChats()`, which replaces `chats`, which gives `storedChat` a new
     * identity, which gives this callback a new identity — and the effect that
     * runs it lists it as a dependency, so it ran again, and again. The
     * conversation was being saved dozens of times a second and the tab
     * stopped responding.
     *
     * The signature is what was actually written: the chat, how many turns,
     * and how much text. Anything that would change the stored rows changes
     * it; a fresh `chats` array that says the same thing does not.
     */
    const signature = `${activeId}|${rows.length}|${rows.reduce(
      (total, row) => total + row.text.length,
      0,
    )}`;
    if (signature === saved.current) return;
    saved.current = signature;

    const base = historyItems.length;
    try {
      await api.saveTurns(activeId, {
        // The stored title wins: a revived chat gets a fresh backend session
        // whose own title is the *latest* prompt, and letting that through
        // would rename the conversation on every visit.
        // A revived chat already has its name; the live session's would be
        // the *latest* prompt, and sending that before the chat list has
        // loaded renamed the conversation after every reload.
        title: revived ? undefined : (storedChat?.title ?? live?.title ?? null),
        sdkSessionId: live?.sdkSessionId ?? null,
        turns: live?.turns,
        totalCostUsd: live?.totalCostUsd,
        messages: rows.map((row, index) => ({
          seq: base + index,
          role: row.kind === "user" ? ("user" as const) : ("agent" as const),
          text: row.text,
          ...(row.kind === "user" && row.attachments
            ? { attachments: row.attachments }
            : {}),
        })),
      });
    } catch (err) {
      fail((err as Error).message);
    }
  }, [activeId, backendId, history?.chatId, stream.items, historyItems.length, storedChat, live]);

  // The held write, once the stored copy it was waiting on has been read.
  useEffect(() => {
    if (!pendingPersist.current) return;
    if (!activeId || history?.chatId !== activeId) return;
    pendingPersist.current = false;
    void persist().then(() => refreshChats());
  }, [activeId, history?.chatId, persist, refreshChats]);

  /**
   * A finished turn is when turns, cost and the answer all stop changing, so
   * both the list poll and the write happen on the way back to idle rather
   * than on a timer.
   *
   * On the *transition*, which is the part this was missing. An effect cannot
   * list a callback in its dependencies and then treat itself as an edge:
   * `refresh()` replaces `sessions`, `live` comes out of that with a new
   * identity, `persist` is rebuilt because it closes over `live`, and this
   * effect re-runs because `persist` is in its list — so it fetched the
   * session list and the chat list again, and again, for as long as the page
   * was open. Comparing against the previous status is what makes an edge an
   * edge.
   */
  const wasIdle = useRef(false);
  useEffect(() => {
    const settled = stream.status === "idle";
    const arrived = settled && !wasIdle.current;
    wasIdle.current = settled;
    if (!arrived) return;

    // The turn is over, so there is no prompt still waiting to be echoed.
    setSendMark(null);
    void refresh();
    void persist().then(() => refreshChats());
  }, [stream.status, refresh, persist, refreshChats]);

  const selectChat = async (id: string): Promise<void> => {
    setActiveId(id);
    setHistory(null);
    // A chat that *is* a live backend session rebuilds itself from that
    // session's replay buffer. A revived one is read as well, and the turns
    // both copies hold are folded together in `historyItems`.
    if (sessions.some((session) => session.id === id)) return;

    try {
      const found = await api.readChat(id);
      setHistory({
        chatId: id,
        messages: found.messages,
        context: found.context,
      });
    } catch (err) {
      fail((err as Error).message);
    }
  };

  const createSession = async (): Promise<void> => {
    setBusy(true);
    setError(null);
    try {
      const session = await api.createSession(undefined, undefined, spend());
      setSessions((current) => [...current, session]);
      setHistory(null);
      setActiveId(session.id);
    } catch (err) {
      fail((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  /**
   * The row goes first, then the requests. Closing a session tears down an SDK
   * subprocess, and waiting for that before removing the row made a click on ×
   * look ignored for as long as the teardown took — which is longest for a
   * session that has only just started.
   *
   * This deletes the stored conversation too. The rail is a list of
   * conversations now, not of running processes, so × means what it means in
   * every other chat list.
   */
  const closeSession = async (id: string): Promise<void> => {
    if (closing.current.has(id)) return;
    closing.current.add(id);

    const backend = attached[id] ?? id;
    closed.current.add(backend);
    removedChats.current.add(id);

    setSessions((current) =>
      current.filter((session) => session.id !== backend),
    );
    setChats((current) => current.filter((chat) => chat.id !== id));
    setActiveId((current) => (current === id ? null : current));
    setAttached((current) => {
      const next = { ...current };
      delete next[id];
      return next;
    });

    try {
      await api.closeSession(backend);
    } catch (err) {
      const message = (err as Error).message;
      // 404 is the outcome that was asked for: the session is already gone,
      // whether this tab closed it twice or another one got there first.
      if (!/unknown session/i.test(message)) {
        fail(message);
        closed.current.delete(backend);
      }
    }

    try {
      await api.deleteChat(id);
    } catch (err) {
      fail((err as Error).message);
    } finally {
      closing.current.delete(id);
      // Not awaited, and not one per close: see `scheduleRefresh`. The row is
      // already gone from the screen — this is only the list catching up.
      scheduleRefresh();
    }
  };

  /**
   * Sends the reader's prompt, attaching a backend session first if the chat
   * does not have one.
   *
   * A stored chat whose session died with the last restart gets a fresh one
   * plus its own prior conversation as a preamble — the backend feeds that to
   * the model and keeps it off the stream, so the transcript still shows only
   * what was typed.
   *
   * No optimistic bubble: the backend echoes the prompt onto the stream, and
   * rendering it twice — once locally, once on replay — is worse than the few
   * milliseconds it takes to come back.
   */
  const send = async (text: string, files: Draft[] = []): Promise<void> => {
    if (!activeId) return;
    setSubmitted(true);
    setAwaitingAck(stream.items.length);
    setSendMark(stream.items.length);
    setError(null);

    try {
      let target = backendId;
      let context: string | null = null;

      if (!target) {
        // Reviving a stored chat: the new session carries that chat's totals
        // so its own counting continues them. Without this the session starts
        // at zero and `persist` writes that zero back over what the chat had
        // spent — the rail loses the figures, and so does the record.
        const session = await api.createSession(
          undefined,
          storedChat
            ? {
                turns: storedChat.turns,
                totalCostUsd: storedChat.totalCostUsd,
              }
            : undefined,
          spend(),
        );
        setSessions((current) => [...current, session]);
        setAttached((current) => ({ ...current, [activeId]: session.id }));
        target = session.id;
        context = history?.chatId === activeId ? history.context : null;
      }

      await api.sendMessage(target, text, context, files.map(toAttachment));
      // The first prompt is what names the conversation in the rail, so pull
      // the list now rather than waiting for the turn to finish.
      void refresh();
    } catch (err) {
      fail((err as Error).message);
      setSubmitted(false);
      setAwaitingAck(null);
      setSendMark(null);
    }
  };

  /**
   * Abandon the turn in flight.
   *
   * The latches go first and the request second. They are what holds the
   * indicator up, and leaving them set while the round trip runs would keep
   * the dots on a turn the reader has already called off — the press is the
   * decision, the request is only how it gets carried out.
   *
   * A refusal is not surfaced: the only way this fails on a session that was
   * running a moment ago is that the answer landed first, which is not
   * something to interrupt someone with.
   */
  const stop = async (): Promise<void> => {
    if (!backendId) return;
    expectStop.current = true;
    setAwaitingAck(null);
    setSendMark(null);
    // Said here rather than waited for. The backend reports the same thing a
    // round trip later, but the press is the moment it is true — and if the
    // request is refused because the answer landed first, the reader still
    // needs to know their press did something.
    setPassing(true);
    setError(t.stopped);
    try {
      await api.stopSession(backendId);
    } catch {
      // See above.
    }
    void refresh();
  };

  /**
   * The empty state has no chat behind it, so the first prompt creates one and
   * sends in the same gesture — the reader never presses the plus.
   */
  const startAndSend = async (
    text: string,
    files: Draft[] = [],
  ): Promise<void> => {
    setSubmitted(true);
    // A new session, so its stream starts empty whatever this one holds.
    setAwaitingAck(0);
    setSendMark(0);
    setError(null);
    try {
      const session = await api.createSession(undefined, undefined, spend());
      setSessions((current) => [...current, session]);
      setHistory(null);
      setActiveId(session.id);
      await api.sendMessage(session.id, text, null, files.map(toAttachment));
      void refresh();
    } catch (err) {
      fail((err as Error).message);
      setSubmitted(false);
      setAwaitingAck(null);
      setSendMark(null);
    }
  };

  // Oldest first, one at a time: the model can park several tool calls at once,
  // and answering them out of order is a worse story than a small queue.
  const approval = stream.pending[0] ?? null;
  const [settling, setSettling] = useState(false);

  const settle = async (response: PermissionResponse): Promise<void> => {
    if (!backendId || !approval) return;
    setSettling(true);
    try {
      await api.respondToPermission(backendId, approval.reqId, response);
      // The dialog closes on the `permission_resolved` event, not here — the
      // backend deciding it was settled is what makes it settled.
    } catch (err) {
      fail((err as Error).message);
    } finally {
      setSettling(false);
    }
  };

  /**
   * Allow this request and stop asking about SAP reads for the session.
   *
   * Order matters. The switch is set first and awaited, so by the time the
   * turn resumes the calls queued behind this one already meet a session that
   * no longer asks — setting it after would let the next one raise a dialog
   * before the switch landed.
   */
  const allowAllSapReads = async (): Promise<void> => {
    if (!backendId || !approval) return;
    setSettling(true);
    try {
      await api.setAutoApprove(backendId, true);
      await api.respondToPermission(backendId, approval.reqId, {
        behavior: "allow",
      });
    } catch (err) {
      fail((err as Error).message);
    } finally {
      setSettling(false);
    }
  };

  /** Back to asking. Nothing already waved through is undone by this. */
  const stopAutoApprove = async (): Promise<void> => {
    if (!backendId) return;
    try {
      await api.setAutoApprove(backendId, false);
    } catch (err) {
      fail((err as Error).message);
    }
  };

  /**
   * The rail: every stored conversation, plus any live session that has not
   * been stored yet. A revived chat's new backend session is deliberately not
   * a row of its own — it belongs to the chat it was attached to.
   */
  const railItems = useMemo<RailItem[]>(() => {
    const attachedIds = new Set(Object.values(attached));
    const rows = new Map<string, RailItem>();
    /**
     * When each conversation began, for the order. Fixed at creation, so a
     * row never moves once it is on screen: the list used to be sorted by
     * last write, and opening a conversation is a write, so the row just
     * clicked jumped to the top and the reader's next target moved with it.
     */
    const since = new Map<string, number>();

    for (const chat of chats) {
      since.set(chat.id, Date.parse(chat.createdAt));
      rows.set(chat.id, {
        id: chat.id,
        title: chat.title,
        turns: chat.turns,
        totalCostUsd: chat.totalCostUsd,
      });
    }

    for (const session of sessions) {
      if (attachedIds.has(session.id)) continue;
      const stored = rows.get(session.id);
      if (!since.has(session.id)) {
        since.set(session.id, Date.parse(session.createdAt));
      }
      rows.set(session.id, {
        id: session.id,
        // The stored title wins. It is the one the app chose deliberately —
        // a skill run is saved as "Analyze Code · ZMMR1002" — where the live
        // session's is derived from the raw prompt text and, for a run started
        // from a skill screen, is the slash command that began it. The live
        // one is the fallback for a session that has never been saved.
        title: stored?.title ?? session.title ?? null,
        turns: session.turns,
        totalCostUsd: session.totalCostUsd,
      });
    }

    // The live numbers for a revived chat sit on its attached session.
    for (const [chatId, sessionId] of Object.entries(attached)) {
      const session = sessions.find((other) => other.id === sessionId);
      const row = rows.get(chatId);
      if (!session || !row) continue;
      rows.set(chatId, {
        ...row,
        turns: session.turns,
        totalCostUsd: session.totalCostUsd,
      });
    }

    // Newest first. A row with no known start — which should not happen —
    // sorts to the bottom rather than the top, where it would push everything
    // else down.
    return [...rows.values()].sort(
      (a, b) => (since.get(b.id) ?? 0) - (since.get(a.id) ?? 0),
    );
  }, [chats, sessions, attached]);

  /**
   * An empty transcript is the empty state — whether that is because no chat
   * is selected or because a freshly created one has not been asked anything
   * yet. A new chat opening onto a frame with nothing in it was the same blank
   * screen the greeting exists to replace.
   */
  const hero =
    !submitted &&
    // A prompt in flight is not an empty screen, whatever the transcript holds
    // yet. `submitted` alone was not enough: starting a chat from the greeting
    // sets `activeId`, and the effect that watches it clears that latch — so
    // between the session being created and its echo arriving, `hero` came
    // back on, took the whole transcript down with it, and put it up again a
    // moment later. That unmount is what made the waiting row appear twice and
    // its fade look like it never ran; it ran, from the start, twice.
    awaitingAck === null &&
    items.length === 0 &&
    // A session with turns behind it is not empty — its transcript is simply
    // still being replayed off the stream, and flashing the greeting for those
    // few hundred milliseconds on every reload is worse than waiting for it.
    !(live !== null && live.turns > 0);

  const composerDisabled = status === "closed" || status === "error";

  return (
    <div className="chat">
      <SessionList
        items={railItems}
        activeId={activeId}
        busy={busy}
        onSelect={(id) => void selectChat(id)}
        onCreate={() => void createSession()}
        onClose={(id) => void closeSession(id)}
      />

      <main className="main">
        {/* Always mounted, opened by a class. An element that only exists
            while it has something to say cannot be animated on the way out —
            it is gone by the time the animation would run. */}
        <div className={`error${error ? " is-open" : ""}`} role="alert">
          {errorShown}
          <button
            onClick={() => {
              setError(null);
              setPassing(false);
            }}
            aria-label={t.dismiss}
            // Not reachable by keyboard while the bar is closed, where it is
            // a button on a message that is not there.
            tabIndex={error ? 0 : -1}
          >
            ×
          </button>
        </div>

        {/* Four rows: transcript, greeting, composer, tail. The greeting
            collapses and the tail's flex-grow runs to zero on the same curve,
            which is what carries the composer from the middle of the screen to
            the bottom of it in one move. */}
        <div className={`stage${hero ? " is-hero" : ""}`}>
          <div className="stage-body">
            {!hero && (
              <Transcript
                items={items}
                idle={false}
                busy={status === "busy" || awaitingAck !== null}
                pending={awaitingAck !== null || stream.items.length === sendMark}
                activity={stream.activity}
              />
            )}
          </div>

          <div className="stage-greeting">
            {/* Deliberately not "I am your assistant, how can I help" — that
                is the line every chat window opens with, and it says nothing
                this one could not. What can be asked is already spelled out
                in the composer below, so this does not repeat it either; it
                just says hello and gets out of the way.

                Falls back to the greeting without a name rather than to a
                blank one: an account can exist with no name on it. */}
            <h1>
              {firstName ? t.greeting(firstName) : t.greetingAnonymous}
            </h1>
          </div>

          {/* Sits above the composer rather than in a corner: a switch that
              stops the machine asking permission has to be visible to whoever
              is about to type the next thing, and turning it back off has to
              be one press away from where they are looking. */}
          {stream.autoApprove && (
            <div className="auto-approve-bar">
              <span>{t.autoApproveOn}</span>
              <button type="button" onClick={() => void stopAutoApprove()}>
                {t.askAgain}
              </button>
            </div>
          )}

          <div className="stage-composer">
            <Composer
              disabled={composerDisabled}
              // The running session's model when there is one, otherwise the
              // one the next session will open on — which is what the picker
              // is changing.
              model={activeModel ?? chosen ?? health?.model ?? null}
              models={offered}
              onModelChange={pickModel}
              autoFocus={hero}
              // The same test the transcript's indicator uses, so the button
              // and the dots are never in disagreement about whether the
              // screen is waiting for something.
              running={status === "busy" || awaitingAck !== null}
              onStop={() => void stop()}
              seed={seed}
              hint={hero ? t.hintHero : t.hintChat}
              // The empty state can be a selected-but-unasked chat as well as
              // no chat at all, so the branch is on whether one exists — not
              // on which screen is showing.
              onSend={(text, files) =>
                void (activeId ? send(text, files) : startAndSend(text, files))
              }
              // A refused file is a failure the reader did not ask for, so it
              // goes in the bar and stays until dismissed, like the rest.
              onReject={fail}
            />
          </div>

          <div className="stage-tail" aria-hidden />
        </div>
      </main>

      {approval && (
        <ApprovalModal
          // Remount per request, so a queued second approval starts with an
          // empty form rather than the previous one's selections.
          key={approval.reqId}
          request={approval}
          busy={settling}
          autoApprove={stream.autoApprove}
          onSettle={(response) => void settle(response)}
          onAllowAll={() => void allowAllSapReads()}
        />
      )}
    </div>
  );
}
