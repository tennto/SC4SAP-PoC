/**
 * View all's search: conversations whose title or saved messages contain the
 * query. An exact segment, so it wins over `/api/chats/[id]`.
 */
import { NextResponse } from "next/server";
import { apiConnected } from "@/lib/auth/api-guard";
import { searchChats } from "@/lib/chat-store";

export const dynamic = "force-dynamic";

export async function GET(request: Request): Promise<Response> {
  const auth = await apiConnected();
  if ("response" in auth) return auth.response;
  const query = new URL(request.url).searchParams.get("q") ?? "";
  try {
    return NextResponse.json({ results: await searchChats(auth.account.id, query) });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 503 });
  }
}
