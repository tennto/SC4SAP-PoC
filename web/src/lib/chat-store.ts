import "server-only";
import { ObjectId } from "mongodb";
import { inferKind } from "@/lib/chat-kind";
import { chatMessages, chats, projects, runSpend, spendMonths, users, type ChatDoc } from "@/lib/mongo";

/**
 * Persisting the conversation the reader can see.
 *
 * The backend keeps sessions in memory and evicts them; this is what survives
 * a sign-out, a server restart, and a different machine. Only what the
 * transcript draws is written — see `ChatMessageDoc` for why tool results are
 * deliberately not.
 */

/**
 * One message's ceiling. A runaway answer should cost one truncated row, not
 * a collection. Generous enough that no real answer reaches it: a long report
 * with tables runs to about a third of this.
 */
const MAX_TEXT = 64 * 1024;

/** How much prior conversation a revived chat carries back to the model. */
const CONTEXT_BUDGET = 24 * 1024;

export type ChatSummary = {
  id: string;
  title: string | null;
  sdkSessionId: string | null;
  turns: number;
  totalCostUsd: number;
  createdAt: string;
  updatedAt: string;
  kind: "chat" | "task";
  projectId: string | null;
  /** Pinned to the top of the rail; ISO time it was pinned, or null. */
  pinnedAt: string | null;
};

export type ProjectSummary = { id: string; name: string; createdAt: string };

export type AttachmentMeta = { name: string; mediaType: string; size: number };

export type ChatMessage = {
  seq: number;
  role: "user" | "agent";
  text: string;
  at: string;
  attachments?: AttachmentMeta[];
};

function summarize(doc: ChatDoc): ChatSummary {
  return {
    id: doc._id,
    title: doc.title,
    sdkSessionId: doc.sdkSessionId,
    turns: doc.turns,
    totalCostUsd: doc.totalCostUsd,
    // Rows written before `createdAt` existed fall back to their last write.
    createdAt: (doc.createdAt ?? doc.updatedAt).toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
    kind: doc.kind ?? inferKind(doc.title),
    projectId: doc.projectId ?? null,
    pinnedAt: doc.pinnedAt ? doc.pinnedAt.toISOString() : null,
  };
}


/**
 * The rail, for one account. Newest conversation first — by when it was
 * started, not last touched.
 *
 * It used to be most-recently-used, and that moved rows under the reader's
 * hand: opening a conversation writes it, so the one just clicked jumped to
 * the top and the one they meant to open next was somewhere else. A list
 * whose order is fixed at creation is one the eye can learn.
 */
export async function listChats(userId: string): Promise<ChatSummary[]> {
  const rows = await (await chats())
    .find({ userId })
    .sort({ createdAt: -1, updatedAt: -1 })
    .limit(200)
    .toArray();
  return rows.map(summarize);
}

export async function readChat(
  userId: string,
  chatId: string,
): Promise<{ chat: ChatSummary; messages: ChatMessage[] } | null> {
  const doc = await (await chats()).findOne({ _id: chatId, userId });
  if (!doc) return null;

  const rows = await (await chatMessages())
    .find({ chatId, userId })
    .sort({ seq: 1 })
    .toArray();

  return {
    chat: summarize(doc),
    messages: rows.map((row) => ({
      seq: row.seq,
      role: row.role,
      text: row.text,
      at: row.at.toISOString(),
      ...(row.attachments && row.attachments.length > 0
        ? { attachments: row.attachments }
        : {}),
    })),
  };
}

/**
 * Appends turns to a chat, creating it on the first one.
 *
 * Idempotent by `(chatId, seq)`: the client numbers its own turns, so a retry
 * after a dropped response rewrites the same row instead of adding a second
 * copy of the same answer.
 */
