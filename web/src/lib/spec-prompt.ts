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

function economyPrompt(survey: SpecSurvey, outDir: string): string {
  const lang = LANG[survey.language];
  const wanted = survey.formats;
  const base = `${outDir}/${survey.program}-${new Date()
    .toISOString()
    .slice(0, 10)
    .replace(/-/g, "")}-${lang}`;
  const depth =
    survey.depth === "Summary"
      ? "L1 Quick Spec: purpose, inputs, outputs, and the main logic as numbered business steps"
      : "L2 Standard Spec: L1 plus inputs and screens, data model, authorizations, outputs, exceptions, and every FORM / method signature";
  const audience =
    survey.audience === "Both"
      ? "both functional readers and developers"
      : survey.audience === "Functional"
        ? "functional (business) readers"
        : "developers";

  const steps: string[] = [
    `Write a ${depth} specification of the ABAP program ${survey.program}${survey.package ? ` (package ${survey.package})` : ""}, in ${survey.language}, for ${audience}.`,
    "",
    "Work directly and briefly. Do not dispatch sub-agents, do not invoke skills, do not ask questions, and do not search the disk.",
    "",
    "1. Read, each once and in parallel where you can: GetObjectInfo, GetProgFullCode, GetScreensList and GetTextElement for the program. Call GetTable only for a custom Z/Y table the logic depends on and only if the code leaves its purpose unclear. Nothing else.",
    "2. Read the plugin's `skills/program-to-spec/spec-templates.md` for the section skeleton and the image-spec schema, and follow the skeleton at the depth above. Keep the main-logic narrative business-first: what each step does for the business, with the ABAP event or FORM as a secondary note.",
    `3. Write the screen pictures' data to \`${outDir}/_img/image-spec.json\` in that schema: \`selection\` from the PARAMETERS / SELECT-OPTIONS, \`alv\` from the output columns with two or three plausible sample rows (objects keyed by column name), and \`processFlow\` as the LINEAR array form — 5 to 9 short business steps, \`?\` before a decision and \`!\` before the end — so the flow is drawn left to right. Leave out a slot the program has no screen for. Set \`lang\` to \`${lang}\`.`,
    `4. Render them: \`node <plugin>/scripts/spec/render-md-images.mjs ${outDir}/_img/image-spec.json ${outDir}/_assets\`. It prints which pictures it wrote.`,
  ];

  if (wanted.includes("md") || wanted.includes("html")) {
    steps.push(
      `5. Write the spec as Markdown to \`${base}.md\`, putting each picture it wrote where the skeleton shows that screen or the flow: \`![Selection screen](_assets/selection.png)\`, \`![ALV output](_assets/alv.png)\`, \`![Process flow](_assets/flow.png)\`. Only for a picture it did not write, fall back to an ASCII wireframe or a Mermaid \`flowchart LR\`.`,
    );
  }
  if (wanted.includes("html")) {
    steps.push(
      `6. Convert it: \`node <plugin>/scripts/spec/md-to-html.mjs ${base}.md ${base}.html\`. Leave the .md where it is.`,
    );
  }
  if (wanted.includes("xlsx")) {
    steps.push(
      `5. Build the Excel spec as spec-templates.md § Excel describes: write the TR map to \`${outDir}/_tr/tr.json\`, then run \`node <plugin>/scripts/spec/build-spec.mjs ${outDir}/_tr/tr.json ${outDir}/_img/image-spec.json ${base}.xlsx\`. If it reports a LANGUAGE MIX, fix the flagged strings once and run it again.`,
    );
  }
  steps.push(
    "",
    `Write nothing outside \`${outDir}/\`. End with a short summary for the reader (3–6 lines): what the program does, its main tables, and anything notable such as a missing authority check.`,
    "",
    `Write the report in ${survey.language}.`,
  );
  return steps.join("\n");
}
