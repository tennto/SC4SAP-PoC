/**
 * The reader's saved conversations.
 *
 * Deliberately a Next route rather than something on the Fastify backend: the
 * backend is user-agnostic — it knows sessions, not accounts — and the cookie
 * that says who is asking only exists here. `[...path]/route.ts` proxies
 * everything else under `/api` to the backend, and does not see this because
 * an exact segment wins over a catch-all.
 */
import { NextResponse } from "next/server";
import { apiConnected } from "@/lib/auth/api-guard";
import { listChats } from "@/lib/chat-store";

export const dynamic = "force-dynamic";

export async function GET(): Promise<Response> {
  // Signed in *and* set up. A conversation belongs to a connection, and an
  // account with none has nothing for one to run against — see `apiConnected`.
  const auth = await apiConnected();
  if ("response" in auth) return auth.response;
  const account = auth.account;

  try {
    return NextResponse.json({ chats: await listChats(account.id) });
  } catch (err) {
    // Mongo being unreachable must not take the chat screen down with it —
    // live sessions still work, only the history is missing.
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 503 },
    );
  }
}
