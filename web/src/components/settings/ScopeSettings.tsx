"use client";

/**
 * What the plugin is scoped to for this account — shown as rows, changed in
 * a dialog.
 *
 * The industry the consultant agents read up on, the blocklist profile the
 * MCP server refuses table rows with, and the tables let through it. These
 * came out of the plugin's `/sc4sap:sap-option` skill, which edited them in a
 * dotenv file on the machine running the CLI; here they are rows on the
 * account, which is what "per user" means once there is more than one.
 *
 * One pencil for the three, like the connection panel above it, but for the
 * opposite reason: those fields are checked together against a system, and
 * these are not checked against anything. They are choices, and a save is a
 * write. So there is no confirmation step either — nothing is being tried
 * that could fail in a way worth being warned about first.
 *
 * **What is saved is not yet applied**, and the panel says so. The backend
 * runs one plugin profile for every session until per-account sessions land
 * (see `docs/roadmap-per-user-credentials.md`), so the row is stored now and
 * read then. The note stays until the backend reads it; a settings screen
 * that lets someone pick Strict and then hands back HR rows is worse than one
 * that says the switch is not wired yet.
 */
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Icon } from "@/components/Icon";
import { Select } from "@/components/Select";
import { EditButton, EditModal, SettingRow } from "@/components/settings/EditModal";
import {
  ALLOW_TABLES_RULE,
  BLOCKLIST_PROFILES,
  INDUSTRIES,
  parseAllowTables,
  type BlocklistProfile,
} from "@/lib/setup";
import type { ConnectionSummary } from "@/lib/setup-store";

type Refusal = { error?: string; field?: string };

type Scope = Pick<ConnectionSummary, "industry" | "blocklist" | "allowTables">;

/** Everything the dialog holds. The list is edited as the text it is typed as. */
type Form = {
  industry: string;
  blocklist: BlocklistProfile;
  allowTables: string;
};

function formOf(scope: Scope): Form {
  return {
    industry: scope.industry,
    blocklist: scope.blocklist,
    allowTables: scope.allowTables.join(", "),
  };
}

const industryLabel = (value: string): string =>
  INDUSTRIES.find((industry) => industry.value === value)?.label ?? value;

const profile = (value: BlocklistProfile) =>
  BLOCKLIST_PROFILES.find((entry) => entry.value === value);

export function ScopeSettings({ scope }: { scope: Scope }) {
  const router = useRouter();
  const [stored, setStored] = useState(scope);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<Form>(() => formOf(scope));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<Refusal | null>(null);

  const set = <K extends keyof Form>(key: K, value: Form[K]): void =>
    setForm((current) => ({ ...current, [key]: value }));

  // Compared against the parsed list rather than the text, so retyping the
  // same names with different spacing is not an edit.
  const parsed = parseAllowTables(form.allowTables);
  const changed =
    form.industry !== stored.industry ||
    form.blocklist !== stored.blocklist ||
    (parsed !== null && parsed.join(",") !== stored.allowTables.join(","));
  const valid = parsed !== null;

  function open(): void {
    setForm(formOf(stored));
    setError(null);
    setEditing(true);
  }

  async function save(): Promise<void> {
    setBusy(true);
    setError(null);

    const response = await fetch("/api/account/scope", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        industry: form.industry,
        blocklist: form.blocklist,
        allowTables: form.allowTables,
      }),
    });

    const body = ((await response.json().catch(() => null)) as
      | (Refusal & { allowTables?: string[] })
      | null) ?? { error: `The server answered ${response.status}.` };

    setBusy(false);
    if (!response.ok) {
      setError(body);
      return;
    }

    setStored({
      industry: form.industry,
      blocklist: form.blocklist,
      // The server's list, which is the parsed and de-duplicated one.
      allowTables: body.allowTables ?? parsed ?? [],
    });
    setEditing(false);
    router.refresh();
  }

  return (
    <section className="panel">
      <div className="panel-head panel-head-row">
        <div>
          <h2>
            <Icon name="shield-check" /> Scope
          </h2>
          <p className="panel-note">
            Stored for this account. The backend still runs one profile for
            every session, so these take effect once per-account sessions land.
          </p>
        </div>
        <EditButton label="Edit scope" onClick={open} />
      </div>

      <div className="setting-rows">
        <SettingRow
          label="Industry"
          value={industryLabel(stored.industry)}
          hint="Which reference the consultant agents read before they answer."
        />
        <SettingRow
          label="Blocklist profile"
          value={profile(stored.blocklist)?.label ?? stored.blocklist}
          hint={profile(stored.blocklist)?.hint}
        />
        <SettingRow
          label="Allowed tables"
          value={
            stored.allowTables.length > 0 ? (
              <code>{stored.allowTables.join(", ")}</code>
            ) : (
              "None"
            )
          }
          hint="Let through the blocklist anyway. Every read of one is still audited."
        />
      </div>

      {editing && (
        <EditModal
          kind="Scope"
          heading="Edit scope"
          description="Nothing here is checked against the SAP system. Saving writes the choice."
          submitLabel="Save scope"
          busy={busy}
          disabled={!changed || !valid}
          error={error?.error ?? null}
          onSubmit={() => void save()}
          onCancel={() => setEditing(false)}
        >
          <div className="field">
            <span className="field-label" id="settings-industry-label">
              Industry
            </span>
            <Select
              name="industry"
              labelledBy="settings-industry-label"
              value={form.industry}
              options={INDUSTRIES.map((industry) => ({
                value: industry.value,
                label: industry.label,
              }))}
              onChange={(next) => set("industry", next)}
              disabled={busy}
            />
          </div>

          <div className="field">
            <span className="field-label" id="settings-blocklist-label">
              Blocklist profile
            </span>
            <Select
              name="blocklist"
              labelledBy="settings-blocklist-label"
              value={form.blocklist}
              options={BLOCKLIST_PROFILES.map((entry) => ({
                value: entry.value,
                label: entry.label,
              }))}
              onChange={(next) => set("blocklist", next as BlocklistProfile)}
              disabled={busy}
            />
            <span className="field-hint">{profile(form.blocklist)?.hint}</span>
          </div>

          <label className="field field-wide">
            <span className="field-label">Allowed tables</span>
            <input
              type="text"
              value={form.allowTables}
              onChange={(event) => set("allowTables", event.target.value)}
              className={
                error?.field === "allowTables" || !valid ? "is-invalid" : undefined
              }
              placeholder="MARA, VBAK, Z*_LOG"
              spellCheck={false}
              autoComplete="off"
              disabled={busy}
            />
            <span className={valid ? "field-hint" : "field-error"}>
              {ALLOW_TABLES_RULE}
            </span>
          </label>
        </EditModal>
      )}
    </section>
  );
}
