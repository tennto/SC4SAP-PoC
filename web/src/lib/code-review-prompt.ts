/**
 * Analyze Code's Economy prompt: one agent reviews the object itself.
 *
 * Standard is the plugin's skill — an orchestrator that loads the skill,
 * dispatches `sap-code-reviewer` (Opus in its own file), and rewrites the
 * reviewer's findings into the report. Most of what that costs is the second
 * agent: its own context, its own reads, and the orchestrator reading its
 * answer back. Economy is the same review without the hand-off. The reviewer's
 * rule files — the same files, narrowed by focus the same way — are put in
 * front of this prompt by the backend (`reviewRules` on the session), so both
 * modes judge by one rule set; the session has no `Agent` and no `Skill`, so
 * there is nothing to delegate to.
 */

export type CodeReviewInput = {
  objectType: string;
  objectName: string;
  /** Optional; narrows the lookup. */
  pkg?: string;
  /** All, Clean ABAP, Performance, Security, SAP standard compliance. */
  focus: string;
  /** The report's language, in English — "Korean". */
  language: string;
};

/** The source read for each object type, as the reviewer's own list has it. */
const SOURCE_TOOL: Record<string, string> = {
  Program: "GetProgFullCode",
  Class: "GetClass",
  "Function Module": "GetFunctionModule",
  Include: "GetInclude",
  Interface: "GetInterface",
};

/** How the SAP tools are named to this session. */
const MCP = "mcp__plugin_sc4sap_sap__";

export function codeReviewPrompt(input: CodeReviewInput): string {
  const tool = SOURCE_TOOL[input.objectType] ?? "GetProgFullCode";
  const source = tool === "GetProgFullCode" ? `${tool} (the program with its includes)` : tool;
  // The SAP tools are deferred: their schemas load through ToolSearch. Left
  // to find them itself, the first measured run searched three times — three
  // turns, each re-reading the rules. Named here, it is one call.
  const load = `ToolSearch with query "select:${MCP}GetObjectInfo,${MCP}${tool}"`;
  const focus = input.focus && input.focus !== "All" ? input.focus : "All";
  return [
    // Kept to the same `Label: value` lines the plugin's skill is given, so
    // the backend reads the focus the same way for both modes.
    `Object type: ${input.objectType}`,
    ...(input.pkg ? [`Package: ${input.pkg}`] : []),
    `Object name: ${input.objectName}`,
    `Review focus: ${focus}`,
    "",
    `Review this ABAP ${input.objectType.toLowerCase()} statically, applying the rule files above. ` +
      (focus === "All"
        ? "Cover every dimension they list."
        : `Report only findings in the ${focus} area; skip the other dimensions.`),
    "",
    "Work directly and briefly: no sub-agents, no skills, no questions, no disk search, and do not read the plugin's files — the rules are above. Say nothing between steps.",
    "",
    `1. If those tools are not loaded yet, load both with one ${load}. Then, in one turn, call together: GetObjectInfo and ${source} for the object${input.pkg ? ` (package ${input.pkg})` : ""}. If the source names an include or a class the review needs and it is not in what came back, read that one too. Read nothing else from SAP: no where-used, no table contents.`,
    "2. Review what you read against the rules. A finding needs a line or a routine you can point to in the source; do not report what you could not see.",
    "3. Write the report, once, in this shape (Markdown):",
    "   - A title line: the object and the focus.",
    "   - Summary: two to four sentences on what the object does and its overall state, then `Quality score: N/10` and the single most valuable fix.",
    "   - Findings: one table, most severe first — # | Severity (CRITICAL, HIGH, MEDIUM, LOW) | Location (include/routine and line) | Rule | Finding | Fix. One line per finding; SAP identifiers exactly as in the source.",
    "   - For each CRITICAL and HIGH finding only: its root cause in a sentence and the corrected ABAP in a code block.",
    "   - Next: a short numbered list of what can be asked next — explain a finding by its number, show the callers of a routine, or re-review with another focus.",
    "",
    `Write the report in ${input.language}.`,
  ].join("\n");
}
