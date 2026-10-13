/**
 * Analyze Code's prompts, built from its form.
 *
 * Both modes end in the same place: `<run folder>/_work/review.json` — the
 * summary, the findings and the proposed code changes — run through this
 * app's `scripts/review/build.mjs`, which checks each change against the
 * source it changes and writes `review-data.json`. The page builds the HTML
 * (each change as the code before and after, side by side, with its analysis
 * and the reasoning for it) and the Markdown from that file
 * (`review-doc.ts`); the run itself writes no report.
 *
 *   Economy  — one agent reviews the object itself. The reviewer's rule files
 *              — the same files, narrowed by focus the same way — are put in
 *              front of this prompt by the backend (`reviewRules` on the
 *              session), so both modes judge by one rule set; the session has
 *              no `Agent` and no `Skill`, so there is nothing to delegate to.
 *   Standard — the plugin's skill: an orchestrator that dispatches
 *              `sap-code-reviewer` and turns its findings into the report.
 *              The host notes ask the reviewer for the changes in the same
 *              shape and the orchestrator for the same file.
 *
 * The source is read with `output: "file"`: the MCP server writes it, one
 * file per include, and the agent reads those files — so a line number it
 * gives is the line in that include, as the SAP editor numbers it, and the
 * build script can check it.
 */

export type ReviewSurvey = {
  objectType: string;
  objectName: string;
  /** Optional; narrows the lookup. */
  pkg?: string;
  /** All, Clean ABAP, Performance, Security, SAP standard compliance. */
  focus: string;
  /** The report's language, in English — "Korean". */
  language: "Korean" | "English" | "Japanese";
  method: "Economy" | "Precise";
  formats: ("md" | "html")[];
};

const LANG: Record<ReviewSurvey["language"], string> = { Korean: "ko", English: "en", Japanese: "ja" };

/** The files' name without the extension: `ZMMR00020-review-20261013-ko`. */
export function reviewBase(survey: Pick<ReviewSurvey, "objectName" | "language">): string {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  return `${survey.objectName.replace(/\//g, "_") || "review"}-review-${date}-${LANG[survey.language] ?? "en"}`;
}

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

export function reviewPrompt(survey: ReviewSurvey, outDir: string): string {
  return survey.method === "Precise" ? standardPrompt(survey, outDir) : economyPrompt(survey, outDir);
}

const focusOf = (survey: ReviewSurvey): string =>
  survey.focus && survey.focus !== "All" ? survey.focus : "All";

/**
 * The shape of `review.json`, as both modes are told it. Short field
 * descriptions rather than a schema: the model writes it once, in one Write.
 */
const reviewShape = (survey: ReviewSurvey): string =>
  [
    "```",
    "{",
    `  "object": "${survey.objectName}", "type": "${survey.objectType}", "focus": "${focusOf(survey)}", "language": "${survey.language}",`,
    '  "title": "<the object and the focus, one line>",',
    '  "summary": "<two to four sentences: what the object does and its overall state>",',
    '  "score": <quality score 0-10>,',
    '  "topFix": "<the single most valuable fix, one sentence>",',
    '  "findings": [ { "id": 1, "severity": "CRITICAL|HIGH|MEDIUM|LOW", "location": "<include · routine · line>", "rule": "<rule>", "finding": "<one sentence>", "fix": "<one sentence>" } ],',
    '  "changes": [ {',
    '    "title": "<what the change does, a few words>",',
    '    "findings": [<ids of the findings it fixes>],',
    '    "severity": "<the highest of those>",',
    '    "file": "<the source file path exactly as the read tool returned it>",',
    '    "start": <first line replaced, as numbered in that file>, "end": <last line replaced>,',
    '    "original": "<lines start..end copied verbatim from the file, indentation kept, \\n between lines>",',
    '    "proposed": "<the lines that replace them, complete and in the same indentation>",',
    '    "analysis": "<what is wrong in these lines and what it costs, 1-3 sentences>",',
    '    "rationale": "<why this change, what it does not solve, what to verify on the system, 1-3 sentences>"',
    "  } ],",
    '  "next": ["<what can be asked next: explain a finding by its number, show the callers of a routine, re-review with another focus>"]',
    "}",
    "```",
  ].join("\n");

/** What makes a change worth the reader's time, said once for both modes. */
const CHANGE_RULES = [
  "Rules for `changes`:",
  "- One change per CRITICAL and HIGH finding that a local edit fixes, and for MEDIUM ones where the edit is short and clear; at most 6, most valuable first. Findings that need a redesign stay in `findings` only.",
  "- `original` is a contiguous block of 1–15 lines copied character for character from the file you read, at the line numbers that file shows; never retype or reformat it. Keep the block to the lines that change, plus a line on either side only where the statement needs it.",
  // Measured 2026-10-13 (Standard, ZMMR00020): a fix that inserts before a
  // LOOP and replaces inside it came back as one change, with comments in
  // the proposed code saying where each half goes — drawn in place of the
  // inner lines only, it read as nonsense.
  "- One change replaces exactly that one block. A fix that touches two places (e.g. a lookup built before a LOOP and the SELECT inside it replaced) is two changes, each with its own lines, listing the same findings. To insert lines, quote the line they go after as `original` and repeat it first in `proposed`. Never put directions such as \"insert after line 51\" in `proposed`: it is the code that replaces `original`, nothing else.",
  "- `proposed` is real ABAP for the configured release (S/4HANA, ABAP 758), not pseudo-code or `...`; keep the original's indentation and case style.",
  "- JSON strings: escape quotes and backslashes, `\\n` between lines.",
].join("\n");

