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
import { LoopingVideo } from "@/components/LoopingVideo";
import { isPasswordValid } from "@/lib/password";
import { useLocale } from "@/lib/i18n/client";
import { LanguageSwitch } from "@/components/LanguageSwitch";

export default function SignInPage() {
  const router = useRouter();
  const { t: messages } = useLocale();
  const t = messages.auth;
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordTouched, setPasswordTouched] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /** Arrived here from a completed password reset. */
  const [afterReset, setAfterReset] = useState(false);
  /** The `?error=` code, kept as a code so the sentence follows the language. */
  const [googleCode, setGoogleCode] = useState<string | null>(null);

  // Read after mount rather than through `useSearchParams`, which would need a
  // Suspense boundary around the form to prerender. Neither notice is
  // something the form depends on, so appearing a frame late costs nothing.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setAfterReset(params.get("reset") === "1");
    // Google sign-in can only report back through the URL — see
    // `api/auth/google/callback`.
    setGoogleCode(params.get("error"));
  }, []);

  const googleFailure = googleCode
    ? (t.google[googleCode] ?? t.googleFallback)
    : null;

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
        setError(body?.error ?? t.signInFailed(response.status));
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
      setError(t.couldNotReach((err as Error).message));
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="auth auth-split">
      <LanguageSwitch />
      {/* Decoration, not content: muted, looping, and hidden from the
          accessibility tree, so nothing here is announced or focusable. */}
      <div className="auth-media" aria-hidden="true">
        <LoopingVideo className="auth-media-video" src="/assets/video_f.mp4" />
      </div>

      <div className="auth-pane">
        <div className="auth-card rise">
          <Link className="auth-brand" href="/">
            <span className="rail-wordmark">
              <b>Super-Claude</b> for SAP
            </span>
          </Link>

          <header className="auth-head">
            <h1>{t.signInTitle}</h1>
            <p className="auth-lede">{t.signInLede}</p>
          </header>

          <form className="auth-form" onSubmit={submit}>
            <label className="field">
              <span className="field-label">{t.email}</span>
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
              <span className="field-label">{t.password}</span>
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
                  {t.passwordRule}
                </span>
              ) : null}
            </label>

            <div className="auth-row">
              <Link className="link-button" href="/forgot">
                {t.forgotPassword}
              </Link>
            </div>

            <button
              className="primary auth-submit"
              type="submit"
              disabled={!complete || busy}
            >
              <Icon name={busy ? "circle-notch" : "sign-in"} />
              {busy ? t.signingIn : t.signIn}
            </button>

            {error || googleFailure ? (
              <p className="auth-status is-error" role="alert">
                <Icon name="warning-circle" /> {error ?? googleFailure}
              </p>
            ) : afterReset ? (
              <p className="auth-status" role="status">
                <Icon name="check-circle" /> {t.afterReset}
              </p>
            ) : null}

            <div className="auth-sep">
              <span>{t.or}</span>
            </div>

            {/* A link, not a button: `/api/auth/google` answers with a redirect
                to Google, and a plain navigation is what should follow one. It
                also means the flow survives with JavaScript still loading. */}
            <a className="ghost auth-submit" href="/api/auth/google">
              <GoogleMark />
              {t.continueWithGoogle}
            </a>
          </form>
        </div>

        <p className="auth-foot rise" style={{ "--delay": "160ms" } as React.CSSProperties}>
          <Link href="/signup">{t.signUp}</Link>
          <span aria-hidden="true">·</span>
          <Link href="/terms">{t.terms}</Link>
        </p>
      </div>
    </main>
  );
}
