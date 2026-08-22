import "server-only";
import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";

/**
 * Password hashing.
 *
 * `scrypt` from Node's own `crypto` rather than bcrypt or argon2, both of which
 * are native modules — a compile step on every install, and the usual place a
 * Windows checkout of a project like this one falls over. scrypt is memory-hard,
 * ships in the runtime, and is what Node documents for exactly this job.
 *
 * The stored string carries its own parameters:
 *
 *   scrypt$16384$8$1$<salt base64url>$<hash base64url>
 *
 * so raising the cost later does not invalidate existing rows — an old hash
 * still verifies against the parameters it was written with, and is rewritten
 * at the next successful sign-in if that is ever wired up.
 */

/** OWASP's floor for scrypt, and Node's own default N. */
const COST = 16_384;
const BLOCK_SIZE = 8;
const PARALLELISM = 1;
const KEY_LENGTH = 64;
const SALT_LENGTH = 16;

/**
 * Node's default `maxmem` is 32 MB, and N=16384/r=8 needs ~128 × N × r = 16 MB
 * for the main array plus overhead. Stated rather than left to the default so
 * a future cost bump fails loudly at the call rather than mysteriously.
 */
const MAX_MEM = 64 * 1024 * 1024;

function derive(password: string, salt: Buffer, keyLength: number): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(
      // Normalize so the same password typed on two keyboards — a composed vs
      // decomposed accent, say — hashes to the same thing.
      password.normalize("NFKC"),
      salt,
      keyLength,
      { N: COST, r: BLOCK_SIZE, p: PARALLELISM, maxmem: MAX_MEM },
      (err, key) => (err ? reject(err) : resolve(key)),
    );
  });
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(SALT_LENGTH);
  const key = await derive(password, salt, KEY_LENGTH);
  return [
    "scrypt",
    COST,
    BLOCK_SIZE,
    PARALLELISM,
    salt.toString("base64url"),
    key.toString("base64url"),
  ].join("$");
}

/**
 * Compare in constant time, and treat any malformed stored value as a plain
 * mismatch rather than an exception — a corrupt row should fail the sign-in,
 * not 500 the endpoint and tell the caller that this account is special.
 */
export async function verifyPassword(
  password: string,
  stored: string,
): Promise<boolean> {
  const parts = stored.split("$");
  if (parts.length !== 6 || parts[0] !== "scrypt") return false;

  const [, cost, blockSize, parallelism, saltB64, hashB64] = parts;
  const salt = Buffer.from(saltB64, "base64url");
  const expected = Buffer.from(hashB64, "base64url");
  if (salt.length === 0 || expected.length === 0) return false;

  let key: Buffer;
  try {
    key = await new Promise<Buffer>((resolve, reject) => {
      scrypt(
        password.normalize("NFKC"),
        salt,
        expected.length,
        {
          N: Number(cost),
          r: Number(blockSize),
          p: Number(parallelism),
          maxmem: MAX_MEM,
        },
        (err, derived) => (err ? reject(err) : resolve(derived)),
      );
    });
  } catch {
    return false;
  }

  return timingSafeEqual(key, expected);
}
