/**
 * First-answer latency, measured over the HTTP contract the browser uses.
 *
 *   npm run server                      # in another terminal
 *   npm run bench:latency               # 3 runs, a no-tool prompt
 *   npm run bench:latency -- --runs 5 --sap
 *
 * Each run does what a reader does: `POST /sessions`, then the prompt straight
 * away, then waits on the stream. Four marks per run, all from the moment the
 * session was asked for:
 *
 *   idle     the first `status: idle` — the turn's end, in practice, since
 *            the SDK does not report booting done until it has a prompt
 *   turn     the model started answering (`turn_start`)
 *   text     the first visible token (`text_delta`)
 *   result   the turn ended (`result`)
 *
 * `--sap` asks a question that needs one SAP read, so the figure includes a
 * tool round trip. `--warm-wait N` sleeps N ms after listing sessions and
 * between runs, which is how a warm pool gets its head start. `--pre-wait N`
 * sleeps N ms between opening a session and sending to it, and counts the
 * marks from the prompt — what warming would give, without a warm pool.
 */
const BASE = process.env.SC4SAP_BENCH_BASE ?? "http://127.0.0.1:3001";
const USER = process.env.SC4SAP_BENCH_USER ?? "bench";
const TURN_TIMEOUT_MS = 180_000;

const args = process.argv.slice(2);
const flag = (name: string, fallback: string): string => {
  const at = args.indexOf(`--${name}`);
  return at >= 0 && args[at + 1] ? args[at + 1]! : fallback;
};
const RUNS = Number(flag("runs", "3"));
const WARM_WAIT_MS = Number(flag("warm-wait", "0"));
const SAP = args.includes("--sap");
/**
 * Sleep this long between opening the session and sending the prompt. What
 * a session that was opened ahead of time looks like from the prompt's side.
 */
const PRE_WAIT_MS = Number(flag("pre-wait", "0"));

const PROMPT = SAP
  ? "Use GetProgram to read RSUSR002 and tell me in one sentence what it does."
  : "Reply with exactly: PONG";

const identity = {
  "x-sc4sap-user": USER,
  // Reads go through without a dialog, so the figure is the machine's.
  "x-sc4sap-approval": "writes",
};
// Only where there is a body: Fastify refuses an empty body under this type.
const headers = { ...identity, "content-type": "application/json" };

type Marks = { idle?: number; turn?: number; text?: number; result?: number };

async function run(): Promise<Marks> {
  const t0 = performance.now();
  const since = (): number => Math.round(performance.now() - t0);
  const marks: Marks = {};

  const created = await fetch(`${BASE}/sessions`, {
    method: "POST",
    headers,
    body: "{}",
  });
  if (!created.ok) throw new Error(`POST /sessions ${created.status}`);
  const { session } = (await created.json()) as {
    session: { id: string; status: string };
  };
  if (session.status === "idle") marks.idle = since();

  const stream = await fetch(`${BASE}/sessions/${session.id}/stream`, {
    headers: identity,
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
        const line = frame.split("\n").find((l) => l.startsWith("data: "));
        if (!line) continue;
        const event = JSON.parse(line.slice(6));
        if (event.type === "status" && event.status === "idle" && marks.idle === undefined) {
          marks.idle = since();
        } else if (event.type === "turn_start" && marks.turn === undefined) {
          marks.turn = since();
        } else if (event.type === "text_delta" && marks.text === undefined) {
          marks.text = since();
        } else if (event.type === "message" && event.message.type === "result") {
          marks.result = since();
          return;
        } else if (event.type === "error") {
          throw new Error(event.error);
        }
      }
    }
  })();

  if (PRE_WAIT_MS > 0) await new Promise((r) => setTimeout(r, PRE_WAIT_MS));
  const sent = since();

  await fetch(`${BASE}/sessions/${session.id}/messages`, {
    method: "POST",
    headers,
    body: JSON.stringify({ text: PROMPT }),
  });

  const timeout = new Promise<"timeout">((r) =>
    setTimeout(() => r("timeout"), TURN_TIMEOUT_MS),
  );
  if ((await Promise.race([consume, timeout])) === "timeout") {
    throw new Error("turn timed out");
  }
  await reader.cancel().catch(() => {});
  await fetch(`${BASE}/sessions/${session.id}`, { method: "DELETE", headers: identity });
  // With a head start, the figures that matter count from the prompt.
  if (PRE_WAIT_MS > 0) {
    for (const key of ["turn", "text", "result"] as const) {
      if (marks[key] !== undefined) marks[key] = marks[key]! - sent;
    }
  }
  return marks;
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid]! : (sorted[mid - 1]! + sorted[mid]!) / 2;
}

async function main(): Promise<void> {
  const health = await fetch(`${BASE}/health`);
  if (!health.ok) throw new Error(`server not healthy: ${health.status}`);

  // What the chat page does on load. A warm pool, if there is one, starts here.
  await fetch(`${BASE}/sessions`, { headers: identity });
  if (WARM_WAIT_MS > 0) {
    console.log(`waiting ${WARM_WAIT_MS} ms for a warm session`);
    await new Promise((r) => setTimeout(r, WARM_WAIT_MS));
  }

  console.log(
    `${RUNS} run(s), prompt: ${PROMPT}` +
      (PRE_WAIT_MS > 0 ? `, sent ${PRE_WAIT_MS} ms after opening (figures count from the prompt)` : "") +
      "\n",
  );
  console.log("run    idle    turn    text  result");
  const all: Marks[] = [];
  for (let i = 1; i <= RUNS; i += 1) {
    const marks = await run();
    all.push(marks);
    const cell = (n?: number): string => String(n ?? "-").padStart(7);
    console.log(
      `${String(i).padStart(3)} ${cell(marks.idle)} ${cell(marks.turn)} ${cell(marks.text)} ${cell(marks.result)}`,
    );
    // Give the pool a moment to refill between runs, as a reader would.
    if (i < RUNS && WARM_WAIT_MS > 0) {
      await new Promise((r) => setTimeout(r, WARM_WAIT_MS));
    }
  }

  const med = (key: keyof Marks): string =>
    String(median(all.map((m) => m[key]).filter((v): v is number => v !== undefined)) || "-").padStart(7);
  console.log(`med ${med("idle")} ${med("turn")} ${med("text")} ${med("result")}   (ms)`);
}

main().catch((err) => {
  console.error(`\nFAILED: ${(err as Error).message}`);
  process.exitCode = 1;
});

// A script, not a module: this keeps its top-level names off the global scope.
export {};
