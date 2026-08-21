"use client";

/**
 * Sign-in.
 *
 * A screen, not a gate: nothing behind it is protected yet. The PoC takes its
 * API key from the server's own `.env` and its SAP credentials from one
 * profile chosen at provisioning time, so there is no per-user identity for a
 * password to resolve to. Phase 5 is what gives this a backend; until then the
 * form validates, reports that it cannot go further, and says so plainly
 * rather than pretending to fail on the credentials.
 *
 * Rendered without the app shell — see `BARE_ROUTES` in AppShell.
 */
import { useState } from "react";
import Link from "next/link";
import { Icon } from "@/components/Icon";
import { GoogleMark } from "@/components/GoogleMark";
import { PASSWORD_RULE, isPasswordValid } from "@/lib/password";

export default function SignInPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordTouched, setPasswordTouched] = useState(false);
  const [attempted, setAttempted] = useState(false);

  // Sign-in holds the entered password to the same rule sign-up sets, so a
  // password that could never have been registered is caught here rather than
  // being spent on a round trip. Held back until the field has been left once,
  // so the rule is not shown against a password still being typed.
  const passwordOk = isPasswordValid(password);
  const showPasswordError = passwordTouched && !passwordOk;

  const complete = email.trim().length > 0 && passwordOk;

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

        <form
          className="auth-form"
          onSubmit={(event) => {
            event.preventDefault();
            setAttempted(true);
          }}
        >
          <label className="field">
            <span className="field-label">Email</span>
            <input
              type="email"
              name="email"
              autoComplete="username"
              placeholder="example@company.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
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
              required
            />
            {showPasswordError ? (
              <span className="field-error" role="alert">
                {PASSWORD_RULE}
              </span>
            ) : null}
          </label>

          <div className="auth-row">
            <Link className="link-button" href="/signin">
              Forgot password
            </Link>
          </div>

          <button className="primary auth-submit" type="submit" disabled={!complete}>
            <Icon name="sign-in" />
            Sign in
          </button>

          {/* Only after a real submit: a standing warning would read as an
              error the form is already in. */}
          {attempted ? (
            <p className="auth-status" role="status">
              <Icon name="info" /> Sign-in has no backend yet. Credentials are
              not sent anywhere.
            </p>
          ) : null}

          <div className="auth-sep">
            <span>or</span>
          </div>

          <button className="ghost auth-submit" type="button" title="Not wired up yet">
            <GoogleMark />
            Continue with Google
          </button>
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
