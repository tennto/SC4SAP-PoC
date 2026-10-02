/**
 * Program → Spec's prompt, built from its pre-run survey.
 *
 * The skill opens with an interview (audience, format, depth, language), asks
 * which module the package belongs to, and ends on a review loop. On this
 * screen every one of those is a form field, so the run is started with all
 * of them answered and told not to ask — measured on 2026-09-28, a run given
 * the answers this way went from start to files without a question.
 *
 * Two ways to run it, chosen on the form:
 *
 *   Precise — the plugin's own skill: an analyst sub-agent, the plugin's
 *             templates and mockup pipeline. About $1.1 and ten minutes on
 *             ZMMR00020.
 *   Economy — one agent, no sub-agents, a fixed short list of reads, the
 *             same templates and converters. Built for a run under ₩500.
 *
 * Both write into the run's own output folder (`.sc4sap/out/<session>/`),
 * which the backend hands to the page once and then deletes.
 */
/** One file kind, in the skill's own `format=` spelling. */
export type SpecFormat = "md" | "html" | "xlsx";

export type SpecSurvey = {
  program: string;
  /** Optional; narrows the lookup and names the package to the skill. */
  package?: string;
  method: "Economy" | "Precise";
  depth: "Detailed" | "Summary";
  /** Markdown and HTML in any mix, or Excel on its own. */
  formats: SpecFormat[];
  audience: "Both" | "Functional" | "Technical";
  language: "Korean" | "English" | "Japanese";
};

const LANG: Record<SpecSurvey["language"], string> = {
  Korean: "ko",
  English: "en",
  Japanese: "ja",
};

export function specPrompt(survey: SpecSurvey, outDir: string): string {
  return survey.method === "Precise"
    ? precisePrompt(survey, outDir)
    : economyPrompt(survey, outDir);
}

function precisePrompt(survey: SpecSurvey, outDir: string): string {
  const args = [
    `object=${survey.program}`,
    ...(survey.package ? [`package=${survey.package}`] : []),
    `depth=${survey.depth === "Summary" ? "L1" : "L2"}`,
    `format=${survey.formats.join(",")}`,
    `lang=${LANG[survey.language]}`,
    `audience=${survey.audience.toLowerCase()}`,
  ].join(" ");
  const lang = LANG[survey.language];
  return [
    `/sc4sap:program-to-spec ${args}`,
    "",
    "Every interview answer is given above: do not ask any of them, and skip the Step 5 review loop — finalize directly.",
    `Write every file this run produces — the spec files and their _assets, _tr and _img working files — under \`${outDir}/\` (relative to the working directory) instead of \`.sc4sap/specs/\`, and nowhere else.`,
    "",
    ...PRECISE_HOST_NOTES,
    ...(!survey.formats.includes("xlsx")
      ? []
      : [
          // The plugin's TR map was 512 of a 658-second run on 2026-10-02, and
          // its shared strings gave cells the wrong values: seven steps under
          // one event, ALV lengths taken from the row numbers. The builder
          // writes each cell on its own — see scripts/spec/build-xlsx.mjs.
          `- The Excel file: this host replaces the TR map and build-spec with its own builder. Make the analysis and the image-spec.json exactly as the skill says, but instead of a TR map write the workbook's content to \`${outDir}/_xlsx/sheet.json\` in this shape:`,
          "```json",
          sheetSpec(SHEET_AUDIENCE[survey.audience][survey.language], SHEET_DEPTH[survey.depth][survey.language]),
          "```",
          `  \`lang\` is \`${lang}\`. Every value is ${survey.language} prose for this program, except SAP identifiers, ABAP keywords and the program's own message texts. The workbook's labels are added for you: values only, and keep \`audience\` and \`depth\` as given. Fixed rows — up to 4 tables, 5 parameters, 5 warnings, 12 steps, 10 ALV columns, 4 authorization checks, 3 exceptions — so condense to fit. ${SHEET_RULES} Message codes as \`CODE (English text)\`.`,
          `  Then build it with \`node ../scripts/spec/build-xlsx.mjs ${outDir}/_xlsx/sheet.json <image-spec.json> ${outDir}/${survey.program}-${today()}-${lang}.xlsx\` — this host's script, one level above the working directory, not one of the plugin's. It renders and places the pictures itself. Do not run build-spec.`,
        ]),
    "",
    `Write the report in ${survey.language}.`,
  ].join("\n");
}

