"use client";

/**
 * Password reset.
 *
 * One screen, two steps, rather than two routes: the code arrives by mail and
 * there is no link to click, so the person is still sitting in front of this
 * form when they go and read it. Sending them to a second URL would mean
 * re-entering the address they just typed.
 *
 * Step one asks for the address and always claims success — the endpoint
 * behind it answers the same way whether or not there is an account, and this
 * screen must not undo that by saying anything more specific.
 *
 * Rendered without the app shell — see `BARE_ROUTES` in AppShell.
 */
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/Icon";
import {
  PASSWORD_MISMATCH,
  PASSWORD_RULE,
  isPasswordValid,
} from "@/lib/password";

/** Matches the server's own cooldown, so the button unlocks when the API does. */
const RESEND_COOLDOWN_SECONDS = 60;

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [step, setStep] = useState<"email" | "code">("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [passwordTouched, setPasswordTouched] = useState(false);
  const [confirm, setConfirm] = useState("");
  const [confirmTouched, setConfirmTouched] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);

  // Counts the resend button back down. Cleared on unmount so a navigation
  // mid-count does not leave the interval running.
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(
      () => setCooldown((current) => Math.max(0, current - 1)),
      1000,
    );
    return () => clearInterval(timer);
  }, [cooldown]);

  const emailOk = email.trim().length > 0 && email.includes("@");
  const codeOk = /^\d{6}$/.test(code);
  const passwordOk = isPasswordValid(password);
  const confirmOk = confirm === password && confirm.length > 0;
  const showPasswordError = passwordTouched && !passwordOk;
  const showConfirmError = confirmTouched && confirm.length > 0 && !confirmOk;

  /** Step one, and the resend button in step two — the same request either way. */
  async function requestCode(): Promise<void> {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/auth/forgot", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as
          | { error?: string }
          | null;
        setError(body?.error ?? `Request failed (${response.status}).`);
        return;
      }

      setStep("code");
      setCooldown(RESEND_COOLDOWN_SECONDS);
    } catch (err) {
      setError(`Could not reach the server: ${(err as Error).message}`);
    } finally {
      setBusy(false);
    }
  }

  async function submitReset(): Promise<void> {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/auth/reset", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: email.trim(), code, password }),
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as
          | { error?: string }
          | null;
        setError(body?.error ?? `Reset failed (${response.status}).`);
        return;
      }

      // No session comes back by design — every one of this user's sessions was
      // just revoked. So the next screen is sign-in, carrying a note about why.
      router.replace("/signin?reset=1");
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
          <h1>Reset password</h1>
          <p className="auth-lede">
            {step === "email"
              ? "We will send a six-digit code to the address on the account."
              : `Enter the code sent to ${email.trim()}, then choose a new password.`}
          </p>
        </header>

        {step === "email" ? (
          <form
            className="auth-form"
            onSubmit={(event) => {
              event.preventDefault();
              void requestCode();
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
                disabled={busy}
                required
              />
            </label>

            <button
              className="primary auth-submit"
              type="submit"
              disabled={!emailOk || busy}
            >
              <Icon name={busy ? "circle-notch" : "paper-plane-tilt"} />
              {busy ? "Sending…" : "Send code"}
            </button>

            {error ? (
              <p className="auth-status is-error" role="alert">
                <Icon name="warning-circle" /> {error}
              </p>
            ) : null}
          </form>
        ) : (
          <form
            className="auth-form"
            onSubmit={(event) => {
              event.preventDefault();
              void submitReset();
            }}
          >
            {/* Said plainly rather than as a confirmation, because it is true
                whether or not that address has an account — the endpoint does
                not say, and neither can this. */}
            <p className="auth-status" role="status">
              <Icon name="envelope-simple" /> If that address has an account, a
              code is on its way. It expires in 10 minutes.
            </p>

            <label className="field">
              <span className="field-label">Six-digit code</span>
              <input
                className="code-input"
                type="text"
                name="code"
                autoComplete="one-time-code"
                // Brings up the numeric keypad on a phone without rejecting a
                // paste, which `type="number"` would also decorate with
                // spinners nobody wants on a code.
                inputMode="numeric"
                pattern="\d{6}"
                maxLength={6}
                placeholder="000000"
                value={code}
                // Anything that is not a digit is dropped rather than rejected,
                // so a code pasted with a stray space still lands.
                onChange={(event) =>
                  setCode(event.target.value.replace(/\D/g, "").slice(0, 6))
                }
                disabled={busy}
                required
              />
            </label>

            <label className="field">
              <span className="field-label">New password</span>
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
                disabled={busy}
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
              <span className="field-label">Confirm new password</span>
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
                disabled={busy}
                required
              />
              {showConfirmError ? (
                <span className="field-error" role="alert">
                  {PASSWORD_MISMATCH}
                </span>
              ) : null}
            </label>

            <div className="auth-row">
              <button
                className="link-button"
                type="button"
                onClick={() => void requestCode()}
                disabled={busy || cooldown > 0}
              >
                {cooldown > 0
                  ? `Resend code in ${cooldown}s`
                  : "Resend code"}
              </button>
            </div>

            <button
              className="primary auth-submit"
              type="submit"
              disabled={!codeOk || !passwordOk || !confirmOk || busy}
            >
              <Icon name={busy ? "circle-notch" : "key"} />
              {busy ? "Resetting…" : "Reset password"}
            </button>

            {error ? (
              <p className="auth-status is-error" role="alert">
                <Icon name="warning-circle" /> {error}
              </p>
            ) : null}
          </form>
        )}
      </div>

      <p
        className="auth-foot rise"
        style={{ "--delay": "160ms" } as React.CSSProperties}
      >
        <Link href="/signin">Back to sign in</Link>
        <span aria-hidden="true">·</span>
        <Link href="/signup">Sign up</Link>
      </p>
    </main>
  );
}
