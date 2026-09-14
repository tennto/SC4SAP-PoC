"use client";

/**
 * Sign-up.
 *
 * Posts to `/api/auth/signup`, which creates the row and signs the new account
 * in on the same request — so this screen lands on the dashboard rather than
 * bouncing back to sign-in for a password that was just typed twice.
 *
 * Unlike sign-in, a failure here can name its field: whether an address is
 * already registered is not a secret this form can keep, since the answer is
 * whether the account got created.
 *
 * The reserved-account rule in `lib/reserved-accounts.ts` runs here as well as
 * in the endpoint, so `admin@…` is refused while it is being typed rather than
 * after a submit. The endpoint is still the one that decides.
 *
 * Rendered without the app shell — see `BARE_ROUTES` in AppShell.
 */
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/Icon";
import { GoogleMark } from "@/components/GoogleMark";
import { isPasswordValid } from "@/lib/password";
import { isReservedEmail, isReservedName } from "@/lib/reserved-accounts";
import { useLocale } from "@/lib/i18n/client";
import { LanguageSwitch } from "@/components/LanguageSwitch";

export default function SignUpPage() {
  const router = useRouter();
  const { t: messages } = useLocale();
  const t = messages.auth;
  const [lastName, setLastName] = useState("");
  const [firstName, setFirstName] = useState("");
  const [email, setEmail] = useState("");
  const [emailTouched, setEmailTouched] = useState(false);
  const [password, setPassword] = useState("");
  const [passwordTouched, setPasswordTouched] = useState(false);
  const [confirm, setConfirm] = useState("");
  const [confirmTouched, setConfirmTouched] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /** Which input the server blamed, if it blamed one. */
  const [errorField, setErrorField] = useState<string | null>(null);
  /**
   * The rejection was specifically "this address already has an account".
   * Tracked apart from the message so the screen can offer the way out —
   * sign-in — as a link rather than as a sentence telling them to go and find
   * it themselves.
   */
  const [duplicate, setDuplicate] = useState(false);

  // The same two rules the endpoint enforces, run here so the answer arrives
  // while the field is being filled in rather than after a submit.
  const emailReserved = isReservedEmail(email);
  const nameReserved = isReservedName(lastName, firstName);
  // Held back until the field has been left once, so a reserved word is not
  // flagged the moment it is passed through on the way to something longer.
  const showEmailReserved = emailTouched && email.trim().length > 0 && emailReserved;

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
    !emailReserved &&
    !nameReserved &&
    passwordOk &&
    confirmOk &&
    confirm.length > 0;

  async function submit(event: React.FormEvent): Promise<void> {
    event.preventDefault();
    if (!complete || busy) return;

    setBusy(true);
    setError(null);
    setErrorField(null);
    setDuplicate(false);
    try {
      const response = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          lastName: lastName.trim(),
          firstName: firstName.trim(),
          email: email.trim(),
          password,
        }),
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as
          | { error?: string; field?: string }
          | null;
        setError(body?.error ?? t.signUpFailed(response.status));
        setErrorField(body?.field ?? null);
        // 409 is the endpoint's one verdict for an address that is taken.
        setDuplicate(response.status === 409);
        return;
      }

      // The account exists and the cookie is set; `refresh` is what makes the
      // layout re-read the session so the rail shows the new account.
      router.replace("/");
      router.refresh();
    } catch (err) {
      setError(t.couldNotReach((err as Error).message));
    } finally {
      setBusy(false);
    }
  }

  /**
   * The server's message, shown under the field it named rather than in the
   * status line at the foot of the form.
   *
   * A rejection about one input belongs next to that input — at the bottom of
   * a six-field form it is far enough from the cause to read as being about
   * the form as a whole. Only errors the server did not attribute stay down
   * there.
   */
  const serverError = (field: string): string | null =>
    errorField === field ? error : null;

  return (
    <main className="auth">
      <LanguageSwitch />
      <div className="auth-card rise">
        <Link className="auth-brand" href="/">
          <span className="rail-wordmark">
            <b>Super-Claude</b> for SAP
          </span>
        </Link>

        <header className="auth-head">
          <h1>{t.signUpTitle}</h1>
          <p className="auth-lede">{t.signUpLede}</p>
        </header>

        <form className="auth-form" onSubmit={submit}>
          <div className="field-pair">
            <label className="field">
              <span className="field-label">{t.lastName}</span>
              <input
                type="text"
                name="lastName"
                autoComplete="family-name"
                placeholder={t.lastNamePlaceholder}
                value={lastName}
                onChange={(event) => setLastName(event.target.value)}
                disabled={busy}
                required
              />
            </label>

            <label className="field">
              <span className="field-label">{t.firstName}</span>
              <input
                type="text"
                name="firstName"
                autoComplete="given-name"
                placeholder={t.firstNamePlaceholder}
                value={firstName}
                onChange={(event) => setFirstName(event.target.value)}
                disabled={busy}
                required
              />
            </label>
          </div>

          {/* Under the pair rather than inside one of them: the rule reads the
              two together, and marking one field would point at the wrong half
              as often as the right one. */}
          {nameReserved || serverError("lastName") ? (
            <span className="field-error" role="alert">
              {nameReserved ? t.reservedName : serverError("lastName")}
            </span>
          ) : null}

          <label className="field">
            <span className="field-label">{t.email}</span>
            <input
              className={
                errorField === "email" || showEmailReserved
                  ? "is-invalid"
                  : undefined
              }
              type="email"
              name="email"
              autoComplete="email"
              placeholder="example@company.com"
              value={email}
              onChange={(event) => {
                setEmail(event.target.value);
                // The address just changed, so a verdict about the old one is
                // no longer about anything on screen.
                if (errorField === "email") {
                  setError(null);
                  setErrorField(null);
                }
              }}
              onBlur={() => setEmailTouched(true)}
              aria-invalid={
                errorField === "email" || showEmailReserved || undefined
              }
              disabled={busy}
              required
            />
            {showEmailReserved ? (
              <span className="field-error" role="alert">
                {t.reservedEmail}
              </span>
            ) : serverError("email") ? (
              <span className="field-error" role="alert">
                {serverError("email")}
                {/* The whole answer to "already registered" is one link, so it
                    is one link and not an instruction to go and find it. */}
                {duplicate ? (
                  <>
                    {" "}
                    <Link className="field-error-link" href="/signin">
                      {t.goToSignIn}
                    </Link>
                  </>
                ) : null}
              </span>
            ) : null}
          </label>

          <label className="field">
            <span className="field-label">{t.password}</span>
            <input
              className={showPasswordError ? "is-invalid" : undefined}
              type="password"
              name="password"
              autoComplete="new-password"
              placeholder={t.passwordPlaceholder}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              onBlur={() => setPasswordTouched(true)}
              aria-invalid={showPasswordError || undefined}
              disabled={busy}
              required
            />
            {showPasswordError || serverError("password") ? (
              <span className="field-error" role="alert">
                {showPasswordError ? t.passwordRule : serverError("password")}
              </span>
            ) : (
              <span className="field-hint">{t.passwordHint}</span>
            )}
          </label>

          <label className="field">
            <span className="field-label">{t.confirmPassword}</span>
            <input
              className={showConfirmError ? "is-invalid" : undefined}
              type="password"
              name="confirmPassword"
              autoComplete="new-password"
              placeholder={t.confirmPlaceholder}
              value={confirm}
              onChange={(event) => setConfirm(event.target.value)}
              onBlur={() => setConfirmTouched(true)}
              aria-invalid={showConfirmError || undefined}
              disabled={busy}
              required
            />
            {showConfirmError ? (
              <span className="field-error" role="alert">
                {t.passwordMismatch}
              </span>
            ) : null}
          </label>

          <button
            className="primary auth-submit"
            type="submit"
            disabled={!complete || busy}
          >
            <Icon name={busy ? "circle-notch" : "user-plus"} />
            {busy ? t.creatingAccount : t.createAccount}
          </button>

          {/* Only what the server did not pin to a field — a 503, a network
              failure. Anything it did name is already shown under that
              field. */}
          {error && !errorField ? (
            <p className="auth-status is-error" role="alert">
              <Icon name="warning-circle" /> {error}
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

      <p
        className="auth-foot rise"
        style={{ "--delay": "160ms" } as React.CSSProperties}
      >
        <Link href="/signin">{t.signIn}</Link>
        <span aria-hidden="true">·</span>
        <Link href="/terms">{t.terms}</Link>
      </p>
    </main>
  );
}
