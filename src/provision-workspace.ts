/**
 * Phase 1-4 — cwd strategy.
 *
 * The Agent SDK resolves skill artifact paths (`.sc4sap/...`) against the
 * session `cwd`, and loads `.claude/settings.json` from that same cwd. Two
 * consequences the plugin repo does not satisfy on its own:
 *
 *  1. The active SAP profile pointer must exist at `<cwd>/.sc4sap/active-profile.txt`,
 *     or the MCP server and tier guard cannot resolve which system to talk to.
 *
 *  2. The two L1 PreToolUse guards — block-forbidden-tables + tier-readonly-guard —
 *     are NOT declared in the plugin's own `hooks/hooks.json`. They are installed
 *     per-project into `.claude/settings.json`. Under the SDK that means a bare
 *     workspace runs with NO row-extraction guardrail. This script installs them.
 *
 * Re-runnable: rewrites the two managed files, leaves other workspace content alone.
 */
import { mkdirSync, writeFileSync, readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { loadConfig } from "./config.ts";

const HOOK_SPECS = [
  {
    script: "block-forbidden-tables.mjs",
    matcher: "mcp__.*__(GetTableContents|GetSqlQuery)",
  },
  {
    script: "tier-readonly-guard.mjs",
    // Mirrors HOOKS in the plugin's scripts/install-hooks.mjs — that file is
    // the source of truth, so this stays byte-identical to it on purpose.
    //
    // It has a known gap: ActivateObjects, PatchGuiStatus,
    // WriteTextElementsBulk and RuntimeCreateProfilerTraceParameters mutate
    // SAP without a Create|Update|Delete prefix, so neither this matcher nor
    // the hook's own classification covers them. Widening it here alone would
    // achieve nothing — the hook would be invoked and then ignore them.
    // In this PoC those four are handled instead by WRITE_CLASS_PATTERNS in
    // server/tool-policy.ts, which removes them from the model's context
    // entirely, on every tier rather than only QA/PRD. Closing the gap in the
    // hook itself belongs in the plugin repo.
    matcher:
      "mcp__.*__(Create|Update|Delete|RunUnitTest|RuntimeRunProgramWithProfiling|RuntimeRunClassWithProfiling)",
  },
] as const;

function resolveActiveAlias(pluginPath: string): string {
  const fromEnv = process.env.SC4SAP_PROFILE_ALIAS;
  if (fromEnv) return fromEnv;

  // Fall back to the alias the plugin repo itself is pointed at.
  const pointer = join(pluginPath, ".sc4sap", "active-profile.txt");
  if (existsSync(pointer)) return readFileSync(pointer, "utf8").trim();

  throw new Error(
    "Cannot determine active profile alias. Set SC4SAP_PROFILE_ALIAS in .env.",
  );
}

function main(): void {
  const { pluginPath, workspace } = loadConfig();
  const alias = resolveActiveAlias(pluginPath);

  // 1. Active profile pointer.
  mkdirSync(join(workspace, ".sc4sap"), { recursive: true });
  writeFileSync(join(workspace, ".sc4sap", "active-profile.txt"), alias);

  // 2. L1 PreToolUse guards, resolved against the loaded plugin.
  const hookDir = join(pluginPath, "scripts", "hooks");
  const missing = HOOK_SPECS.filter(
    (s) => !existsSync(join(hookDir, s.script)),
  );
  if (missing.length > 0) {
    throw new Error(
      `Hook scripts not found under ${hookDir}: ${missing
        .map((m) => m.script)
        .join(", ")}`,
    );
  }

  const settings = {
    hooks: {
      PreToolUse: HOOK_SPECS.map((spec) => ({
        matcher: spec.matcher,
        hooks: [
          {
            type: "command",
            // Forward slashes so the path is safe inside the JSON command string.
            command: `node "${join(hookDir, spec.script).replaceAll("\\", "/")}"`,
          },
        ],
      })),
    },
  };

  mkdirSync(join(workspace, ".claude"), { recursive: true });
  writeFileSync(
    join(workspace, ".claude", "settings.json"),
    JSON.stringify(settings, null, 2) + "\n",
  );

  console.log(`workspace     ${workspace}`);
  console.log(`profile       ${alias}`);
  console.log(`L1 hooks      ${HOOK_SPECS.map((s) => s.script).join(", ")}`);
  console.log("\nProvisioned. Run: npm run smoke:plugin");
}

main();
