import { NextResponse } from "next/server";
import { apiConnected } from "@/lib/auth/api-guard";
import { deleteProject, renameProject } from "@/lib/chat-store";

export const dynamic = "force-dynamic";

type Context = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Context): Promise<Response> {
  const auth = await apiConnected();
  if ("response" in auth) return auth.response;
  const { id } = await params;
  const body = (await request.json().catch(() => ({}))) as { name?: unknown };
  if (typeof body.name !== "string" || body.name.trim() === "") {
    return NextResponse.json({ error: "body.name is required" }, { status: 400 });
  }
  try {
    return (await renameProject(auth.account.id, id, body.name))
      ? NextResponse.json({ ok: true })
      : NextResponse.json({ error: "unknown project" }, { status: 404 });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 503 });
  }
}

/** Deletes the project; its conversations stay, unfiled. */
export async function DELETE(_request: Request, { params }: Context): Promise<Response> {
  const auth = await apiConnected();
  if ("response" in auth) return auth.response;
  const { id } = await params;
  try {
    await deleteProject(auth.account.id, id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 503 });
  }
}
