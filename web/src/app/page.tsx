/**
 * Home — the operator's dashboard.
 *
 * Who is signed in, what system they are pointed at, and whether anything is
 * actually connected. The skill catalog moved to the rail, which is where you
 * go when you already know what you want; this screen answers "am I set up,
 * and is it working".
 *
 * The three connection rows, the account panel and the activity panel are
 * live: the backend and key rows from the real `/health` call below, the SAP
 * row from this account's stored connection and the last probe of it, the
 * account from the signed-in user's row, the activity aggregated from this
 * account's stored conversations. The SAP system *card* lower down is still a
 * fixture from `lib/account.ts` — it wants a SID, a tier and a module list
 * that setup does not collect yet; see that file for the mapping.
 *
 * Activity is where a credit balance used to be. The balance was a fixture and
 * could only ever have been one — the remaining amount is a number Anthropic
 * holds and this app is never told — where what has been *spent* is already
 * summed on every chat row. Same question, the half of it that is true.
 *
 * Every visible string comes from the dictionary in `lib/i18n/messages.ts`,
 * chosen by the cookie the account menu writes. Rendered on the server, so
 * the page arrives in the right language rather than flipping after hydration.
 */
import Link from "next/link";
import { BACKEND } from "@/lib/backend";
import type { Health } from "@/lib/types";
import { CREDITS, SAP_SYSTEM } from "@/lib/account";
import { requireAccount } from "@/lib/auth/session";
import { readActivity } from "@/lib/chat-store";
import { readConnection } from "@/lib/setup-store";
import { readMessages } from "@/lib/i18n/server";
import { localeTag } from "@/lib/i18n/locale";
import type { Messages } from "@/lib/i18n/messages";
import { Icon } from "@/components/Icon";
import { FavoriteSkills } from "@/components/FavoriteSkills";
import { ReconnectButton } from "@/components/ReconnectButton";

export const dynamic = "force-dynamic";

/** The dictionary key beside the dot for each answer the key check can give. */
const CLAUDE_API_STATUS = {
  up: "active",
  down: "rejected",
  unknown: "unknown",
} as const;

// Intl has no option for the gap, and en-US formats `$41.28` flush. Split with
// a non-breaking space so the symbol cannot end a line on its own. Always the
// en-US shape whatever the UI language: the figure is a US-dollar amount from
// Anthropic's bill, and `ko-KR` would spell it `US$41.28` on a screen that
// never shows a second currency.
const money = (value: number): string =>
  value
    .toLocaleString("en-US", { style: "currency", currency: "USD" })
    .replace("$", "$ ");

/**
 * How long ago, in the coarsest unit that still says something.
 *
 * Rendered on the server with `force-dynamic`, so it is right when the page is
 * built and goes stale as the tab is left open — which is the same bargain
 * every other figure on this screen makes, and cheaper than shipping a clock.
 *
 * `Intl.RelativeTimeFormat` rather than a hand-pluralised string, because the
 * three languages put the number in three different places; the one case it
 * cannot phrase is "less than a minute", which each dictionary says itself.
 */
