/**
 * SAP reads with no model in the loop.
 *
 * Some screens need SAP data but no reasoning: Display IMG counts rows in
 * customizing tables and draws them. Running that through an agent session
 * would bill tokens for what is a plain SQL call, so this module talks to the
 * plugin's MCP bridge directly over stdio — the same server, the same profile
 * pointer, the same upstream guard a session gets, with no Claude call.
 *
 * What a session gets and this does not is the L3 `PreToolUse` hook, because
 * hooks are run by the agent harness and there is no harness here. Row reads
 * therefore go through `checkBlocklist`, which feeds the hook script the same
 * payload the harness would and honours its answer. Counts (`COUNT(*)`) and
 * DDIC/IMG metadata do not extract business rows and are not checked.
 *
 * One bridge process is kept per active profile alias and closed after a few
 * idle minutes. A profile switch rewrites the pointer the bridge read at
 * start, so the alias is re-read on every call and a change replaces the
 * process — the same rule `profiles.ts` documents for sessions.
 */
import { spawn } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

/** Close the bridge after this long without a call. A cold start is ~20 s. */
const IDLE_MS = 10 * 60_000;

/**
 * ADT's free-style SQL refuses a statement line longer than 255 characters
 * with a bare 400 — measured: five 32-character keys on one line passed, ten
 * failed, three hundred on separate lines passed. Every list goes one item
 * per line.
 */
export function inList(values: (string | null | undefined)[]): string {
  // SAP rows carry empty keys now and then (a TNODEIMGR reference with no
  // object, measured on PP); they can match nothing, so they are dropped.
  const keys = values.filter((v): v is string => !!v);
  return "(\n" + keys.map((v) => `'${v.replace(/'/g, "''")}'`).join(",\n") + " )";
}

/** A DDIC name safe to splice into SQL: letters, digits, `_` and namespaces. */
export function isDdicName(name: string): boolean {
  return /^(\/[A-Z0-9_]{1,10}\/)?[A-Z0-9_]{1,30}$/.test(name);
}

export type SqlRow = Record<string, string | null>;

export class SapDirect {
  private client: Client | null = null;
  private connecting: Promise<Client> | null = null;
  private alias = "";
  private idle: NodeJS.Timeout | null = null;

  constructor(
    private readonly pluginPath: string,
    private readonly workspace: string,
  ) {}

  /** The profile the bridge would start against right now. */
  activeAlias(): string {
    const pointer = join(this.workspace, ".sc4sap", "active-profile.txt");
    return existsSync(pointer) ? readFileSync(pointer, "utf8").trim() : "";
  }

  private async connect(): Promise<Client> {
    const alias = this.activeAlias();
    if (this.client && alias === this.alias) return this.client;
    if (this.connecting && alias === this.alias) return this.connecting;
    // Claimed before the first await, so a second caller arriving meanwhile
    // waits on this connection instead of starting (and leaking) its own.
    this.alias = alias;
    const previous = this.client;
    this.client = null;
    this.connecting = (async () => {
      if (previous) await previous.close().catch(() => {});
      const transport = new StdioClientTransport({
        command: process.execPath,
        args: [join(this.pluginPath, "bridge", "mcp-server.cjs")],
        cwd: this.workspace,
        env: {
          ...(process.env as Record<string, string>),
          CLAUDE_PLUGIN_ROOT: this.pluginPath,
        },
        stderr: "ignore",
      });
      const client = new Client({ name: "sc4sap-web-direct", version: "1" });
      await client.connect(transport);
      this.client = client;
      return client;
    })();
    const pending = this.connecting;
    try {
      return await pending;
    } finally {
      if (this.connecting === pending) this.connecting = null;
    }
  }

  async close(): Promise<void> {
    const client = this.client;
    this.client = null;
    if (client) await client.close().catch(() => {});
  }

  private touch(): void {
    if (this.idle) clearTimeout(this.idle);
    this.idle = setTimeout(() => void this.close(), IDLE_MS);
    this.idle.unref();
  }

  /** Call one MCP tool and return its text answer. Throws on a tool error. */
  async call(name: string, args: Record<string, unknown>): Promise<string> {
    const client = await this.connect();
    this.touch();
    const result = await client.callTool({ name, arguments: args });
    const content = result.content as { type: string; text?: string }[];
    const text = content.find((c) => c.type === "text")?.text ?? "";
    if (result.isError) throw new Error(text.slice(0, 500) || `${name} failed`);
    return text;
  }

  /** Run one Open SQL statement through `GetSqlQuery`. */
  async sql(query: string, maxRows = 50_000): Promise<SqlRow[]> {
    const text = await this.call("GetSqlQuery", { sql_query: query, row_number: maxRows });
    let parsed: { rows?: SqlRow[] };
    try {
      parsed = JSON.parse(text);
    } catch {
      throw new Error(text.slice(0, 300));
    }
    return parsed.rows ?? [];
  }

  /**
   * `sql` over a long key list, `size` keys per statement.
   *
   * ADT also answers a bare 400 when a statement's result is too large —
   * measured twice: three-language CUS_IMGACT texts for 200 activities, and
   * CUS_ACTOBJ for 200 activities of Cross-Application Components. Where the
   * limit falls depends on the data, so a batch that fails is split in half
   * and retried rather than sized in advance; a single key that still fails
   * is a real error.
   */
  async sqlIn(keys: string[], build: (list: string) => string, size = 200): Promise<SqlRow[]> {
    keys = keys.filter(Boolean);
    const out: SqlRow[] = [];
    const run = async (batch: string[]): Promise<void> => {
      try {
        out.push(...(await this.sql(build(inList(batch)))));
      } catch (err) {
        if (batch.length === 1) throw err;
        const half = Math.ceil(batch.length / 2);
        await run(batch.slice(0, half));
        await run(batch.slice(half));
      }
    };
    for (let i = 0; i < keys.length; i += size) await run(keys.slice(i, i + size));
    return out;
  }

  /**
   * Ask the plugin's blocklist hook about a row read, as the harness would.
   * Returns `null` when allowed, else the reason. A `warn` (ask) answer is a
   * refusal here: there is no one in this path to ask.
   */
  checkBlocklist(sqlQuery: string): Promise<string | null> {
    const script = join(this.pluginPath, "scripts", "hooks", "block-forbidden-tables.mjs");
    const payload = JSON.stringify({
      tool_name: "mcp__sap__GetSqlQuery",
      tool_input: { sql_query: sqlQuery },
    });
    return new Promise((resolve) => {
      // The hook finds the profile by walking up from its cwd to `.sc4sap/`.
      const child = spawn(process.execPath, [script], { cwd: this.workspace });
      // Fails closed: this is the only guard on this path, so a hook that
      // cannot run or answers something unreadable means no rows.
      let out = "";
      child.stdout.on("data", (d) => (out += d));
      child.on("error", () => resolve("blocklist check could not run"));
      child.on("close", (code) => {
        if (code !== 0) return resolve(`blocklist check exited with ${code}`);
        if (!out.trim()) return resolve(null);
        try {
          const decision = JSON.parse(out).hookSpecificOutput;
          if (!decision || decision.permissionDecision === "allow") return resolve(null);
          resolve(String(decision.permissionDecisionReason ?? "blocked by the blocklist"));
        } catch {
          resolve("blocklist check answered something unreadable");
        }
      });
      child.stdin.end(payload);
    });
  }
}
