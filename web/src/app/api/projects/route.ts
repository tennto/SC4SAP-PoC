/**
 * The reader's projects — named folders on the chat screen. A Next route for
 * the same reason as `/api/chats`: only this side knows who is signed in.
 */
import { NextResponse } from "next/server";
import { apiConnected } from "@/lib/auth/api-guard";
import { createProject, listProjects } from "@/lib/chat-store";

export const dynamic = "force-dynamic";

export async function GET(): Promise<Response> {
  const auth = await apiConnected();
  if ("response" in auth) return auth.response;
  try {
    return NextResponse.json({ projects: await listProjects(auth.account.id) });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 503 });
  }
}

export async function POST(request: Request): Promise<Response> {
  const auth = await apiConnected();
  if ("response" in auth) return auth.response;
  const body = (await request.json().catch(() => ({}))) as { name?: unknown };
  if (typeof body.name !== "string" || body.name.trim() === "") {
    return NextResponse.json({ error: "body.name is required" }, { status: 400 });
  }
  try {
    return NextResponse.json(
      { project: await createProject(auth.account.id, body.name) },
      { status: 201 },
    );
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 503 });
  }
}
