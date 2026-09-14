"use client";

/**
 * Where this account is pointed — shown as rows, changed in a dialog.
 *
 * One pencil for the whole panel rather than one per row. The fields are not
 * independent settings: a host, a logon and a client are checked together
 * against a system that either answers or does not, and a per-row edit would
 * mean a full connection attempt to change a client number, three times, once
 * per field someone meant to change together.
 *
 * Saving asks before it does anything, and the question is not a formality.
 * The stored connection is what every screen behind the setup gate assumes is
 * reachable, so a change that was wrong would not surface here — it would
 * surface later, inside a skill run, as something that reads like a bug in the
 * skill. The dialog says the app is about to try the logon for real, and the
 * save only happens if it works.
 *
 * The check and the save are one request. Two would leave a window in which a
 * browser that had checked could save something else, and there is nothing to
 * narrate between them — the wizard splits its three checks across three
 * endpoints only so it can name which one is running.
 */
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ConfirmModal } from "@/components/ConfirmModal";
import { Icon } from "@/components/Icon";
import { Select } from "@/components/Select";
import { EditButton, EditModal, SettingRow } from "@/components/settings/EditModal";
import { useLocale } from "@/lib/i18n/client";
import {
  isAbapReleaseValid,
  isAdtUrlValid,
  isClientValid,
  LANGUAGES,
  SAP_VERSIONS,
  type SetupDraft,
} from "@/lib/setup";
import type { ConnectionSummary } from "@/lib/setup-store";

type Refusal = { error?: string; field?: string };

/** Everything the dialog holds. The password is the only one not prefilled. */
type Form = {
  adtUrl: string;
  sapUser: string;
  sapPassword: string;
  sapVersion: SetupDraft["sapVersion"];
  abapRelease: string;
  client: string;
  language: string;
};

function formOf(connection: ConnectionSummary): Form {
  return {
    adtUrl: connection.adtUrl,
    sapUser: connection.sapUser,
    sapPassword: "",
    sapVersion: connection.sapVersion,
    abapRelease: connection.abapRelease,
    client: connection.client,
    language: connection.language,
  };
}

const RELEASE_LABEL: Record<SetupDraft["sapVersion"], string> = {
  S4: "S/4HANA",
  ECC: "ECC 6.0",
};

/**
 * `2026-09-05 12:09 UTC`.
 *
 * UTC and hand-assembled rather than `toLocaleString`, which formats in the
 * runtime's own locale and timezone — the server's on the first render and the
 * browser's on the second, which is a hydration mismatch and was one. A fixed
 * zone is also the right answer for the value itself: this is when a machine
 * somewhere answered, and the operator reading it may not be in the timezone
 * either end of that was in.
 */
function stamp(iso: string): string {
  return `${iso.slice(0, 10)} ${iso.slice(11, 16)} UTC`;
}