const buildStep = (outDir: string): string =>
  `\`node ../scripts/review/build.mjs ${outDir}\` (this app's script, one command on one line)`;

function economyPrompt(survey: ReviewSurvey, outDir: string): string {
  const tool = SOURCE_TOOL[survey.objectType] ?? "GetProgFullCode";
  const source = tool === "GetProgFullCode" ? `${tool} (the program with its includes)` : tool;
  // The SAP tools are deferred: their schemas load through ToolSearch. Left
  // to find them itself, the first measured run searched three times — three
  // turns, each re-reading the rules. Named here, it is one call.
  const load = `ToolSearch with query "select:${MCP}GetObjectInfo,${MCP}${tool}"`;
  const focus = focusOf(survey);
  return [
    // Kept to the same `Label: value` lines the plugin's skill is given, so
    // the backend reads the focus the same way for both modes.
    `Object type: ${survey.objectType}`,
    ...(survey.pkg ? [`Package: ${survey.pkg}`] : []),
    `Object name: ${survey.objectName}`,
    `Review focus: ${focus}`,
    "",
    `Review this ABAP ${survey.objectType.toLowerCase()} statically, applying the rule files above. ` +
      (focus === "All"
        ? "Cover every dimension they list."
        : `Report only findings in the ${focus} area; skip the other dimensions.`),
    "",
    "Work directly and briefly: no sub-agents, no skills, no questions, no disk search, and do not read the plugin's files — the rules are above. Say nothing between steps.",
    "",
    `1. If those tools are not loaded yet, load both with one ${load}. Then, in one turn, call together: GetObjectInfo and ${source} with \`output: "file"\` for the object${survey.pkg ? ` (package ${survey.pkg})` : ""}. The answer lists the source file(s) with an outline.`,
    "2. Read every source file it listed, all in ONE turn (the Read tool, whole files). If the source names an include or a class the review needs and it is not among them, read that one too. Read nothing else from SAP: no where-used, no table contents.",
    "3. Review what you read against the rules. A finding needs a line or a routine you can point to in the source; do not report what you could not see.",
    `4. Write the review in ONE Write to \`${outDir}/_work/review.json\`, in this shape, and do not edit it afterwards:`,
    reviewShape(survey),
    CHANGE_RULES,
    `   Every text in ${survey.language}; SAP identifiers exactly as in the source.`,
    `5. Run ${buildStep(outDir)}. It checks each change against the source and prints one line per change. A change it could not place stays in the report without the side-by-side view; do not rewrite the file for it.`,
    "",
    `Write nothing outside \`${outDir}/\`. Then end with a short summary for the reader (3–5 lines): the quality score, the most serious finding, and how many code changes are proposed.`,
    "",
    `Write the report in ${survey.language}.`,
  ].join("\n");
}

/**
 * Standard: the plugin's skill as it is, with its report step and its menu
 * answered by the host notes, and the reviewer asked for the changes in the
 * shape the page needs.
 */
function standardPrompt(survey: ReviewSurvey, outDir: string): string {
  const tool = SOURCE_TOOL[survey.objectType] ?? "GetProgFullCode";
  const focus = focusOf(survey);
  return [
    "/sc4sap:analyze-code",
    "",
    // The same `Label: value` lines as Economy: the backend reads the focus
    // from here to narrow the reviewer's rule files.
    `Object type: ${survey.objectType}`,
    ...(survey.pkg ? [`Package: ${survey.pkg}`] : []),
    `Object name: ${survey.objectName}`,
    `Review focus: ${focus}`,
    "",
    "Every question the skill would ask is answered here: do not ask any, and do not call AskUserQuestion.",
    "- Step 0: skip the trust-session bootstrap — this host grants the permissions itself.",
    `- Step 1: the object is ${survey.objectName} (${survey.objectType}). If SearchObject does not find it, stop and say so — do not ask.`,
    `- Step 2: dispatch the reviewer as the skill says, and add to its prompt: "Read the source with ${tool} and \`output: \\"file\\"\`, then Read the files it lists, all in one turn; skip GetWhereUsed.${focus === "All" ? "" : ` Report only findings in the ${focus} area.`} Besides the findings, return the proposed code changes: for each, the source file path exactly as the read tool returned it, the first and last line replaced as that file numbers them, those lines copied verbatim, the replacement lines, what is wrong (1-3 sentences) and why this fix (1-3 sentences). ${CHANGE_RULES.replace(/\n/g, " ")}"`,
    `- Step 3: do not write the Markdown report. Write the reviewer's result in ONE Write to \`${outDir}/_work/review.json\`, in this shape:`,
    reviewShape(survey),
    `  Then run ${buildStep(outDir)}.`,
    "- Step 4: skip the action menu; end with a short summary for the reader (3–5 lines): the quality score, the most serious finding, and how many code changes are proposed.",
    "",
    "Host notes for this run (they change nothing the skill decides, only how it gets there):",
    "- Skip the Response_Prefix and Phase_Banner conventions: do not read model-routing-rule.md or model-dispatch-mode.md for them.",
    "- The SAP context is given: S/4HANA, ABAP release 758; industry and country not set. Do not read config.json or sap.env, and do not search the disk: every file named here is under the plugin root given in your system prompt.",
    "- Keep every file inside the output folder above — never /tmp or another folder — and run one plain command per Bash call.",
    "",
    `Every text in the review in ${survey.language}. Write the report in ${survey.language}.`,
  ].join("\n");
}