const today = (): string => new Date().toISOString().slice(0, 10).replace(/-/g, "");

/**
 * What a Standard run is told on top of the skill, none of which changes what
 * the skill does — only how much it pays to get there. Measured 2026-10-02 on
 * ZMMR00020 (Standard, Korean, Detailed): HTML 271 s and SDK $1.67 over 37
 * turns, Excel 658 s and $2.87 over 46. Each line answers a cost seen there:
 * seven turns reading the source back include by include after a file-mode
 * GetProgFullCode; 18 KB of model-routing rules read for a reply prefix and
 * phase banners nobody sees here, and carried through every later turn;
 * scratch work in /tmp, which the host cannot see and so had to ask about;
 * the scripts' source opened for their usage; a disk search for a CBO
 * inventory.
 */
const PRECISE_HOST_NOTES = [
  "Host notes for this run (they change nothing the skill decides, only how it gets there):",
  "- Skip the Response_Prefix and Phase_Banner conventions: do not read model-routing-rule.md or model-dispatch-mode.md for them.",
  "- Call GetProgFullCode without `output`, so the whole source comes back in one result; do not read includes one by one.",
  "- Make independent SAP reads in the same turn.",
  "- Step 1.5: look only for `.sc4sap/cbo/<MODULE>/<PACKAGE>/inventory.json` with one Glob; if it is not there, skip the step without a message.",
  "- The spec scripts take: `render-md-images.mjs <image-spec.json> <assets dir>`, `md-to-html.mjs <in.md> <out.html>`, `build-spec.mjs <tr.json> <image-spec.json|-> <out.xlsx>` — no need to open them.",
  "- Keep every scratch file inside the output folder above — never /tmp or another folder — and run one plain command per Bash call.",
];

/**
 * The spec's outline, stated in the prompt rather than read from the
 * plugin's spec-templates.md: that file is 14 KB of Markdown, Excel and image
 * rules, and every turn after reading it paid to carry it.
 */
const OUTLINE_DETAILED = [
  "# <Functional/Technical spec>: <PROGRAM> — then a short metadata list (type, package, author/changed, archetype, one-line purpose)",
  "## 1. Business context",
  "## 2. Data model — table: Table | Access (R/W) | Key fields | Join | Notes",
  "## 3. Inputs & screens — parameters table: Field | Type | Required | Default | Description; then the selection-screen picture",
  "## 4. Main logic — numbered business steps, each with its ABAP event/FORM as a note; then the process-flow picture",
  "## 5. Outputs — ALV columns table: Column | Field | Description; then the ALV picture",
  "## 6. Authorizations",
  "## 7. Exceptions & messages — table: Trigger | Mechanism | Message | Recovery",
  "## 8. Dependencies",
  "## 9. Routines — every FORM / method, one line each: name, parameters, purpose",
  "## 10. Open questions / assumptions",
].join("\n");

const OUTLINE_SUMMARY = [
  "# <Functional/Technical spec>: <PROGRAM> — then a one-line purpose",
  "## 1. Business context (a short paragraph)",
  "## 2. Inputs — parameters table: Field | Type | Description; then the selection-screen picture",
  "## 3. Main logic — numbered business steps; then the process-flow picture",
  "## 4. Outputs — the ALV picture and a one-line description",
  "## 5. Open questions",
].join("\n");

/** The image-spec shape the plugin's renderer reads, in brief. */
const IMAGE_SPEC = `{
  "lang": "<ko|en|ja>",
  "selection": { "blockLabel": "<title>", "fields": [ { "name": "S_EBELN", "label": "<label>", "range": true, "required": false } ] },
  "alv": { "columns": [ { "name": "EBELN", "header": "<header>", "width": 110, "align": "end" } ], "sampleRows": [ { "EBELN": "4500001234" } ] },
  "processFlow": [ "<step>", "? <decision>", "<step>", "! <end>" ]
}`;