export async function appendTurns(
  userId: string,
  chatId: string,
  input: {
    title?: string | null;
    sdkSessionId?: string | null;
    turns?: number;
    totalCostUsd?: number;
    /** Fixed when the row is created; later saves cannot change it. */
    kind?: "chat" | "task";
    /** Where a new conversation is filed — a chat started inside a project. */
    projectId?: string | null;
    messages: {
      seq: number;
      role: "user" | "agent";
      text: string;
      attachments?: AttachmentMeta[];
    }[];
  },
): Promise<void> {
  const now = new Date();

  // Before the write, so the seed reads the chat rows as they were and this
  // save's own cost is added once, below, rather than also by the seed.
  await ensureSpendSeeded(userId);

  const before = await (await chats()).findOneAndUpdate(
    { _id: chatId, userId },
    {
      $set: {
        updatedAt: now,
        // Only overwrite what the caller actually knows. A send knows the
        // title; only the end of a turn knows the cost.
        ...(input.title !== undefined && input.title !== null
          ? { title: input.title }
          : {}),
        ...(input.sdkSessionId ? { sdkSessionId: input.sdkSessionId } : {}),
        ...(input.turns !== undefined ? { turns: input.turns } : {}),
        ...(input.totalCostUsd !== undefined
          ? { totalCostUsd: input.totalCostUsd }
          : {}),
      },
      $setOnInsert: {
        userId,
        createdAt: now,
        kind: input.kind ?? "chat",
        projectId: input.projectId ?? null,
        ...(input.title === undefined || input.title === null
          ? { title: null }
          : {}),
        ...(input.sdkSessionId ? {} : { sdkSessionId: null }),
        ...(input.turns === undefined ? { turns: 0 } : {}),
        ...(input.totalCostUsd === undefined ? { totalCostUsd: 0 } : {}),
      },
    },
    {
      upsert: true,
      returnDocument: "before",
      projection: { turns: 1, totalCostUsd: 1 },
    },
  );

  // What this save newly cost goes to this month. Only ever upward: a total
  // that comes back lower is a session that lost its prior figure, not money
  // returned.
  const costDelta =
    input.totalCostUsd !== undefined
      ? input.totalCostUsd - (before?.totalCostUsd ?? 0)
      : 0;
  const turnDelta =
    input.turns !== undefined ? input.turns - (before?.turns ?? 0) : 0;
  const started = before === null;
  if (costDelta > 0 || turnDelta > 0 || started) {
    await addSpend(userId, monthKey(now), {
      costUsd: Math.max(0, costDelta),
      turns: Math.max(0, turnDelta),
      chats: started ? 1 : 0,
    });
  }

  if (input.messages.length === 0) return;

  await (await chatMessages()).bulkWrite(
    input.messages.map((message) => {
      const text = message.text.slice(0, MAX_TEXT);
      return {
        updateOne: {
          filter: { chatId, seq: message.seq },
          update: {
            $set: {
              userId,
              role: message.role,
              text,
              at: now,
              ...(text.length < message.text.length
                ? { truncated: true }
                : {}),
              ...(message.attachments && message.attachments.length > 0
                ? { attachments: message.attachments }
                : {}),
            },
          },
          upsert: true,
        },
      };
    }),
    { ordered: false },
  );
}

export async function deleteChat(
  userId: string,
  chatId: string,
): Promise<void> {
  /**
   * Read the totals before the row goes, and fold them into the account's
   * retired counters.
   *
   * Read-then-write rather than one atomic step, and that is a real if small
   * race: two tabs deleting the same chat at once could both read it and both
   * add it. The alternative is keeping the row and marking it deleted, which
   * means every read in the app grows a filter it must not forget — a worse
   * trade for a number that is reported to one person about their own use.
   */
  const doc = await (await chats()).findOne(
    { _id: chatId, userId },
    { projection: { turns: 1, totalCostUsd: 1 } },
  );

  await (await chats()).deleteOne({ _id: chatId, userId });
  await (await chatMessages()).deleteMany({ chatId, userId });

  // Nothing found means nothing to retire — someone else deleted it first.
  if (!doc || !ObjectId.isValid(userId)) return;

  await (await users()).updateOne(
    { _id: new ObjectId(userId) },
    {
      $inc: {
        "retired.chats": 1,
        "retired.turns": doc.turns,
        "retired.costUsd": doc.totalCostUsd,
      },
    },
  );
}

/**
 * Conversations whose title or any saved message contains `query`, with the
 * text around the first hit in the messages — View all's search.
 *
 * A case-insensitive substring match rather than a text index: one account's
 * history is small, and a text index would stem and tokenise the SAP names
 * (ZMMR00020, EKKO-EBELN) people actually search for.
 */
