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

/**
 * The agent's own tools that are auto-approved.
 *
 * Not SAP tools at all — these are the SDK's, and they are the reason a single
 * skill run was raising dozens of prompts. `analyze-code` reads nine rule
 * files, keeps a todo list and dispatches a reviewer sub-agent before it has
 * touched the SAP system once, and every one of those was landing in the
 * approval queue as an unclassified `other`. A prompt that fires that often
 * stops being read, which makes the prompts that matter — a write, a table
 * dump — cost nothing to wave through.
 *
 * What is on this list can look at things: the local filesystem the server
 * already gave the session as its `cwd` and plugin path, the model's own
 * bookkeeping, and dispatching work to a sub-agent — whose tool calls come
 * back through this same policy rather than around it.
 *
 * What is deliberately NOT on it, and still prompts every time:
 *
 *   Bash, Write, Edit, NotebookEdit — change the machine the server runs on.
 *   WebFetch, WebSearch           — leave the machine entirely.
 *   Every SAP write tool          — not reachable at all; see
 *                                   `disallowedTools` above.
 */
export const LOCAL_AUTO_ALLOW: readonly string[] = [
  "Read",
  "Glob",
  "Grep",
  "TodoWrite",
  // Dispatching a sub-agent. `Agent`, not `Task` — the SDK names it that
  // ("invoked via the Agent tool", `sdk.d.ts` under `agents`), and a name that
  // matches nothing is not a permissive entry, it is an absent one. Its own
  // calls are policed by this same callback, so allowing the dispatch is not
  // allowing what it goes on to do.
  "Agent",
  "SlashCommand",
  "BashOutput",
  "ExitPlanMode",
];

export type ToolClass = "write" | "row-extraction" | "read" | "other";

export function classifySapTool(bareName: string): ToolClass {
  if (WRITE_CLASS_RE.test(bareName)) return "write";
  if (NEVER_AUTO_ALLOW.has(bareName)) return "row-extraction";
  if (READ_PREFIXES.some((p) => bareName.startsWith(p))) return "read";
  return "other";
}

/**
 * Whether a session's "allow all SAP reads" switch may wave this call through.
 *
 * Runs the same classifier the auto-allow list is built from, so the switch
 * can never grant more than a healthy discovery would have granted anyway:
 * SAP tools only, read class only — which excludes every write pattern and
 * both row-extraction tools by construction rather than by a second list that
 * could drift away from this one.
 *
 * The agent's own tools are deliberately not covered. `Bash`, `Write`, `Edit`
 * and `WebFetch` change or leave the machine the server runs on, and a switch
 * flipped to stop being asked about reading ABAP source is not consent to
 * those.
 */
export function isSapReadTool(toolName: string): boolean {
  if (!toolName.startsWith(SAP_TOOL_PREFIX)) return false;
  return classifySapTool(toolName.slice(SAP_TOOL_PREFIX.length)) === "read";
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
    // The agent's own safe tools are added unconditionally: unlike the SAP
    // list they are not discovered, so a discovery failure must not be able to
    // take them away and bury the operator in prompts.
    allowedTools: [...allowedTools, ...LOCAL_AUTO_ALLOW],
    disallowedTools: [...WRITE_CLASS_PATTERNS],
    summary,
  };
}
