import "server-only";
import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "node:crypto";

/**
 * Reversible encryption for the two secrets `/setup` collects.
 *
 * Passwords are hashed, never encrypted — see `lib/auth/password.ts`, which is
 * the right shape for a credential nobody has to read back. These two are the
 * opposite case: the SAP password is replayed at every ADT handshake and the
 * Anthropic key is sent on every turn, so the server has to be able to recover
 * the plaintext. That rules out a hash, and it means the honest thing to do is
 * encrypt them properly rather than store them as they arrived.
 *
 * AES-256-GCM, so the ciphertext is authenticated: a row edited in the
 * database fails to open rather than decrypting to something else. The key is
 * derived from `SETUP_SECRET` and lives only in the process — a dump of the
 * `users` collection on its own is not enough to read anything back, which is
 * the whole property being bought here.
 *
 * What this is *not*: a KMS, an HSM, or key rotation. `SETUP_SECRET` sits in
 * the same `.env.local` as the database URI, so anyone holding the environment
 * holds both halves. That is the correct trade for a PoC running on one
 * machine and the wrong one for anything with an operations team; the seam for
 * fixing it is this file, and the stored format carries a version tag so a
 * second scheme can be added without a migration.
 */

/** `v1.<iv>.<tag>.<ciphertext>`, each part base64url. */
const VERSION = "v1";
const IV_LENGTH = 12; // 96 bits, the size GCM is specified for.
const KEY_LENGTH = 32;

/**
 * A fixed salt, not a random one.
 *
 * Per-secret salts are what stop a stolen table of password hashes being
 * attacked once for every row at a time. There is no table here: one key,
 * derived once, from a value that is already high-entropy — a random salt
 * would only mean storing it alongside every ciphertext to derive the same key
 * again.
 */
const SALT = "sc4sap.setup.v1";

let cachedKey: Buffer | null = null;

/**
 * Read lazily and cache. Lazily because a missing variable should fail the one
 * request that needed a secret, with a message naming what to set — not take
 * down every route in the app at import time. Cached because scrypt is
 * deliberately slow and this would otherwise be paid per field.
 */
function key(): Buffer {
  if (cachedKey) return cachedKey;

  const secret = process.env.SETUP_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error(
      "SETUP_SECRET is not set, or is shorter than 32 characters. It is the " +
        "key the stored SAP password and Anthropic key are encrypted with. " +
        "Generate one with `node -e \"console.log(require('crypto')" +
        '.randomBytes(32).toString(\'base64url\'))"` and put it in ' +
        "web/.env.local.",
    );
  }

  cachedKey = scryptSync(secret, SALT, KEY_LENGTH);
  return cachedKey;
}

/** Plaintext in, a string safe to store in Mongo out. */
export function seal(plain: string): string {
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  const body = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  return [
    VERSION,
    iv.toString("base64url"),
    cipher.getAuthTag().toString("base64url"),
    body.toString("base64url"),
  ].join(".");
}

/**
 * The reverse. Throws rather than returning `null` on anything malformed: a
 * secret that cannot be opened is not an empty secret, and a caller that took
 * `""` for an answer would go on to attempt a connection with a blank password
 * and report the system as having refused it.
 */
export function open(sealed: string): string {
  const parts = sealed.split(".");
  if (parts.length !== 4 || parts[0] !== VERSION) {
    throw new Error("Stored secret is not in a format this server can read.");
  }

  const [, ivB64, tagB64, bodyB64] = parts;
  const decipher = createDecipheriv(
    "aes-256-gcm",
    key(),
    Buffer.from(ivB64, "base64url"),
  );
  decipher.setAuthTag(Buffer.from(tagB64, "base64url"));

  try {
    return Buffer.concat([
      decipher.update(Buffer.from(bodyB64, "base64url")),
      decipher.final(),
    ]).toString("utf8");
  } catch {
    // GCM's tag check failed: the row was altered, or `SETUP_SECRET` is not
    // the one it was written with. Both mean the same thing to the caller.
    throw new Error(
      "Stored secret could not be decrypted. SETUP_SECRET may have changed " +
        "since it was saved.",
    );
  }
}
