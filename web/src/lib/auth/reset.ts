import "server-only";
import { randomInt } from "node:crypto";
import { ObjectId } from "mongodb";
import { resets, users } from "@/lib/mongo";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { findByEmail, normalizeEmail } from "@/lib/auth/users";
import { sendMail } from "@/lib/mail";
import { resetCodeMail } from "@/lib/mail-templates";
import { revokeSessionsFor } from "@/lib/auth/session";

/**
 * Password reset by six-digit code.
 *
 * A code, not a link, because a link needs somewhere to point and this app is
 * localhost. The trade is that six digits is a million-wide space, which is
 * small — so the guessing defences are not optional here the way they would be
 * with a 256-bit token, and they are what most of this file is:
 *
 *   - the code is generated with `randomInt`, which is CSPRNG-backed and
 *     unbiased, not `Math.random()` scaled into range;
 *   - only a scrypt hash of it is stored, so ~100ms per guess is imposed on
 *     anyone who has the row and on anyone guessing through the endpoint;
 *   - five wrong guesses burn the code, so an online attacker gets five tries
 *     per issued code, not a million;
 *   - a new code cannot be requested more than once a minute per address, and
 *     a burnt code is kept until it expires precisely so that the cooldown can
 *     still see it — deleting it would hand out a fresh code immediately and
 *     make the five-guess ceiling meaningless;
 *   - the code lives ten minutes.
 *
 * Five guesses out of 10^6, refreshable once a minute, is about a 1-in-3000
 * chance of a hit over an hour of sustained attack against a *known* address.
 * That is the cost of a code rather than a link, and it is the reason the reset
 * endpoint also demands the address the code was issued for.
 */

const CODE_TTL_MINUTES = 10;
const MAX_ATTEMPTS = 5;
/** How long before another code can be issued for the same address. */
const REISSUE_COOLDOWN_MS = 60_000;

/**
 * What `codeHash` is overwritten with once a code is burnt through.
 *
 * The row is kept rather than deleted, and this is why: the reissue cooldown
 * below works by finding a live row for the address, so deleting a burnt code
 * would hand the attacker an immediate fresh one and five more guesses. Keeping
 * it means the cooldown still sees it and the five-per-minute ceiling is real.
 *
 * `verifyPassword` rejects this on sight — it is not in `scrypt$N$r$p$s$h`
 * form — so no guess can match it and no scrypt work is spent trying.
 */
const BURNT = "burnt";

/** Always six characters, leading zeros kept. */
function generateCode(): string {
  return String(randomInt(0, 1_000_000)).padStart(6, "0");
}

export const RESET_CODE_MINUTES = CODE_TTL_MINUTES;

/**
 * Issue a code for `email`, if there is an account behind it.
 *
 * Returns nothing the caller can use to tell whether there was one. That is
 * the point: the endpoint above this answers the same way regardless, so the
 * form cannot be used to enumerate registered addresses.
 *
 * Cooldown and delivery failures are handled here rather than reported, for
 * the same reason — the caller has no branch to make on them.
 */
export async function requestReset(email: string): Promise<void> {
  const normalized = normalizeEmail(email);
  const collection = await resets();

  // The throttle is on the address, not on whether it has an account, so a
  // rapid second request looks identical either way.
  const recent = await collection.findOne(
    { email: normalized, expiresAt: { $gt: new Date() } },
    { sort: { createdAt: -1 } },
  );
  if (recent && Date.now() - recent.createdAt.getTime() < REISSUE_COOLDOWN_MS) {
    return;
  }

  const user = await findByEmail(normalized);
  if (!user) return;

  const code = generateCode();
  const now = new Date();

  // One live code per address. Replacing rather than adding means the previous
  // code stops working the moment a new one is asked for, so a code read over
  // someone's shoulder is dead as soon as they request another.
  await collection.deleteMany({ email: normalized });
  await collection.insertOne({
    userId: String(user._id),
    email: normalized,
    codeHash: await hashPassword(code),
    attempts: 0,
    createdAt: now,
    expiresAt: new Date(now.getTime() + CODE_TTL_MINUTES * 60_000),
  });

  // Sent to the address as the user typed it, so the mail does not arrive
  // addressed to a lower-cased version of their own address.
  await sendMail(await resetCodeMail(user.displayEmail, code, CODE_TTL_MINUTES));
}

export type ResetOutcome =
  | { ok: true }
  /** Wrong, expired, already used, or never issued — one verdict for all of them. */
  | { ok: false; reason: "invalid" }
  /** The code was burnt by too many wrong guesses. A new one must be requested. */
  | { ok: false; reason: "exhausted" };

/**
 * Spend a code and set the new password.
 *
 * On success every existing session for that user is revoked. Someone resetting
 * a password is often doing it because they think someone else has it, and a
 * reset that leaves the other party signed in on their own machine does not
 * answer that. It also means this device has to sign in with the new password,
 * which is why the endpoint does not hand back a session.
 */
export async function completeReset(
  email: string,
  code: string,
  newPassword: string,
): Promise<ResetOutcome> {
  const normalized = normalizeEmail(email);
  const collection = await resets();

  const record = await collection.findOne({ email: normalized });
  if (!record || record.expiresAt.getTime() <= Date.now()) {
    return { ok: false, reason: "invalid" };
  }

  // A code that was already guessed to death. Reported before any hashing, so
  // an exhausted code costs nothing to answer.
  if (record.attempts >= MAX_ATTEMPTS) {
    return { ok: false, reason: "exhausted" };
  }

  if (!(await verifyPassword(code, record.codeHash))) {
    // Counted in the database rather than in memory, so the ceiling survives a
    // restart and cannot be reset by racing two requests through one process.
    const after = await collection.findOneAndUpdate(
      { _id: record._id },
      { $inc: { attempts: 1 } },
      { returnDocument: "after" },
    );
    if (!after || after.attempts >= MAX_ATTEMPTS) {
      // Burnt, not deleted — see `BURNT`. The row has to outlive the code so
      // the reissue cooldown can still see it.
      await collection.updateOne(
        { _id: record._id },
        { $set: { codeHash: BURNT, attempts: MAX_ATTEMPTS } },
      );
      return { ok: false, reason: "exhausted" };
    }
    return { ok: false, reason: "invalid" };
  }

  // Burn the code before touching the password, so a crash between the two
  // leaves a spent code rather than a live one.
  const spent = await collection.deleteOne({ _id: record._id });
  if (spent.deletedCount !== 1) {
    // Another request got there first with the same code. Only one of them may
    // proceed, and it was not this one.
    return { ok: false, reason: "invalid" };
  }

  await (await users()).updateOne(
    { _id: new ObjectId(record.userId) },
    { $set: { passwordHash: await hashPassword(newPassword) } },
  );
  await revokeSessionsFor(record.userId);

  return { ok: true };
}
