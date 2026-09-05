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
import {
  ABAP_RELEASE_RULE,
  ADT_URL_RULE,
  CLIENT_RULE,
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
      | null) ?? { error: `The server answered ${response.status}.` };

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
    setDetail(body.detail ?? "Connected.");
    // The dashboard draws the same connection from the server.
    router.refresh();
  }

  return (
    <section className="panel">
      <div className="panel-head panel-head-row">
        <h2>
          <Icon name="database" /> SAP connection
        </h2>
        <EditButton label="Edit SAP connection" onClick={open} />
      </div>

      <div className="setting-rows">
        <SettingRow
          label="ADT URL"
          value={<code>{stored.adtUrl}</code>}
          hint={detail ?? undefined}
        />
        <SettingRow label="SAP user" value={stored.sapUser} />
        <SettingRow label="Client" value={stored.client} />
        <SettingRow
          label="Release"
          value={`${RELEASE_LABEL[stored.sapVersion]} · ABAP ${stored.abapRelease}`}
        />
        <SettingRow
          label="Logon language"
          value={stored.language}
          // Named so it is not mistaken for the one in the account menu: this
          // is what the SAP system answers in, not what this app is drawn in.
          hint="What the SAP system logs on with. The app's own language is in the account menu."
        />
        <SettingRow
          label="Last verified"
          value={stamp(stored.connectedAt)}
          hint="When a logon last actually succeeded — not when the row was written."
        />
      </div>

      {editing && (
        <EditModal
          kind="Connection"
          heading="Edit SAP connection"
          description="Saving tries the logon against the system first. Nothing is stored unless it answers."
          submitLabel="Save connection"
          busy={busy}
          disabled={!changed || !valid}
          error={error?.error ?? null}
          onSubmit={() => setAsking(true)}
          onCancel={() => setEditing(false)}
        >
          <label className="field field-wide">
            <span className="field-label">ADT URL</span>
            <input
              type="text"
              value={form.adtUrl}
              onChange={(event) => set("adtUrl", event.target.value)}
              className={error?.field === "adtUrl" ? "is-invalid" : undefined}
              spellCheck={false}
              disabled={busy}
            />
            <span className="field-hint">{ADT_URL_RULE}</span>
          </label>

          <label className="field">
            <span className="field-label">SAP user</span>
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
            <span className="field-label">Password</span>
            <input
              type="password"
              value={form.sapPassword}
              onChange={(event) => set("sapPassword", event.target.value)}
              className={
                error?.field === "sapPassword" ? "is-invalid" : undefined
              }
              placeholder="Unchanged"
              autoComplete="off"
              disabled={busy}
            />
            <span className="field-hint">
              Leave blank to keep the stored password.
            </span>
          </label>

          <div className="field">
            <span className="field-label" id="settings-release-label">
              Release
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
            <span className="field-label">ABAP release</span>
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
            <span className="field-hint">{ABAP_RELEASE_RULE}</span>
          </label>

          <label className="field">
            <span className="field-label">Client</span>
            <input
              type="text"
              value={form.client}
              onChange={(event) => set("client", event.target.value)}
              className={error?.field === "client" ? "is-invalid" : undefined}
              inputMode="numeric"
              disabled={busy}
            />
            <span className="field-hint">{CLIENT_RULE}</span>
          </label>

          <div className="field">
            <span className="field-label" id="settings-language-label">
              Logon language
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
          kind="Connection"
          heading="Change this connection?"
          description={
            form.sapPassword
              ? "The new logon is tried against the system first. Nothing is stored unless it answers."
              : "The new details are tried against the system with the stored password first. Nothing is stored unless it answers."
          }
          confirmLabel="Check and save"
          confirmIcon="plugs-connected"
          note="This can take a few seconds."
          busy={busy}
          onConfirm={() => void save()}
          onCancel={() => setAsking(false)}
        />
      )}
    </section>
  );
}
