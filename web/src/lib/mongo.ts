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
    }).connect();
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
  createdAt: Date;
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
