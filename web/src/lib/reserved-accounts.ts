/**
 * Addresses and names that may not be registered.
 *
 * The point is not security — nothing here stops anyone doing anything, and a
 * real `admin` account would be created by an operator, not through this form.
 * The point is that `admin@…` or a display name of "Administrator" reads as
 * official inside the app, and the rail shows that name next to every session.
 * Somebody who registers it can lean on it in a conversation with a colleague.
 *
 * No `server-only` here on purpose: the sign-up form and the sign-up endpoint
 * both enforce this, and a rule that drifts between the two is worse than no
 * rule. The endpoint is the one that decides — the form's copy only saves a
 * round trip.
 */

/**
 * Blocked wherever they appear in the local part.
 *
 * Every entry is long and specific enough that a person's real address is very
 * unlikely to contain it by accident, which is what earns the substring match:
 * `admin` also catches `sysadmin`, `superadmin`, `admin-prod` and
 * `kim.admin.ops` without any of those needing an entry.
 */
const RESERVED_ANYWHERE = [
  "admin",
  "superuser",
  "sysop",
  "postmaster",
  "hostmaster",
  "listmaster",
  "webmaster",
  "moderator",
  "operator",
  "noreply",
  "donotreply",
  "helpdesk",
  // The product's own names. `sc4sap-support@…` is the address a phishing
  // attempt would want.
  "sc4sap",
  "superclaude",
];

/**
 * Blocked only as the whole local part, optionally with trailing digits.
 *
 * These are ordinary enough words that a substring match would reject real
 * people — `root` is inside `rootes`, `dev` inside `devi`, `ops` inside
 * `hopson`. So `root`, `root2` and `root-01` are refused while `rootes` is
 * not.
 */
const RESERVED_EXACT = [
  "root",
  "abuse",
  "security",
  "support",
  "billing",
  "contact",
  "owner",
  "master",
  "system",
  "service",
  "staff",
  "ops",
  "dev",
  "test",
  "qa",
  "prd",
  "backup",
  "daemon",
  "nobody",
  "guest",
  "anonymous",
];

export const RESERVED_EMAIL_MESSAGE =
  "That address is reserved for operations. Use a personal address instead.";

export const RESERVED_NAME_MESSAGE =
  "That name is reserved for operations. Use the name on the account.";

/**
 * Everything that is not a letter or a digit comes out, so the separators
 * someone might pad a reserved word with — dots, dashes, underscores — cannot
 * be used to walk past the list. A `+tag` is dropped first, since it addresses
 * the same mailbox as the part before it.
 */
function normalize(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .split("+")[0]
    .replace(/[^a-z0-9]/g, "");
}

/** `admin01` counts as `admin`; `admin1x` does not. */
function withoutTrailingDigits(value: string): string {
  return value.replace(/\d+$/, "");
}

export function isReservedEmail(email: string): boolean {
  const at = email.lastIndexOf("@");
  // No `@` yet — the form calls this while someone is still typing. Judge what
  // is there rather than passing a half-typed address as acceptable.
  const local = normalize(at === -1 ? email : email.slice(0, at));
  if (local.length === 0) return false;

  if (RESERVED_ANYWHERE.some((word) => local.includes(word))) return true;

  const stem = withoutTrailingDigits(local);
  return RESERVED_EXACT.some((word) => local === word || stem === word);
}

/**
 * Names are held to the exact rule only, both parts and the two joined.
 *
 * A substring match on a person's name would be a bad trade: "Ops" inside a
 * surname is somebody's actual name, and being told it is reserved is a worse
 * outcome than the display-name impersonation it would prevent.
 */
export function isReservedName(...parts: string[]): boolean {
  const candidates = [...parts, parts.join("")];
  return candidates.some((candidate) => {
    const value = normalize(candidate);
    if (value.length === 0) return false;
    const stem = withoutTrailingDigits(value);
    return [...RESERVED_ANYWHERE, ...RESERVED_EXACT].some(
      (word) => value === word || stem === word,
    );
  });
}
