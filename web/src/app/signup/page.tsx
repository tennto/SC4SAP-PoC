"use client";

/**
 * Sign-up.
 *
 * Exists so the link out of sign-in lands somewhere rather than on a 404, and
 * built from the same parts as that screen. Like it, nothing is submitted:
 * there is no user store to create a row in until Phase 5.
 *
 * Rendered without the app shell — see `BARE_ROUTES` in AppShell.
 */
import { useState } from "react";
import Link from "next/link";
import { Icon } from "@/components/Icon";
import { GoogleMark } from "@/components/GoogleMark";
import {
  PASSWORD_MISMATCH,
  PASSWORD_RULE,
  isPasswordValid,
} from "@/lib/password";

export default function SignUpPage() {
  const [lastName, setLastName] = useState("");
  const [firstName, setFirstName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordTouched, setPasswordTouched] = useState(false);
  const [confirm, setConfirm] = useState("");
  const [confirmTouched, setConfirmTouched] = useState(false);
  const [attempted, setAttempted] = useState(false);

  const passwordOk = isPasswordValid(password);
  const confirmOk = confirm === password;
  // Held back until the field has been left once, so the rule is not shown as
  // an error against a password that is only half typed.
  const showPasswordError = passwordTouched && !passwordOk;
  // The confirmation reads against whatever the first field currently holds,
  // so editing the password back above a matching confirmation re-flags it
  // rather than leaving a stale pass.
  const showConfirmError = confirmTouched && confirm.length > 0 && !confirmOk;

  const complete =
    lastName.trim().length > 0 &&
    firstName.trim().length > 0 &&
    email.trim().length > 0 &&
    passwordOk &&
    confirmOk &&
    confirm.length > 0;

  return (
    <main className="auth">
      <div className="auth-card rise">
        <Link className="auth-brand" href="/">
          <span className="rail-wordmark">
            <b>Super-Claude</b> for SAP
          </span>
        </Link>

        <header className="auth-head">
          <h1>Create an account</h1>
          <p className="auth-lede">
            One account per operator. The SAP connection profile is attached
            afterwards, in settings.
          </p>
        </header>

        <form
          className="auth-form"
          onSubmit={(event) => {
            event.preventDefault();
            setAttempted(true);
          }}
        >
          <div className="field-pair">
            <label className="field">
              <span className="field-label">Last name</span>
              <input
                type="text"
                name="lastName"
                autoComplete="family-name"
                placeholder="Kim"
                value={lastName}
                onChange={(event) => setLastName(event.target.value)}
                required
              />
            </label>

            <label className="field">
              <span className="field-label">First name</span>
              <input
                type="text"
                name="firstName"
                autoComplete="given-name"
                placeholder="Sihoon"
                value={firstName}
                onChange={(event) => setFirstName(event.target.value)}
                required
              />
            </label>
          </div>

          <label className="field">
            <span className="field-label">Email</span>
            <input
              type="email"
              name="email"
              autoComplete="email"
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
              autoComplete="new-password"
              placeholder="At least 10 characters"
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
            ) : (
              <span className="field-hint">
                Letters, digits and one symbol. At least 10 characters.
              </span>
            )}
          </label>

          <label className="field">
            <span className="field-label">Confirm password</span>
            <input
              className={showConfirmError ? "is-invalid" : undefined}
              type="password"
              name="confirmPassword"
              autoComplete="new-password"
              placeholder="Repeat the password"
              value={confirm}
              onChange={(event) => setConfirm(event.target.value)}
              onBlur={() => setConfirmTouched(true)}
              aria-invalid={showConfirmError || undefined}
              required
            />
            {showConfirmError ? (
              <span className="field-error" role="alert">
                {PASSWORD_MISMATCH}
              </span>
            ) : null}
          </label>

          <button
            className="primary auth-submit"
            type="submit"
            disabled={!complete}
          >
            <Icon name="user-plus" />
            Create account
          </button>

          {attempted ? (
            <p className="auth-status" role="status">
              <Icon name="info" /> Sign-up has no backend yet. Nothing was sent
              or stored.
            </p>
          ) : null}

          <div className="auth-sep">
            <span>or</span>
          </div>

          <button
            className="ghost auth-submit"
            type="button"
            title="Not wired up yet"
          >
            <GoogleMark />
            Continue with Google
          </button>
        </form>
      </div>

      <p
        className="auth-foot rise"
        style={{ "--delay": "160ms" } as React.CSSProperties}
      >
        <Link href="/signin">Sign in</Link>
        <span aria-hidden="true">·</span>
        <Link href="/terms">Terms</Link>
      </p>
    </main>
  );
}
