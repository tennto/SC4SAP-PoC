/**
 * The tool-call log: every tool the agent runs, per account, as it runs.
 *
 * Two audiences, two stores. The monitoring page wants to watch calls land as
 * they happen, and it wants to page back through last week's — so each call
 * is kept in a short ring buffer per account and streamed to that account's
 * subscribers, and is also written to Mongo, which is where the page reads
 * history from. The ring is the live half; Mongo is the durable half. Neither
 * is in the hot path: an entry is pushed and forgotten, and the Mongo writes
 * go out in batches on a timer rather than one `await` per tool result. A
 * logging failure is logged and dropped. It must never stall a turn.
 *
 * What is kept is deliberately small. A tool result is routinely tens of
 * kilobytes — a table read, a whole ABAP source — and storing it would make
 * this the largest collection in the database within a day. So the row holds
 * the name, a short preview of the input, timings, whether it succeeded, and
 * how many bytes came back. Enough to see what the agent is doing and how
 * long it takes; never a copy of what it read.
 *
 * Mongo is optional. Without `MONGODB_URI` in the backend's `.env` the ring
 * still fills and the live stream still runs; only history is missing, and
 * the page says so.
 */
import { MongoClient, type AnyBulkWriteOperation, type Collection } from "mongodb";

/** How many calls each account keeps in memory for the live view. */
const RING_LIMIT = 200;
/** How long a batch of writes waits for company before it goes out. */
const FLUSH_MS = 1000;
/** A batch this large goes out at once rather than waiting. */
const FLUSH_AT = 50;
/**
 * How much of the input is kept, in characters of its JSON.
 *
 * Enough for the monitor to show a whole input for nearly every call — a
 * program name, a table and a where-clause — and small enough that a row is
 * still a row. A `WriteProgram` carrying a whole source is the case that
 * gets cut, and that is the case where nobody wanted it in the log.
 */
const PREVIEW_CHARS = 2000;
/** Rows expire after this. The page is a monitor, not an archive. */
const RETENTION_DAYS = 30;

const DEFAULT_DB = "sc4sap";
const COLLECTION = "tool_calls";

/**
 * The name `mcp__<server>__<tool>` split apart, or a built-in.
 *
 * Plugin MCP servers are registered as `plugin_<plugin>_<server>`, which is
 * what the model sees — so `mcp__plugin_sc4sap_sap__GetProgram` is server
 * `plugin_sc4sap_sap`, tool `GetProgram`.
 */
export function splitToolName(name: string): {
  kind: "mcp" | "builtin";
  server: string | null;
  tool: string;
} {
  const match = /^mcp__(.+?)__(.+)$/.exec(name);
  if (!match) return { kind: "builtin", server: null, tool: name };
  return { kind: "mcp", server: match[1] ?? null, tool: match[2] ?? name };
}

/** One tool call. The same shape in the ring, on the wire and in Mongo. */
export type ToolCall = {
  /** The SDK's `tool_use` id — the key everything else joins on. */
  id: string;
  userId: string;
  sessionId: string;
  name: string;
  kind: "mcp" | "builtin";
  server: string | null;
  tool: string;
  /** The first `PREVIEW_CHARS` of the input as JSON. Never the whole thing. */
  inputPreview: string;
  startedAt: string;
  endedAt: string | null;
  durationMs: number | null;
  /** `null` until the result arrives. */
  ok: boolean | null;
  /** Size of the result as text. `null` until it arrives. */
  resultBytes: number | null;
  /**
   * How the call got past the approval gate. `auto` for a tool the policy
   * waved through; the others are what a person did about it. `null` where
   * the gate was never consulted, which is most built-in reads.
   */
  decision: "auto" | "allowed" | "denied" | "expired" | null;
};

export type ToolCallEvent =
  | { type: "call_started"; call: ToolCall }
  | { type: "call_finished"; call: ToolCall };

type Subscriber = (event: ToolCallEvent) => void;

/** Mongo's copy: dates as dates, so the TTL index and range queries work. */
type ToolCallDoc = Omit<ToolCall, "id" | "startedAt" | "endedAt"> & {
  _id: string;
  startedAt: Date;
  endedAt: Date | null;
};

