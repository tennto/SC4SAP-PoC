/**
 * Phase 2-6 — backend-only E2E.
 *
 * Drives the running server over plain HTTP + SSE, exactly as a browser would:
 * create a session, send a turn, answer approvals off the stream, assert what
 * came back. No SDK import — if this passes, the HTTP contract is the thing
 * that works, not some in-process shortcut.
 *
 *   npm run server           # in another terminal
 *   npm run e2e
 *
 * Every scenario is read-only or denied. Nothing here mutates SAP: the write
 * tools are removed from context by the 2-5 policy, and the one row-extraction
 * case is answered with "deny" on purpose.
 */
const BASE = process.env.SC4SAP_E2E_BASE ?? "http://127.0.0.1:3001";
const TURN_TIMEOUT_MS = 120_000;

/** How the driver answers whatever approval the turn raises. */
type Policy = "allow" | "deny" | "ignore";

type TurnResult = {
  requests: { toolName: string; kind: string }[];
  decisions: string[];
  toolResults: string[];
  text: string;
  timedOut: boolean;
};

type Question = { question: string; options: { label: string }[] };

async function json<T>(res: Response): Promise<T> {
  if (!res.ok) throw new Error(`${res.status} ${res.url}: ${await res.text()}`);
  return (await res.json()) as T;
}

async function createSession(): Promise<string> {
  const body = await json<{ session: { id: string } }>(
    await fetch(`${BASE}/sessions`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{}",
    }),
  );
  return body.session.id;
}

/**
 * Per-session replay cursor. Without it a second turn re-reads the first
 * turn's history and stops at ITS `result` — the turn looks finished before it
 * has begun, and the previous answer is mistaken for the new one.
 */
const cursors = new Map<string, number>();

/**
 * Sends one turn and consumes the stream until the `result` message.
 * The stream is opened BEFORE the message is posted so nothing is missed —
 * replay would cover it, but not the deltas, which are ephemeral by design.
 */
async function runTurn(
  id: string,
  prompt: string,
  policy: Policy,
): Promise<TurnResult> {
  const out: TurnResult = {
    requests: [],
    decisions: [],
    toolResults: [],
    text: "",
    timedOut: false,
  };

  const stream = await fetch(`${BASE}/sessions/${id}/stream`, {
    headers: { "last-event-id": String(cursors.get(id) ?? 0) },
  });
  if (!stream.body) throw new Error("stream has no body");
  const reader = stream.body.getReader();
  const decoder = new TextDecoder();

  const consume = (async () => {
    let buffer = "";
    for (;;) {
      const { value, done } = await reader.read();
      if (done) return;
      buffer += decoder.decode(value, { stream: true });
      const frames = buffer.split("\n\n");
      buffer = frames.pop() ?? "";

      for (const frame of frames) {
        const lines = frame.split("\n");
        const seq = Number(
          lines.find((l) => l.startsWith("id: "))?.slice(4) ?? NaN,
        );
        if (Number.isFinite(seq)) cursors.set(id, seq);

        const line = lines.find((l) => l.startsWith("data: "));
        if (!line) continue;
        const event = JSON.parse(line.slice(6));

        if (event.type === "permission_request") {
          const req = event.request;
          out.requests.push({ toolName: req.toolName, kind: req.kind });
          if (policy === "ignore") continue;
          await fetch(`${BASE}/sessions/${id}/permissions/${req.reqId}`, {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify(answerFor(req, policy)),
          });
        } else if (event.type === "permission_resolved") {
          out.decisions.push(event.decision);
        } else if (event.type === "message") {
          collectMessage(event.message, out);
          if (event.message.type === "result") return;
        }
      }
    }
  })();

  await fetch(`${BASE}/sessions/${id}/messages`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ text: prompt }),
  });

  const timeout = new Promise<"timeout">((r) =>
    setTimeout(() => r("timeout"), TURN_TIMEOUT_MS),
  );
  out.timedOut = (await Promise.race([consume, timeout])) === "timeout";
  await reader.cancel().catch(() => {});
  return out;
}

function answerFor(
  req: { kind: string; questions?: Question[] },
  policy: "allow" | "deny",
): unknown {
  if (policy === "deny") {
    return { behavior: "deny", message: "Denied by the E2E driver." };
  }
  if (req.kind !== "question") return { behavior: "allow" };
  // Always take the first option, so the assertion is deterministic.
  return {
    behavior: "allow",
    answers: Object.fromEntries(
      (req.questions ?? []).map((q) => [q.question, q.options[0]?.label ?? ""]),
    ),
  };
}

function collectMessage(message: any, out: TurnResult): void {
  if (message.type === "assistant") {
    for (const block of message.message.content ?? []) {
      if (block.type === "text") out.text += block.text;
    }
  }
  if (message.type === "user") {
    for (const block of message.message.content ?? []) {
      if (block.type !== "tool_result") continue;
      out.toolResults.push(
        typeof block.content === "string"
          ? block.content
          : JSON.stringify(block.content),
      );
    }
  }
}

// ── assertions ───────────────────────────────────────────────────────────────

let failures = 0;

function check(label: string, ok: boolean, detail = ""): void {
  console.log(`  ${ok ? "PASS" : "FAIL"}  ${label}${detail ? ` — ${detail}` : ""}`);
  if (!ok) failures += 1;
}

