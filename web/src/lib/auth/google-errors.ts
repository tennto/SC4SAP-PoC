/**
 * What the `?error=` code on `/signin` means, in words.
 *
 * The callback can only speak to the browser by redirecting, so every outcome
 * becomes a short code in the URL and this is where it turns back into a
 * sentence. Kept out of `lib/auth/google.ts` because that file is
 * `server-only` and this is read by the sign-in form.
 */
export const GOOGLE_ERRORS: Record<string, string> = {
  "google-unconfigured":
    "Google sign-in is not configured on this server. Use an email and password.",
  "google-cancelled": "Google sign-in was cancelled.",
  "google-state":
    "That sign-in attempt could not be verified. Start again from this screen.",
  "google-unverified":
    "Google has not verified the address on that account, so it cannot be used to sign in here.",
  "google-reserved":
    "That address is reserved for operations. Use a personal Google account.",
  "google-retry": "Something raced us. Try signing in with Google again.",
  "google-store": "The user store could not be reached. Try again shortly.",
  "google-failed": "Google sign-in did not complete. Try again.",
};

export function googleErrorMessage(code: string | null): string | null {
  if (!code) return null;
  return GOOGLE_ERRORS[code] ?? "Google sign-in did not complete. Try again.";
}
