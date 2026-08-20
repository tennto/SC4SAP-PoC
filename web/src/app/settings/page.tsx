/**
 * Settings.
 *
 * Layout pass, like the skill pages: the groups below name the settings this
 * app will actually have, and every control is inert. Two of them are already
 * real state living somewhere else — language is held by the account menu, and
 * the SAP connection belongs to the profile the backend was started against —
 * so wiring this screen up means pointing those at one store rather than
 * inventing new ones here.
 */
import type { Metadata } from "next";
import Link from "next/link";
import { Icon } from "@/components/Icon";
import { SAP_SYSTEM } from "@/lib/account";

export const metadata: Metadata = { title: "Settings · SC4SAP" };

type Row = {
  label: string;
  hint?: string;
  control: React.ReactNode;
};

function Group({
  icon,
  title,
  rows,
  delay,
}: {
  icon: string;
  title: string;
  rows: Row[];
  delay: number;
}) {
  return (
    <section
      className="panel rise"
      style={{ "--delay": `${delay}ms` } as React.CSSProperties}
    >
      <div className="panel-head">
        <h2>
          <Icon name={icon} /> {title}
        </h2>
      </div>
      <div className="fields">
        {rows.map((row) => (
          <label className="field" key={row.label}>
            <span className="field-label">{row.label}</span>
            {row.control}
            {row.hint && <span className="field-hint">{row.hint}</span>}
          </label>
        ))}
      </div>
    </section>
  );
}

export default function SettingsPage() {
  return (
    <div className="page">
      <header className="page-head rise">
        <div>
          <p className="eyebrow">Account</p>
          <h1>Settings</h1>
          <p className="page-lede">
            Preferences for this account and the system it is pointed at.
          </p>
        </div>
      </header>

      <p
        className="notice-block rise"
        style={{ "--delay": "110ms" } as React.CSSProperties}
        role="note"
      >
        <strong>Layout only.</strong> Nothing here saves yet. Per-account
        settings need somewhere to live, which arrives with authentication in
        Phase 5.
      </p>

      <div className="card-grid">
        <Group
          icon="user-circle"
          title="Profile"
          delay={220}
          rows={[
            { label: "Display name", control: <input type="text" defaultValue="Kim Sihoon" disabled /> },
            { label: "Email", control: <input type="text" defaultValue="s2hoon326@gmail.com" disabled /> },
            {
              label: "Language",
              control: (
                <select disabled defaultValue="EN">
                  <option value="KR">한국어 (KR)</option>
                  <option value="EN">English (EN)</option>
                  <option value="JP">日本語 (JP)</option>
                </select>
              ),
              hint: "Also switchable from the account menu.",
            },
          ]}
        />

        <Group
          icon="database"
          title="SAP connection"
          delay={330}
          rows={[
            { label: "Profile alias", control: <input type="text" defaultValue={SAP_SYSTEM.alias} disabled /> },
            { label: "Client", control: <input type="text" defaultValue={SAP_SYSTEM.client} disabled /> },
            {
              label: "Blocklist profile",
              control: (
                <select disabled defaultValue={SAP_SYSTEM.blocklistProfile}>
                  <option value="strict">strict</option>
                  <option value="standard">standard</option>
                  <option value="relaxed">relaxed</option>
                </select>
              ),
              hint: "Decides which tables are refused outright before a tool call is even offered.",
            },
          ]}
        />

        <Group
          icon="sliders"
          title="Sessions"
          delay={440}
          rows={[
            {
              label: "Model",
              control: (
                <select disabled defaultValue="claude-sonnet-5">
                  <option>claude-sonnet-5</option>
                  <option>claude-opus-5</option>
                </select>
              ),
            },
            {
              label: "Auto-approve read tools",
              control: (
                <span className="field-toggle">
                  <input type="checkbox" defaultChecked disabled />
                  <span>Enabled</span>
                </span>
              ),
              hint: "Off means every SAP read raises an approval prompt. Row extraction is never auto-approved either way.",
            },
            {
              label: "Approval timeout",
              control: (
                <select disabled defaultValue="5 minutes">
                  <option>1 minute</option>
                  <option>5 minutes</option>
                  <option>15 minutes</option>
                </select>
              ),
            },
          ]}
        />
      </div>

      <p
        className="fixture-note rise"
        style={{ "--delay": "550ms" } as React.CSSProperties}
      >
        <Icon name="info" /> Connection values shown here mirror the backend
        profile. Editing them from the browser is Phase 5-2 —{" "}
        <Link className="link-button" href="/skills/sap-option">
          see SAP Options
        </Link>
        .
      </p>
    </div>
  );
}
