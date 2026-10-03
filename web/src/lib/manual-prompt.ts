/**
 * Program → Manual's prompt, built from the form and its cover dialog.
 *
 * The plugin's skill (`program-to-manual`, plugin 0.6.31) opens with an
 * interview (language, version), asks once for the cover's author, team,
 * company and confidentiality notice and saves them into the profile's
 * config.json, asks up to three questions about what it inferred, and ends
 * on a review loop. On this screen the language is a form field and the cover
 * is a dialog, so the run starts with everything answered and is told not to
 * ask: what it could not confirm goes into the manual as "to be confirmed"
 * badges, which the reader can fix in the page's own edit mode.
 *
 * Two ways to run it, chosen on the form:
 *
 *   Precise — the plugin's own skill: an analyst and a module consultant in
 *             parallel, a writer for manual.json, the plugin's builder.
 *   Economy — one agent: the same reads, the same schema and builder, no
 *             sub-agents.
 *
 * Both write into the run's own output folder (`.sc4sap/out/<session>/`),
 * which the backend hands to the page once and then deletes. The cover goes
 * into manual.json's `meta` rather than into config.json, so a run changes
 * nothing outside that folder.
 */
export type ManualCover = {
  author: string;
  team: string;
  company: string;
  confidentiality: string;
};

export type ManualSurvey = {
  program: string;
  /** Optional; narrows the lookup and names the package to the skill. */
  package?: string;
  method: "Economy" | "Precise";
  language: "Korean" | "English" | "Japanese";
  /** An English companion as well — ignored when the manual is English. */
  english: boolean;
  cover: ManualCover;
};

const LANG: Record<ManualSurvey["language"], string> = {
  Korean: "ko",
  English: "en",
  Japanese: "ja",
};

/** The T100 language key for the manual language. */
const SPRSL: Record<ManualSurvey["language"], string> = {
  Korean: "3",
  English: "E",
  Japanese: "J",
};

/** "Initial version", as the revision history should say it. */
const FIRST_NOTE: Record<ManualSurvey["language"], string> = {
  Korean: "최초 작성",
  English: "Initial version",
  Japanese: "初版作成",
};

export function manualPrompt(survey: ManualSurvey, outDir: string): string {
  return survey.method === "Precise"
    ? precisePrompt(survey, outDir)
    : economyPrompt(survey, outDir);
}

/** Whether an English companion is built as well. */
export const withEnglish = (survey: ManualSurvey): boolean =>
  survey.english && survey.language !== "English";

/** The cover as manual.json's `meta`, or null when nothing was given. */
function coverMeta(cover: ManualCover): string | null {
  const given = Object.fromEntries(
    Object.entries(cover)
      .map(([key, value]) => [key, value.trim()] as const)
      .filter(([, value]) => value !== ""),
  );
  return Object.keys(given).length > 0 ? JSON.stringify(given) : null;
}

function coverLine(survey: ManualSurvey): string {
  const meta = coverMeta(survey.cover);
  return meta
    ? `put the cover values in manual.json's top-level \`"meta": ${meta}\` — exactly these, nothing invented`
    : "leave `meta` out (no cover values were given) — never invent a company or a person — and ignore the build's `no \"manual\" block in config.json` warning, which only says so";
}

function precisePrompt(survey: ManualSurvey, outDir: string): string {
  const lang = LANG[survey.language];
  const english = withEnglish(survey);
  return [
    `/sc4sap:program-to-manual ${survey.program}${survey.package ? ` package=${survey.package}` : ""}`,
    "",
    "Every interview answer is given here: do not ask any question, at any step.",
    `- Step 1: the manual language is ${survey.language} (\`${lang}\`), and this is a first version (no history exists, build without a version flag).`,
    `- Step 2a: do not run manual-config.mjs, neither get nor set; ${coverLine(survey)}.`,
    "- Step 4: do not ask. Every [inferred] statement that matters to a user goes into `intro.unverified`, keep every scenario the analyst found, and leave out a button that has no handler.",
    "- Step 7: skip the review loop and finalize directly.",
    english
      ? "- Step 8: build the English companion as the skill says."
      : "- Step 8: skip it — no English version.",
    "",
    `Use \`${outDir}/\` (relative to the working directory) as \`<base>/manuals/\`: \`_work/\` and \`_draft/\` go inside it, and every build is \`node <plugin>/scripts/manual/build-manual.mjs <manual.json> --out-dir ${outDir}\` (add \`--same-version\` for a rebuild). Write nothing outside that folder.`,
    "",
    "Host notes for this run (they change nothing the skill decides, only how it gets there):",
    "- Skip the Response_Prefix and Phase_Banner conventions: do not read model-routing-rule.md or model-dispatch-mode.md for them.",
    "- Call GetProgFullCode without `output`, so the whole source comes back in one result, and do not split it into include files: tell the analyst to read the source with GetProgFullCode itself. Write only `screens.md` under `_work/<PROGRAM>/`.",
    "- Make independent SAP reads in the same turn.",
    "- Module: look only for `.sc4sap/cbo/*/<PACKAGE>/` with one Glob; if there is nothing, take the module from the package name and do not ask.",
    "- No upload template is given: draw an upload step as an Excel screen only if the source names the template's columns.",
    "- `build-manual.mjs` takes `<manual.json> --out-dir <dir> [--same-version]` — no need to open it.",
    "- Keep every scratch file inside the output folder above — never /tmp or another folder — and run one plain command per Bash call.",
    "",
    `Write the report in ${survey.language}.`,
  ].join("\n");
}

