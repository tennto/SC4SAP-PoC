import "server-only";
import { MongoClient, type Collection, type Db, type ObjectId } from "mongodb";

/**
 * The one MongoDB connection, and the one place it is configured.
 *
 * A `MongoClient` is a connection *pool*, not a connection — creating one per
 * request is the classic way to exhaust an Atlas cluster's connection limit in
 * development. So it is created once and reused, and in dev it is parked on
 * `globalThis` because Next's HMR re-evaluates this module on every edit and
 * would otherwise leak a pool per save.
 *
 * `server-only` is load-bearing here: importing this from a Client Component
 * has to be a build error, not a runtime one, because the connection string
 * carries the database password.
 */

const DEFAULT_DB = "sc4sap";

/**
 * Read lazily rather than at module scope. A missing URI should fail the one
 * request that needed the database with a message naming the variable — not
 * take down every route in the app at import time, including the ones that do
 * not touch Mongo at all.
 */
function connectionUri(): string {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error(
      "MONGODB_URI is not set. Copy web/.env.example to web/.env.local and " +
        "put the Atlas connection string in it.",
    );
  }
  return uri;
}

declare global {
  // eslint-disable-next-line no-var
  var __sc4sapMongo: Promise<MongoClient> | undefined;
  // eslint-disable-next-line no-var
  var __sc4sapMongoIndexes: Promise<void> | undefined;
}

function client(): Promise<MongoClient> {
  if (!globalThis.__sc4sapMongo) {
    globalThis.__sc4sapMongo = new MongoClient(connectionUri(), {
      // Fail a request in seconds rather than hanging on a cluster that is
      // paused or firewalled — the default is 30s, which reads as a hang.
      serverSelectionTimeoutMS: 8_000,
    })
      .connect()
      // A failed attempt must not be cached as a success, or every later
      // request replays this rejection and the process never reconnects —
      // one blip on the way to Atlas would need a restart to clear.
      .catch((err: unknown) => {
        globalThis.__sc4sapMongo = undefined;
        throw err;
      });
  }
  return globalThis.__sc4sapMongo;
}

/** A user row. `_id` is the account id every other layer passes around. */
export type UserDoc = {
  /** Optional because the driver assigns it on insert. */
  _id?: ObjectId;
  /** Lower-cased. The unique key — see `ensureIndexes`. */
  email: string;
  /** Exactly as typed, for display. */
  displayEmail: string;
  lastName: string;
  firstName: string;
  /**
   * `scrypt$N$r$p$salt$hash` — see `lib/auth/password.ts`.
   *
   * Absent on an account created through Google, which has no password until
   * its owner sets one through the reset flow. Password sign-in fails for such
   * a row, with the same message every other failed sign-in gets.
   */
  passwordHash?: string;
  /**
   * Set once this row has been linked to a Google account.
   *
   * `sub` is Google's stable identifier for the user and is what the callback
   * matches on first — an address can be changed or reassigned, `sub` cannot.
   */
  google?: {
    sub: string;
    linkedAt: Date;
  };
  /**
   * Starred skill slugs, oldest first.
   *
   * An array on the user row rather than a collection of its own: it is a
   * short list, only ever read as a whole, and only ever alongside the user it
   * belongs to. Optional because rows written before this existed do not have
   * it — every reader treats a missing field as an empty list.
   */
  favorites?: string[];
  /**
   * What `/setup` collected: which ABAP stack this account works against, how
   * it logs in, and the Anthropic key it thinks with.
   *
   * Absent until setup is completed, and that absence is what routes a new
   * account to the wizard — see `requireAccount` in `lib/auth/session.ts`.
   *
   * On the user row rather than in a collection of its own, for the same
   * reason `favorites` is: exactly one per account, never read without the
   * account, never listed on its own.
   */
  connection?: ConnectionDoc;
  /**
   * What this account has run and then deleted.
   *
   * Activity is otherwise summed from the chat rows themselves, which is
   * correct right up until someone clears a conversation out of the rail — and
   * then a lifetime total goes *down*, which is the one thing a lifetime total
   * must not do. Deleting a chat folds its numbers in here on the way out, so
   * what is reported is "everything ever run" whether or not the transcript
   * still exists.
   *
   * Absent on every row written before this existed, which reads as zero.
   */
  retired?: {
    chats: number;
    turns: number;
    costUsd: number;
  };
  createdAt: Date;
};

/**
 * One account's connection.
 *
 * The two secrets are stored sealed and are named for it — `…Sealed`, so no
 * reader can mistake one for a value it can use, and so a field holding
 * plaintext could never be added under the same name by accident. Everything
 * else is stored as typed; none of it is a secret, and the dashboard shows
 * most of it back.
 *
 * See `lib/secrets.ts` for what sealed means and what it does not.
 */
