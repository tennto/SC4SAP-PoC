/**
 * Home — the operator's dashboard.
 *
 * Who is signed in, what system they are pointed at, and whether anything is
 * actually connected. The skill catalog moved to the rail, which is where you
 * go when you already know what you want; this screen answers "am I set up,
 * and is it working".
 *
 * The backend row, the account panel and the activity panel are live: the
 * first from the real `/health` call below, the second from the signed-in
 * user's row, the third aggregated from this account's stored conversations.
 * The SAP system is still a fixture from `lib/account.ts` until Phase 5-2
 * gives it a real source; see that file for the mapping.
 *
 * Activity is where a credit balance used to be. The balance was a fixture and
 * could only ever have been one — the remaining amount is a number Anthropic
 * holds and this app is never told — where what has been *spent* is already
 * summed on every chat row. Same question, the half of it that is true.
 */
import Link from "next/link";
import { BACKEND } from "@/lib/backend";
import type { Health } from "@/lib/types";
import { CREDITS, SAP_SYSTEM } from "@/lib/account";
import { requireAccount } from "@/lib/auth/session";
import { readActivity } from "@/lib/chat-store";
import { Icon } from "@/components/Icon";
import { FavoriteSkills } from "@/components/FavoriteSkills";
import { ReconnectButton } from "@/components/ReconnectButton";

export const dynamic = "force-dynamic";

/** The word beside the dot for each answer the key check can give. */
const CLAUDE_API_STATUS = {
  up: "active",
  down: "rejected",
  unknown: "unknown",
} as const;

// Intl has no option for the gap, and en-US formats `$41.28` flush. Split with
// a non-breaking space so the symbol cannot end a line on its own.
const money = (value: number): string =>
  value
    .toLocaleString("en-US", { style: "currency", currency: "USD" })
    .replace("$", "$ ");

/**
 * How long ago, in the coarsest unit that still says something.
 *
 * Rendered on the server with `force-dynamic`, so it is right when the page is
 * built and goes stale as the tab is left open — which is the same bargain
 * every other figure on this screen makes, and cheaper than shipping a clock.
 */
function ago(iso: string): string {
  const minutes = Math.round((Date.now() - Date.parse(iso)) / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? "" : "s"} ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.round(hours / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}

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
  // Independent of each other: one is an HTTP call to the backend, the other a
  // Mongo aggregate, and waiting for them in turn would add the slower to the
  // faster for nothing.
  const [{ health, error }, activity] = await Promise.all([
    loadHealth(),
    readActivity(account.id),
  ]);
  const online = health !== null;
  // Every row with a real source behind it, not just the backend — what the
  // reconnect control compares its own check against to tell "still fine"
  // apart from "it came back".
  const connected = health !== null && health.claudeApi.state === "up";

  return (
    <div className="page dashboard">
      <header className="page-head rise">
        <div>
          <p className="eyebrow">SC4SAP · Web PoC</p>
          <h1>Welcome back, {account.firstName}!</h1>
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
            <ReconnectButton online={online} wasConnected={connected} />
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
          {/* The one row whose state does not come from `online`: the backend
              answering says nothing about whether the key it holds still
              works, so the backend checks that separately and reports it. With
              the backend down there is nobody to ask, which is `unknown` and
              not `down` — an unanswered question is not a failed key. */}
          <ConnectionRow
            icon="key"
            label="Claude API Status"
            state={health?.claudeApi.state ?? "unknown"}
            status={CLAUDE_API_STATUS[health?.claudeApi.state ?? "unknown"]}
            detail={
              health ? (
                <>
                  {health.claudeApi.detail} · {CREDITS.keyLabel}
                </>
              ) : (
                <>backend not answering, so the key could not be checked</>
              )
            }
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
          </dl>
        </section>

        <section
          className="panel panel-activity rise"
          style={{ "--delay": "440ms" } as React.CSSProperties}
        >
          <div className="panel-head panel-head-row">
            <h2>
              <Icon name="pulse" /> Activity
            </h2>
            <span className="panel-note">Last 7 days</span>
          </div>

          {/* Turns rather than conversations: it is the number that moves
              during a working session, and the one the spend below tracks. */}
          <p className="figure">
            {activity.week.turns.toLocaleString("en-US")}
            <span className="figure-unit">
              turn{activity.week.turns === 1 ? "" : "s"}
            </span>
          </p>

          <dl className="facts">
            <div>
              <dt>Conversations</dt>
              {/* Both numbers, because one of them alone is unreadable: a
                  week's count means nothing without the total behind it. */}
              <dd>
                {activity.week.chats} this week · {activity.all.chats} all time
              </dd>
            </div>
            <div>
              <dt>Spend</dt>
              <dd>
                {money(activity.week.costUsd)} this week ·{" "}
                {money(activity.all.costUsd)} all time
              </dd>
            </div>
            {/* The backend's count, which is every session it is holding open
                and not only this account's. One backend to one operator for
                now; when that stops being true this row needs its own
                per-account source rather than a different label. */}
            <div>
              <dt>Live sessions</dt>
              <dd>
                {health
                  ? `${health.sessions} open on the backend`
                  : "backend not answering"}
              </dd>
            </div>
            <div>
              <dt>Last activity</dt>
              <dd>
                {activity.lastActiveAt
                  ? ago(activity.lastActiveAt)
                  : "Nothing run yet"}
              </dd>
            </div>
          </dl>
        </section>
      </div>

      <p
        className="fixture-note rise"
        style={{ "--delay": "550ms" } as React.CSSProperties}
      >
        <Icon name="info" /> Account and SAP system figures are placeholders.
        Activity is real. Per-user credentials arrive in Phase 5.
      </p>
    </div>
  );
}
