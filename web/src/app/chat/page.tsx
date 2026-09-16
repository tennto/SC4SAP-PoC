/**
 * Plan item 3-1 — the chat screen.
 *
 * Free-form prompting against the agent. Secondary to the skill pages now that
 * the catalog drives the left rail, which is why it moved off `/` and onto its
 * own route — but it stays the escape hatch for anything the forms do not cover.
 *
 * A Server Component: the session list and the `/health` policy snapshot are
 * fetched on the Next server, straight from the backend, and handed to the
 * client tree as props. So the first paint already shows real state instead of
 * an empty shell that fills in after hydration — and the browser never learns
 * the backend's address.
 *
 * Everything interactive lives under `<Chat>`, which is a client component.
 */
import { BACKEND } from "@/lib/backend";
import { requireAccount } from "@/lib/auth/session";
import type { Account } from "@/lib/account";
import type { Health, Session } from "@/lib/types";
import { Chat } from "@/components/Chat";

// The backend holds sessions in memory and they change constantly, so this
// page can never be prerendered — including at build time, when the backend
// is usually not running at all.
export const dynamic = "force-dynamic";

type InitialState = {
  sessions: Session[];
  health: Health | null;
  error: string | null;
};

async function loadInitialState(account: Account): Promise<InitialState> {
  try {
    const [sessionsResponse, healthResponse] = await Promise.all([
      // With the account, as the proxy would send it: listing is what tells
      // the backend to open a session ahead of the "+" that usually follows,
      // and it opens one only for a caller it knows.
      fetch(`${BACKEND}/sessions`, {
        cache: "no-store",
        headers: {
          "x-sc4sap-user": account.id,
          "x-sc4sap-approval": account.approval,
        },
      }),
      fetch(`${BACKEND}/health`, { cache: "no-store" }),
    ]);

    if (!sessionsResponse.ok || !healthResponse.ok) {
      return {
        sessions: [],
        health: null,
        error: `backend answered ${sessionsResponse.status} / ${healthResponse.status}`,
      };
    }

    const { sessions } = (await sessionsResponse.json()) as {
      sessions: Session[];
    };
    return { sessions, health: (await healthResponse.json()) as Health, error: null };
  } catch (err) {
    // The backend is started separately, so "not running yet" is routine —
    // render the shell with a banner rather than an error page.
    return {
      sessions: [],
      health: null,
      error: `backend unreachable: ${(err as Error).message}. Start it with \`npm run server\`.`,
    };
  }
}

export default async function ChatPage() {
  // Same guard as the dashboard: `proxy.ts` checks that a cookie exists,
  // this checks that it still resolves to a user before rendering.
  const account = await requireAccount();
  const initial = await loadInitialState(account);

  return (
    <Chat
      initialSessions={initial.sessions}
      initialHealth={initial.health}
      initialError={initial.error}
      // The given name only. A hello that uses someone's full name is a
      // summons.
      firstName={account.firstName}
    />
  );
}