export type ConnectionDoc = {
  /** ADT base URL — scheme, host and port, no path. */
  adtUrl: string;
  sapUser: string;
  /** AES-256-GCM. Never the password. */
  sapPasswordSealed: string;
  sapVersion: "S4" | "ECC";
  abapRelease: string;
  client: string;
  language: string;
  /** AES-256-GCM. Never the key, and never any part of it. */
  apiKeySealed: string;
  /**
   * The plugin-side scope: industry reference, blocklist profile, and the
   * tables let through it. Stored per account, not yet read by the backend —
   * see `lib/setup.ts`. Optional because rows written before this existed
   * do not have it; readers fall back to the plugin's own defaults.
   */
  industry?: string;
  blocklist?: "minimal" | "standard" | "strict";
  allowTables?: string[];
  /** When setup last completed. Rewritten if it is run again. */
  connectedAt: Date;
  /**
   * What the last probe of this connection found — see `checkSap`.
   *
   * Written by every place that runs the probe: setup, a settings save, and
   * the dashboard's Reconnect. Read by the dashboard so its SAP row can say
   * something measured rather than something assumed. Absent on rows written
   * before this existed, which the dashboard draws as "not checked yet".
   */
  lastCheck?: {
    ok: boolean;
    /** The sentence `checkSap` returned or threw. Never a credential. */
    detail: string;
    at: Date;
  };
};

/** A live sign-in. The token itself is never stored; see `lib/auth/session.ts`. */
export type SessionDoc = {
  _id?: ObjectId;
  /** SHA-256 of the cookie's token, hex. */
  tokenHash: string;
  userId: string;
  createdAt: Date;
  /** Mongo's TTL monitor deletes the row once this passes. */
  expiresAt: Date;
};

/**
 * A password-reset code in flight.
 *
 * `email` is denormalized off the user row so a reset can be rate-limited by
 * address without a join, including for addresses that turn out to have no
 * account — see `lib/auth/reset.ts`.
 */
export type ResetDoc = {
  _id?: ObjectId;
  userId: string;
  /** Lower-cased, matching `UserDoc.email`. */
  email: string;
  /** `scrypt$...` of the six digits. Never the digits. */
  codeHash: string;
  /** Wrong guesses so far. The row is destroyed once this hits the ceiling. */
  attempts: number;
  createdAt: Date;
  expiresAt: Date;
};

/**
 * A conversation, as the reader sees it — not as the backend runs it.
 *
 * The backend's session is a live SDK subprocess and dies with the process;
 * this row outlives it, which is the whole point. `_id` is the id of the
 * backend session that *first* opened the conversation and it never changes,
 * so reviving a chat after a restart attaches a new backend session to the
 * same row rather than starting a second history.
 *
 * Named `chat_sessions`, not `sessions` — that name is taken by sign-in
 * sessions above, and the two have nothing to do with each other.
 */
export type ChatDoc = {
  /** The first backend session id. Stable for the life of the conversation. */
  _id: string;
  userId: string;
  /** First prompt, clipped — the same string the rail shows. */
  title: string | null;
  /** The SDK's own conversation id, for `POST /sessions {resume}`. */
  sdkSessionId: string | null;
  turns: number;
  totalCostUsd: number;
  createdAt: Date;
  updatedAt: Date;
};

/**
 * One rendered turn. A document per message rather than an array on the chat
 * row: Mongo caps a document at 16 MB, and a long conversation reaches that.
 *
 * `text` is what the transcript draws — the reader's prompt, or the agent's
 * answer with the blocks of one turn already folded together. Tool results and
 * thinking are not stored: they are not shown, and a single ABAP source read
 * is larger than every answer in the conversation put together.
 */
export type ChatMessageDoc = {
  _id?: ObjectId;
  chatId: string;
  userId: string;
  /** Order within the chat. Unique per chat — see `ensureIndexes`. */
  seq: number;
  role: "user" | "agent";
  text: string;
  /** True if `text` was cut at the ceiling in `chat-store.ts`. */
  truncated?: boolean;
  /**
   * Files that went with a user turn — names and sizes only. The bytes went
   * to the model once and are not kept: a reopened chat shows that a file
   * was sent, not the file.
   */
  attachments?: { name: string; mediaType: string; size: number }[];
  at: Date;
};

