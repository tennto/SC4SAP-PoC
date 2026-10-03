/**
 * Inventory a CBO Package's prompt, built from its form.
 *
 * The plugin's skill (`analyze-cbo-obj`, plugin 0.6.31) asks three questions
 * one at a time — the package, the programs used most, the module — then
 * hands the walk to its `sap-stocker` agent, which writes `index.md` and
 * `inventory.json` under `.sc4sap/cbo/<MODULE>/<PACKAGE>/`, and ends by
 * asking whether to make an HTML view. On this screen the three answers are
 * form fields, the files go into the run's own output folder (handed to the
 * page and deleted, like the spec's and the manual's), and the HTML is always
 * made: the page shows it and offers it, and nothing is kept on the server.
 *
 * Two ways to run it, chosen on the form:
 *
 *   Precise — the plugin's skill and its stocker agent.
 *   Economy — one agent: the same walk, where-used graph and files, no
 *             sub-agent, with the detail reads kept to the objects that
 *             matter.
 *
 * In both, the agent writes only inventory.json — what it found and judged —
 * and this app's scripts do the mechanical rest (`scripts/cbo/`):
 * `objects.mjs` turns the package's object list into a few lines, so the
 * agent never reads the whole list, and `build-index.mjs` lays out index.md
 * in one outline — the table of every object included — and makes the HTML.
 * Measured 2026-10-04 on ZMMPAEK (362 objects): reading the list was 26k
 * tokens carried through every later turn, and writing index.md by hand 11k
 * output tokens and 70 seconds.
 */
export type CboSurvey = {
  package: string;
  module: string;
  /** Flagship programs, upper case; may be empty. */
  keyPrograms: string[];
  method: "Economy" | "Precise";
  language: "Korean" | "English" | "Japanese";
};

/** The files every run leaves in its folder, by name. */
export const CBO_FILES = { md: "index.md", html: "index.html", json: "inventory.json" } as const;

const LANG: Record<CboSurvey["language"], string> = { Korean: "ko", English: "en", Japanese: "ja" };

export function cboPrompt(survey: CboSurvey, outDir: string): string {
  return survey.method === "Precise" ? precisePrompt(survey, outDir) : economyPrompt(survey, outDir);
}

/**
 * How GetWhereUsed is called. Measured 2026-10-04 on ZMMPAEK (Economy): 74 of
 * 219 calls failed on `object_type: "TABL"`, which the tool does not take, and
 * every call was its own turn, so 232 turns of a growing context spent the $2
 * ceiling before the HTML was made.
 */
const WHERE_USED =
  'GetWhereUsed `object_type` must be one of: `tabl/dt` (table), `stru/dt` (structure), `dtel` (data element), `view`, `clas/oc` (class), `intf/if` (interface), `fugr` (function group) — never `TABL`, `STRU` or `TTYP`; table types have no where-used. ' +
  "Make the GetWhereUsed calls in batches of up to 30 parallel tool calls in ONE message, never one call per message. Keep only references whose package is the package being inventoried.";

/** The package's object list, made small by this app's script. */
const objectList = (outDir: string): string =>
  `GetPackageContents with \`include_descriptions: true\`. Its answer is usually too large and is saved to a file: then do NOT read that file — run \`node ../scripts/cbo/objects.mjs "<the saved file's path>" ${outDir}\` (this app's script, one level above the working directory) and work from what it prints: the counts by type, the "frequently used" threshold, and the names to ask where-used for. If the answer comes back inline instead (a small package), use it directly and put every object into inventory.json's \`all_objects\` as [type, name, description].`;

/** The inventory.json shape, which build-index.mjs and the plugin's other skills read. */
const inventoryShape = (lang: string): string => `{
  "lang": "${lang}",
  "package": "<PACKAGE>", "package_description": "<from GetPackage>", "module": "<MODULE>",
  "scanned_at": "<ISO timestamp>", "sap_version": "<S/4HANA | ECC>",
  "key_programs": ["<PROG>"],
  "logic_heavy": false,
  "summary": "<2–4 sentences in the report language: what the package is, how it is built, what is worth reusing>",
  "objects": [
    { "name": "ZMM_LOG", "type": "TABL", "ref_count": 7, "key_boost": 10, "score": 17,
      "used_by_key_programs": ["<PROG>"], "role": "log",
      "purpose": "<1–2 sentences>", "keys": ["MANDT", "EBELN"], "fk_to_standard": ["EKKO-EBELN"],
      "reuse_hint": "<when to reuse it instead of creating something new>" }
  ],
  "crossModuleGaps": "skipped — not requested",
  "sensitive": [ { "name": "<OBJ>", "fields": ["<FIELD>"], "reason": "<personal / HR / customer / bank / price …>" } ]
}`;

