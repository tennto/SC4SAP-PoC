import { NextResponse } from "next/server";
import { apiConnected } from "@/lib/auth/api-guard";
import {
  appendTurns,
  contextPreamble,
  deleteChat,
  readChat,
} from "@/lib/chat-store";

export const dynamic = "force-dynamic";

type Context = { params: Promise<{ id: string }> };

/** One conversation and every turn in it, oldest first. */
export async function GET(
  _request: Request,
  { params }: Context,
): Promise<Response> {
  // Signed in *and* set up. A conversation belongs to a connection, and an
  // account with none has nothing for one to run against — see `apiConnected`.
  const auth = await apiConnected();
  if ("response" in auth) return auth.response;
  const account = auth.account;

  const { id } = await params;
  try {
    const found = await readChat(account.id, id);
    if (!found) {
      return NextResponse.json({ error: "unknown chat" }, { status: 404 });
    }
    // Built here rather than in the browser: the trimming rule belongs next to
    // the storage it trims, and the client has no reason to own it.
    return NextResponse.json({
      ...found,
      context: contextPreamble(found.messages),
    });
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 503 },
    );
  }
}

/**
 * Appends turns. The client numbers them, so this is safe to retry: a repeat
 * of the same `seq` rewrites its row rather than adding a second one.
 */
export async function POST(
  request: Request,
  { params }: Context,
): Promise<Response> {
  // Signed in *and* set up. A conversation belongs to a connection, and an
  // account with none has nothing for one to run against — see `apiConnected`.
  const auth = await apiConnected();
  if ("response" in auth) return auth.response;
  const account = auth.account;

  const { id } = await params;
  const body = (await request.json()) as {
    title?: string | null;
    sdkSessionId?: string | null;
    turns?: number;
    totalCostUsd?: number;
    messages?: {
      seq: number;
      role: "user" | "agent";
      text: string;
      attachments?: unknown;
    }[];
  };

  const messages = (body.messages ?? [])
    .filter(
      (message) =>
        Number.isInteger(message.seq) &&
        (message.role === "user" || message.role === "agent") &&
        typeof message.text === "string",
    )
    .map((message) => ({
      seq: message.seq,
      role: message.role,
      text: message.text,
      // Names and sizes only, and only the well-formed ones: this is the
      // client's word for what it sent, kept for display.
      attachments: Array.isArray(message.attachments)
        ? message.attachments
            .filter(
              (file): file is { name: string; mediaType: string; size: number } =>
                typeof file === "object" &&
                file !== null &&
                typeof (file as { name?: unknown }).name === "string" &&
                typeof (file as { mediaType?: unknown }).mediaType === "string" &&
                typeof (file as { size?: unknown }).size === "number",
            )
            .slice(0, 5)
            .map((file) => ({
              name: file.name.slice(0, 200),
              mediaType: file.mediaType,
              size: file.size,
            }))
        : undefined,
    }));

  try {
    await appendTurns(account.id, id, { ...body, messages });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 503 },
    );
  }
}

export async function DELETE(
  _request: Request,
  { params }: Context,
): Promise<Response> {
  // Signed in *and* set up. A conversation belongs to a connection, and an
  // account with none has nothing for one to run against — see `apiConnected`.
  const auth = await apiConnected();
  if ("response" in auth) return auth.response;
  const account = auth.account;

  const { id } = await params;
  try {
    await deleteChat(account.id, id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 503 },
    );
  }
}
