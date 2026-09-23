"use client";

/**
 * A skill's inputs, and what comes back when it runs.
 *
 * The catalog describes each field — a kind, a label, options, a placeholder —
 * and this renders one control per description. A skill added to
 * `lib/skills.ts` gets a working screen with no code written for it.
 *
 * Running opens a real backend session and sends a prompt built from the
 * answers, which is the same thing the chat screen does with a typed message.
 * That is deliberate and is the whole design: everything worth having here —
 * approvals, stopping a turn, the transcript, the conversation surviving a
 * reload — hangs off a session rather than off the chat screen, so a second
 * way to open one inherits all of it instead of reimplementing any of it.
 *
 * The answer is rendered as a document, not as a conversation. What comes back
 * from these skills is a report — headings, tables, findings with line numbers
 * — and a transcript frames that as somebody's reply: a speaker label above it,
 * a turn-sized gap under it, the shape of a thing to answer rather than to
 * read. The chat screen is right to draw it that way; this screen asked one
 * question with a form and gets one document back.
 *
 * It is still written to the account's conversations while that happens, so
 * the run is not trapped on a screen with no history. "Continue in chat" is
 * the door between the two: the same conversation, in the place built for
 * following it up.
 *
 * `Select` rather than a native one, for the same reason the wizard and the
 * settings screen use it: a native select hands its open list to the operating
 * system to draw, and no CSS in this app reaches inside it.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { api } from "@/lib/client";
import { useSessionStream } from "@/hooks/useSessionStream";
import { Icon } from "@/components/Icon";
import { Select } from "@/components/Select";
import { Markdown } from "@/components/Markdown";
import { ActivityLine } from "@/components/ActivityLine";
import {
  readShowEverything,
  toRows,
  useSmoothText,
  writeShowEverything,
} from "@/components/Transcript";
import { ApprovalModal } from "@/components/ApprovalModal";
import { ConfirmModal } from "@/components/ConfirmModal";
import { EditModal } from "@/components/settings/EditModal";
import type { PermissionResponse } from "@/lib/types";
import { findSkill, type SkillField, type SkillTools } from "@/lib/skills";
import { useLocale } from "@/lib/i18n/client";
import { skillDisplay } from "@/lib/i18n/skills";
import type { Messages } from "@/lib/i18n/messages";
import { FileChip } from "@/components/FileChip";
import {
  IMAGE_TYPES,
  LIMITS,
  isImageType,
  prepare,
  toAttachment,
  toMeta,
  type Draft,
} from "@/lib/attachments";

/**
 * Where the chat screen looks for the conversation to open on load. Set on the
 * way out of "Open in chat" so that screen lands on this run.
 */
const ACTIVE_KEY = "sc4sap.activeSession";

/** A blank line between two blocks of an answer that came back in pieces. */
const SEPARATOR = "\n\n";

/** What one field holds. Toggles are the only non-text control here. */
type Value = string | boolean;

/** How a run may spend — what the cost dialog collects. See `Skill.cost`. */
type Spend = { maxBudgetUsd: number; economy: boolean; model: string };

/**
 * The models the dialog offers. The same three the backend accepts; listed
 * here rather than fetched because the dialog opens before any session
 * exists to ask through, and a list of two is not worth a round trip.
 */
const MODELS: {
  id: string;
  label: string;
  /** The dictionary key for the line under the picker. */
  note: keyof Messages["skillForm"];
}[] = [
  { id: "claude-haiku-4-5", label: "Haiku 4.5", note: "haikuNote" },
  { id: "claude-sonnet-5", label: "Sonnet 5", note: "sonnetNote" },
  { id: "claude-opus-5", label: "Opus 5", note: "opusNote" },
];

function initial(fields: readonly SkillField[]): Record<string, Value> {
  const state: Record<string, Value> = {};
  for (const field of fields) {
    // A select opens on its first option rather than on nothing: every one of
    // these lists starts with the answer most runs want.
    state[field.label] =
      field.kind === "toggle"
        ? false
        : field.kind === "select"
          ? (field.options?.[0] ?? "")
          : "";
  }
  return state;
}

/**
 * The prompt the run actually sends.
 *
 * The slash command first, because that is what selects the skill; the answers
 * after it as `Label: value` lines, which is the shape the skills' own intake
 * steps read. Blank fields are dropped rather than sent empty — an optional
 * package left alone should look like it was not given, not like it was given
 * as nothing — and a toggle only appears when it is on, for the same reason.
 */
