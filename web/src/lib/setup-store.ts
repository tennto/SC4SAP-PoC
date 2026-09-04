import "server-only";
import { ObjectId } from "mongodb";
import { users, type ConnectionDoc } from "@/lib/mongo";
import { open, seal } from "@/lib/secrets";
import type { SetupDraft } from "@/lib/setup";

/**
 * Reading and writing one account's connection.
 *
 * The only place a `SetupDraft` becomes a `ConnectionDoc` and the only place it
 * comes back — so the sealing and unsealing of the two secrets happens in one
 * file rather than at each call site, and nothing above this layer ever holds a
 * sealed string it might mistake for a usable one.
 */

/** Write, or overwrite. Setup can be run again; there is one row either way. */
export async function saveConnection(
  userId: string,
  draft: SetupDraft,
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
    connectedAt: new Date(),
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
  connectedAt: string;
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
    connectedAt: connection.connectedAt.toISOString(),
  };
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
