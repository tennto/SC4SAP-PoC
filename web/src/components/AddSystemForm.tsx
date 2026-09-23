"use client";

/**
 * Add a SAP system: three short cards, a live logon check, then a profile.
 *
 * Built like the setup wizard rather than as one long form, and for the same
 * reason that screen is built that way: eleven fields stacked in a column is a
 * page to be scrolled and audited, and the answers fall into three questions
 * that have nothing to do with each other — where the system is, what it is,
 * and what to call it. One card per question, a rail underneath saying how far
 * along you are.
 *
 * Not the setup wizard itself, though. That one is the gate a brand-new
 * account passes through: it asks for a Console key this app already holds,
 * its way out is to sign out, and finishing it means "now you may use the
 * app". This is reached from Settings by someone already working, and it owes
 * them a way back to where they were.
 *
 * What it does share is the check. The same `/api/setup/check/sap` probe runs
 * here, because "did that host answer that logon" is one question and two
 * implementations of it would eventually give two answers.
 *
 * The order is load-bearing: already-registered, then reachable, then written.
 * A profile made from values that turn out to be wrong is not a harmless
 * leftover — it is a system in the picker that fails at its first tool call,
 * which reads as the app being broken rather than as a typo in a form.
 */
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Icon } from "@/components/Icon";
import { Select } from "@/components/Select";
import { useLocale } from "@/lib/i18n/client";
import type { ProfileList } from "@/lib/types";
import {
  isAbapReleaseValid,
  isAdtUrlValid,
  isClientValid,
  INDUSTRIES,
  LANGUAGES,
  SAP_VERSIONS,
} from "@/lib/setup";

/** Icons only; the words for each step live in the dictionary, same order. */
const STEPS = [
  { icon: "link-simple" },
  { icon: "database" },
  { icon: "tag" },
] as const;

const TIERS = ["DEV", "QA", "PRD"] as const;

/** How long the "already registered" card stays up before it leaves. */
const REDIRECT_MS = 2600;

type Form = {
  adtUrl: string;
  sapUser: string;
  sapPassword: string;
  client: string;
  sapVersion: string;
  abapRelease: string;
  language: string;
  industry: string;
  alias: string;
  tier: string;
  description: string;
};

const EMPTY: Form = {
  adtUrl: "",
  sapUser: "",
  sapPassword: "",
  client: "",
  sapVersion: "S4",
  abapRelease: "",
  language: "EN",
  industry: "other",
  alias: "",
  tier: "DEV",
  description: "",
};

type Refusal = { error?: string; field?: string; duplicateAlias?: string };

/**
 * Enough of an ADT URL to compare two of them by. Scheme, trailing slash and
 * case are levelled: `http://HOST:50000/` is not a second system.
 */
function sameHost(a: string, b: string): boolean {
  const strip = (url: string): string =>
    url.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/+$/, "");
  return strip(a) === strip(b);
}

/**
 * The alias is what the picker shows and what names the folder on disk, so it
 * is restricted to what a folder name may hold. Suggested from the host rather
 * than demanded blank: `crown.sapvista.com` offers `CROWN`, which is what
 * someone would have typed anyway.
 */