export async function searchChats(
  userId: string,
  query: string,
): Promise<{ id: string; snippet: string | null }[]> {
  const needle = query.trim().slice(0, 100);
  if (needle === "") return [];
  const pattern = new RegExp(needle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");

  const byTitle = await (await chats())
    .find({ userId, title: pattern }, { projection: { _id: 1 } })
    .limit(200)
    .toArray();
  const byText = await (await chatMessages())
    .aggregate<{ _id: string; text: string }>([
      { $match: { userId, text: pattern } },
      { $sort: { seq: 1 } },
      { $group: { _id: "$chatId", text: { $first: "$text" } } },
      { $limit: 200 },
    ])
    .toArray();

  const found = new Map<string, string | null>();
  for (const row of byText) found.set(row._id, excerpt(row.text, pattern));
  for (const row of byTitle) if (!found.has(row._id)) found.set(row._id, null);
  return [...found].map(([id, snippet]) => ({ id, snippet }));
}

/** About a line of text around the first match, on word-ish edges. */
function excerpt(text: string, pattern: RegExp): string {
  const flat = text.replace(/\s+/g, " ");
  const at = flat.search(pattern);
  if (at < 0) return flat.slice(0, 120);
  const start = Math.max(0, at - 50);
  const end = Math.min(flat.length, at + 90);
  return `${start > 0 ? "…" : ""}${flat.slice(start, end).trim()}${end < flat.length ? "…" : ""}`;
}

/**
 * Renames a conversation or files it under a project — the rail's row menu.
 * `projectId: null` takes it out of its project. A project id that is not
 * this account's is refused rather than stored.
 */
export async function updateChat(
  userId: string,
  chatId: string,
  change: { title?: string; projectId?: string | null; pinned?: boolean },
): Promise<boolean> {
  const set: Partial<ChatDoc> = {};
  if (change.pinned !== undefined) set.pinnedAt = change.pinned ? new Date() : null;
  if (typeof change.title === "string" && change.title.trim() !== "") {
    set.title = change.title.trim().slice(0, 200);
  }
  if (change.projectId !== undefined) {
    if (change.projectId !== null && !(await ownsProject(userId, change.projectId))) {
      return false;
    }
    set.projectId = change.projectId;
  }
  if (Object.keys(set).length === 0) return true;
  const result = await (await chats()).updateOne({ _id: chatId, userId }, { $set: set });
  return result.matchedCount === 1;
}

async function ownsProject(userId: string, projectId: string): Promise<boolean> {
  if (!ObjectId.isValid(projectId)) return false;
  return (await (await projects()).countDocuments({ _id: new ObjectId(projectId), userId })) === 1;
}

/** One account's projects, oldest first — the order they were made in. */
export async function listProjects(userId: string): Promise<ProjectSummary[]> {
  const rows = await (await projects()).find({ userId }).sort({ createdAt: 1 }).limit(100).toArray();
  return rows.map((row) => ({
    id: row._id.toHexString(),
    name: row.name,
    createdAt: row.createdAt.toISOString(),
  }));
}

export async function createProject(userId: string, name: string): Promise<ProjectSummary> {
  const doc = { _id: new ObjectId(), userId, name: name.trim().slice(0, 80), createdAt: new Date() };
  await (await projects()).insertOne(doc);
  return { id: doc._id.toHexString(), name: doc.name, createdAt: doc.createdAt.toISOString() };
}

export async function renameProject(userId: string, projectId: string, name: string): Promise<boolean> {
  if (!ObjectId.isValid(projectId)) return false;
  const result = await (await projects()).updateOne(
    { _id: new ObjectId(projectId), userId },
    { $set: { name: name.trim().slice(0, 80) } },
  );
  return result.matchedCount === 1;
}

/**
 * Deletes a project and unfiles its conversations. The conversations stay:
 * a project is a label on them, and taking the label away is not a reason to
 * lose what was said.
 */
export async function deleteProject(userId: string, projectId: string): Promise<void> {
  if (!ObjectId.isValid(projectId)) return;
  await (await projects()).deleteOne({ _id: new ObjectId(projectId), userId });
  await (await chats()).updateMany({ userId, projectId }, { $set: { projectId: null } });
}

/**
 * The prior conversation, as a preamble for a chat whose backend session is
 * gone.
 *
 * The SDK's own `resume` is the better path when it works, but it depends on
 * the SDK's on-disk store still holding that conversation on this machine. So
 * this is the fallback, and it is a plain reading of the transcript rather
 * than a summary: summarizing costs a model call and loses the specifics —
 * system ids, program names — that are the whole reason to look back.
 *
 * The newest turns are kept and the oldest dropped when the budget runs out.
 */
export function contextPreamble(messages: ChatMessage[]): string | null {
  if (messages.length === 0) return null;

  const kept: string[] = [];
  let size = 0;

  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index]!;
    // The file itself is gone; the model is told it was there so it does not
    // treat a question about "the screenshot" as coming from nowhere.
    const attached =
      message.attachments && message.attachments.length > 0
        ? ` [attached: ${message.attachments.map((file) => file.name).join(", ")}]`
        : "";
    const line = `${message.role === "user" ? "User" : "Assistant"}: ${message.text}${attached}`;
    if (size + line.length > CONTEXT_BUDGET) break;
    kept.unshift(line);
    size += line.length;
  }

  if (kept.length === 0) return null;

  const elided =
    kept.length < messages.length
      ? "\n(Earlier turns of this conversation have been omitted.)\n"
      : "\n";

  return [
    "<prior_conversation>",
    "This conversation continues an earlier session with the same user. Read",
    "it for context — names, system ids and decisions already established —",
    "then answer only the new message that follows it. Do not summarize or",
    "repeat this history back unless asked to.",
    elided,
    ...kept,
    "</prior_conversation>",
    "",
  ].join("\n");
}

