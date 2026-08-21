/**
 * The one password rule, kept in one place because sign-in and sign-up both
 * enforce it and a rule that drifts between the two screens is worse than no
 * rule at all.
 *
 * Ten characters carrying at least one letter, one digit and one symbol.
 * "Symbol" is anything that is not a letter, a digit or whitespace, so a
 * keyboard the rule was not written against still has a way to satisfy it.
 *
 * Note this is a front-end check only, and stays one until Phase 5 gives these
 * screens a backend: it shapes what a user types, it does not protect
 * anything. The same rule has to be re-applied server-side there.
 */
export const PASSWORD_RULE =
  "Password must be at least 10 characters and include a letter, a digit and a symbol.";

export const PASSWORD_MISMATCH = "Passwords do not match.";

export function isPasswordValid(value: string): boolean {
  return (
    value.length >= 10 &&
    /[A-Za-z]/.test(value) &&
    /[0-9]/.test(value) &&
    /[^A-Za-z0-9\s]/.test(value)
  );
}