function suggestAlias(adtUrl: string): string {
  const host = adtUrl.trim().replace(/^https?:\/\//i, "").split(/[:/]/)[0] ?? "";
  return (host.split(".")[0] ?? "").toUpperCase().replace(/[^A-Z0-9_-]/g, "");
}

/** Which fields each card owns, for the gate on its Next button. */
function stepComplete(step: number, form: Form): boolean {
  if (step === 0) {
    return (
      isAdtUrlValid(form.adtUrl) &&
      form.sapUser.trim() !== "" &&
      form.sapPassword !== "" &&
      isClientValid(form.client)
    );
  }
  if (step === 1) return isAbapReleaseValid(form.abapRelease);
  return /^[A-Za-z0-9_-]{1,64}$/.test(form.alias.trim());
}

/** The card a refusal belongs on, by the field the backend named. */
const FIELD_STEP: Record<string, number> = {
  host: 0,
  username: 0,
  password: 0,
  client: 0,
  abapRelease: 1,
  alias: 2,
  tier: 2,
};

export function AddSystemForm() {
  const router = useRouter();
  const { t: messages } = useLocale();
  const t = messages.addSystem;

  const [form, setForm] = useState<Form>(EMPTY);
  const [step, setStep] = useState(0);
  const [dir, setDir] = useState<"initial" | "forward" | "back" | "settle">(
    "initial",
  );
  const [stage, setStage] = useState<
    "form" | "checking" | "saving" | "done" | "duplicate"
  >("form");
  const [error, setError] = useState<Refusal | null>(null);
  const [detail, setDetail] = useState<string | null>(null);
  const [duplicate, setDuplicate] = useState<string>("");

  /**
   * The systems already configured, fetched once so a duplicate can be caught
   * without a round trip to SAP. The backend checks again and is what decides;
   * this only saves someone a ten-second logon attempt to be told the system
   * was already here.
   */
  const [known, setKnown] = useState<ProfileList | null>(null);
  useEffect(() => {
    let live = true;
    void fetch("/api/profiles", { cache: "no-store" })
      .then((response) => (response.ok ? response.json() : null))
      .then((body) => {
        if (live) setKnown(body as ProfileList | null);
      })
      .catch(() => {
        // Not worth surfacing: the backend refuses the duplicate anyway.
      });
    return () => {
      live = false;
    };
  }, []);

  // Leaves on its own once the "already registered" card has been read. The
  // button below it is for anyone who does not want to wait.
  useEffect(() => {
    if (stage !== "duplicate") return;
    const timer = setTimeout(() => back(), REDIRECT_MS);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage]);

  const busy = stage === "checking" || stage === "saving";
  const last = step === STEPS.length - 1;
  const complete = stepComplete(step, form);

  const set = <K extends keyof Form>(key: K, value: Form[K]): void => {
    setForm((current) => ({ ...current, [key]: value }));
    setError(null);
  };

  function go(to: number): void {
    setDir(to > step ? "forward" : "back");
    setStep(to);
    setError(null);
  }

  function back(): void {
    // `refresh` as well as `push`: Settings is server-rendered, and its system
    // list was read before any of this happened.
    router.push("/settings");
    router.refresh();
  }

  /** Fills the alias from the host, unless someone has already typed one. */
  function onUrlBlur(): void {
    if (form.alias.trim() !== "") return;
    const suggested = suggestAlias(form.adtUrl);
    if (suggested) set("alias", suggested);
  }

  /** Puts a refusal on the card the field belongs to. */
  function refuse(body: Refusal): void {
    setError(body);
    const to = body.field ? FIELD_STEP[body.field] : undefined;
    if (to !== undefined && to !== step) {
      setDir("back");
      setStep(to);
    }
    setStage("form");
  }

  async function add(): Promise<void> {
    // 1. Already here? Locally first, from the list fetched on arrival.
    const here = known?.profiles.find(
      (p) =>
        sameHost(p.host, form.adtUrl) &&
        p.client === form.client.trim() &&
        p.username.toUpperCase() === form.sapUser.trim().toUpperCase(),
    );
    if (here) {
      setDuplicate(here.alias);
      setStage("duplicate");
      return;
    }

    // 2. Does it answer? A 502 is the system's own words, not ours.
    setError(null);
    setStage("checking");
    try {
      const response = await fetch("/api/setup/check/sap", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          adtUrl: form.adtUrl.trim(),
          sapUser: form.sapUser.trim(),
          sapPassword: form.sapPassword,
          client: form.client.trim(),
        }),
      });
      const body = (await response.json().catch(() => null)) as
        | (Refusal & { detail?: string })
        | null;
      if (!response.ok) {
        refuse(body ?? { error: t.checkFailed, field: "host" });
        return;
      }
      setDetail(body?.detail ?? null);
    } catch (err) {
      refuse({ error: (err as Error).message, field: "host" });
      return;
    }

    // 3. Write it, and move onto it. The backend closes every open session as
    //    part of that, which the note beside the button says beforehand.
    setStage("saving");
    try {
      const response = await fetch("/api/profiles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          alias: form.alias.trim(),
          tier: form.tier,
          host: form.adtUrl.trim(),
          client: form.client.trim(),
          username: form.sapUser.trim(),
          password: form.sapPassword,
          version: form.sapVersion,
          abapRelease: form.abapRelease.trim(),
          language: form.language,
          industry: form.industry,
          description: form.description.trim(),
        }),
      });
      const body = (await response.json().catch(() => null)) as Refusal | null;
      if (response.status === 409 && body?.duplicateAlias) {
        // The list this browser fetched was stale — someone added it in
        // between, or it was added from another tab.
        setDuplicate(body.duplicateAlias);
        setStage("duplicate");
        return;
      }
      if (!response.ok) {
        refuse(body ?? { error: t.saveFailed });
        return;
      }
    } catch (err) {
      refuse({ error: (err as Error).message });
      return;
    }

    setDir("settle");
    setStage("done");
  }

  function submit(event: React.FormEvent): void {
    event.preventDefault();
    if (busy || !complete) return;
    if (!last) {
      go(step + 1);
      return;
    }
    void add();
  }

  if (stage === "duplicate") {
    return (
      <div className="setup-stage" data-dir="settle">
        <section className="setup-card">
          <div className="setup-kind">
            <Icon name="info" />
            {t.kind}
          </div>
          <header className="setup-head">
            <h2>{t.duplicateHeading(duplicate)}</h2>
            <p className="setup-lede">
              <span className="setup-lede-line">{t.duplicateBody}</span>
              <span className="setup-lede-line">{t.duplicateGoing}</span>
            </p>
          </header>
          <div className="setup-actions">
            <span className="setup-spacer" />
            <button type="button" className="primary" onClick={back}>
              <Icon name="arrow-right" />
              {t.backToSettings}
            </button>
          </div>
        </section>
      </div>
    );
  }

  if (stage === "done") {
    return (
      <div className="setup-stage" data-dir="settle">
        <section className="setup-card">
          <div className="setup-kind">
            <Icon name="check-circle" />
            {t.kind}
          </div>
          <header className="setup-head">
            <h2>{t.doneHeading(form.alias.trim())}</h2>
            <p className="setup-lede">
              <span className="setup-lede-line">{t.doneBody}</span>
              {detail && <span className="setup-lede-line">{detail}</span>}
            </p>
          </header>
          <div className="setup-actions">
            <span className="setup-spacer" />
            <button type="button" className="primary" onClick={back}>
              <Icon name="arrow-right" />
              {t.backToSettings}
            </button>
          </div>
        </section>
      </div>
    );
  }

  const invalid = (field: string): string | undefined =>
    error?.field === field ? "is-invalid" : undefined;

  return (
    <div className="setup-stage" data-dir={dir}>
      {/* Keyed by step, so each question arrives as its own card rather than
          as the previous one's fields being replaced in place. */}
      <form className="setup-card" key={step} onSubmit={submit}>
        <div className="setup-kind">
          <Icon name={STEPS[step].icon} />
          {t.stepOf(step + 1, STEPS.length)}
        </div>

        <header className="setup-head">
          <h2>{t.steps[step].title}</h2>
          <p className="setup-lede">
            <span className="setup-lede-line">{t.steps[step].lede}</span>
          </p>
        </header>

        <div className="setup-fields">
          {step === 0 && (
            <>
              <label className="field field-wide">
                <span className="field-label">{t.adtUrl}</span>
                <input
                  type="text"
                  value={form.adtUrl}
                  onChange={(event) => set("adtUrl", event.target.value)}
                  onBlur={onUrlBlur}
                  className={invalid("host")}
                  placeholder="http://host.example.com:50000"
                  spellCheck={false}
                  disabled={busy}
                  autoFocus
                />
                <span className="field-hint">{messages.setup.adtUrlRule}</span>
              </label>

              <label className="field">
                <span className="field-label">{t.sapUser}</span>
                <input
                  type="text"
                  value={form.sapUser}
                  onChange={(event) => set("sapUser", event.target.value)}
                  className={invalid("username")}
                  spellCheck={false}
                  disabled={busy}
                />
              </label>

              <label className="field">
                <span className="field-label">{t.sapPassword}</span>
                <input
                  type="password"
                  value={form.sapPassword}
                  onChange={(event) => set("sapPassword", event.target.value)}
                  className={invalid("password")}
                  autoComplete="off"
                  disabled={busy}
                />
                <span className="field-hint">{t.passwordHint}</span>
              </label>

              <label className="field">
                <span className="field-label">{t.client}</span>
                <input
                  type="text"
                  value={form.client}
                  onChange={(event) => set("client", event.target.value)}
                  className={invalid("client")}
                  inputMode="numeric"
                  disabled={busy}
                />
                <span className="field-hint">{messages.setup.clientRule}</span>
              </label>
            </>
          )}

          {step === 1 && (
            <>
              <div className="field">
                <span className="field-label" id="add-release-label">
                  {t.release}
                </span>
                <Select
                  name="sapVersion"
                  labelledBy="add-release-label"
                  value={form.sapVersion}
                  options={SAP_VERSIONS.map((v) => ({
                    value: v.value,
                    label: v.label,
                  }))}
                  onChange={(next) => set("sapVersion", next)}
                  disabled={busy}
                />
              </div>

              <label className="field">
                <span className="field-label">{t.abapRelease}</span>
                <input
                  type="text"
                  value={form.abapRelease}
                  onChange={(event) => set("abapRelease", event.target.value)}
                  className={invalid("abapRelease")}
                  inputMode="numeric"
                  disabled={busy}
                  autoFocus
                />
                <span className="field-hint">
                  {messages.setup.abapReleaseRule}
                </span>
              </label>

              <div className="field">
                <span className="field-label" id="add-language-label">
                  {t.logonLanguage}
                </span>
                <Select
                  name="language"
                  labelledBy="add-language-label"
                  value={form.language}
                  options={LANGUAGES.map((l) => ({
                    value: l.code,
                    label: l.label,
                  }))}
                  onChange={(next) => set("language", next)}
                  disabled={busy}
                />
              </div>

              <div className="field field-wide">
                <span className="field-label" id="add-industry-label">
                  {t.industry}
                </span>
                <Select
                  name="industry"
                  labelledBy="add-industry-label"
                  value={form.industry}
                  options={INDUSTRIES.map((i) => ({
                    value: i.value,
                    label: i.label,
                  }))}
                  onChange={(next) => set("industry", next)}
                  disabled={busy}
                />
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <label className="field">
                <span className="field-label">{t.alias}</span>
                <input
                  type="text"
                  value={form.alias}
                  onChange={(event) => set("alias", event.target.value)}
                  className={invalid("alias")}
                  spellCheck={false}
                  disabled={busy}
                  autoFocus
                />
                <span className="field-hint">{t.aliasHint}</span>
              </label>

              <div className="field">
                <span className="field-label" id="add-tier-label">
                  {t.tier}
                </span>
                <Select
                  name="tier"
                  labelledBy="add-tier-label"
                  value={form.tier}
                  options={TIERS.map((tier) => ({ value: tier, label: tier }))}
                  onChange={(next) => set("tier", next)}
                  disabled={busy}
                />
                <span className="field-hint">{t.tierHint}</span>
              </div>

              <label className="field field-wide">
                <span className="field-label">{t.description}</span>
                <input
                  type="text"
                  value={form.description}
                  onChange={(event) => set("description", event.target.value)}
                  placeholder={t.descriptionPlaceholder}
                  disabled={busy}
                />
                <span className="field-hint">{t.descriptionHint}</span>
              </label>
            </>
          )}
        </div>

        {error?.error && <p className="field-error">{error.error}</p>}

        {/* Above the buttons, not beside them. It is a sentence, and a
            sentence sharing a flex row with two controls either squeezes them
            or wraps the row — on a Korean build it wrapped. */}
        {last && <p className="setup-warning">{t.switchWarning}</p>}

        <div className="setup-actions">
          <button
            className="link-button setup-escape"
            type="button"
            onClick={back}
            disabled={busy}
          >
            {t.cancel}
          </button>

          <span className="setup-spacer" />

          <button className="primary" type="submit" disabled={!complete || busy}>
            <Icon
              name={
                busy
                  ? "circle-notch"
                  : last
                    ? "plugs-connected"
                    : "arrow-right"
              }
            />
            {stage === "checking"
              ? t.checking
              : stage === "saving"
                ? t.saving
                : last
                  ? t.checkAndAdd
                  : t.next}
          </button>
        </div>
      </form>

      <div className="setup-rail">
        <ol className="setup-dots">
          {STEPS.map((entry, index) => {
            const state =
              index === step ? "current" : index < step ? "done" : "upcoming";
            return (
              <li key={entry.icon} className={`setup-dot is-${state}`}>
                <button
                  type="button"
                  // Backwards only. A step ahead has not been answered, and a
                  // rail that jumps to it turns three questions into a form.
                  onClick={() => go(index)}
                  disabled={index >= step || busy}
                  aria-current={index === step ? "step" : undefined}
                >
                  <span className="setup-dot-mark" aria-hidden="true">
                    {index < step ? <Icon name="check" /> : index + 1}
                  </span>
                  <span className="setup-dot-label">{t.steps[index].short}</span>
                </button>
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
}
