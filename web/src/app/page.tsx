/**
 * Home — the operator's dashboard.
 *
 * Who is signed in, what system they are pointed at, what the API key has left,
 * and whether anything is actually connected. The skill catalog moved to the
 * rail, which is where you go when you already know what you want; this screen
 * answers "am I set up, and can I afford to run something".
 *
 * The backend row and the account panel are live: the first from the real
 * `/health` call below, the second from the signed-in user's row. SAP system
 * and credits are still fixtures from `lib/account.ts` until Phase 5-2/5-4
 * give each of them a real source; see that file for the mapping.
 */
import Link from "next/link";
import { BACKEND } from "@/lib/backend";
import type { Health } from "@/lib/types";
import { CREDITS, SAP_SYSTEM } from "@/lib/account";
import { requireAccount } from "@/lib/auth/session";
import { Icon } from "@/components/Icon";
import { FavoriteSkills } from "@/components/FavoriteSkills";

export const dynamic = "force-dynamic";

// Intl has no option for the gap, and en-US formats `$41.28` flush. Split with
// a non-breaking space so the symbol cannot end a line on its own.
const money = (value: number): string =>
  value
    .toLocaleString("en-US", { style: "currency", currency: "USD" })
    .replace("$", "$ ");

async function loadHealth(): Promise<{ health: Health | null; error: string | null }> {
  try {
    const response = await fetch(`${BACKEND}/health`, { cache: "no-store" });
    if (!response.ok) {
      return { health: null, error: `backend answered ${response.status}` };
    }
    return { health: (await response.json()) as Health, error: null };
  } catch (err) {
    return { health: null, error: (err as Error).message };
  }
}

/** One line of the connection panel. `state` drives the dot, nothing else. */
function ConnectionRow({
  icon,
  label,
  state,
  status,
  detail,
}: {
  icon: string;
  label: string;
  state: "up" | "down" | "unknown";
  status: string;
  detail: React.ReactNode;
}) {
  return (
    <li className={`conn-row is-${state}`}>
      <span className="conn-icon">
        <Icon name={icon} />
      </span>
      <span className="conn-main">
        <span className="conn-label">{label}</span>
        <span className="conn-detail">{detail}</span>
      </span>
      <span className="conn-state">
        <span className="conn-dot" aria-hidden="true" />
        {status}
      </span>
    </li>
  );
}