/** One period's worth of what this account has run. */
export type UsageTotals = {
  chats: number;
  turns: number;
  costUsd: number;
};

/**
 * What the dashboard reports instead of a balance.
 *
 * A credit balance needs a number only Anthropic holds; what was *spent* is
 * recorded on every save, so this is the half of the same question that can
 * be answered honestly.
 */
export type Activity = {
  /** The month shown, `YYYY-MM`. */
  month: string;
  /** What that month spent, or null when nothing was recorded in it. */
  monthTotals: UsageTotals | null;
  /**
   * How far back the left arrow goes: the month the account was made, or
   * the first month with spend on record if that is earlier.
   */
  firstMonth: string;
  /** The current month — the right arrow stops there. */
  currentMonth: string;
  /** Everything this account has ever run. */
  all: UsageTotals;
  /** When the most recent conversation was last touched. */
  lastActiveAt: string | null;
};

/** `YYYY-MM` for a moment, in the web server's time zone. */
export function monthKey(at: Date): string {
  return `${at.getFullYear()}-${String(at.getMonth() + 1).padStart(2, "0")}`;
}

/** Whether a string is a `YYYY-MM` month this app could have recorded. */
export function isMonthKey(value: string): boolean {
  return /^\d{4}-(0[1-9]|1[0-2])$/.test(value);
}

/** The month before or after a `YYYY-MM`. */
export function shiftMonth(month: string, by: number): string {
  const [year, index] = month.split("-").map(Number) as [number, number];
  return monthKey(new Date(year, index - 1 + by, 1));
}

async function addSpend(
  userId: string,
  month: string,
  add: UsageTotals,
): Promise<void> {
  await (await spendMonths()).updateOne(
    { _id: `${userId}:${month}` },
    {
      $inc: { costUsd: add.costUsd, turns: add.turns, chats: add.chats },
      $set: { updatedAt: new Date() },
      $setOnInsert: { userId, month },
    },
    { upsert: true },
  );
}

/**
 * Folds the chat rows written before the ledger existed into it, once.
 *
 * Cost and turns go to the month each conversation was last touched, and
 * the conversation itself to the month it started — the old rows carry one
 * total and those two dates, and nothing finer. Deleted conversations are
 * not included: their counters were kept, their dates were not.
 *
 * One caller wins the claim on the account row; everyone else goes on
 * without waiting, and at worst reads a month a moment before its history
 * lands in it.
 */
async function ensureSpendSeeded(userId: string): Promise<void> {
  if (!ObjectId.isValid(userId)) return;
  const claimed = await (await users()).updateOne(
    { _id: new ObjectId(userId), spendSeededAt: { $exists: false } },
    { $set: { spendSeededAt: new Date() } },
  );
  if (claimed.modifiedCount === 0) return;

  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const byMonth = (date: unknown) => ({
    $dateToString: { format: "%Y-%m", date, timezone },
  });
  const collection = await chats();
  const [spent, started] = await Promise.all([
    collection
      .aggregate<{ _id: string; costUsd: number; turns: number }>([
        { $match: { userId } },
        {
          $group: {
            _id: byMonth("$updatedAt"),
            costUsd: { $sum: "$totalCostUsd" },
            turns: { $sum: "$turns" },
          },
        },
      ])
      .toArray(),
    collection
      .aggregate<{ _id: string; chats: number }>([
        { $match: { userId } },
        {
          $group: {
            _id: byMonth({ $ifNull: ["$createdAt", "$updatedAt"] }),
            chats: { $sum: 1 },
          },
        },
      ])
      .toArray(),
  ]);

  const months = new Map<string, UsageTotals>();
  const at = (month: string) => {
    let totals = months.get(month);
    if (!totals) months.set(month, (totals = { chats: 0, turns: 0, costUsd: 0 }));
    return totals;
  };
  for (const row of spent) {
    at(row._id).costUsd += row.costUsd;
    at(row._id).turns += row.turns;
  }
  for (const row of started) at(row._id).chats += row.chats;
  for (const [month, totals] of months) await addSpend(userId, month, totals);
}