/**
 * The Excel spec's content, one value per template slot, for the app's own
 * builder (`scripts/spec/build-xlsx.mjs`). It replaces the plugin's TR map:
 * a map keyed by the template's 202 English strings was 255 of a 356-second
 * run on 2026-10-02, and could not give two cells that share a string
 * different values. The fixed labels are translated by the builder.
 */
const sheetSpec = (audience: string, depth: string): string => `{
  "lang": "<ko|en|ja>",
  "overview": { "objectName": "", "objectType": "", "shortDescription": "", "reportTitle": "", "package": "", "archetype": "", "purpose": "", "audience": "${audience}", "depth": "${depth}", "sapVersion": "", "industry": "", "includes": "", "localClasses": "", "dynpros": "", "calledTcodes": "", "note": "" },
  "tables": [ { "table": "EKKO", "access": "R", "keys": "EBELN", "join": "", "notes": "" } ],
  "cds": "", "bapis": "", "badis": "",
  "params": [ { "name": "S_EBELN", "type": "SELECT-OPTIONS → EKKO-EBELN", "required": "X or empty", "default": "", "description": "" } ],
  "warnings": [ "" ],
  "steps": [ { "event": "START-OF-SELECTION", "step": "" } ],
  "columns": [ { "field": "EBELN", "description": "", "length": "10", "edit": "N", "hidden": "N", "note": "" } ],
  "auth": [ { "check": "", "object": "", "level": "", "implemented": "", "notes": "" } ],
  "exceptions": [ { "trigger": "", "mechanism": "", "message": "", "recovery": "" } ]
}`;

/**
 * How the workbook's values are written, for Economy and Standard alike.
 * The last three sentences answer a Standard run read cell by cell on
 * 2026-10-02: `driver` left in English as every table's join, a check
 * column that said only "none" three times, and steps that had lost the
 * ABAP mechanism the plugin's Excel rules ask for after each sentence.
 */
const SHEET_RULES =
  "`steps` are business-first: the business sentence, then the ABAP mechanism in parentheses (the SELECT, CHECK, CALL SCREEN …), with the event or FORM in `event`. " +
  "`warnings` are the real findings (missing authority check, performance, error handling); `auth` includes the gaps. " +
  "`join` is in the report language too — the driving table, INNER JOIN, LEFT OUTER, or a single read in a loop — and `objectType` likewise. " +
  "`auth.check` names the check (program-level AUTHORITY-CHECK, purchasing document display, …); whether it exists goes in `implemented`, never in `check`.";

/** The workbook's Audience and Depth rows: the survey's answers, not the agent's reading. */
const SHEET_AUDIENCE: Record<SpecSurvey["audience"], Record<SpecSurvey["language"], string>> = {
  Both: { Korean: "기능 + 기술", English: "Both (Functional + Technical)", Japanese: "機能 + 技術" },
  Functional: { Korean: "기능", English: "Functional", Japanese: "機能" },
  Technical: { Korean: "기술", English: "Technical", Japanese: "技術" },
};
const SHEET_DEPTH: Record<SpecSurvey["depth"], Record<SpecSurvey["language"], string>> = {
  Detailed: { Korean: "상세 (L2)", English: "L2 Standard", Japanese: "詳細 (L2)" },
  Summary: { Korean: "요약 (L1)", English: "L1 Summary", Japanese: "要約 (L1)" },
};

/** The SAP reads every Economy run makes, by the names ToolSearch needs. */
const SAP_READS = ["GetObjectInfo", "GetProgFullCode", "GetScreensList", "GetTextElement"]
  .map((name) => `mcp__plugin_sc4sap_sap__${name}`)
  .join(",");

