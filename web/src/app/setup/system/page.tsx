/**
 * `/setup/system` — add a SAP system to an account that already has one.
 *
 * Split from `/setup` rather than given to it as a mode. That screen is the
 * gate a new account passes through, and nearly everything about it is bound
 * to being first: it asks for a Console key this app already holds, its way
 * out is to sign out, it renders without the app shell because no skill can
 * run yet, and finishing it means "now you may use the app". None of that is
 * true of someone in Settings adding a second system, and a wizard carrying a
 * flag through five steps to suppress half of itself is harder to read than
 * two screens that each do one thing.
 *
 * `requireAccount`, not `requireSignedIn`: this is behind the gate. An account
 * that has not finished setup belongs on `/setup`, and that guard is what
 * sends it there.
 */
import type { Metadata } from "next";
import { requireAccount } from "@/lib/auth/session";
import { AddSystemForm } from "@/components/AddSystemForm";
import { Sc4Mark } from "@/components/Sc4Mark";
import { readMessages } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await readMessages();
  return { title: `${t.addSystem.title} · SC4SAP` };
}

// The form writes, and what it writes decides what the next render shows.
export const dynamic = "force-dynamic";

export default async function AddSystemPage() {
  await requireAccount();
  const { t } = await readMessages();

  return (
    <main className="setup setup-long">
      <div className="setup-brand">
        <Sc4Mark className="setup-logo" />
        <h1 className="setup-title">{t.addSystem.title}</h1>
      </div>
      <AddSystemForm />
    </main>
  );
}