/**
 * Counts a run that keeps no transcript — its cost and turns, nothing else.
 *
 * Reported as a running total, possibly more than once; only the growth since
 * the last report is added, to this month and to the account's retired
 * counters, where every run whose transcript is gone is already counted.
 */
export async function recordRun(
  userId: string,
  runId: string,
  totals: { turns: number; totalCostUsd: number },
): Promise<void> {
  await ensureSpendSeeded(userId);
  const before = await (await runSpend()).findOneAndUpdate(
    { _id: runId, userId },
    {
      $set: { turns: totals.turns, costUsd: totals.totalCostUsd, updatedAt: new Date() },
      $setOnInsert: { userId },
    },
    { upsert: true, returnDocument: "before" },
  );
  const add = {
    chats: before ? 0 : 1,
    turns: Math.max(0, totals.turns - (before?.turns ?? 0)),
    costUsd: Math.max(0, totals.totalCostUsd - (before?.costUsd ?? 0)),
  };
  if (add.chats === 0 && add.turns === 0 && add.costUsd === 0) return;
  await addSpend(userId, monthKey(new Date()), add);
  if (ObjectId.isValid(userId)) {
    await (await users()).updateOne(
      { _id: new ObjectId(userId) },
      {
        $inc: {
          "retired.chats": add.chats,
          "retired.turns": add.turns,
          "retired.costUsd": add.costUsd,
        },
      },
    );
  }
}

/** One month of the ledger, as the activity panel steps through it. */
export type MonthSpend = {
  month: string;
  /** Null when nothing was recorded in the month. */
  totals: UsageTotals | null;
};

/**
 * One account's month from the ledger.
 *
 * A month with a row but nothing in it — a conversation opened and never
 * answered — reads as empty too: there is no spend to show.
 */
export async function readMonthSpend(
  userId: string,
  month: string,
): Promise<MonthSpend> {
  await ensureSpendSeeded(userId);
  const shown = await (await spendMonths()).findOne({ _id: `${userId}:${month}` });
  return {
    month,
    totals:
      shown && (shown.costUsd > 0 || shown.turns > 0 || shown.chats > 0)
        ? { chats: shown.chats, turns: shown.turns, costUsd: shown.costUsd }
        : null,
  };
}

/**
 * One account's month, and its lifetime totals, for the dashboard.
 *
 * The month comes from the ledger (`spend_months`); the lifetime totals
 * still come from the chat rows plus the retired counters, which is what
 * they always were.
 */
export async function readActivity(
  userId: string,
  requestedMonth?: string,
): Promise<Activity> {
  await ensureSpendSeeded(userId);

  const currentMonth = monthKey(new Date());
  const month =
    requestedMonth && isMonthKey(requestedMonth) && requestedMonth <= currentMonth
      ? requestedMonth
      : currentMonth;

  const [shown, first] = await Promise.all([
    readMonthSpend(userId, month),
    (await spendMonths())
      .find({ userId }, { projection: { month: 1 } })
      .sort({ month: 1 })
      .limit(1)
      .next(),
  ]);

  const user = ObjectId.isValid(userId)
    ? await (await users()).findOne(
        { _id: new ObjectId(userId) },
        { projection: { retired: 1, createdAt: 1 } },
      )
    : null;
  // Absent on every row written before retiring existed.
  const retired = user?.retired ?? { chats: 0, turns: 0, costUsd: 0 };

  // Every month since the account existed can be stepped to — an empty one
  // says so in the box rather than being out of reach.
  const joined = user?.createdAt ? monthKey(user.createdAt) : currentMonth;
  const firstMonth =
    first?.month && first.month < joined ? first.month : joined;

  const [row] = await (await chats())
    .aggregate<{
      allChats: number;
      allTurns: number;
      allCost: number;
      lastActiveAt: Date | null;
    }>([
      { $match: { userId } },
      {
        $group: {
          _id: null,
          allChats: { $sum: 1 },
          allTurns: { $sum: "$turns" },
          allCost: { $sum: "$totalCostUsd" },
          lastActiveAt: { $max: "$updatedAt" },
        },
      },
    ])
    .toArray();

  return {
    month,
    monthTotals: shown.totals,
    firstMonth,
    currentMonth,
    // No chats yet is no group; the retired counters still count, since an
    // account that deleted everything it ran has certainly run something.
    all: row
      ? {
          chats: row.allChats + retired.chats,
          turns: row.allTurns + retired.turns,
          costUsd: row.allCost + retired.costUsd,
        }
      : retired,
    lastActiveAt: row?.lastActiveAt?.toISOString() ?? null,
  };
}