function composePrompt(
  command: string,
  fields: readonly SkillField[],
  values: Record<string, Value>,
  /**
   * Something the run should start from that no field asked for: what the
   * dashboard's Reconnect found, handed to the doctor. Goes after the fields
   * as its own paragraph, which is where a skill reading `{{ARGUMENTS}}` finds
   * it.
   */
  context: string | null = null,
): string {
  const lines: string[] = [];
  for (const field of fields) {
    const value = values[field.label];
    if (field.kind === "toggle") {
      if (value === true) lines.push(`${field.label}: yes`);
      continue;
    }
    if (typeof value === "string" && value.trim() !== "") {
      lines.push(`${field.label}: ${value.trim()}`);
    }
  }
  const parts = [command];
  if (lines.length > 0) parts.push(lines.join("\n"));
  if (context) parts.push(context);
  return parts.join("\n\n");
}

/**
 * What the conversation is called in the chat rail.
 *
 * The skill's name and the thing it was pointed at, because a rail of six runs
 * all called "Analyze Code" identifies nothing — which is what it looked like
 * before. The last short text answer is the identifying one: for a code review
 * that is the object, for a package walk it is the package, and a skill whose
 * only free text is a paragraph-long question contributes nothing and falls
 * back to its own name.
 */
function runTitle(
  title: string,
  fields: readonly SkillField[],
  values: Record<string, Value>,
): string {
  let subject = "";
  for (const field of fields) {
    if (field.kind !== "text") continue;
    const value = values[field.label];
    if (typeof value === "string" && value.trim() !== "") subject = value.trim();
  }
  return subject ? `${title} · ${subject}` : title;
}

/**
 * Where a run is remembered so leaving the page does not throw it away.
 *
 * Per skill, and in `sessionStorage` rather than `localStorage`: a run belongs
 * to the sitting someone is in the middle of, not to the browser forever.
 * What is stored is the session id — enough to re-attach to the live stream,
 * which replays everything the backend still holds — plus the finished text as
 * a fallback for when that session has since been evicted.
 */
const runKey = (slug: string): string => `sc4sap.skillRun.${slug}`;

type StoredRun = { sessionId: string; answer: string };

function readStoredRun(slug: string): StoredRun | null {
  try {
    const raw = sessionStorage.getItem(runKey(slug));
    return raw ? (JSON.parse(raw) as StoredRun) : null;
  } catch {
    // Private mode, or a value from an older shape. Neither is worth an error
    // on a screen that works perfectly well without it.
    return null;
  }
}

/**
 * Hand the report to the browser as a file.
 *
 * A blob and an anchor rather than a route that re-renders it server-side: the
 * text is already here, and asking the server for something the page is
 * holding would mean a second copy that could disagree with what is on screen.
 * The object URL is revoked on the next frame — the click has already been
 * dispatched by then, and leaving it alive pins the whole document in memory
 * for the life of the tab.
 */
function download(name: string, text: string): void {
  const url = URL.createObjectURL(
    new Blob([text], { type: "text/markdown;charset=utf-8" }),
  );
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = name;
  anchor.click();
  requestAnimationFrame(() => URL.revokeObjectURL(url));
}

/**
 * `Analyze Code` becomes `analyze-code-2026-09-06.md`.
 *
 * Dated rather than numbered: a second run of the same skill is a different
 * report of the same shape, and a name that only differs by `(1)` is one the
 * download folder assigns, not one that says which run it was.
 */
function filenameFor(title: string): string {
  const slug =
    title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "report";
  return `${slug}-${new Date().toISOString().slice(0, 10)}.md`;
}