function economyPrompt(survey: SpecSurvey, outDir: string): string {
  const lang = LANG[survey.language];
  const wanted = survey.formats;
  const base = `${outDir}/${survey.program}-${new Date()
    .toISOString()
    .slice(0, 10)
    .replace(/-/g, "")}-${lang}`;
  const summary = survey.depth === "Summary";
  const audience =
    survey.audience === "Both"
      ? "both functional readers and developers"
      : survey.audience === "Functional"
        ? "functional (business) readers"
        : "developers";
  const text = wanted.includes("md") || wanted.includes("html");

  const steps: string[] = [
    `Write a ${summary ? "short summary" : "detailed"} specification of the ABAP program ${survey.program}${survey.package ? ` (package ${survey.package})` : ""}, in ${survey.language}, for ${audience}.`,
    "",
    "Work directly and briefly: no sub-agents, no skills, no questions, no disk search, and do not read the plugin's skill or template files — everything needed is below. Say nothing between steps.",
    "",
    `1. Load the SAP tools with one ToolSearch \`select:${SAP_READS}\`, then in one turn call all four together for the program.`,
    "   Then, only if the output table or ALV is typed on a DDIC table or structure whose fields the code does not spell out (a field catalog built from the type), call GetTable or GetStructure for that one type — its field names and texts are the ALV's columns and headers. Read nothing else from SAP.",
    `2. ${text ? "Write" : "In one turn, make two Writes together (both files are new: do not read them first). First"} the screen pictures' data to \`${outDir}/_img/image-spec.json\` in this shape (keys exactly as shown; sampleRows are objects keyed by column name; leave out a slot the program has no screen for):`,
    "```json",
    IMAGE_SPEC,
    "```",
    `   \`lang\` is \`${lang}\`. \`processFlow\` is 5 to 9 short business steps drawn left to right: \`?\` before a decision, \`!\` before the end. Give the ALV two or three plausible sample rows.`,
  ];

  if (text) {
    steps.push(
      `3. Render them: \`node <plugin>/scripts/spec/render-md-images.mjs ${outDir}/_img/image-spec.json ${outDir}/_assets\`.`,
      `4. Write the whole spec in ONE Write to \`${base}.md\`, in this outline, and do not edit it afterwards:`,
      "```",
      summary ? OUTLINE_SUMMARY : OUTLINE_DETAILED,
      "```",
      "   The pictures are `![Selection screen](_assets/selection.png)`, `![ALV output](_assets/alv.png)` and `![Process flow](_assets/flow.png)`; skip one the renderer did not write. Business-first wording; SAP identifiers as they are. No wireframes, no Mermaid.",
    );
  }
  if (wanted.includes("html")) {
    steps.push(
      `5. Convert it: \`node <plugin>/scripts/spec/md-to-html.mjs ${base}.md ${base}.html\`.`,
    );
  }
  if (wanted.includes("xlsx")) {
    steps.push(
      `   Second, the workbook's content to \`${outDir}/_xlsx/sheet.json\` in this shape:`,
      "```json",
      sheetSpec(SHEET_AUDIENCE[survey.audience][survey.language], SHEET_DEPTH[survey.depth][survey.language]),
      "```",
      `   \`lang\` is \`${lang}\`. Every value is ${survey.language} prose for this program, except SAP identifiers, ABAP keywords and the program's own message texts, which stay as they are. Labels are added for you: write values only, and keep \`audience\` and \`depth\` as given. The workbook has fixed rows — up to 4 tables, 5 parameters, 5 warnings, 12 steps, 10 ALV columns, 4 authorization checks and 3 exceptions — so condense to fit rather than list more. ${SHEET_RULES}${summary ? " Keep every value short." : ""}`,
      `3. Build it: \`node ../scripts/spec/build-xlsx.mjs ${outDir}/_xlsx/sheet.json ${outDir}/_img/image-spec.json ${base}.xlsx\` — exactly this command, from the working directory. It renders the pictures itself.`,
    );
  }
  steps.push(
    "",
    `Write nothing outside \`${outDir}/\`. Then end with a short summary for the reader (3–5 lines): what the program does, its main tables, and anything notable such as a missing authority check.`,
    "",
    `Write the report in ${survey.language}.`,
  );
  return steps.join("\n");
}