const keyList = (survey: CboSurvey): string =>
  survey.keyPrograms.length > 0 ? survey.keyPrograms.join(", ") : "none";

const buildStep = (outDir: string): string =>
  `\`node ../scripts/cbo/build-index.mjs ${outDir}/${CBO_FILES.json} ${outDir}\` — this app's script; it writes \`index.md\` and \`index.html\` from inventory.json (and the object list objects.mjs saved). Do not write index.md yourself and do not open the script.`;

function precisePrompt(survey: CboSurvey, outDir: string): string {
  const lang = LANG[survey.language];
  return [
    `/sc4sap:analyze-cbo-obj ${survey.package}`,
    "",
    "Every intake answer is given here: do not ask any question.",
    `- Step 1: the package is ${survey.package}. Verify it with GetPackage only.`,
    `- Step 1.5: flagship programs: ${keyList(survey)}. Verify each with SearchObject; drop the ones not found.`,
    `- Step 2: the module is ${survey.module}.`,
    `- Step 3–7: dispatch the stocker as the skill says, with its whole investigation and its own index.md — leave nothing of its analysis out. Put these notes in its dispatch prompt, word for word:`,
    `  1. Write \`index.md\` and \`inventory.json\` into \`${outDir}/\` (relative to the working directory) instead of \`.sc4sap/cbo/<MODULE>/<PACKAGE>/\`; no raw-walk.md, nothing anywhere else. Write the prose in ${survey.language}; keep names, types and JSON keys as they are. \`inventory.json\` follows the skill's schema and also carries \`"lang": "${lang}"\`, \`"summary"\` and \`"sensitive"\` as in this shape:`,
    "```json",
    inventoryShape(lang),
    "```",
    `  2. index.md keeps everything the skill asks of it and everything your analysis found — nothing summarised away. Its top is fixed: \`# <PACKAGE> CBO inventory\` (in ${survey.language}), then one bullet per fact with the label in bold and in ${survey.language} — Package (the name only, in \`code\`), Module, Flagship programs (the names only, in \`code\`), Scanned (date only), SAP version, Objects (total and by type) — then \`## Summary\` (in ${survey.language}). After it, the skill's own order with a table in each section: Pinned (a \`###\` per flagship program), then frequently used objects by type, then sensitive objects. Then every further finding of your analysis as its own \`##\` section — package patterns (e.g. one backing table per report, listed as a table of table → report → purpose), function groups and their modules, standard-table extensions, objects not linked to anything, the logic-heavy reasoning. Wherever a section names objects, list them in a table, not in a sentence. Do not write a table of every object in the package: the host appends it.`,
    "  3. Of the Mandatory_Baseline rule files read only `common/data-extraction-policy.md`; the paths and the inventory shape are given here, so do not read the skill's workflow-steps.md either.",
    "  4. Skip the cross-module gap step: do not look for config.json, sap.env or SAP_ACTIVE_MODULES; write `crossModuleGaps` as given and say in index.md that it was not requested.",
    `  5. Walk the package with ONE GetPackageContents with \`include_descriptions: true\`. When its answer is saved to a file, Read that file (it is allowed) and also run \`node ../scripts/cbo/objects.mjs "<the saved file's path>" ${outDir}\` once, which saves the object list for the host's table. Do not call GetPackageContents or GetPackageTree again, and do not SearchObject for objects the list already names.`,
    `  6. ${WHERE_USED}`,
    "  7. Do not run mkdir or ls: the folder exists, and Write creates what it needs.",
    `- Step 8: when the stocker returns, run \`node ../scripts/cbo/build-index.mjs ${outDir}/${CBO_FILES.json} ${outDir} --keep\` — this app's script; it appends the table of every object to the stocker's index.md and writes \`index.html\`. Do not open it. Then give the skill's Step 8 briefing in ${survey.language}, from the stocker's return block and what you already know — do not read inventory.json, index.md or the skill's files again.`,
    "",
    "Host notes for this run (they change nothing the skill decides, only how it gets there):",
    "- Skip the Response_Prefix and Phase_Banner conventions: do not read model-routing-rule.md or model-dispatch-mode.md for them.",
    "- Make independent SAP reads in the same turn.",
    "- Keep every scratch file inside the output folder above — never /tmp or another folder — and run one plain command per Bash call.",
    "",
    `Write the report in ${survey.language}.`,
  ].join("\n");
}