function ago(iso: string, tag: string, justNow: string): string {
  const minutes = Math.round((Date.now() - Date.parse(iso)) / 60000);
  if (minutes < 1) return justNow;
  const format = new Intl.RelativeTimeFormat(tag, { numeric: "always" });
  if (minutes < 60) return format.format(-minutes, "minute");
  const hours = Math.round(minutes / 60);
  if (hours < 24) return format.format(-hours, "hour");
  return format.format(-Math.round(hours / 24), "day");
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

/**
 * The SAP row's tail: what the last probe found and when, or the nudge to run
 * one. Its own function because the three languages order "answered" and
 * "3 hours ago" differently, and that belongs in the dictionary, not in JSX.
 */
function sapTail(
  sap: { ok: boolean; detail: string; at: string } | null,
  t: Messages["home"],
  tag: string,
): string {
  if (!sap) return t.sapPressReconnect;
  const when = ago(sap.at, tag, t.justNow);
  return sap.ok ? t.sapAnswered(when) : t.sapFailed(sap.detail, when);
}

export default async function HomePage() {
  // Before anything is fetched or rendered. `proxy.ts` has already turned away
  // requests with no cookie at all; this is the check that the cookie still
  // names a session, and it redirects rather than rendering an empty shell.
  const account = await requireAccount();
  // Independent of each other: one is an HTTP call to the backend, the other a
  // Mongo aggregate, and waiting for them in turn would add the slower to the
  // faster for nothing.
  const [{ health, error }, activity, connection, { locale, t: messages }] =
    await Promise.all([
      loadHealth(),
      readActivity(account.id),
      readConnection(account.id),
      readMessages(),
    ]);
  const t = messages.home;
  const tag = localeTag(locale);
  const online = health !== null;
  // The SAP row is not measured on render — the probe takes up to twelve
  // seconds against a system that is not answering, which is not a price a
  // page load should pay. It shows what the last probe found, and the
  // reconnect control is what runs a new one. `null` means never probed,
  // which is drawn as unknown rather than as down: an unasked question is not
  // a failed answer.
  const sap = connection?.lastCheck ?? null;
  // Every row with a real source behind it — what the reconnect control
  // compares its own check against to tell "still fine" apart from "it came
  // back".
  const connected =
    health !== null && health.claudeApi.state === "up" && sap?.ok === true;

  return (
    <div className="page dashboard">
      <header className="page-head rise">
        <div>
          <p className="eyebrow">SC4SAP · Web PoC</p>
          <h1>{t.welcome(account.firstName)}</h1>
          <p className="page-lede">{t.lede}</p>
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
            <h2 id="connections-heading">{t.connection}</h2>
            <p className="panel-note">
              {online ? t.connectionOnline : t.connectionOffline}
            </p>
          </div>

          <div className="conn-actions">
            <ReconnectButton online={online} wasConnected={connected} />
            <Link className="link-button" href="/skills/sap-doctor">
              {t.runDiagnostics}
            </Link>
          </div>
        </div>

        <ul className="conn-list">
          <ConnectionRow
            icon="hard-drives"
            label={t.agentStatus}
            state={online ? "up" : "down"}
            status={online ? t.status.connected : t.status.offline}
            detail={
              health
                ? t.agentDetail(
                    health.model,
                    health.sessions,
                    health.toolPolicy.autoAllowed,
                  )
                : t.agentUnreachable(error ?? t.unreachable)
            }
          />
          <ConnectionRow
            icon="database"
            label={t.sapSystem}
            state={sap === null ? "unknown" : sap.ok ? "up" : "down"}
            status={
              sap === null
                ? t.status.notChecked
                : sap.ok
                  ? t.status.reachable
                  : t.status.refused
            }
            detail={
              connection ? (
                <>
                  {t.sapClient(connection.client)} · {connection.sapUser} ·{" "}
                  <code>{connection.adtUrl}</code>
                  {" · "}
                  {sapTail(sap, t, tag)}
                </>
              ) : (
                t.sapNoConnection
              )
            }
          />
          {/* The one row whose state does not come from `online`: the backend
              answering says nothing about whether the key it holds still
              works, so the backend checks that separately and reports it. With
              the backend down there is nobody to ask, which is `unknown` and
              not `down` — an unanswered question is not a failed key. */}
          <ConnectionRow
            icon="key"
            label={t.claudeApiStatus}
            state={health?.claudeApi.state ?? "unknown"}
            status={
              t.status[CLAUDE_API_STATUS[health?.claudeApi.state ?? "unknown"]]
            }
            detail={
              health ? (
                <>
                  {health.claudeApi.detail} · {CREDITS.keyLabel}
                </>
              ) : (
                t.keyNotChecked
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
              <Icon name="user-circle" /> {t.account}
            </h2>
          </div>
          <dl className="facts">
            <div>
              <dt>{t.name}</dt>
              <dd>{account.name}</dd>
            </div>
            <div>
              <dt>{t.email}</dt>
              <dd>{account.email}</dd>
            </div>
            {/* Neither is asked for at sign-up. The row stays, so the panel
                does not change shape once settings can fill them in. */}
            <div>
              <dt>{t.role}</dt>
              <dd>{account.role ?? t.notSet}</dd>
            </div>
            <div>
              <dt>{t.organization}</dt>
              <dd>{account.organization ?? t.notSet}</dd>
            </div>
            <div>
              <dt>{t.plan}</dt>
              <dd>{account.plan}</dd>
            </div>
            <div>
              <dt>{t.memberSince}</dt>
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
              <Icon name="database" /> {t.sapSystemCard}
            </h2>
            <span className="tier">{SAP_SYSTEM.tier}</span>
          </div>
          <dl className="facts">
            <div>
              <dt>{t.profile}</dt>
              <dd>
                {SAP_SYSTEM.alias} — {SAP_SYSTEM.description}
              </dd>
            </div>
            <div>
              <dt>{t.host}</dt>
              <dd>
                <code>{SAP_SYSTEM.host}</code>
              </dd>
            </div>
            <div>
              <dt>{t.systemClient}</dt>
              <dd>
                {SAP_SYSTEM.sid} · {SAP_SYSTEM.client} · {SAP_SYSTEM.language}
              </dd>
            </div>
            <div>
              <dt>{t.user}</dt>
              <dd>{SAP_SYSTEM.user}</dd>
            </div>
            <div>
              <dt>{t.release}</dt>
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
              <Icon name="pulse" /> {t.activity}
            </h2>
            <span className="panel-note">{t.last7Days}</span>
          </div>

          {/* Turns rather than conversations: it is the number that moves
              during a working session, and the one the spend below tracks. */}
          <p className="figure">
            {activity.week.turns.toLocaleString(tag)}
            <span className="figure-unit">{t.turns(activity.week.turns)}</span>
          </p>

          <dl className="facts">
            <div>
              <dt>{t.conversations}</dt>
              {/* Both numbers, because one of them alone is unreadable: a
                  week's count means nothing without the total behind it. */}
              <dd>
                {t.weekAndAllTime(
                  activity.week.chats.toLocaleString(tag),
                  activity.all.chats.toLocaleString(tag),
                )}
              </dd>
            </div>
            <div>
              <dt>{t.spend}</dt>
              <dd>
                {t.weekAndAllTime(
                  money(activity.week.costUsd),
                  money(activity.all.costUsd),
                )}
              </dd>
            </div>
            {/* The backend's count, which is every session it is holding open
                and not only this account's. One backend to one operator for
                now; when that stops being true this row needs its own
                per-account source rather than a different label. */}
            <div>
              <dt>{t.liveSessions}</dt>
              <dd>
                {health
                  ? t.openOnBackend(health.sessions)
                  : t.backendNotAnswering}
              </dd>
            </div>
            <div>
              <dt>{t.lastActivity}</dt>
              <dd>
                {activity.lastActiveAt
                  ? ago(activity.lastActiveAt, tag, t.justNow)
                  : t.nothingRunYet}
              </dd>
            </div>
          </dl>
        </section>
      </div>

      <p
        className="fixture-note rise"
        style={{ "--delay": "550ms" } as React.CSSProperties}
      >
        <Icon name="info" /> {t.fixtureNote}
      </p>
    </div>
  );
}
