"use client";

/**
 * Add a SAP system: one card, a live logon check, then a profile.
 *
 * Deliberately not the setup wizard. That one is the gate a brand-new account
 * passes through, and most of what it does is wrong here: it asks for a
 * Console key this app already has, its way out is to sign out, and finishing
 * it sends you to the dashboard. This is reached from Settings by someone who
 * is already working, and it owes them a way back to where they were.
 *
 * What it does share is the check. The same `/api/setup/check/sap` probe runs
 * here, because "did that host answer that logon" is one question and having
 * two implementations of it would mean two answers.
 *
 * Two steps, in this order, and the order is the point: the system is proved
 * reachable before anything is written. A profile created from values that
 * turn out to be wrong is not a harmless leftover — it is a system in the
 * picker that fails at the first tool call, which reads as the app being
 * broken rather than as a typo in a form.
 */
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Icon } from "@/components/Icon";
import { Select } from "@/components/Select";
import { useLocale } from "@/lib/i18n/client";
import {
  isAbapReleaseValid,
  isAdtUrlValid,
  isClientValid,
  INDUSTRIES,
  LANGUAGES,
  SAP_VERSIONS,
} from "@/lib/setup";

const TIERS = ["DEV", "QA", "PRD"] as const;

type Form = {
  alias: string;
  description: string;
  tier: string;
  adtUrl: string;
  sapUser: string;
  sapPassword: string;
  client: string;
  sapVersion: string;
  abapRelease: string;
  language: string;
  industry: string;
};

const EMPTY: Form = {
  alias: "",
  description: "",
  tier: "DEV",
  adtUrl: "",
  sapUser: "",
  sapPassword: "",
  client: "",
  sapVersion: "S4",
  abapRelease: "",
  language: "EN",
  industry: "other",
};

type Refusal = { error?: string; field?: string };

/**
 * The alias is what the picker shows and what names the directory on disk, so
 * it is restricted to what a directory name may hold. Suggested from the host
 * rather than demanded blank: `crown.sapvista.com` offers `CROWN`, which is
 * what someone would have typed anyway.
 */
function suggestAlias(adtUrl: string): string {
  const host = adtUrl
    .trim()
    .replace(/^https?:\/\//i, "")
    .split(/[:/]/)[0] ?? "";
  const first = host.split(".")[0] ?? "";
  return first.toUpperCase().replace(/[^A-Z0-9_-]/g, "");
}

export function AddSystemForm() {
  const router = useRouter();
  const { t: messages } = useLocale();
  const t = messages.addSystem;

  const [form, setForm] = useState<Form>(EMPTY);
  const [stage, setStage] = useState<"form" | "checking" | "saving" | "done">(
    "form",
  );
  const [error, setError] = useState<Refusal | null>(null);
  const [detail, setDetail] = useState<string | null>(null);

  const busy = stage === "checking" || stage === "saving";

  const set = <K extends keyof Form>(key: K, value: Form[K]): void => {
    setForm((current) => ({ ...current, [key]: value }));
    setError(null);
  };

  // The same rules the server re-runs. This copy shapes what gets typed; the
  // one there is what decides.
  const valid =
    isAdtUrlValid(form.adtUrl) &&
    form.sapUser.trim() !== "" &&
    form.sapPassword !== "" &&
    isClientValid(form.client) &&
    isAbapReleaseValid(form.abapRelease) &&
    /^[A-Za-z0-9_-]{1,64}$/.test(form.alias.trim());

  /** Fills the alias from the host, unless someone has already typed one. */
  function onUrlBlur(): void {
    if (form.alias.trim() !== "") return;
    const suggested = suggestAlias(form.adtUrl);
    if (suggested) set("alias", suggested);
  }

  async function submit(event: React.FormEvent): Promise<void> {
    event.preventDefault();
    if (busy || !valid) return;

    setError(null);
    setStage("checking");

    // 1. Prove the logon. A 502 here means the system did not answer, which is
    //    the reader's to fix and is said in the system's own words.
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
        setError(body ?? { error: t.checkFailed });
        setStage("form");
        return;
      }
      setDetail(body?.detail ?? null);
    } catch (err) {
      setError({ error: (err as Error).message });
      setStage("form");
      return;
    }

    // 2. Write the profile and move onto it. The backend closes every open
    //    session as part of this, which the button's note says beforehand.
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
      if (!response.ok) {
        setError(body ?? { error: t.saveFailed });
        setStage("form");
        return;
      }
    } catch (err) {
      setError({ error: (err as Error).message });
      setStage("form");
      return;
    }

    setStage("done");
  }

  function back(): void {
    // `refresh` as well as `push`: Settings is server-rendered and its system
    // list was read before this system existed.
    router.push("/settings");
    router.refresh();
  }

  if (stage === "done") {
    return (
      <div className="setup-card">
        <div className="setup-kind">
          <Icon name="check-circle" />
          {t.kind}
        </div>
        <h2>{t.doneHeading(form.alias.trim())}</h2>
        <p className="setup-lede">{t.doneBody}</p>
        {detail && <p className="field-note">{detail}</p>}
        <div className="setup-actions">
          <button type="button" className="button-primary" onClick={back}>
            <Icon name="arrow-right" />
            {t.backToSettings}
          </button>
        </div>
      </div>
    );
  }

  const invalid = (field: string): string | undefined =>
    error?.field === field ? "is-invalid" : undefined;

  return (
    <form className="setup-card" onSubmit={(event) => void submit(event)}>
      <div className="setup-kind">
        <Icon name="database" />
        {t.kind}
      </div>
      <h2>{t.heading}</h2>
      <p className="setup-lede">{t.lede}</p>

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

      <div className="field">
        <span className="field-label" id="add-release-label">
          {t.release}
        </span>
        <Select
          name="sapVersion"
          labelledBy="add-release-label"
          value={form.sapVersion}
          options={SAP_VERSIONS.map((v) => ({ value: v.value, label: v.label }))}
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
        />
        <span className="field-hint">{messages.setup.abapReleaseRule}</span>
      </label>

      <div className="field">
        <span className="field-label" id="add-language-label">
          {t.logonLanguage}
        </span>
        <Select
          name="language"
          labelledBy="add-language-label"
          value={form.language}
          options={LANGUAGES.map((l) => ({ value: l.code, label: l.label }))}
          onChange={(next) => set("language", next)}
          disabled={busy}
        />
      </div>

      <div className="field">
        <span className="field-label" id="add-industry-label">
          {t.industry}
        </span>
        <Select
          name="industry"
          labelledBy="add-industry-label"
          value={form.industry}
          options={INDUSTRIES.map((i) => ({ value: i.value, label: i.label }))}
          onChange={(next) => set("industry", next)}
          disabled={busy}
        />
      </div>

      <label className="field">
        <span className="field-label">{t.alias}</span>
        <input
          type="text"
          value={form.alias}
          onChange={(event) => set("alias", event.target.value)}
          className={invalid("alias")}
          spellCheck={false}
          disabled={busy}
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

      {error?.error && <p className="field-error">{error.error}</p>}

      <div className="setup-actions">
        <button
          type="button"
          className="button-quiet"
          onClick={back}
          disabled={busy}
        >
          {t.cancel}
        </button>
        <span className="setup-note">{t.switchWarning}</span>
        <button type="submit" className="button-primary" disabled={busy || !valid}>
          <Icon name="plugs-connected" />
          {stage === "checking"
            ? t.checking
            : stage === "saving"
              ? t.saving
              : t.checkAndAdd}
        </button>
      </div>
    </form>
  );
}