/** The SAP reads an Economy run makes, by the names ToolSearch needs. */
const SAP_READS = [
  "GetPackage",
  "GetPackageContents",
  "SearchObject",
  "GetWhereUsed",
  "GetObjectInfo",
  "GetTable",
  "GetStructure",
  "GetDataElement",
  "GetClass",
  "GetInterface",
  "GetFunctionGroup",
  "GetFunctionModule",
]
  .map((name) => `mcp__plugin_sc4sap_sap__${name}`)
  .join(",");

function economyPrompt(survey: CboSurvey, outDir: string): string {
  const lang = LANG[survey.language];
  return [
    `Make the CBO inventory of the ABAP package ${survey.package} (module ${survey.module}) in ${survey.language}: what custom objects it holds, which of them the package itself uses most, what each of those is for, and when to reuse it instead of creating something new. It is the plugin's analyze-cbo-obj skill done by one agent.`,
    `Flagship programs (used most by the business): ${keyList(survey)}.`,
    "",
    "Work directly and briefly: no sub-agents, no skills, no questions, no disk search, and do not read the plugin's skill, agent or rule files — everything needed is below. Never call GetTableContents or GetSqlQuery: DDIC metadata and where-used only. Say nothing between steps.",
    "",
    `1. Load the SAP tools with one ToolSearch \`select:${SAP_READS}\`. Then in ONE turn: GetPackage, ${objectList(outDir).replace(/^GetPackageContents/, `GetPackageContents for ${survey.package}`)}${survey.keyPrograms.length > 0 ? " In the same turn, SearchObject for each flagship program (drop the ones not found)." : ""}`,
    `2. Where-used for the names objects.mjs listed (or, inline, each table, structure, view, class, interface and function group — data elements only under 150 objects). ${WHERE_USED} Per object: \`ref_count\` = in-package callers, \`used_by_key_programs\` = the flagship programs among them, \`key_boost\` = 10 × that count, \`score\` = ref_count + key_boost.`,
    "3. Frequently used: at or above the threshold objects.mjs printed (under 30 objects ≥ 2 references, 30–150 ≥ 3, over 150 ≥ 5); an object a flagship program uses is always in (pinned). Take at most the 20 highest by score.",
    "4. For those only, read their DDIC in one or two turns (GetTable / GetStructure / GetDataElement / GetClass / GetInterface / GetFunctionGroup / GetFunctionModule, GetObjectInfo for the rest) and give each a `role` — header, line, log, mapping, classification, config, util, service, event or dto — a 1–2 sentence business `purpose`, its `keys`, `fk_to_standard` where a field points at a standard table, and a concrete `reuse_hint`. Read nothing else from SAP.",
    "5. Flag as `sensitive` any object whose name, description or fields suggest personal, HR, customer, bank, tax or price data — look through the whole package's names and descriptions for this, not only the frequently used ones.",
    `6. Write \`${outDir}/${CBO_FILES.json}\` in ONE Write, in this shape (objects pinned first, then by score; \`logic_heavy\` is true when a pinned object is a FUGR, CLAS or INTF or the frequently used set has three or more of them; \`summary\`, \`purpose\` and \`reuse_hint\` in ${survey.language}):`,
    "```json",
    inventoryShape(lang),
    "```",
    `7. Run ${buildStep(outDir)}`,
    "",
    `Write nothing outside \`${outDir}/\`. Then end with a short briefing for the reader (5–10 lines): the pinned objects, the two or three business-logic assets worth knowing, the sensitive objects, and which skill to run next.`,
    "",
    `Write the report in ${survey.language}.`,
  ].join("\n");
}