/**
 * One tool call, written by the backend — see `src/server/tool-log.ts`.
 *
 * This app never writes these; it reads them for the monitor page. The
 * indexes are the backend's too, created where the rows are written, which
 * is why they are not in `ensureIndexes` below. Kept in step by hand: the
 * backend's `ToolCallDoc` is the same fields with `Date`s.
 */
export type ToolCallDoc = {
  /** The SDK's `tool_use` id. */
  _id: string;
  userId: string;
  sessionId: string;
  name: string;
  kind: "mcp" | "builtin";
  server: string | null;
  tool: string;
  inputPreview: string;
  startedAt: Date;
  endedAt: Date | null;
  durationMs: number | null;
  ok: boolean | null;
  resultBytes: number | null;
  decision: "auto" | "allowed" | "denied" | "expired" | null;
};

/**
 * Indexes the auth code depends on for *correctness*, not just speed:
 *
 *   users.email      unique — the only thing standing between two sign-ups
 *                    racing on the same address and both winning. The
 *                    application-level "already registered" check cannot do
 *                    this on its own; it is a read before a write.
 *   users.google.sub unique and sparse — one Google account owns at most one
 *                    row, and the accounts that were never linked are exempt
 *                    rather than all colliding on a missing value.
 *   sessions.expiresAt  TTL — expiry is enforced by the database, so a session
 *                    row cannot outlive its own deadline even if every reader
 *                    forgets to check.
 *   resets.expiresAt TTL, same reasoning, and it also means a code that was
 *                    never used cleans itself up rather than sitting in the
 *                    collection indefinitely.
 *
 * Run once per process and awaited by every accessor below, so the first
 * request pays for it and no request runs before it is in place.
 */
function ensureIndexes(db: Db): Promise<void> {
  if (!globalThis.__sc4sapMongoIndexes) {
    globalThis.__sc4sapMongoIndexes = (async () => {
      await db.collection<UserDoc>("users").createIndex(
        { email: 1 },
        { unique: true, name: "email_unique" },
      );
      // Sparse, so the rows that have never been linked — every
      // password-only account — do not all collide on a missing value.
      // Unique, so one Google account cannot end up owning two rows here.
      await db.collection<UserDoc>("users").createIndex(
        { "google.sub": 1 },
        { unique: true, sparse: true, name: "google_sub_unique" },
      );
      await db.collection<SessionDoc>("sessions").createIndex(
        { expiresAt: 1 },
        { expireAfterSeconds: 0, name: "session_ttl" },
      );
      await db.collection<SessionDoc>("sessions").createIndex(
        { tokenHash: 1 },
        { unique: true, name: "token_unique" },
      );
      await db.collection<ResetDoc>("resets").createIndex(
        { expiresAt: 1 },
        { expireAfterSeconds: 0, name: "reset_ttl" },
      );
      // Every reset lookup and every throttle check is by address.
      await db.collection<ResetDoc>("resets").createIndex(
        { email: 1 },
        { name: "reset_email" },
      );
      // The rail's query: this user's conversations, most recent first.
      await db.collection<ChatDoc>("chat_sessions").createIndex(
        { userId: 1, updatedAt: -1 },
        { name: "chat_by_user" },
      );
      // Unique, so a retried write cannot put the same turn in twice — the
      // client appends by sequence number and a retry reuses it.
      await db.collection<ChatMessageDoc>("chat_messages").createIndex(
        { chatId: 1, seq: 1 },
        { unique: true, name: "chat_message_seq" },
      );
    })().catch((err: unknown) => {
      // A failed attempt must not be cached as a success, or every later
      // request would assume indexes that are not there.
      globalThis.__sc4sapMongoIndexes = undefined;
      throw err;
    });
  }
  return globalThis.__sc4sapMongoIndexes;
}

async function database(): Promise<Db> {
  const db = (await client()).db(process.env.MONGODB_DB ?? DEFAULT_DB);
  await ensureIndexes(db);
  return db;
}

export async function users(): Promise<Collection<UserDoc>> {
  return (await database()).collection<UserDoc>("users");
}

export async function sessions(): Promise<Collection<SessionDoc>> {
  return (await database()).collection<SessionDoc>("sessions");
}

export async function resets(): Promise<Collection<ResetDoc>> {
  return (await database()).collection<ResetDoc>("resets");
}

export async function chats(): Promise<Collection<ChatDoc>> {
  return (await database()).collection<ChatDoc>("chat_sessions");
}

export async function toolCalls(): Promise<Collection<ToolCallDoc>> {
  return (await database()).collection<ToolCallDoc>("tool_calls");
}

export async function chatMessages(): Promise<Collection<ChatMessageDoc>> {
  return (await database()).collection<ChatMessageDoc>("chat_messages");
}
