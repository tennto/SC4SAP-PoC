import "server-only";
import { ObjectId } from "mongodb";
import { users, type UserDoc } from "@/lib/mongo";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import type { Account } from "@/lib/account";

/**
 * The user store, and the one place a `UserDoc` turns into the `Account` the
 * screens render.
 *
 * Nothing above this file sees a password hash — `toAccount` is the only exit
 * from the collection, and it does not carry one.
 */

/** The plan every PoC account is on. There is no billing to read it from yet. */
const PLAN = "PoC — bring your own key";

/**
 * Addresses are matched case-insensitively, because nobody thinks of
 * `Kim@corp.com` and `kim@corp.com` as two accounts and the unique index has to
 * agree with that. The address is also stored as typed, and that is the one
 * shown back to the user.
 */
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function toAccount(doc: UserDoc): Account {
  return {
    id: String(doc._id),
    // Family name first, matching the order the sign-up form asks for it in.
    name: `${doc.lastName} ${doc.firstName}`.trim(),
    email: doc.displayEmail,
    // Neither is collected at sign-up; both are settings-screen material.
    role: null,
    organization: null,
    plan: PLAN,
    memberSince: doc.createdAt.toISOString().slice(0, 10),
    // Rows written before favourites were stored have no field at all.
    favorites: doc.favorites ?? [],
  };
}

export async function findByEmail(email: string): Promise<UserDoc | null> {
  return (await users()).findOne({ email: normalizeEmail(email) });
}

export async function findById(id: string): Promise<UserDoc | null> {
  if (!ObjectId.isValid(id)) return null;
  return (await users()).findOne({ _id: new ObjectId(id) });
}

/**
 * `duplicate` rather than a thrown error, because two sign-ups racing on the
 * same address is an ordinary outcome, not an exceptional one: the loser is
 * caught by the unique index rather than by the check above it, and both paths
 * have to answer the caller the same way.
 */
export type CreateResult =
  | { ok: true; user: UserDoc }
  | { ok: false; reason: "duplicate" };

export async function createUser(input: {
  lastName: string;
  firstName: string;
  email: string;
  password: string;
}): Promise<CreateResult> {
  const doc: UserDoc = {
    email: normalizeEmail(input.email),
    displayEmail: input.email.trim(),
    lastName: input.lastName.trim(),
    firstName: input.firstName.trim(),
    passwordHash: await hashPassword(input.password),
    favorites: [],
    createdAt: new Date(),
  };

  try {
    const result = await (await users()).insertOne(doc);
    return { ok: true, user: { ...doc, _id: result.insertedId } };
  } catch (err) {
    // 11000 is Mongo's duplicate-key code, and `email_unique` is the only
    // unique index on the collection that a sign-up can collide with.
    if ((err as { code?: number }).code === 11000) {
      return { ok: false, reason: "duplicate" };
    }
    throw err;
  }
}

/**
 * Verify a sign-in.
 *
 * When the address is unknown this still spends a scrypt derivation against a
 * throwaway hash before answering. Returning immediately would make "no such
 * user" measurably faster than "wrong password", which turns the sign-in form
 * into an oracle for which addresses are registered.
 */
const DUMMY_HASH_PROMISE = hashPassword("sc4sap-timing-equalizer");

export async function authenticate(
  email: string,
  password: string,
): Promise<UserDoc | null> {
  const user = await findByEmail(email);
  // A row created through Google has no password yet. It is rejected like an
  // unknown address, and spends the same derivation doing it — a fast "no"
  // here would say "this address exists but signs in another way", which is
  // exactly what the generic message is there to avoid.
  if (!user?.passwordHash) {
    await verifyPassword(password, await DUMMY_HASH_PROMISE);
    return null;
  }
  return (await verifyPassword(password, user.passwordHash)) ? user : null;
}

/** Google's `sub` is the stable key; an address is not. */
export async function findByGoogleSub(sub: string): Promise<UserDoc | null> {
  return (await users()).findOne({ "google.sub": sub });
}

/**
 * Attach a Google identity to a row that already exists.
 *
 * Only ever called for an address Google has told us it verified, which is
 * what makes linking safe: proving control of the mailbox is the same proof
 * the password reset would give.
 */
export async function linkGoogle(
  userId: string,
  sub: string,
): Promise<UserDoc | null> {
  return (await users()).findOneAndUpdate(
    { _id: new ObjectId(userId) },
    { $set: { google: { sub, linkedAt: new Date() } } },
    { returnDocument: "after" },
  );
}

/**
 * A brand-new account, created from a Google profile.
 *
 * No `passwordHash` at all rather than an unusable placeholder: absent is
 * checkable, and a placeholder is something a later reader has to know the
 * convention for.
 */
export async function createGoogleUser(input: {
  lastName: string;
  firstName: string;
  email: string;
  sub: string;
}): Promise<CreateResult> {
  const doc: UserDoc = {
    email: normalizeEmail(input.email),
    displayEmail: input.email.trim(),
    lastName: input.lastName.trim(),
    firstName: input.firstName.trim(),
    google: { sub: input.sub, linkedAt: new Date() },
    favorites: [],
    createdAt: new Date(),
  };

  try {
    const result = await (await users()).insertOne(doc);
    return { ok: true, user: { ...doc, _id: result.insertedId } };
  } catch (err) {
    if ((err as { code?: number }).code === 11000) {
      // Another request registered this address between the lookup and here.
      return { ok: false, reason: "duplicate" };
    }
    throw err;
  }
}
