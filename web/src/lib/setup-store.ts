import "server-only";
import { ObjectId } from "mongodb";
import { users, type ConnectionDoc } from "@/lib/mongo";
import { open, seal } from "@/lib/secrets";
import { EMPTY_DRAFT, type BlocklistProfile, type SetupDraft } from "@/lib/setup";

/**
 * Reading and writing one account's connection.
 *
 * The only place a `SetupDraft` becomes a `ConnectionDoc` and the only place it
 * comes back — so the sealing and unsealing of the two secrets happens in one
 * file rather than at each call site, and nothing above this layer ever holds a
 * sealed string it might mistake for a usable one.
 */

/**
 * Write, or overwrite. Setup can be run again; there is one row either way.
 *
 * `verified` is the sentence the SAP probe returned a moment before this was
 * called — both callers probe before they save, and a row saved without that
 * would tell the dashboard the connection had never been checked, one second
 * after it had been.
 */
export async function saveConnection(
  userId: string,
  draft: SetupDraft,
  verified?: string,
): Promise<void> {
  const connection: ConnectionDoc = {
    adtUrl: draft.adtUrl.trim().replace(/\/+$/, ""),
    sapUser: draft.sapUser.trim(),
    sapPasswordSealed: seal(draft.sapPassword),
    sapVersion: draft.sapVersion,
    abapRelease: draft.abapRelease.trim(),
    client: draft.client.trim(),
    language: draft.language,
    apiKeySealed: seal(draft.apiKey.trim()),
    industry: draft.industry,
    blocklist: draft.blocklist,
    allowTables: draft.allowTables,
    connectedAt: new Date(),
    ...(verified ? { lastCheck: { ok: true, detail: verified, at: new Date() } } : {}),
  };

  const result = await (await users()).updateOne(
    { _id: new ObjectId(userId) },
    { $set: { connection } },
  );

  // The session resolved to this row a moment ago, so a miss means it was
  // deleted underneath us — worth failing loudly rather than reporting a save
  // that did not happen.
  if (result.matchedCount === 0) {
    throw new Error("That account no longer exists.");
  }
}

/**
 * What the screens are allowed to see: everything except the two secrets.
 *
 * A separate type rather than `Omit<ConnectionDoc, …>`, so adding a field to
 * the document does not silently add it here — a new secret would otherwise
 * arrive on the dashboard the day it is stored.
 */
export type ConnectionSummary = {
  adtUrl: string;
  sapUser: string;
  sapVersion: "S4" | "ECC";
  abapRelease: string;
  client: string;
  language: string;
  industry: string;
  blocklist: BlocklistProfile;
  allowTables: string[];
  connectedAt: string;
  /** ISO timestamps. `null` when the connection has never been probed. */
  lastCheck: { ok: boolean; detail: string; at: string } | null;
};

export async function readConnection(
  userId: string,
): Promise<ConnectionSummary | null> {
  if (!ObjectId.isValid(userId)) return null;
  const user = await (await users()).findOne(
    { _id: new ObjectId(userId) },
    { projection: { connection: 1 } },
  );
  const connection = user?.connection;
  if (!connection) return null;

  return {
    adtUrl: connection.adtUrl,
    sapUser: connection.sapUser,
    sapVersion: connection.sapVersion,
    abapRelease: connection.abapRelease,
    client: connection.client,
    language: connection.language,
    // Rows from before these existed read as the plugin's own defaults,
    // which is what the backend applies to them today anyway.
    industry: connection.industry ?? EMPTY_DRAFT.industry,
    blocklist: connection.blocklist ?? EMPTY_DRAFT.blocklist,
    allowTables: connection.allowTables ?? [],
    connectedAt: connection.connectedAt.toISOString(),
    lastCheck: connection.lastCheck
      ? {
          ok: connection.lastCheck.ok,
          detail: connection.lastCheck.detail,
          at: connection.lastCheck.at.toISOString(),
        }
      : null,
  };
}

/**
 * Change the plugin-side scope without touching the connection.
 *
 * Its own writer because the settings screen edits these on their own and
 * none of them needs the SAP system consulted: an industry is a choice, not a
 * logon, and running the twelve-second probe to record one would be the wrong
 * kind of careful. Refuses an account with no connection — the wizard is the
 * only flow that creates one.
 */
export async function saveScope(
  userId: string,
  scope: Pick<SetupDraft, "industry" | "blocklist" | "allowTables">,
): Promise<boolean> {
  if (!ObjectId.isValid(userId)) return false;
  const result = await (await users()).updateOne(
    { _id: new ObjectId(userId), connection: { $exists: true } },
    {
      $set: {
        "connection.industry": scope.industry,
        "connection.blocklist": scope.blocklist,
        "connection.allowTables": scope.allowTables,
      },
    },
  );
  return result.matchedCount > 0;
}

/**
 * Record what a probe of the stored connection found.
 *
 * Separate from `saveConnection` because the probe runs far more often than
 * the values change: every Reconnect press lands here, and a press that
 * rewrote the sealed secrets to record a timestamp would be doing something
 * it was never asked to do.
 */
export async function recordCheck(
  userId: string,
  result: { ok: boolean; detail: string },
): Promise<void> {
  if (!ObjectId.isValid(userId)) return;
  await (await users()).updateOne(
    { _id: new ObjectId(userId), connection: { $exists: true } },
    { $set: { "connection.lastCheck": { ...result, at: new Date() } } },
  );
}

/**
 * The secrets, unsealed.
 *
 * Deliberately its own function with a blunt name, so every caller reads as
 * what it is at the call site. Nothing that renders should be calling this;
 * it exists for the code that has to actually connect with them.
 */
export async function readConnectionSecrets(
  userId: string,
): Promise<{ sapPassword: string; apiKey: string } | null> {
  if (!ObjectId.isValid(userId)) return null;
  const user = await (await users()).findOne(
    { _id: new ObjectId(userId) },
    { projection: { connection: 1 } },
  );
  const connection = user?.connection;
  if (!connection) return null;

  return {
    sapPassword: open(connection.sapPasswordSealed),
    apiKey: open(connection.apiKeySealed),
  };
}
