/**
 * Phase 1-2 / 1-3 — does the sc4sap plugin load under the Agent SDK?
 *
 * Reads the `system`/`init` message, which the CLI emits BEFORE any model call,
 * and reports what actually loaded: skills, agents, slash commands, MCP servers.
 * We break out of the loop right after init, so this costs approximately nothing
 * — it verifies plugin wiring, not model behavior.
 *
 * Gate (per the execution plan): MCP server `abap-mcp-adt` must appear in
 * mcp_servers, and the /sc4sap: skills must appear in skills.
 */
import { query, type McpServerStatus } from "@anthropic-ai/claude-agent-sdk";
import { loadConfig } from "./config.ts";

const MCP_CONNECT_TIMEOUT_MS = 60_000;
const MCP_POLL_INTERVAL_MS = 500;

/**
 * MCP servers connect asynchronously and `system`/`init` is emitted before that
 * finishes, so servers read as `pending` in the init snapshot even when they go
 * on to connect fine. Poll live status instead of trusting the snapshot.
 */
async function waitForMcp(
  session: { mcpServerStatus(): Promise<McpServerStatus[]> },
): Promise<McpServerStatus[]> {
  const until = Date.now() + MCP_CONNECT_TIMEOUT_MS;
  let last: McpServerStatus[] = [];
  while (Date.now() < until) {
    last = await session.mcpServerStatus();
    if (last.length > 0 && last.every((s) => s.status !== "pending")) return last;
    await new Promise((r) => setTimeout(r, MCP_POLL_INTERVAL_MS));
  }
  return last;
}

function main(): void {
  const { pluginPath, workspace, model } = loadConfig();

  console.log(`plugin   ${pluginPath}`);
  console.log(`cwd      ${workspace}`);
  console.log(`model    ${model}\n`);

  const session = query({
    // Never actually answered — we exit at init.
    prompt: "noop",
    options: {
      plugins: [{ type: "local", path: pluginPath }],
      cwd: workspace,
      model,
      // Load .claude/settings.json from the workspace so the L1 PreToolUse
      // guards installed by provision-workspace.ts are registered.
      settingSources: ["project"],
      // Nothing should execute in this probe.
      permissionMode: "dontAsk",
      maxTurns: 1,
    },
  });

  void (async () => {
    try {
      for await (const message of session) {
        if (message.type !== "system" || message.subtype !== "init") continue;

        const sc4sapSkills = message.skills.filter((s) =>
          s.includes("sc4sap"),
        );

        console.log(`claude_code   ${message.claude_code_version}`);
        console.log(`apiKeySource  ${message.apiKeySource}`);
        console.log(`permission    ${message.permissionMode}\n`);

        console.log(
          `plugins       ${
            message.plugins.length === 0
              ? "(none)"
              : message.plugins
                  .map((p) => `${p.name}@${p.version ?? "?"}`)
                  .join(", ")
          }`,
        );
        console.log(
          `mcp @init     ${
            message.mcp_servers.length === 0
              ? "(none)"
              : message.mcp_servers
                  .map((s) => `${s.name}=${s.status}`)
                  .join(", ")
          }`,
        );
        console.log(`agents        ${message.agents?.length ?? 0}`);
        console.log(
          `skills        ${message.skills.length} total, ${sc4sapSkills.length} sc4sap`,
        );
        for (const s of sc4sapSkills) console.log(`  - ${s}`);

        const settled = await waitForMcp(session);
        console.log(
          `\nmcp settled   ${
            settled.length === 0
              ? "(none)"
              : settled
                  .map(
                    (s) =>
                      `${s.name}=${s.status}${s.error ? ` (${s.error})` : ""}`,
                  )
                  .join(", ")
          }`,
        );

        // Gate evaluation.
        const mcpOk = settled.some((s) => s.status === "connected");
        const skillsOk = sc4sapSkills.length > 0;
        console.log(
          `\nGATE  mcp=${mcpOk ? "PASS" : "FAIL"}  skills=${skillsOk ? "PASS" : "FAIL"}`,
        );

        // Stop the session; we deliberately do not run a model turn.
        await session.interrupt().catch(() => {});
        break;
      }
    } catch (err) {
      console.error(`\nFAILED: ${(err as Error).message}`);
      process.exitCode = 1;
    }
  })();
}

main();