async function scenario(
  name: string,
  fn: () => Promise<void>,
): Promise<void> {
  console.log(`\n${name}`);
  try {
    await fn();
  } catch (err) {
    check(`${name} threw`, false, (err as Error).message);
  }
}

async function main(): Promise<void> {
  const health = await json<{
    ok: boolean;
    toolPolicy: { autoAllowed: number; denyPatterns: string[] };
  }>(await fetch(`${BASE}/health`));
  console.log(
    `server up — ${health.toolPolicy.autoAllowed} auto-allowed tools, ` +
      `${health.toolPolicy.denyPatterns.length} deny patterns`,
  );
  check("tool policy discovered", health.toolPolicy.autoAllowed > 0);

  await scenario("1. plain turn streams an answer", async () => {
    const id = await createSession();
    const turn = await runTurn(id, "Reply with exactly: PONG", "allow");
    check("not timed out", !turn.timedOut);
    check("assistant said PONG", turn.text.includes("PONG"), turn.text.trim());
    check("no approval needed", turn.requests.length === 0);
    await fetch(`${BASE}/sessions/${id}`, { method: "DELETE" });
  });

  await scenario("2. multi-turn keeps context", async () => {
    const id = await createSession();
    await runTurn(id, "Remember the codeword ZEBRA. Reply OK.", "allow");
    const turn = await runTurn(
      id,
      "What codeword did I give you? Reply with only that word.",
      "allow",
    );
    check("recalled across turns", turn.text.includes("ZEBRA"), turn.text.trim());
    await fetch(`${BASE}/sessions/${id}`, { method: "DELETE" });
  });

  await scenario("3. read tool is auto-allowed, no prompt", async () => {
    const id = await createSession();
    // Deny policy on purpose: if a prompt were raised, the call would fail.
    const turn = await runTurn(
      id,
      "Use GetProgram to read RSUSR002, then say whether you got the source.",
      "deny",
    );
    check("no approval raised", turn.requests.length === 0);
    check(
      "source came back",
      turn.toolResults.some((t) => t.includes("RSUSR002")),
    );
    await fetch(`${BASE}/sessions/${id}`, { method: "DELETE" });
  });

  await scenario("4. write tool is absent from context", async () => {
    const id = await createSession();
    const turn = await runTurn(
      id,
      "Attempt to call mcp__plugin_sc4sap_sap__CreateClass once. " +
        "If it is not available to you, say NOT_AVAILABLE and stop.",
      "allow",
    );
    check("no approval raised", turn.requests.length === 0);
    check(
      "model reports it unavailable",
      turn.text.includes("NOT_AVAILABLE"),
      turn.text.slice(0, 120).trim(),
    );
    await fetch(`${BASE}/sessions/${id}`, { method: "DELETE" });
  });

  await scenario("5. row extraction prompts, and deny blocks it", async () => {
    const id = await createSession();
    const turn = await runTurn(
      id,
      "Call GetTableContents for table T100 with 1 row. Attempt once, then report what happened.",
      "deny",
    );
    check(
      "approval was raised",
      turn.requests.some((r) => r.toolName.endsWith("GetTableContents")),
    );
    check("resolved as deny", turn.decisions.includes("deny"));
    check(
      "nothing extracted",
      turn.toolResults.some((t) => t.includes("Denied by the E2E driver")),
    );
    await fetch(`${BASE}/sessions/${id}`, { method: "DELETE" });
  });

  await scenario("6. blocklist hook outranks a human allow", async () => {
    const id = await createSession();
    const turn = await runTurn(
      id,
      "Call GetTableContents for table BNKA with 1 row. Attempt once, then report verbatim what came back.",
      "allow",
    );
    check(
      "no approval was ever offered",
      turn.requests.length === 0,
      `saw ${turn.requests.map((r) => r.toolName).join(",") || "none"}`,
    );
    check(
      "hook denial surfaced",
      turn.toolResults.some((t) => t.includes("sc4sap blocklist")),
    );
    await fetch(`${BASE}/sessions/${id}`, { method: "DELETE" });
  });

  await scenario("7. AskUserQuestion round-trips an answer", async () => {
    const id = await createSession();
    const turn = await runTurn(
      id,
      "Use the AskUserQuestion tool to ask which SAP module to focus on: MM or SD. " +
        "After I answer, repeat my answer back in one short sentence.",
      "allow",
    );
    check(
      "arrived as a question",
      turn.requests.some((r) => r.kind === "question"),
    );
    check("answer reached the model", turn.text.includes("MM"), turn.text.trim());
    await fetch(`${BASE}/sessions/${id}`, { method: "DELETE" });
  });

  await scenario("8. delete evicts the session", async () => {
    const id = await createSession();
    const del = await fetch(`${BASE}/sessions/${id}`, { method: "DELETE" });
    check("delete returns 204", del.status === 204, String(del.status));
    const after = await fetch(`${BASE}/sessions/${id}`);
    check("404 afterwards", after.status === 404, String(after.status));
  });

  console.log(
    failures === 0
      ? "\nAll scenarios passed."
      : `\n${failures} check(s) FAILED.`,
  );
  process.exitCode = failures === 0 ? 0 : 1;
}

main().catch((err) => {
  console.error(`\nFAILED: ${(err as Error).message}`);
  console.error("Is the server running? `npm run server`");
  process.exitCode = 1;
});
