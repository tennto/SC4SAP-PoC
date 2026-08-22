"use client";

/**
 * Sign-in.
 *
 * A real gate now: it posts to `/api/auth/signin`, which sets the session
 * cookie that `proxy.ts` and every protected page read.
 *
 * The failure message is whatever the endpoint returns, and the endpoint
 * deliberately returns the same sentence for a wrong password as for an
 * address that was never registered — so this screen has nothing to mark one
 * field with, and does not try to.
 *
 * Rendered without the app shell — see `BARE_ROUTES` in AppShell.
 */
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/Icon";
import { GoogleMark } from "@/components/GoogleMark";
import { PASSWORD_RULE, isPasswordValid } from "@/lib/password";
import { googleErrorMessage } from "@/lib/auth/google-errors";

export default function SignInPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordTouched, setPasswordTouched] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /** Arrived here from a completed password reset. */
  const [afterReset, setAfterReset] = useState(false);

  // Read after mount rather than through `useSearchParams`, which would need a
  // Suspense boundary around the form to prerender. Neither notice is
  // something the form depends on, so appearing a frame late costs nothing.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setAfterReset(params.get("reset") === "1");
    // Google sign-in can only report back through the URL — see
    // `api/auth/google/callback`.
    const failure = googleErrorMessage(params.get("error"));
    if (failure) setError(failure);
  }, []);

  // Sign-in holds the entered password to the same rule sign-up sets, so a
  // password that could never have been registered is caught here rather than
  // being spent on a round trip. Held back until the field has been left once,
  // so the rule is not shown against a password still being typed.
  const passwordOk = isPasswordValid(password);
  const showPasswordError = passwordTouched && !passwordOk;

  const complete = email.trim().length > 0 && passwordOk;

  async function submit(event: React.FormEvent): Promise<void> {
    event.preventDefault();
    if (!complete || busy) return;

    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/auth/signin", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password }),
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as
          | { error?: string }
          | null;
        setError(body?.error ?? `Sign-in failed (${response.status}).`);
        return;
      }

      // Read at submit time rather than through `useSearchParams`, which would
      // need a Suspense boundary around the whole form to prerender.
      const next = new URLSearchParams(window.location.search).get("next");
      // `replace`, so the back button does not land on a sign-in form the user
      // is now past. `refresh` because the layout renders the account menu
      // from the session and its cached copy predates the cookie.
      router.replace(next?.startsWith("/") ? next : "/");
      router.refresh();
    } catch (err) {
      setError(`Could not reach the server: ${(err as Error).message}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="auth">
      <div className="auth-card rise">
        <Link className="auth-brand" href="/">
          <span className="rail-wordmark">
            <b>Super-Claude</b> for SAP
          </span>
        </Link>

        <header className="auth-head">
          <h1>Sign in</h1>
          <p className="auth-lede">
            Use the account your SAP connection profile is registered to.
          </p>
        </header>

        <form className="auth-form" onSubmit={submit}>
          <label className="field">
            <span className="field-label">Email</span>
            <input
              type="email"
              name="email"
              autoComplete="username"
              placeholder="example@company.com"
              value={email}
              onChange={(event) => {
                setEmail(event.target.value);
                // A message about a Google attempt is not about the form they
                // have now started filling in.
                setError(null);
              }}
              disabled={busy}
              required
            />
          </label>

          <label className="field">
            <span className="field-label">Password</span>
            <input
              className={showPasswordError ? "is-invalid" : undefined}
              type="password"
              name="password"
              autoComplete="current-password"
              placeholder="••••••••"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              onBlur={() => setPasswordTouched(true)}
              aria-invalid={showPasswordError || undefined}
              disabled={busy}
              required
            />
            {showPasswordError ? (
              <span className="field-error" role="alert">
                {PASSWORD_RULE}
              </span>
            ) : null}
          </label>

          <div className="auth-row">
            <Link className="link-button" href="/forgot">
              Forgot password
            </Link>
          </div>

          <button
            className="primary auth-submit"
            type="submit"
            disabled={!complete || busy}
          >
            <Icon name={busy ? "circle-notch" : "sign-in"} />
            {busy ? "Signing in…" : "Sign in"}
          </button>

          {error ? (
            <p className="auth-status is-error" role="alert">
              <Icon name="warning-circle" /> {error}
            </p>
          ) : afterReset ? (
            <p className="auth-status" role="status">
              <Icon name="check-circle" /> Password changed. Everything that was
              signed in has been signed out — including this browser.
            </p>
          ) : null}

          <div className="auth-sep">
            <span>or</span>
          </div>

          {/* A link, not a button: `/api/auth/google` answers with a redirect
              to Google, and a plain navigation is what should follow one. It
              also means the flow survives with JavaScript still loading. */}
          <a className="ghost auth-submit" href="/api/auth/google">
            <GoogleMark />
            Continue with Google
          </a>
        </form>
      </div>

      <p className="auth-foot rise" style={{ "--delay": "160ms" } as React.CSSProperties}>
        <Link href="/signup">Sign up</Link>
        <span aria-hidden="true">·</span>
        <Link href="/terms">Terms</Link>
      </p>
    </main>
  );
}
