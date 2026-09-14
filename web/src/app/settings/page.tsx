/**
 * Settings.
 *
 * A single centred column rather than a grid of cards. The dashboard is a
 * grid because its panels are things to glance at and comparing them
 * side-by-side is the point; these are things to change one at a time, and a
 * form read across two columns has the eye jumping between two unrelated
 * questions on every row.
 *
 * Everything on it is a row showing what a setting currently says, with a
 * pencil where it can be changed — these are read far more often than they are
 * changed, and a screen of open inputs answers "what is my client" while
 * asking "is this a value, or one I am in the middle of typing".
 *
 * The name, the password and the SAP connection are real and save. The last
 * group is the backend's own configuration, shown because it decides what
 * every run costs and how it behaves, and read-only because it is a
 * process-wide setting this app is a client of, not an owner of.
 */
import type { Metadata } from "next";
import { requireAccount } from "@/lib/auth/session";
import { findById } from "@/lib/auth/users";
import { readConnection } from "@/lib/setup-store";
import { BACKEND } from "@/lib/backend";
import type { Health } from "@/lib/types";
import Link from "next/link";
import { Icon } from "@/components/Icon";
import { AccountSettings } from "@/components/settings/AccountSettings";
import { ConnectionSettings } from "@/components/settings/ConnectionSettings";
import { ScopeSettings } from "@/components/settings/ScopeSettings";
import { SettingRow } from "@/components/settings/EditModal";
import { ApprovalSettings } from "@/components/settings/ApprovalSettings";
import { readMessages } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await readMessages();
  return { title: `${t.settings.title} · SC4SAP` };
}

// The forms below write, so a cached render of this page would show someone
// their own change not having happened.
export const dynamic = "force-dynamic";

/**
 * The backend's model, or nothing.
 *
 * Failing quietly on purpose: the backend being down is a real state this page
 * has to draw, and it is already said plainly on the dashboard. Repeating the
 * whole diagnosis in a settings group would make the group about the outage
 * rather than about the setting.
 */
async function loadModel(): Promise<string | null> {
  try {
    const response = await fetch(`${BACKEND}/health`, { cache: "no-store" });
    if (!response.ok) return null;
    return ((await response.json()) as Health).model;
  } catch {
    return null;
  }
}

export default async function SettingsPage() {
  // Same guard as the dashboard: `proxy.ts` checks that a cookie exists, this
  // checks that it still resolves to a user before rendering.
  const account = await requireAccount();

  // The row itself, not the `Account` built from it: this screen needs the two
  // name parts apart, which `Account` joins, and whether a password exists at
  // all, which `Account` deliberately does not carry.
  const [doc, connection, model, { t: messages }] = await Promise.all([
    findById(account.id),
    readConnection(account.id),
    loadModel(),
    readMessages(),
  ]);
  const t = messages.settings;

  return (
    <div className="page settings">
      <header className="page-head rise">
        <div>
          <p className="eyebrow">{t.eyebrow}</p>
          <h1>{t.title}</h1>
          <p className="page-lede">{t.lede}</p>
        </div>
      </header>

      <div className="settings-stack">
        <div className="rise" style={{ "--delay": "110ms" } as React.CSSProperties}>
          <AccountSettings
            lastName={doc?.lastName ?? ""}
            firstName={doc?.firstName ?? ""}
            email={account.email}
            memberSince={account.memberSince}
            hasPassword={doc?.passwordHash != null}
            isGoogle={doc?.google != null}
          />
        </div>

        <div className="rise" style={{ "--delay": "180ms" } as React.CSSProperties}>
          {connection ? (
            <ConnectionSettings connection={connection} />
          ) : (
            // Reachable only by deleting the row from under a live session:
            // every page behind the gate redirects an account with no
            // connection to the wizard. Drawn anyway, because the alternative
            // is a settings screen that crashes on a state the app can be in.
            <section className="panel">
              <div className="panel-head">
                <h2>
                  <Icon name="database" /> {t.sapConnection}
                </h2>
              </div>
              <p className="field-note">
                {t.noConnection}{" "}
                <Link className="link-button" href="/setup">
                  {t.runSetup}
                </Link>
              </p>
            </section>
          )}
        </div>

        {connection ? (
          <div className="rise" style={{ "--delay": "250ms" } as React.CSSProperties}>
            <ScopeSettings
              scope={{
                industry: connection.industry,
                blocklist: connection.blocklist,
                allowTables: connection.allowTables,
              }}
            />
          </div>
        ) : null}

        <div className="rise" style={{ "--delay": "320ms" } as React.CSSProperties}>
          <section className="panel">
            <div className="panel-head">
              <h2>
                <Icon name="sliders" /> {t.sessions}
              </h2>
              <p className="panel-note">{t.sessionsNote}</p>
            </div>

            {/* No pencil, and the hint says why. The SDK takes a model per
                query, so this could become an account setting — it would mean
                the backend accepting one on `POST /sessions` and holding it
                per session, which is a change on that side and not a control
                this screen can grow on its own. */}
            <div className="setting-rows">
              <ApprovalSettings approval={account.approval} />
              <SettingRow
                label={t.defaultModel}
                value={model ?? t.backendNotAnswering}
                hint={t.defaultModelHint}
              />
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