/** The SAP reads every Economy run makes, by the names ToolSearch needs. */
const SAP_READS = [
  "SearchObject",
  "GetObjectInfo",
  "GetProgFullCode",
  "GetScreensList",
  "GetScreen",
  "GetGuiStatusList",
  "GetGuiStatus",
  "GetTextElement",
  "GetSqlQuery",
]
  .map((name) => `mcp__plugin_sc4sap_sap__${name}`)
  .join(",");

function economyPrompt(survey: ManualSurvey, outDir: string): string {
  const lang = LANG[survey.language];
  const program = survey.program;
  const draft = `${outDir}/_draft/${program}-${lang}.manual.json`;
  const build = (file: string, again = false): string =>
    `\`node <plugin>/scripts/manual/build-manual.mjs ${file} --out-dir ${outDir}${again ? " --same-version" : ""}\``;
  const steps: string[] = [
    `Write the end-user manual of the ABAP program ${program}${survey.package ? ` (package ${survey.package})` : ""} in ${survey.language}: the manual a business user follows to run it — which screen to open, what to enter, which button to press, what the result means and what to do when a message appears. It is the plugin's program-to-manual skill done by one agent.`,
    "",
    "Work directly and briefly: no sub-agents, no skills, no questions, no disk search. Say nothing between steps.",
    "",
    `1. Load the SAP tools with one ToolSearch \`select:${SAP_READS}\`. Then in ONE turn: SearchObject for ${program} (a TRAN hit beside the PROG is its T-Code; none → \`SA38\`), GetObjectInfo, GetProgFullCode without \`output\`, GetScreensList, GetGuiStatusList, GetTextElement with \`language: "E"\` — and, in the same turn, Read \`<plugin>/skills/program-to-manual/manual-schema.md\` and \`<plugin>/skills/program-to-manual/example-manual.json\`.`,
    "2. In ONE turn: GetScreen for every dynpro the scenarios can reach, GetGuiStatus for every status the source sets (SET PF-STATUS), and — when the source raises messages of a message class — one GetSqlQuery on T100 with the fields `ARBGB, MSGNR, TEXT`, " +
      `\`SPRSL = '${SPRSL[survey.language]}'\` and only the classes and numbers the source uses. Never read table contents otherwise. Read nothing else from SAP.`,
    "   Read the screens, never guess them: button icons from the status (`TEXT_NAME`, e.g. `ICON_TRANSPORT`), a popup's buttons from its dialog-box status, `\"modal\": true` for a dynpro called `STARTING AT` and for standard popups, `\"key\": true` on columns whose field catalog sets `KEY = 'X'`. `POPUP_TO_CONFIRM` with only a question shows Yes / No / Cancel.",
    `3. Write manual.json in ONE Write to \`${draft}\` (new file — do not read it first), following manual-schema.md and in the shape of the example:`,
    `   - \`lang\` is \`${lang}\`; \`changeNote\` is "${FIRST_NOTE[survey.language]}"; ${coverLine(survey)}.`,
    "   - Scenarios are the tasks a user performs: each radio option, execution mode or processing button that leads to a different outcome. Steps follow the screens the user sees, one step per screen state (a popup is its own step), at most 6 callouts each, anchored by the keys in manual-schema.md §4.",
    "   - Every scenario has check points with their source: mandatory inputs, AT SELECTION-SCREEN checks, authority checks, confirmation popups, and processing that cannot be undone.",
    "   - `fields`, `messages` (cause in business terms, the user's action; leave out messages the user never sees) and a short `glossary`. Every message has a `code`: its class and number (`ZMM 015`), or `—` for a MESSAGE with a literal text.",
    "   - Any business statement the source does not show goes into `intro.unverified` too, copied exactly.",
    "   - Sample values in the screens are invented (`4500000015`, `KR01`, `100234`) — never business data or real names.",
    "   - Only when a screen needs a shape the example does not show (a popup with fields, several grids, a selection frame), Read `<plugin>/skills/program-to-spec/selection-schema.md` or `alv-buttons-schema.md` for it.",
    `4. Build it: ${build(draft)}. Each \`⚠ build-manual:\` line is a defect (an anchor not on its screen lists the ones that are): fix the draft with Edit and rebuild with ${build(draft, true)} until none is left — at most three builds; then stop and list what remains.`,
  ];
  if (withEnglish(survey)) {
    const en = `${outDir}/_draft/${program}-en.manual.json`;
    steps.push(
      `5. The English companion: write \`${en}\` in ONE Write — the same manual with \`lang: "en"\` and every prose string translated (title, intro, callouts, details, notes, results, captions, check points, field descriptions, message cause and action, glossary, changeNote "Initial version"). Unchanged: \`screens\`, anchors, \`values\`, \`patch\`, sample rows, SAP identifiers, T-Codes, function codes and the T100 message \`text\`; screen labels become their English equivalents. \`intro.unverified\` entries are translated with the exact strings they point at. Build it the same way: ${build(en)}.`,
    );
  }
  steps.push(
    "",
    `Write nothing outside \`${outDir}/\`. Then end with a short summary for the reader (3–6 lines): scenarios, steps, screens drawn, check points, messages, and the statements marked "to be confirmed".`,
    "",
    `Write the report in ${survey.language}.`,
  );
  return steps.join("\n");
}