export function SkillForm({
  slug,
  command,
  title,
  fields,
  tools,
  /** The skill cannot run here — see `blockedReason`. */
  blocked,
  autorun = null,
  cost = null,
  followUp = false,
}: {
  slug: string;
  command: string;
  title: string;
  fields: readonly SkillField[];
  /** What this skill's session may reach for — see `Skill.tools`. */
  tools: SkillTools;
  blocked: boolean;
  /**
   * Start a run the moment the page opens, with this as its context.
   *
   * From `?autorun=1&context=...` on the URL: the dashboard's Reconnect sends
   * a failed press here so the doctor starts from the finding rather than
   * from an empty form. It wins over a remembered run, since someone arriving
   * with a fresh failure wants it looked at, not last hour's report. The query
   * is stripped once read, so a reload lands on the run, not on a second one.
   */
  autorun?: { context: string } | null;
  /**
   * The run is worth a word before it starts — see `Skill.cost`. With this
   * set, the first Run opens a dialog for a budget ceiling and the Sonnet
   * switch, and the choice is kept for "Run again" on this page.
   */
  cost?: { note: string; defaultBudgetUsd: number } | null;
  /**
   * The skill answers in rounds and asks back — see `Skill.followUp`. With
   * this set, a composer sits under the result while the session is open,
   * and what is typed there goes to the same session as the next round.
   */
  followUp?: boolean;
}) {
  const router = useRouter();
  const { locale, t: messages } = useLocale();
  const t = messages.skillForm;
  /**
   * The catalog entry as the reader sees it. `title` and `fields` are the
   * English the prompt and the stored values are keyed by; this is only what
   * is drawn. The slug always resolves — this form is only ever mounted by
   * the skill page, which has already looked it up.
   */
  const shownSkill = skillDisplay(locale, findSkill(slug)!);
  const pathname = usePathname();
  const [values, setValues] = useState<Record<string, Value>>(() =>
    initial(fields),
  );
  /** The backend session this run is attached to, once it has one. */
  const [sessionId, setSessionId] = useState<string | null>(null);
  /** Opening the session and sending — before the stream can say anything. */
  const [starting, setStarting] = useState(false);
  /**
   * The text of a run this page is showing but did not stream.
   *
   * Set when a remembered session is gone from the backend — evicted, or the
   * server restarted — and the stored copy of what it said is all that is
   * left. Cleared the moment a live stream has anything of its own.
   */
  const [restored, setRestored] = useState<string | null>(null);
  /** "Done" pressed, and the dialog asking whether that is really meant. */
  const [confirmDone, setConfirmDone] = useState(false);
  /**
   * Screenshots attached to the field that takes them. One list for the
   * form: no skill has two such fields, and the prompt is one message.
   */
  const [images, setImages] = useState<Draft[]>([]);
  const [readingImages, setReadingImages] = useState(0);
  /** A file is being dragged over the image field. */
  const [dragOver, setDragOver] = useState(false);
  const imagePicker = useRef<HTMLInputElement>(null);
  /** What `persist` last wrote — see the signature it builds. */
  const written = useRef<string | null>(null);
  const [settling, setSettling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /**
   * How this page's runs may spend, once the reader has said. `null` until
   * the cost dialog has been answered — or always, on a skill without one.
   */
  const [spend, setSpend] = useState<Spend | null>(null);
  /** The cost dialog is up, and this is what it holds. */
  const [askingCost, setAskingCost] = useState(false);
  const [costForm, setCostForm] = useState<{ budget: string; model: string }>(() => ({
    budget: String(cost?.defaultBudgetUsd ?? 0),
    model: MODELS[0].id,
  }));
  /** The context a run was asked with while the cost dialog was up. */
  const pendingContext = useRef<string | null>(null);
  /** The next round's answer, as typed under the result. */
  const [reply, setReply] = useState("");
  /** The whole run, or only what each turn ended on. See `toRows`. */
  const [everything, setEverything] = useState(false);
  useEffect(() => {
    setEverything(readShowEverything());
  }, []);

  const stream = useSessionStream(sessionId);
  const approval = stream.pending[0] ?? null;

  /**
   * Pick a previous run back up.
   *
   * Re-attaching to the session is what actually restores it: the backend
   * replays everything it still holds for that id, including a turn that is
   * still going — so walking to the chat screen and back during a review lands
   * on the review still running rather than on an empty form. The stored text
   * only covers the case where that session no longer exists.
   */
  const autorunFired = useRef(false);
  useEffect(() => {
    // An autorun owns this mount: it wins over a remembered run on arrival,
    // and once the query has been stripped and the page re-rendered without
    // it, a remembered run from an earlier sitting must not come back over
    // the top of the one just started.
    if (autorun || autorunFired.current) return;
    const stored = readStoredRun(slug);
    if (!stored) return;

    // Ask whether the session is still there before attaching to it. The
    // backend restarts; a remembered run whose session is gone and whose
    // answer was never stored is nothing — and attaching to it drew a result
    // panel with dots that never stopped, over a form that could not be run
    // again without pressing Done first.
    let cancelled = false;
    void api
      .getSession(stored.sessionId)
      .then(() => {
        if (!cancelled) setSessionId(stored.sessionId);
      })
      .catch(() => {
        if (cancelled) return;
        if (stored.answer) {
          setSessionId(stored.sessionId);
          setRestored(stored.answer);
        } else {
          try {
            sessionStorage.removeItem(runKey(slug));
          } catch {
            // Storage refused; the run will be asked about again next visit.
          }
        }
      });
    return () => {
      cancelled = true;
    };
  }, [slug, autorun]);

  /**
   * The run the URL asked for. Once, on arrival, and the URL is rewritten
   * without the query in the same breath so that nothing re-reads it: not a
   * reload, not the back button, not a second mount of this component.
   */
  useEffect(() => {
    if (!autorun || autorunFired.current) return;
    autorunFired.current = true;
    router.replace(pathname);
    start(autorun.context);
    // `run` closes over the form's state, and this is meant to fire exactly
    // once with whatever that state is on arrival.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autorun]);

  /**
   * The turn is running. `starting` covers the gap before the backend has said
   * anything at all, which is otherwise a stretch with no session, no status
   * and nothing on screen.
   */
  const running = starting || stream.status === "busy";
  /**
   * A run is on this page — going, or finished and still showing.
   *
   * The form is frozen for both. While it runs, because changing an answer
   * under a request already sent is a lie about what produced the result;
   * after it, because the answers on screen are the caption on the report
   * below them. "New run" is what unfreezes it.
   */
  const started = sessionId !== null;
  const settled = started && !running;

  const set = (label: string, value: Value): void =>
    setValues((current) => ({ ...current, [label]: value }));

  /**
   * Reads chosen files into image chips — images only, whatever the source.
   * The chat composer takes any file the model reads; this field is for a
   * picture of an error, and a PDF dropped on it is refused with the reason.
   */
  const imagesRef = useRef<Draft[]>([]);
  useEffect(() => {
    imagesRef.current = images;
  }, [images]);

  const addImages = async (chosen: Iterable<File>): Promise<void> => {
    const list = [...chosen];
    if (list.length === 0) return;
    setReadingImages(list.length);
    try {
      for (const file of list) {
        if (!isImageType(file.type)) {
          setError(t.onlyImages(file.name));
          continue;
        }
        const result = await prepare(file, imagesRef.current);
        if (!result.ok) {
          setError(result.error);
          continue;
        }
        const next = [...imagesRef.current, result.draft];
        imagesRef.current = next;
        setImages(next);
      }
    } finally {
      setReadingImages(0);
    }
  };

  const removeImage = (id: string): void => {
    setImages((current) => {
      const gone = current.find((file) => file.id === id);
      if (gone?.preview) URL.revokeObjectURL(gone.preview);
      return current.filter((file) => file.id !== id);
    });
  };

  /** Files from a paste or a drop, or nothing if there were none. */
  const filesFrom = (transfer: DataTransfer | null): File[] =>
    transfer
      ? [...transfer.items]
          .filter((item) => item.kind === "file")
          .map((item) => item.getAsFile())
          .filter((file): file is File => file !== null)
      : [];

  const rows = toRows(stream.items, { everything });

  /**
   * The run, as one document.
   *
   * Every agent row joined, and only those: the prompt is upstairs in the form
   * that composed it, and repeating it at the top of its own answer is the
   * transcript's convention, not a document's. `toRows` has already folded the
   * assistant messages of one turn together, so this is usually a single
   * entry — the join is for a run that came back in more than one.
   */
  // On a skill that asks back, what the reader answered is part of the
  // record too — quoted, so the report reads as a report with the reader's
  // replies set off from it, not as a transcript. The first user row is the
  // prompt the form composed, and stays out as before.
  const firstUser = rows.findIndex((row) => row.kind === "user");
  const streamed = rows
    .filter(
      (row, index) =>
        row.kind === "agent" || (followUp && row.kind === "user" && index > firstUser),
    )
    .map((row) =>
      row.kind === "user" ? `> **You:** ${row.text.trim().replace(/\n/g, "\n> ")}` : row.text,
    )
    .join(SEPARATOR);
  // The live stream wins the moment it has anything; the stored copy is only
  // for a session the backend no longer has.
  const answer = streamed || restored || "";

  const lastAgent = [...rows].reverse().find((row) => row.kind === "agent");
  /**
   * Paced the same way the transcript paces its own, so a report does not
   * arrive as a series of slabs. Keyed on the row that is still open; a run
   * that has finished is shown whole.
   */
  const paced = useSmoothText(
    answer,
    lastAgent?.id ?? null,
    lastAgent?.kind === "agent" ? lastAgent.streaming : false,
  );

  // Anything the run said that was not the answer — "Stopped.", a disconnect.
  const notices = rows.filter((row) => row.kind === "notice");

  /**
   * Everything that arrived is also on screen.
   *
   * The turn ending is not the same moment as the report finishing: the
   * document is paced out a character at a time, so for a few seconds after
   * the backend goes idle there is still text being written. Clearing the page
   * then would take the last paragraph away as it was being read.
   */
  const drawn = answer.trim() !== "" && paced.length >= answer.length;

  /**
   * Write the run to the account's conversations when it settles.
   *
   * The same rows the transcript draws, keyed by position and upserted, so
   * running this repeatedly is safe: a turn whose text grew as it streamed is
   * corrected rather than duplicated. The chat id is the backend session id,
   * which is what the chat screen uses for a conversation it opened itself.
   */
  const persist = useCallback(async (): Promise<void> => {
    if (!sessionId) return;
    const saved = toRows(stream.items).filter(
      (row) => row.kind !== "notice" && row.text.trim() !== "",
    );
    if (saved.length === 0) return;

    // The same guard the chat screen needs, for the same reason: this callback
    // is rebuilt whenever the stream moves, and the effect that runs it lists
    // it as a dependency. Without a record of what was last written, a settled
    // run re-saves itself for as long as the page is open.
    const signature = `${sessionId}|${saved.length}|${saved.reduce(
      (total, row) => total + row.text.length,
      0,
    )}`;
    if (signature === written.current) return;
    written.current = signature;

    try {
      await api.saveTurns(sessionId, {
        // Named for the skill *and* what it was pointed at. The prompt's first
        // line is a slash command, which makes a poor label in a rail — and so
        // does the skill's name on its own once there are six of them.
        title: runTitle(shownSkill.title, fields, values),
        sdkSessionId: null,
        messages: saved.map((row, index) => ({
          seq: index,
          role: row.kind === "user" ? ("user" as const) : ("agent" as const),
          text: row.text,
          ...(row.kind === "user" && row.attachments
            ? { attachments: row.attachments }
            : {}),
        })),
      });
    } catch (err) {
      setError((err as Error).message);
    }
  }, [sessionId, stream.items, title, fields, values]);

  /**
   * On the transition into idle, not on every render that finds it there —
   * `persist` is rebuilt whenever the stream moves, and an effect that lists
   * it re-runs each time. See the same guard on the chat screen.
   */
  const wasIdle = useRef(false);
  useEffect(() => {
    const settled = stream.status === "idle";
    const arrived = settled && !wasIdle.current;
    wasIdle.current = settled;
    if (arrived) void persist();
  }, [stream.status, persist]);

  /**
   * Remember the run so leaving this page and coming back does not lose it.
   *
   * Written as it goes rather than only when it settles: the reason to leave
   * mid-run is usually to look at something else while it works, and that is
   * exactly the moment there would be nothing stored yet.
   */
  useEffect(() => {
    if (!sessionId) return;
    try {
      sessionStorage.setItem(
        runKey(slug),
        JSON.stringify({ sessionId, answer: streamed } satisfies StoredRun),
      );
    } catch {
      // Storage refused. The run still works; only the return trip is poorer.
    }
  }, [slug, sessionId, streamed]);

  // The backend has taken the prompt, so its own status carries the screen.
  useEffect(() => {
    if (stream.status !== null) setStarting(false);
  }, [stream.status]);

  const result = useRef<HTMLDivElement>(null);

  /**
   * Put the page back to a blank form.
   *
   * The session is left alone rather than closed: it is stored as a
   * conversation by now, and the chat screen can pick it up. What is being
   * ended is this page's involvement, not the run.
   */
  /** What this run was pointed at, for the dialog to name. */
  const subject = runTitle(shownSkill.title, fields, values);

  function reset(): void {
    setConfirmDone(false);
    written.current = null;
    for (const file of imagesRef.current) {
      if (file.preview) URL.revokeObjectURL(file.preview);
    }
    setImages([]);
    setSessionId(null);
    setRestored(null);
    setError(null);
    try {
      sessionStorage.removeItem(runKey(slug));
    } catch {
      // Nothing to clear, or storage refused. Either way the page is clear.
    }
  }

  /**
   * Run, or ask first.
   *
   * On a skill with a cost note the first press opens the dialog and the
   * run starts from its Run button, with what was chosen there. Later
   * presses on this page reuse the choice: the question was about this
   * skill on this system, and it has been answered.
   */
  function start(context: string | null = null): void {
    if (running || blocked) return;
    if (cost && !spend) {
      pendingContext.current = context;
      setAskingCost(true);
      return;
    }
    void run(context, spend);
  }

  async function run(context: string | null, how: Spend | null): Promise<void> {
    if (running || blocked) return;
    setStarting(true);
    setError(null);
    try {
      // Each skill says what it needs; none of them gets everything by
      // default. `analyse` keeps the specialist dispatch and the web lookup
      // and takes the shell and file writes away, which is what a read-only
      // investigation like `analyze-symptom` actually runs on — its own
      // prompt forbids filesystem search, and a logged run spent four minutes
      // doing it anyway because `Bash` was in reach. See `Skill.tools`.
      const session = await api.createSession(undefined, undefined, {
        ...(how ?? {}),
        profile: tools,
      });
      setSessionId(session.id);
      await api.sendMessage(
        session.id,
        composePrompt(command, fields, values, context),
        null,
        images.map(toAttachment),
      );
      // After the panel exists, so there is something to be carried to.
      requestAnimationFrame(() =>
        result.current?.scrollIntoView({ block: "start", behavior: "smooth" }),
      );
    } catch (err) {
      setError((err as Error).message);
      setStarting(false);
    }
  }

  async function stop(): Promise<void> {
    if (!sessionId) return;
    setStarting(false);
    try {
      await api.stopSession(sessionId);
    } catch {
      // The only way this fails on a run that was going a moment ago is that
      // it finished first, which is not worth interrupting anyone with.
    }
  }

  /**
   * Answer the report's questions, in the same session.
   *
   * The skill's next round is one more turn of the conversation this run
   * already is, so this is `sendMessage` on the session the form holds — the
   * same call the chat screen makes — and the answer lands in the same
   * result box, under a line quoting what was said.
   */
  async function sendReply(): Promise<void> {
    const text = reply.trim();
    if (!sessionId || running || text === "") return;
    setStarting(true);
    setError(null);
    try {
      await api.sendMessage(sessionId, text);
      setReply("");
    } catch (err) {
      setError((err as Error).message);
      setStarting(false);
    }
  }

  async function settle(response: PermissionResponse): Promise<void> {
    if (!sessionId || !approval) return;
    setSettling(true);
    try {
      await api.respondToPermission(sessionId, approval.reqId, response);
      // The dialog closes on `permission_resolved`, not here — the backend
      // deciding it was settled is what makes it settled.
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSettling(false);
    }
  }

  /**
   * Allow this one and stop asking about SAP reads for the rest of the run.
   *
   * Worth more here than in chat: a skill run is the case that raises the most
   * prompts — `analyze-code` walks a program's includes before it has anything
   * to say — and this screen is watched rather than worked in.
   *
   * The switch is set before the request is settled so the calls queued behind
   * it meet a session that no longer asks.
   */
  async function allowAllSapReads(): Promise<void> {
    if (!sessionId || !approval) return;
    setSettling(true);
    try {
      await api.setAutoApprove(sessionId, true);
      await api.respondToPermission(sessionId, approval.reqId, {
        behavior: "allow",
      });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSettling(false);
    }
  }

  /**
   * Hand the conversation over to the chat screen.
   *
   * The run is already stored, so this only has to say which one to open. It
   * is written before navigating rather than passed as a query parameter,
   * because that screen already reads this key on load and adding a second
   * route into the same decision would mean two of them to keep in step.
   */
  function openInChat(): void {
    if (!sessionId) return;
    void persist().then(() => {
      try {
        localStorage.setItem(ACTIVE_KEY, sessionId);
      } catch {
        // Private mode, or storage refused. The chat screen opens on whatever
        // it was last on, which is worse than intended and not broken.
      }
      router.push("/chat");
    });
  }

  return (
    <>
      <div className="fields">
        {fields.map((field, index) => {
          const value = values[field.label];
          const id = `skill-field-${index}`;
          const shown = shownSkill.field(field);

          /**
           * A yes-or-no is one line, not two.
           *
           * Every other field is a label with an answer under it, and a toggle
           * built that way ends up with the question in small caps above a box
           * reading "Off" — the same thing said twice, in a frame as heavy as
           * the inputs beside it. The label of a toggle already is the
           * question, so the box goes and the tick sits against the words.
           */
          if (field.kind === "toggle") {
            return (
              <label className="field field-switch" key={field.label}>
                <input
                  type="checkbox"
                  checked={value === true}
                  disabled={started}
                  onChange={(event) => set(field.label, event.target.checked)}
                />
                <span className="field-switch-main">
                  <span className="field-switch-label">{shown.label}</span>
                  {shown.hint && (
                    <span className="field-hint">{shown.hint}</span>
                  )}
                </span>
              </label>
            );
          }

          const control = (): React.ReactNode => {
            switch (field.kind) {
              case "textarea": {
                const area = (
                  <textarea
                    rows={4}
                    placeholder={shown.placeholder}
                    value={typeof value === "string" ? value : ""}
                    disabled={started}
                    onChange={(event) => set(field.label, event.target.value)}
                    // A screenshot on the clipboard lands as an image; text
                    // pastes as text, untouched.
                    onPaste={
                      field.images && !started
                        ? (event) => {
                            const pasted = filesFrom(event.clipboardData);
                            if (pasted.length === 0) return;
                            event.preventDefault();
                            void addImages(pasted);
                          }
                        : undefined
                    }
                  />
                );
                if (!field.images) return area;

                /**
                 * The textarea in a frame that takes drops, with the chips
                 * and an add button under it. The frame is the drop target
                 * rather than the whole window: this page is a form, and a
                 * screenshot belongs to this one question on it.
                 */
                const full = images.length >= LIMITS.maxFiles;
                return (
                  <div
                    className={`field-images${dragOver ? " is-over" : ""}${started ? " is-locked" : ""}`}
                    onDragOver={(event) => {
                      if (started) return;
                      if (![...event.dataTransfer.types].includes("Files")) return;
                      event.preventDefault();
                      event.stopPropagation();
                      event.dataTransfer.dropEffect = "copy";
                      setDragOver(true);
                    }}
                    onDragLeave={(event) => {
                      if (event.currentTarget.contains(event.relatedTarget as Node)) return;
                      setDragOver(false);
                    }}
                    onDrop={(event) => {
                      setDragOver(false);
                      if (started) return;
                      const dropped = filesFrom(event.dataTransfer);
                      if (dropped.length === 0) return;
                      event.preventDefault();
                      event.stopPropagation();
                      void addImages(dropped);
                    }}
                  >
                    {area}
                    <div className="field-images-foot">
                      {images.map((file) => (
                        <FileChip
                          key={file.id}
                          file={toMeta(file)}
                          preview={file.preview}
                          onRemove={started ? undefined : () => removeImage(file.id)}
                        />
                      ))}
                      {Array.from({ length: readingImages }, (_, at) => (
                        <span key={`reading-${at}`} className="file-chip is-reading">
                          <span className="file-chip-glyph">
                            <Icon name="circle-notch" />
                          </span>
                          <span className="file-chip-name">{t.reading}</span>
                        </span>
                      ))}
                      {!started && (
                        <>
                          <input
                            ref={imagePicker}
                            type="file"
                            multiple
                            accept={IMAGE_TYPES.join(",")}
                            hidden
                            onChange={(event) => {
                              const chosen = event.target.files;
                              if (chosen) void addImages(chosen);
                              event.target.value = "";
                            }}
                          />
                          <button
                            type="button"
                            className="field-images-add"
                            disabled={full}
                            onClick={() => imagePicker.current?.click()}
                            title={
                              full ? t.atMostImages(LIMITS.maxFiles) : t.addScreenshotTitle
                            }
                          >
                            <Icon name="image" />
                            {images.length === 0 ? t.addScreenshot : t.addAnother}
                          </button>
                        </>
                      )}
                    </div>
                    {dragOver && (
                      <div className="field-images-veil" aria-hidden>
                        <Icon name="upload-simple" /> {t.dropScreenshot}
                      </div>
                    )}
                  </div>
                );
              }
              case "select":
                return (
                  <Select
                    labelledBy={id}
                    value={typeof value === "string" ? value : ""}
                    options={shown.options}
                    disabled={started}
                    onChange={(next) => set(field.label, next)}
                  />
                );
              default:
                return (
                  <input
                    type="text"
                    placeholder={shown.placeholder}
                    value={typeof value === "string" ? value : ""}
                    disabled={started}
                    onChange={(event) => set(field.label, event.target.value)}
                    spellCheck={false}
                  />
                );
            }
          };

          // A `<label>` wraps its control, which is what a select built from
          // buttons cannot be inside — clicking the label would open the list
          // rather than focus it. Those get a plain element and an id the
          // control points at instead.
          const Tag = field.kind === "select" ? "div" : "label";

          return (
            <Tag className={`field field-${field.kind}`} key={field.label}>
              <span className="field-label" id={id}>
                {shown.label}
              </span>
              {control()}
              {shown.hint && <span className="field-hint">{shown.hint}</span>}
            </Tag>
          );
        })}
      </div>

      <div className="panel-actions">
        {error && <p className="field-error skill-error">{error}</p>}

        {running ? (
          <button className="primary" onClick={() => void stop()}>
            <Icon name="stop" weight="fill" /> {t.stop}
          </button>
        ) : (
          <button
            className="primary"
            onClick={() => start()}
            disabled={blocked}
            title={blocked ? t.cannotRunHere : undefined}
          >
            {settled ? t.runAgain : t.run}
          </button>
        )}

        {/* What the runs on this page are allowed to spend, once chosen. A
            line rather than a badge: it is a fact about the next press. */}
        {spend && (
          <span className="skill-spend">
            {MODELS.find((entry) => entry.id === spend.model)?.label ?? spend.model}
            {spend.maxBudgetUsd > 0 ? t.upTo(spend.maxBudgetUsd.toFixed(2)) : t.noCeiling}
          </span>
        )}

        {/* After Run again, not before it: the two are the ends of the same
            decision — go round once more, or put this away — and the one that
            continues the work reads first.

            Held shut until the report has finished drawing itself. Clearing
            the page while the last paragraph is still appearing takes it away
            from someone in the middle of reading it. */}
        {settled && (
          <button
            className="ghost skill-done"
            onClick={() => setConfirmDone(true)}
            disabled={!drawn}
            title={drawn ? undefined : t.waitForReport}
          >
            {t.done}
          </button>
        )}
      </div>

      {started && (
        <section className="panel skill-result rise" ref={result}>
          <div className="panel-head panel-head-row">
            <h2>{t.result}</h2>
            {/* Only once there is something to carry over. Before the first
                answer there is no conversation to open, just an empty one. */}
            {answer.trim() !== "" && (
              <button className="ghost skill-continue" onClick={openInChat}>
                <Icon name="chat-teardrop-text" /> {t.continueInChat}
              </button>
            )}
          </div>

          {paced.trim() === "" ? (
            // Nothing to read yet. The same line the chat draws while it
            // waits — what is happening, for how long, and what has been done
            // — rather than a spinner of this screen's own. Before the
            // session exists there is no stream to say anything, so the
            // placeholder does.
            <p className="skill-doc-wait">
              <ActivityLine
                activity={stream.activity}
                items={stream.items}
                placeholder={t.working}
              />
            </p>
          ) : (
            <div className="skill-doc-box">
              {/* A bar over the document rather than a button floating beside
                  it: the box is the artefact, and what can be done to it
                  belongs on its own edge, not on the panel that happens to
                  contain it. */}
              <div className="skill-doc-bar">
                <span className="skill-doc-kind">Markdown</span>
                <button
                  type="button"
                  className={`ghost skill-doc-everything${everything ? " is-on" : ""}`}
                  aria-pressed={everything}
                  title={everything ? t.showingEverythingReport : t.showingReportOnly}
                  onClick={() => {
                    const next = !everything;
                    setEverything(next);
                    writeShowEverything(next);
                  }}
                >
                  {everything ? t.everything : t.finalOnly}
                </button>
                {/* Not while the run is going. A half-written report saved to
                    disk is indistinguishable from a whole one afterwards, and
                    the file is the thing people forward. */}
                <button
                  className="ghost skill-doc-save"
                  onClick={() => download(filenameFor(title), answer)}
                  disabled={running}
                  // The full answer, not the paced one — what is saved is the
                  // report, not how much of it has been typed out so far.
                  title={running ? t.availableWhenDone : t.saveReport}
                >
                  <Icon name="download-simple" /> {t.downloadMd}
                </button>
              </div>

              <div className="skill-doc">
                <Markdown>{paced}</Markdown>
                {/* The turn is still going — a tool is running, or more of the
                    report is on its way. Under the document rather than inside
                    it, because it is not part of what was written. */}
                {running && (
                  <span className="skill-doc-more">
                    <ActivityLine
                      activity={stream.activity}
                      items={stream.items}
                      placeholder={t.working}
                    />
                  </span>
                )}
              </div>
            </div>
          )}

          {notices.map((notice) => (
            <p className="skill-doc-notice" key={notice.id}>
              {notice.text}
            </p>
          ))}

          {/* The next round. Only once there is a report to answer, and only
              while the session is there to answer to — a restored run whose
              session is gone has "Continue in chat" for that. */}
          {followUp && settled && answer.trim() !== "" && !restored && (
            <div className="skill-reply">
              <textarea
                className="skill-reply-text"
                rows={2}
                value={reply}
                placeholder={t.replyPlaceholder}
                onChange={(event) => setReply(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    void sendReply();
                  }
                }}
              />
              <button
                className="primary skill-reply-send"
                onClick={() => void sendReply()}
                disabled={reply.trim() === ""}
              >
                <Icon name="paper-plane-tilt" /> {t.reply}
              </button>
            </div>
          )}
        </section>
      )}

      {askingCost && cost && (
        <EditModal
          kind={t.costKind}
          heading={t.runQuestion(shownSkill.title)}
          description={shownSkill.costNote ?? cost.note}
          submitLabel={t.run}
          disabled={!Number.isFinite(Number(costForm.budget)) || Number(costForm.budget) < 0}
          onSubmit={() => {
            const chosen: Spend = {
              maxBudgetUsd: Math.max(0, Number(costForm.budget) || 0),
              model: costForm.model,
              // On Sonnet the whole run stays on Sonnet, reviewers included,
              // whatever the skill asks for. On Opus the skill gets what it
              // asked for.
              economy: !/opus/i.test(costForm.model),
            };
            setSpend(chosen);
            setAskingCost(false);
            void run(pendingContext.current, chosen);
            pendingContext.current = null;
          }}
          onCancel={() => {
            setAskingCost(false);
            pendingContext.current = null;
          }}
        >
          <div className="field">
            <span className="field-label" id="cost-model-label">
              {t.model}
            </span>
            <Select
              name="model"
              labelledBy="cost-model-label"
              value={costForm.model}
              options={MODELS.map((entry) => ({ value: entry.id, label: entry.label }))}
              onChange={(next) => setCostForm((current) => ({ ...current, model: next }))}
            />
            <span className="field-hint">
              {t[MODELS.find((entry) => entry.id === costForm.model)!.note] as string}{" "}
              {t.modelHint}
            </span>
          </div>

          <label className="field">
            <span className="field-label">{t.budget}</span>
            <input
              type="text"
              inputMode="decimal"
              value={costForm.budget}
              onChange={(event) =>
                setCostForm((current) => ({ ...current, budget: event.target.value }))
              }
              className={
                !Number.isFinite(Number(costForm.budget)) || Number(costForm.budget) < 0
                  ? "is-invalid"
                  : undefined
              }
            />
            <span className="field-hint">{t.budgetHint}</span>
          </label>
        </EditModal>
      )}

      {confirmDone && (
        <ConfirmModal
          kind={t.runKind}
          heading={t.closeQuestion(subject)}
          description={t.closeBody}
          confirmLabel={t.closeIt}
          confirmIcon="check"
          onConfirm={reset}
          onCancel={() => setConfirmDone(false)}
        />
      )}

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
    </>
  );
}
