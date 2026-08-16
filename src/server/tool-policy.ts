/**
 * Phase 2-5 — read-only tool policy.
 *
 * The execution plan words this as "`allowedTools` permits only Get and Search
 * tools", but that field does the opposite of what it implies: the SDK
 * documents it as *"tool names that are auto-allowed without prompting"* — a
 * convenience list, not a restriction. The field that actually restricts is
 * `disallowedTools`, documented as *"removed from the model's context and
 * cannot be used, even if they would otherwise be allowed"*. Verified against
 * the running system: with a write tool disallowed the model reports
 * NOT_AVAILABLE and `canUseTool` is never reached. Wildcards work.
 *
 * So the intent (read-only) is implemented as two complementary halves:
 *
 *   disallowedTools — STATIC. Write-class SAP tools, gone from context.
 *                     Never derived from discovery: a lookup failure must not
 *                     be able to widen what is reachable.
 *   allowedTools    — DISCOVERED. Read-class tools, auto-approved so a
 *                     consultant answer does not fire twenty approval prompts.
 *                     If discovery fails this is empty, and everything falls
 *                     back to a human prompt — the safe direction.
 *
 * Anything in neither list still goes through the 2-4 approval queue.
 */

/** MCP tool prefix for the sc4sap plugin's ABAP ADT server. */
export const SAP_TOOL_PREFIX = "mcp__plugin_sc4sap_sap__";

/**
 * Write-class SAP tools, removed from context outright.
 *
 * The plugin's own `tier-readonly-guard.mjs` hook matches
 * `(Create|Update|Delete|RunUnitTest|RuntimeRunProgramWithProfiling|RuntimeRunClassWithProfiling)`.
 * That regex misses `PatchGuiStatus`, `WriteTextElementsBulk`, `ActivateObjects`
 * and `RuntimeCreateProfilerTraceParameters`, all of which mutate the SAP
 * system — so this list deliberately covers more than the hook does rather
 * than mirroring it.
 */
export const WRITE_CLASS_PATTERNS: readonly string[] = [
  `${SAP_TOOL_PREFIX}Create*`,
  `${SAP_TOOL_PREFIX}Update*`,
  `${SAP_TOOL_PREFIX}Delete*`,
  `${SAP_TOOL_PREFIX}Patch*`,
  `${SAP_TOOL_PREFIX}Write*`,
  `${SAP_TOOL_PREFIX}Activate*`,
  `${SAP_TOOL_PREFIX}RunUnitTest`,
  `${SAP_TOOL_PREFIX}RuntimeRun*`,
  `${SAP_TOOL_PREFIX}RuntimeCreate*`,
  // Switches which SAP system the session talks to — server-state mutation.
  `${SAP_TOOL_PREFIX}ReloadProfile`,
];

/** Bare tool names matching a write-class pattern, for classification. */
const WRITE_CLASS_RE =
  /^(Create|Update|Delete|Patch|Write|Activate|RuntimeRun|RuntimeCreate)|^RunUnitTest$|^ReloadProfile$/;

/**
 * Row extraction. Never auto-allowed even though the names start with `Get`:
 * these are the two tools the L1 blocklist hook gates per-table, and a web
 * client must not be able to pull rows without a human in the loop.
 */
export const NEVER_AUTO_ALLOW: ReadonlySet<string> = new Set([
  "GetTableContents",
  "GetSqlQuery",
]);

const READ_PREFIXES = ["Get", "Read", "Search", "List", "Describe"] as const;

export type ToolClass = "write" | "row-extraction" | "read" | "other";

export function classifySapTool(bareName: string): ToolClass {
  if (WRITE_CLASS_RE.test(bareName)) return "write";
  if (NEVER_AUTO_ALLOW.has(bareName)) return "row-extraction";
  if (READ_PREFIXES.some((p) => bareName.startsWith(p))) return "read";
  return "other";
}

export type ToolPolicy = {
  /** Auto-approved, no prompt. */
  allowedTools: string[];
  /** Removed from the model's context. */
  disallowedTools: string[];
  /** Counts per class, for /health and logs. */
  summary: Record<ToolClass, number>;
};

/**
 * Builds the policy from the server's live tool list (bare names, as returned
 * by `mcpServerStatus()`). Pass an empty list when discovery failed: the deny
 * half still applies and everything else prompts.
 */
export function buildToolPolicy(bareToolNames: readonly string[]): ToolPolicy {
  const summary: Record<ToolClass, number> = {
    write: 0,
    "row-extraction": 0,
    read: 0,
    other: 0,
  };
  const allowedTools: string[] = [];

  for (const name of bareToolNames) {
    const cls = classifySapTool(name);
    summary[cls] += 1;
    if (cls === "read") allowedTools.push(`${SAP_TOOL_PREFIX}${name}`);
  }

  return {
    allowedTools,
    disallowedTools: [...WRITE_CLASS_PATTERNS],
    summary,
  };
}