function toDoc(call: ToolCall): ToolCallDoc {
  const { id, startedAt, endedAt, ...rest } = call;
  return {
    _id: id,
    ...rest,
    startedAt: new Date(startedAt),
    endedAt: endedAt ? new Date(endedAt) : null,
  };
}

/** The input, as a short line of JSON. Whatever the input is. */
function preview(input: unknown): string {
  let text: string;
  try {
    text = JSON.stringify(input) ?? "";
  } catch {
    text = String(input);
  }
  return text.length > PREVIEW_CHARS ? `${text.slice(0, PREVIEW_CHARS)}…` : text;
}

/** How big a tool result is, whatever shape it came in. */
function byteLength(content: unknown): number {
  if (typeof content === "string") return Buffer.byteLength(content, "utf8");
  if (Array.isArray(content)) {
    let total = 0;
    for (const block of content) {
      if (block && typeof block === "object" && "text" in block) {
        total += Buffer.byteLength(String((block as { text: unknown }).text), "utf8");
      } else {
        total += Buffer.byteLength(JSON.stringify(block) ?? "", "utf8");
      }
    }
    return total;
  }
  return Buffer.byteLength(JSON.stringify(content) ?? "", "utf8");
}

export class ToolLog {
  /** Per account, oldest first. */
  readonly #rings = new Map<string, ToolCall[]>();
  readonly #subscribers = new Map<string, Set<Subscriber>>();
  /** Calls that have started and not yet finished, by tool_use id. */
  readonly #open = new Map<string, ToolCall>();
  /** Decisions that arrived before the call they belong to was seen. */
  readonly #earlyDecisions = new Map<string, ToolCall["decision"]>();

  readonly #collection: Promise<Collection<ToolCallDoc>> | null;
  #queue: AnyBulkWriteOperation<ToolCallDoc>[] = [];
  #flushTimer: ReturnType<typeof setTimeout> | null = null;
  #client: MongoClient | null = null;
  readonly #log: (message: string) => void;

