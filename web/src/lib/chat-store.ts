import "server-only";
import { ObjectId } from "mongodb";
import { chatMessages, chats, users, type ChatDoc } from "@/lib/mongo";

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
  updatedAt: string;
};

export type ChatMessage = {
  seq: number;
  role: "user" | "agent";
  text: string;
  at: string;
};

function summarize(doc: ChatDoc): ChatSummary {
  return {
    id: doc._id,
    title: doc.title,
    sdkSessionId: doc.sdkSessionId,
    turns: doc.turns,
    totalCostUsd: doc.totalCostUsd,
    updatedAt: doc.updatedAt.toISOString(),
  };
}

/** The rail, for one account. Most recently used first. */
export async function listChats(userId: string): Promise<ChatSummary[]> {
  const rows = await (await chats())
    .find({ userId })
    .sort({ updatedAt: -1 })
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
    messages: { seq: number; role: "user" | "agent"; text: string }[];
  },
): Promise<void> {
  const now = new Date();

  await (await chats()).updateOne(
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
        ...(input.title === undefined || input.title === null
          ? { title: null }
          : {}),
        ...(input.sdkSessionId ? {} : { sdkSessionId: null }),
        ...(input.turns === undefined ? { turns: 0 } : {}),
        ...(input.totalCostUsd === undefined ? { totalCostUsd: 0 } : {}),
      },
    },
    { upsert: true },
  );

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
    const line = `${message.role === "user" ? "User" : "Assistant"}: ${message.text}`;
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
 * already on every chat row, so this is the half of the same question that can
 * be answered honestly.
 */
export type Activity = {
  /** The last seven days. */
  week: UsageTotals;
  /** Everything this account has ever run. */
  all: UsageTotals;
  /** When the most recent conversation was last touched. */
  lastActiveAt: string | null;
};

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * One account's totals, in one round trip.
 *
 * Aggregated in Mongo rather than by reading the rows back and summing here:
 * the rail already caps its own read at 200 chats, and a total that quietly
 * stopped counting past some limit would be worse than no total at all.
 *
 * The week figures are per *chat*, not per turn — a conversation touched
 * inside the window contributes all of its turns and all of its cost, even the
 * ones from before it. Turn-level dating would mean summing `chat_messages`,
 * which does not carry a cost, so the honest fix is a wider label: this is
 * "conversations active in the last seven days", and that is what the panel
 * says.
 *
 * The all-time figures add the account's retired counters — what deleted
 * conversations ran before they were deleted. Without them a lifetime total
 * falls every time the rail is tidied, which makes it a count of what is
 * currently kept rather than of what has been done. The week figures do not
 * add them, and cannot: a retired chat took its dates with it.
 */
export async function readActivity(userId: string): Promise<Activity> {
  const since = new Date(Date.now() - WEEK_MS);

  const user = ObjectId.isValid(userId)
    ? await (await users()).findOne(
        { _id: new ObjectId(userId) },
        { projection: { retired: 1 } },
      )
    : null;
  // Absent on every row written before retiring existed.
  const retired = user?.retired ?? { chats: 0, turns: 0, costUsd: 0 };

  const [row] = await (await chats())
    .aggregate<{
      allChats: number;
      allTurns: number;
      allCost: number;
      weekChats: number;
      weekTurns: number;
      weekCost: number;
      lastActiveAt: Date | null;
    }>([
      { $match: { userId } },
      {
        $group: {
          _id: null,
          allChats: { $sum: 1 },
          allTurns: { $sum: "$turns" },
          allCost: { $sum: "$totalCostUsd" },
          // `$cond` rather than a second pipeline: one pass over the same
          // index the rail already sorts on.
          weekChats: {
            $sum: { $cond: [{ $gte: ["$updatedAt", since] }, 1, 0] },
          },
          weekTurns: {
            $sum: { $cond: [{ $gte: ["$updatedAt", since] }, "$turns", 0] },
          },
          weekCost: {
            $sum: {
              $cond: [{ $gte: ["$updatedAt", since] }, "$totalCostUsd", 0],
            },
          },
          lastActiveAt: { $max: "$updatedAt" },
        },
      },
    ])
    .toArray();

  // No chats yet is no group, not a group of zeroes — an account that has
  // never run anything still has a panel to fill.
  if (!row) {
    return {
      week: { chats: 0, turns: 0, costUsd: 0 },
      // Still the retired ones: an account that has deleted everything it ever
      // ran has no chat rows left and has certainly run something.
      all: retired,
      lastActiveAt: null,
    };
  }

  return {
    week: { chats: row.weekChats, turns: row.weekTurns, costUsd: row.weekCost },
    all: {
      chats: row.allChats + retired.chats,
      turns: row.allTurns + retired.turns,
      costUsd: row.allCost + retired.costUsd,
    },
    lastActiveAt: row.lastActiveAt?.toISOString() ?? null,
  };
}