export function ConnectionSettings({
  connection,
}: {
  connection: ConnectionSummary;
}) {
  const router = useRouter();
  const { t: messages } = useLocale();
  const t = messages.settings;
  const [stored, setStored] = useState(connection);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<Form>(() => formOf(connection));
  const [asking, setAsking] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<Refusal | null>(null);
  const [detail, setDetail] = useState<string | null>(null);

  const set = <K extends keyof Form>(key: K, value: Form[K]): void =>
    setForm((current) => ({ ...current, [key]: value }));

  // A blank password means "keep the stored one", so it is not an edit on its
  // own — but a typed one is, since re-checking a logon someone has just
  // retyped is a reasonable thing to ask for.
  const changed =
    form.sapPassword !== "" ||
    form.adtUrl.trim() !== stored.adtUrl ||
    form.sapUser.trim() !== stored.sapUser ||
    form.sapVersion !== stored.sapVersion ||
    form.abapRelease.trim() !== stored.abapRelease ||
    form.client.trim() !== stored.client ||
    form.language !== stored.language;

  // The same rules the server re-runs. The copy here saves a round trip; the
  // one there is what actually decides.
  const valid =
    isAdtUrlValid(form.adtUrl) &&
    form.sapUser.trim() !== "" &&
    isAbapReleaseValid(form.abapRelease) &&
    isClientValid(form.client);

  function open(): void {
    setForm(formOf(stored));
    setError(null);
    setDetail(null);
    setEditing(true);
  }

  async function save(): Promise<void> {
    setBusy(true);
    setError(null);

    const response = await fetch("/api/account/connection", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        adtUrl: form.adtUrl.trim(),
        sapUser: form.sapUser.trim(),
        // Sent as typed. A password may legitimately begin or end with a
        // space, and an empty string is the signal to keep the stored one.
        sapPassword: form.sapPassword,
        sapVersion: form.sapVersion,
        abapRelease: form.abapRelease.trim(),
        client: form.client.trim(),
        language: form.language,
      }),
    });

    const body = ((await response.json().catch(() => null)) as
      | (Refusal & { detail?: string })
      | null) ?? { error: t.serverAnswered(response.status) };

    setBusy(false);
    // The confirmation closes either way; a failure belongs back on the form,
    // where the field it is about is.
    setAsking(false);

    if (!response.ok) {
      setError(body);
      return;
    }

    // The stored values are these ones now, so the next edit is measured
    // against what was actually saved.
    const next: ConnectionSummary = {
      ...stored,
      adtUrl: form.adtUrl.trim(),
      sapUser: form.sapUser.trim(),
      sapVersion: form.sapVersion,
      abapRelease: form.abapRelease.trim(),
      client: form.client.trim(),
      language: form.language,
      connectedAt: new Date().toISOString(),
    };
    setStored(next);
    setEditing(false);
    setDetail(body.detail ?? t.connected);
    // The dashboard draws the same connection from the server.
    router.refresh();
  }

  return (
    <section className="panel">
      <div className="panel-head panel-head-row">
        <h2>
          <Icon name="database" /> {t.sapConnection}
        </h2>
        <EditButton label={t.editSapConnection} onClick={open} />
      </div>

      <div className="setting-rows">
        <SettingRow
          label={t.adtUrl}
          value={<code>{stored.adtUrl}</code>}
          hint={detail ?? undefined}
        />
        <SettingRow label={t.sapUser} value={stored.sapUser} />
        <SettingRow label={t.client} value={stored.client} />
        <SettingRow
          label={t.release}
          value={`${RELEASE_LABEL[stored.sapVersion]} · ABAP ${stored.abapRelease}`}
        />
        <SettingRow
          label={t.logonLanguage}
          value={stored.language}
          // Named so it is not mistaken for the one in the account menu: this
          // is what the SAP system answers in, not what this app is drawn in.
          hint={t.logonLanguageHint}
        />
        <SettingRow
          label={t.lastVerified}
          value={stamp(stored.connectedAt)}
          hint={t.lastVerifiedHint}
        />
      </div>

      {editing && (
        <EditModal
          kind={t.connectionKind}
          heading={t.editSapConnection}
          description={t.connectionBody}
          submitLabel={t.saveConnection}
          busy={busy}
          disabled={!changed || !valid}
          error={error?.error ?? null}
          onSubmit={() => setAsking(true)}
          onCancel={() => setEditing(false)}
        >
          <label className="field field-wide">
            <span className="field-label">{t.adtUrl}</span>
            <input
              type="text"
              value={form.adtUrl}
              onChange={(event) => set("adtUrl", event.target.value)}
              className={error?.field === "adtUrl" ? "is-invalid" : undefined}
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
              className={error?.field === "sapUser" ? "is-invalid" : undefined}
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
              className={
                error?.field === "sapPassword" ? "is-invalid" : undefined
              }
              placeholder={t.unchanged}
              autoComplete="off"
              disabled={busy}
            />
            <span className="field-hint">{t.keepStored}</span>
          </label>

          <div className="field">
            <span className="field-label" id="settings-release-label">
              {t.release}
            </span>
            <Select
              name="sapVersion"
              labelledBy="settings-release-label"
              value={form.sapVersion}
              options={SAP_VERSIONS.map((version) => ({
                value: version.value,
                label: version.label,
              }))}
              onChange={(next) => set("sapVersion", next as Form["sapVersion"])}
              disabled={busy}
            />
          </div>

          <label className="field">
            <span className="field-label">{t.abapRelease}</span>
            <input
              type="text"
              value={form.abapRelease}
              onChange={(event) => set("abapRelease", event.target.value)}
              className={
                error?.field === "abapRelease" ? "is-invalid" : undefined
              }
              inputMode="numeric"
              disabled={busy}
            />
            <span className="field-hint">{messages.setup.abapReleaseRule}</span>
          </label>

          <label className="field">
            <span className="field-label">{t.client}</span>
            <input
              type="text"
              value={form.client}
              onChange={(event) => set("client", event.target.value)}
              className={error?.field === "client" ? "is-invalid" : undefined}
              inputMode="numeric"
              disabled={busy}
            />
            <span className="field-hint">{messages.setup.clientRule}</span>
          </label>

          <div className="field">
            <span className="field-label" id="settings-language-label">
              {t.logonLanguage}
            </span>
            <Select
              name="language"
              labelledBy="settings-language-label"
              value={form.language}
              options={LANGUAGES.map((language) => ({
                value: language.code,
                label: language.label,
              }))}
              onChange={(next) => set("language", next)}
              disabled={busy}
            />
          </div>
        </EditModal>
      )}

      {asking && (
        <ConfirmModal
          kind={t.connectionKind}
          heading={t.changeConnection}
          description={form.sapPassword ? t.changeWithNew : t.changeWithStored}
          confirmLabel={t.checkAndSave}
          confirmIcon="plugs-connected"
          note={t.fewSeconds}
          busy={busy}
          onConfirm={() => void save()}
          onCancel={() => setAsking(false)}
        />
      )}
    </section>
  );
}
