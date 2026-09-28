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
  return [
    `/sc4sap:program-to-spec ${args}`,
    "",
    "Every interview answer is given above: do not ask any of them, and skip the Step 5 review loop — finalize directly.",
    `Write every file this run produces — the spec files and their _assets, _tr and _img working files — under \`${outDir}/\` (relative to the working directory) instead of \`.sc4sap/specs/\`, and nowhere else.`,
    "",
    `Write the report in ${survey.language}.`,
  ].join("\n");
}

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
    "1. In one turn, call together: GetObjectInfo, GetProgFullCode, GetScreensList and GetTextElement for the program.",
    "   Then, only if the output table or ALV is typed on a DDIC table or structure whose fields the code does not spell out (a field catalog built from the type), call GetTable or GetStructure for that one type — its field names and texts are the ALV's columns and headers. Read nothing else from SAP.",
    `2. Write the screen pictures' data to \`${outDir}/_img/image-spec.json\` in this shape (keys exactly as shown; sampleRows are objects keyed by column name; leave out a slot the program has no screen for):`,
    "```json",
    IMAGE_SPEC,
    "```",
    `   \`lang\` is \`${lang}\`. \`processFlow\` is 5 to 9 short business steps drawn left to right: \`?\` before a decision, \`!\` before the end. Give the ALV two or three plausible sample rows.`,
    `3. Render them: \`node <plugin>/scripts/spec/render-md-images.mjs ${outDir}/_img/image-spec.json ${outDir}/_assets\`.`,
  ];

  if (text) {
    steps.push(
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
      `4. Build the Excel spec: read the "Excel — Template-clone" section of the plugin's \`skills/program-to-spec/spec-templates.md\` for the TR map, write it to \`${outDir}/_tr/tr.json\`, then run \`node <plugin>/scripts/spec/build-spec.mjs ${outDir}/_tr/tr.json ${outDir}/_img/image-spec.json ${base}.xlsx\`. If it reports a LANGUAGE MIX, fix the flagged strings once and run it again.`,
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