  constructor(options: {
    mongoUri?: string;
    mongoDb?: string;
    log?: (message: string) => void;
  } = {}) {
    this.#log = options.log ?? (() => {});
    if (options.mongoUri) {
      const client = new MongoClient(options.mongoUri, {
        serverSelectionTimeoutMS: 5000,
      });
      this.#client = client;
      this.#collection = client
        .connect()
        .then(async (connected) => {
          const collection = connected
            .db(options.mongoDb ?? DEFAULT_DB)
            .collection<ToolCallDoc>(COLLECTION);
          // The page's query, and the reaper. Both idempotent, so every
          // start of the backend can run them.
          await collection.createIndex(
            { userId: 1, startedAt: -1 },
            { name: "tool_calls_by_user" },
          );
          await collection.createIndex(
            { startedAt: 1 },
            {
              expireAfterSeconds: RETENTION_DAYS * 24 * 60 * 60,
              name: "tool_calls_ttl",
            },
          );
          return collection;
        });
      // Surface a dead Mongo once, at startup, rather than on every flush.
      this.#collection.catch((err: unknown) => {
        this.#log(`tool log: Mongo unavailable, history will not be kept — ${(err as Error).message}`);
      });
    } else {
      this.#collection = null;
      this.#log("tool log: MONGODB_URI not set, keeping calls in memory only");
    }
  }

  /** Whether history is being written anywhere. The page reports this. */
  get persistent(): boolean {
    return this.#collection !== null;
  }

  /** A tool has been asked for. From the assistant message's `tool_use` block. */
  start(entry: {
    id: string;
    userId: string;
    sessionId: string;
    name: string;
    input: unknown;
  }): void {
    if (this.#open.has(entry.id)) return;
    const call: ToolCall = {
      id: entry.id,
      userId: entry.userId,
      sessionId: entry.sessionId,
      name: entry.name,
      ...splitToolName(entry.name),
      inputPreview: preview(entry.input),
      startedAt: new Date().toISOString(),
      endedAt: null,
      durationMs: null,
      ok: null,
      resultBytes: null,
      decision: this.#earlyDecisions.get(entry.id) ?? null,
    };
    this.#earlyDecisions.delete(entry.id);
    this.#open.set(entry.id, call);
    this.#push(call);
    this.#emit(call.userId, { type: "call_started", call });
    this.#enqueue({ insertOne: { document: toDoc(call) } });
  }

  /** The result came back. From the user message's `tool_result` block. */
  finish(entry: { id: string; isError: boolean; content: unknown }): void {
    const call = this.#open.get(entry.id);
    if (!call) return;
    this.#open.delete(entry.id);
    const endedAt = new Date();
    call.endedAt = endedAt.toISOString();
    call.durationMs = endedAt.getTime() - Date.parse(call.startedAt);
    call.ok = !entry.isError;
    call.resultBytes = byteLength(entry.content);
    this.#emit(call.userId, { type: "call_finished", call });
    this.#enqueue({
      updateOne: {
        filter: { _id: call.id },
        update: {
          $set: {
            endedAt,
            durationMs: call.durationMs,
            ok: call.ok,
            resultBytes: call.resultBytes,
            decision: call.decision,
          },
        },
      },
    });
  }

  /**
   * What the approval gate decided. Arrives from `canUseTool`, which the SDK
   * consults before the assistant message carrying the `tool_use` block is
   * relayed — so this is usually early, and is held until `start` sees the
   * call. A denied call still gets a `tool_result` (an error one), so
   * `finish` closes it like any other.
   */
  decide(id: string, decision: NonNullable<ToolCall["decision"]>): void {
    const call = this.#open.get(id);
    if (call) {
      call.decision = decision;
      return;
    }
    this.#earlyDecisions.set(id, decision);
  }

  /** A session ended. Anything still open is closed as unanswered. */
  abandon(sessionId: string): void {
    for (const [id, call] of this.#open) {
      if (call.sessionId !== sessionId) continue;
      this.finish({ id, isError: true, content: "" });
    }
  }

  /** The live view's opening state: what this account ran most recently. */
  recent(userId: string): ToolCall[] {
    return [...(this.#rings.get(userId) ?? [])];
  }

  /** Returns an unsubscribe function. */
  subscribe(userId: string, subscriber: Subscriber): () => void {
    let set = this.#subscribers.get(userId);
    if (!set) {
      set = new Set();
      this.#subscribers.set(userId, set);
    }
    set.add(subscriber);
    return () => {
      set.delete(subscriber);
      if (set.size === 0) this.#subscribers.delete(userId);
    };
  }

  /** Flush what is queued and let go of Mongo. For shutdown. */
  async close(): Promise<void> {
    if (this.#flushTimer) clearTimeout(this.#flushTimer);
    await this.#flush();
    await this.#client?.close().catch(() => {});
  }

  #push(call: ToolCall): void {
    let ring = this.#rings.get(call.userId);
    if (!ring) {
      ring = [];
      this.#rings.set(call.userId, ring);
    }
    ring.push(call);
    if (ring.length > RING_LIMIT) ring.shift();
  }

  #emit(userId: string, event: ToolCallEvent): void {
    for (const subscriber of this.#subscribers.get(userId) ?? []) {
      try {
        subscriber(event);
      } catch {
        // A broken client must not take down the session loop.
      }
    }
  }

  #enqueue(op: AnyBulkWriteOperation<ToolCallDoc>): void {
    if (!this.#collection) return;
    this.#queue.push(op);
    if (this.#queue.length >= FLUSH_AT) {
      void this.#flush();
    } else if (!this.#flushTimer) {
      this.#flushTimer = setTimeout(() => void this.#flush(), FLUSH_MS);
    }
  }

  async #flush(): Promise<void> {
    if (this.#flushTimer) {
      clearTimeout(this.#flushTimer);
      this.#flushTimer = null;
    }
    if (!this.#collection || this.#queue.length === 0) return;
    const batch = this.#queue;
    this.#queue = [];
    try {
      const collection = await this.#collection;
      // In order: an update for a call must not run before its insert.
      await collection.bulkWrite(batch, { ordered: true });
    } catch (err) {
      // Dropped, and said so. Re-queueing a batch that Mongo refuses would
      // only grow the queue until the process died of it.
      this.#log(`tool log: ${batch.length} writes dropped — ${(err as Error).message}`);
    }
  }
}