export default async function HomePage() {
  // Before anything is fetched or rendered. `proxy.ts` has already turned away
  // requests with no cookie at all; this is the check that the cookie still
  // names a session, and it redirects rather than rendering an empty shell.
  const account = await requireAccount();
  const { health, error } = await loadHealth();
  const online = health !== null;
  const usedShare = Math.min(1, CREDITS.usedUsd / CREDITS.limitUsd);

  return (
    <div className="page dashboard">
      <header className="page-head rise">
        <div>
          <p className="eyebrow">SC4SAP · Web PoC</p>
          <h1>Welcome back, {account.name.split(" ")[0]}</h1>
          <p className="page-lede">
            Everything this session is pointed at, in one place. Pick a skill
            from the rail when you are ready to run one.
          </p>
        </div>

      </header>

      <FavoriteSkills />

      <section
        className="panel connections rise"
        style={{ "--delay": "110ms" } as React.CSSProperties}
        aria-labelledby="connections-heading"
      >
        <div className="panel-head panel-head-row">
          <div>
            <h2 id="connections-heading">Connection</h2>
            <p className="panel-note">
              {online
                ? "The agent backend is answering. Skills will run against the system below."
                : "The agent backend is not answering, so nothing can run yet."}
            </p>
          </div>

          <div className="conn-actions">
            {online ? (
              <button className="ghost" title="Not wired up yet">
                <Icon name="arrows-clockwise" />
                Reconnect
              </button>
            ) : (
              <button className="primary" title="Not wired up yet">
                <Icon name="plugs-connected" />
                Connect to server
              </button>
            )}
            <Link className="link-button" href="/skills/sap-doctor">
              Run diagnostics
            </Link>
          </div>
        </div>

        <ul className="conn-list">
          <ConnectionRow
            icon="hard-drives"
            label="Agent Status"
            state={online ? "up" : "down"}
            status={online ? "connected" : "offline"}
            detail={
              health ? (
                <>
                  {health.model} · {health.sessions} session
                  {health.sessions === 1 ? "" : "s"} ·{" "}
                  {health.toolPolicy.autoAllowed} read tools auto-allowed
                </>
              ) : (
                <>{error ?? "unreachable"} — start it with `npm run server`</>
              )
            }
          />
          <ConnectionRow
            icon="database"
            label="SAP System"
            state={online ? "up" : "unknown"}
            status={online ? "reachable" : "unknown"}
            detail={
              <>
                {SAP_SYSTEM.sid} · client {SAP_SYSTEM.client} ·{" "}
                {SAP_SYSTEM.user} · <code>{SAP_SYSTEM.host}</code>
              </>
            }
          />
          <ConnectionRow
            icon="key"
            label="Claude API Status"
            state="up"
            status="active"
            detail={<>{CREDITS.keyLabel} · billed to this account</>}
          />
        </ul>
      </section>

      <div className="card-grid">
        <section
          className="panel rise"
          style={{ "--delay": "220ms" } as React.CSSProperties}
        >
          <div className="panel-head">
            <h2>
              <Icon name="user-circle" /> Account
            </h2>
          </div>
          <dl className="facts">
            <div>
              <dt>Name</dt>
              <dd>{account.name}</dd>
            </div>
            <div>
              <dt>Email</dt>
              <dd>{account.email}</dd>
            </div>
            {/* Neither is asked for at sign-up. The row stays, so the panel
                does not change shape once settings can fill them in. */}
            <div>
              <dt>Role</dt>
              <dd>{account.role ?? "Not set"}</dd>
            </div>
            <div>
              <dt>Organization</dt>
              <dd>{account.organization ?? "Not set"}</dd>
            </div>
            <div>
              <dt>Plan</dt>
              <dd>{account.plan}</dd>
            </div>
            <div>
              <dt>Member since</dt>
              <dd>{account.memberSince}</dd>
            </div>
          </dl>
        </section>

        <section
          className="panel rise"
          style={{ "--delay": "330ms" } as React.CSSProperties}
        >
          <div className="panel-head panel-head-row">
            <h2>
              <Icon name="database" /> SAP system
            </h2>
            <span className="tier">{SAP_SYSTEM.tier}</span>
          </div>
          <dl className="facts">
            <div>
              <dt>Profile</dt>
              <dd>
                {SAP_SYSTEM.alias} — {SAP_SYSTEM.description}
              </dd>
            </div>
            <div>
              <dt>Host</dt>
              <dd>
                <code>{SAP_SYSTEM.host}</code>
              </dd>
            </div>
            <div>
              <dt>System / client</dt>
              <dd>
                {SAP_SYSTEM.sid} · {SAP_SYSTEM.client} · {SAP_SYSTEM.language}
              </dd>
            </div>
            <div>
              <dt>User</dt>
              <dd>{SAP_SYSTEM.user}</dd>
            </div>
            <div>
              <dt>Release</dt>
              <dd>
                {SAP_SYSTEM.sapVersion} · ABAP {SAP_SYSTEM.abapRelease}
              </dd>
            </div>
            <div>
              <dt>Industry / country</dt>
              <dd>
                {SAP_SYSTEM.industry} · {SAP_SYSTEM.country}
              </dd>
            </div>
          </dl>
        </section>

        <section
          className="panel rise"
          style={{ "--delay": "440ms" } as React.CSSProperties}
        >
          <div className="panel-head panel-head-row">
            <h2>
              <Icon name="wallet" /> Credits
            </h2>
            <span className="panel-note">{CREDITS.periodLabel}</span>
          </div>

          <p className="figure">
            {money(CREDITS.balanceUsd)}
            <span className="figure-unit">remaining</span>
          </p>

          <div
            className="meter"
            role="img"
            aria-label={`${money(CREDITS.usedUsd)} of ${money(CREDITS.limitUsd)} used`}
          >
            <span
              className="meter-fill"
              style={{ width: `${(usedShare * 100).toFixed(1)}%` }}
            />
          </div>
          <p className="meter-legend">
            {money(CREDITS.usedUsd)} used of {money(CREDITS.limitUsd)} limit
          </p>

          <dl className="facts">
            <div>
              <dt>Output tokens</dt>
              <dd>{CREDITS.tokensUsed.toLocaleString("en-US")}</dd>
            </div>
          </dl>
        </section>
      </div>

      <p
        className="fixture-note rise"
        style={{ "--delay": "550ms" } as React.CSSProperties}
      >
        <Icon name="info" /> Account, SAP system and credit figures are
        placeholders. Sign-in and per-user credentials arrive in Phase 5.
      </p>
    </div>
  );
}
