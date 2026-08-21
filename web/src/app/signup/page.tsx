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

export default function SignUpPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [attempted, setAttempted] = useState(false);

  const complete =
    name.trim().length > 0 && email.trim().length > 0 && password.length >= 8;

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
          <label className="field">
            <span className="field-label">Name</span>
            <input
              type="text"
              name="name"
              autoComplete="name"
              placeholder="Kim Sihoon"
              value={name}
              onChange={(event) => setName(event.target.value)}
              required
            />
          </label>

          <label className="field">
            <span className="field-label">Email</span>
            <input
              type="email"
              name="email"
              autoComplete="email"
              placeholder="you@company.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </label>

          <label className="field">
            <span className="field-label">Password</span>
            <input
              type="password"
              name="password"
              autoComplete="new-password"
              placeholder="At least 8 characters"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              minLength={8}
            />
            <span className="field-hint">At least 8 characters.</span>
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
