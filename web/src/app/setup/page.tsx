/**
 * `/setup` — the screen between a first sign-in and the app.
 *
 * A new account exists but is pointed at nothing: no ABAP stack, no logon, no
 * key. The dashboard behind this would render every one of those rows as
 * unknown, and every skill in the rail would fail at its first tool call. So
 * the connection is asked for once, here, before any of that is offered.
 *
 * Signed in but not set up, which is why this is a protected route like any
 * other — `proxy.ts` sends anonymous traffic to `/signin`, and
 * `requireSignedIn()` below is the check that the cookie still resolves. It
 * renders without the app shell (see `BARE_ROUTES` in AppShell): a rail full
 * of skills beside a form that exists because none of them can run yet is an
 * offer the screen cannot honour.
 *
 * The wizard collects, validates, checks and stores. `requireAccount()` — the
 * guard every other screen uses — is what sends an account here in the first
 * place, and the row this writes is what stops it doing so again.
 */
import type { Metadata } from "next";
import { requireSignedIn } from "@/lib/auth/session";
import { SetupWizard } from "@/components/SetupWizard";
import { Sc4Mark } from "@/components/Sc4Mark";
import { LanguageSwitch } from "@/components/LanguageSwitch";
import { readMessages } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await readMessages();
  return { title: `${t.setup.tabTitle} · SC4SAP` };
}

export default async function SetupPage() {
  // `requireSignedIn`, not `requireAccount`: this screen is where an account
  // with no connection is sent, and the stricter guard would send it here.
  const account = await requireSignedIn();
  const { t } = await readMessages();

  return (
    <main className="setup">
      <LanguageSwitch />
      {/* The screen's h1 lives here rather than on the card, so the four cards
          can swap without the page's one top-level heading swapping with
          them. Each card carries an h2 — the question it is asking. */}
      <div className="setup-brand">
        <Sc4Mark className="setup-logo" />
        <h1 className="setup-title">{t.setup.title}</h1>
      </div>

      {/* The same split the dashboard's greeting makes — `toAccount` builds
          the name family-name-first, and both screens address the first word
          of it. One convention, so the two greetings cannot disagree. */}
      <SetupWizard firstName={account.name.split(" ")[0]} />
    </main>
  );
}
