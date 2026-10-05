/**
 * Package → Process's prompt, built from its form.
 *
 * The plugin's skill (`package-to-process`, plugin 0.6.31) asks the package,
 * the module, the language and the formats, then stops twice more mid-run:
 * to confirm the entry programs it detected, and to approve (merge, split,
 * rename) the process groups its analyst proposed. On this screen the first
 * four are form fields, the two confirmations are taken as proposed — the
 * reader edits the document afterwards instead — and the files go into the
 * run's own output folder, handed to the page and deleted, as for the other
 * document skills.
 *
 * Two ways to run it, chosen on the form:
 *
 *   Standard — the plugin's skill and its analyst, the analysis in full;
 *              the inventory walk, the source reading, the writer and the
 *              BPML assembly done by this app's scripts (see precisePrompt).
 *   Economy  — one agent. The package walk and the program sources go
 *              through this app's scripts (`scripts/process/`), which print a
 *              few lines per program — tables read and written, functions
 *              and BAPIs called — so the agent never reads a source; it writes
 *              one process.json, and `build.mjs` makes every file from it.
 */
export type ProcessSurvey = {
  package: string;
  module: string;
  /** Entry programs the reader named, upper case; may be empty. */
  entryPrograms: string[];
  method: "Economy" | "Precise";
  language: "Korean" | "English" | "Japanese";
  /** Which files: the process document's and the BPML's. */
  formats: ("md" | "html" | "xlsx")[];
};

const LANG: Record<ProcessSurvey["language"], string> = { Korean: "ko", English: "en", Japanese: "ja" };

/** The JSON both modes leave for the page to draw the diagrams from. */
export const PROCESS_FILES = { data: "process.json", diagrams: "process-images.json" } as const;

export function processPrompt(survey: ProcessSurvey, outDir: string): string {
  return survey.method === "Precise" ? precisePrompt(survey, outDir) : economyPrompt(survey, outDir);
}

const entryList = (survey: ProcessSurvey): string =>
  survey.entryPrograms.length > 0 ? survey.entryPrograms.join(", ") : "none named";

/** How GetWhereUsed is called; the same lesson as the CBO inventory's. */
const WHERE_USED =
  'GetWhereUsed `object_type` must be one of: `tabl/dt` (table), `stru/dt` (structure), `dtel` (data element), `view`, `clas/oc` (class), `intf/if` (interface), `fugr` (function group), `prog/p` (program) — never `TABL`, `STRU` or `TTYP`. ' +
  "Make the GetWhereUsed calls in batches of up to 30 parallel tool calls in ONE message, never one call per message.";

/**
 * Standard: the plugin's skill and its analyst, with five changes measured
 * against the skill as it is on 2026-10-05 (ZMMPAEK) and taken as the
 * Standard mode the same day, at the same depth or deeper (14 processes
 * against 9, 36 boundary rows against 23, 39 scenario diagrams against 9):
 * (1) the SAP context given instead of searched for, (2) no stocker — the
 * package walk through `walk.mjs`, (3) the grouping and the narratives in one
 * analyst dispatch, (4) the sources through `scan.mjs` instead of read whole,
 * (5) no writer and no hand-built BPML — the analyst writes process.json in
 * parts by here-document (it has no Write tool, and its whole answer as one
 * reply was cut off at the output limit) and `build.mjs` assembles them and
 * makes every file.
 */
function precisePrompt(survey: ProcessSurvey, outDir: string): string {
  const lang = LANG[survey.language];
  const estimated = { ko: "(추정)", en: "(estimated)", ja: "(推定)" }[lang];
  const tbd = { ko: "(확인필요)", en: "(TBD)", ja: "(要確認)" }[lang];
  const mod = survey.module;
  return [
    `/sc4sap:package-to-process ${survey.package}`,
    "",
    "Every question the skill would ask is answered here: do not ask any, and do not call AskUserQuestion. This host runs some steps its own way, given below; everything the skill asks the analyst to find and write still applies in full, at the same depth.",
    "- Step 0: skip the trust-session bootstrap — this host grants the permissions itself.",
    `- Step 1: the package is ${survey.package}; the module is ${mod}; the language is ${survey.language} (\`${lang}\`). The SAP context is given: S/4HANA, ABAP release 758, industry and country not set (write \`n/a\`), active modules \`${mod}\`. Do not read config.json or sap.env and do not search the disk for anything: every file named here is under the plugin root given in your system prompt.`,
    `- Step 2 — instead of the stocker: in ONE turn, GetPackage and GetPackageContents with \`include_descriptions: true\`. Its answer is usually saved to a file: do NOT read it — run \`node ../scripts/process/walk.mjs "<the saved file's path>" ${outDir}\` and use what it prints (programs, transactions, function groups, classes, custom tables with descriptions).`,
    `- Step 3: GetTransaction for every transaction walk.mjs listed, in ONE message. Entry points are of two kinds, and both count: (a) programs a user starts — those the transactions start, plus ${entryList(survey)}, and when there are none every user-facing report; (b) interfaces another system starts — every function group whose modules are called from outside (RFC / inbound-outbound modules such as *_IN, *_OUT, BAPI-style wrappers): each is the entry point of an interface process. Take them all as confirmed — do not ask. Then GetProgFullCode with \`output: "file"\` for every program of (a) and with \`type: "FUGR"\` for every function group, in ONE message, and run \`node ../scripts/process/scan.mjs ${outDir} <every path those answers listed>\` as one Bash command on one line (its usage is exactly that — the run folder, then the files or folders; it prints a few lines per program and saves them to \`_work/scan.json\` for the build).`,
    "- Steps 4 and 5 — ONE analyst dispatch, not two (there is no approval between them here). Give it the walk.mjs and scan.mjs output in the prompt, the entry points of both kinds, the skill's Step 4 and Step 5 instructions from dispatch-analyst.md in full, and these host notes word for word:",
    `  1. Read these by their path under the plugin root, nothing else from disk: skills/package-to-process/grouping-heuristics.md, common/active-modules.md, configs/${mod}/tcodes.md, configs/${mod}/bapi.md. Work from the scan output; do not read a source whole — GetProgFullCode output files may be read only in the ranges a claim needs. Make independent SAP reads in parallel in one message. Never call GetTableContents or GetSqlQuery.`,
    "  2. Grouping: a process is a business document flow, not a program — the programs that work on the same documents and core tables (e.g. PR approval, PO change and price exception reports all on EBAN / EKKO / EKPO) are ONE process with several members, as grouping-heuristics.md clusters them. Keep apart only what is a different flow: each interface to an external system (e.g. PLM, WMS) and a separate document chain (e.g. import/customs). For a package of this size expect about 6–12 processes; one process per report is too fine. Depth per process: the overview 3–6 sentences; the step table 4–12 rows, every member program and module taking at least one step, more steps for more members; the external boundary every standard BAPI and function the scan shows them calling, every other package's object, and for an interface one row per RFC module with the external system (direction IN for inbound modules, OUT for outbound) — the standard tables they read and write are added by the build from the scan, so do not list those; cross-module notes wherever a second module is touched. `seq` with 5–9 actors: the departments and roles involved, not only one user. Package level: every cross-module touchpoint, every sensitive object, and at least 10 open questions, each concrete and grounded in what the scan or the sources showed (an object nothing calls, a program with no transaction, an unclear status value, a missing authority check, a table two flows write, an interface without error handling …).",
    `  3. Write the result as JSON data files, not as your reply (a reply that size is cut off), and never as a script — do not write or run any .mjs / .js generator. Each file is a Bash here-document — \`cat <<'EOF' > "<path>"\`, the JSON, then a line \`EOF\` — and write three or four files per Bash command, one block after another (every Bash call is a turn of your whole context, so fewer calls cost less); nothing else in the command but those blocks — no echo of a count, no check with node, no other line (the build validates every part and names the one that is broken). Each file valid JSON on its own — \`${outDir}/_parts/head.json\` (every field below except \`processes\` and \`bpml\`), \`${outDir}/_parts/process-01.json\`, \`process-02.json\` … (one process object each, in order), and \`${outDir}/_parts/bpml.json\` (the \`bpml\` rows as an array). Then reply with a short summary only. The shape (the representative scenario as \`seq\`, not Mermaid; prose in ${survey.language}):`,
    "```json",
    processShape(survey),
    "```",
    "     `seq`: 4–9 actors (people and departments as `actor`, programs, modules and tables as `participant`), 8–16 items, `alt`/`opt` + `elselbl` frames for the business branches, `loop` for repeated checks, `r: true` for a return.",
    `     \`bpml\`: the skill's BPML contract (skills/package-to-process/bpml-render.md) as a staircase — L1 business areas, L2 the processes (\`"process": <number>\`), L3–L4 as the flow needs, L5 one leaf per entry program and per interface module, with its attributes; no \`proc_id\`; \`dept\` / \`legacy\` marked ${estimated} / ${tbd}. Give \`seq\` on L3 and L4 rows as the bpml-render.md quality bar asks; L2 and L5 diagrams are filled in by the build.`,
    `- Then, yourself: run \`node ../scripts/process/build.mjs ${outDir}/${PROCESS_FILES.data} ${outDir} ${survey.formats.join(",")}\` (this app's script: it assembles the analyst's \`_parts/\` into process.json and writes the process document, its diagrams and the BPML in every format). If it reports a problem, fix that file (process.json, once assembled) and run it again. Do not read the parts otherwise.`,
    "- Steps 6 and 6b: skip — the build wrote the document, its diagrams and the BPML. Do not dispatch the writer and do not assemble the BPML yourself.",
    "- Step 7: give the skill's summary from the analyst's return, without the 'Next options' list — do not read the files again.",
    "",
    "Host notes: skip the Response_Prefix and Phase_Banner conventions (do not read model-routing-rule.md or model-dispatch-mode.md for them); keep every file inside the output folder; one plain command per Bash call.",
    "",
    `Write the report in ${survey.language}.`,
  ].join("\n");
}
/** The SAP reads an Economy run makes, by the names ToolSearch needs. */
const SAP_READS = [
  "GetPackage",
  "GetPackageContents",
  "SearchObject",
  "GetTransaction",
  "GetProgFullCode",
  "GetWhereUsed",
  "GetFunctionGroup",
  "GetObjectInfo",
]
  .map((name) => `mcp__plugin_sc4sap_sap__${name}`)
  .join(",");

/** process.json, which `build.mjs` turns into every file. */
const processShape = (survey: ProcessSurvey): string => `{
  "lang": "${LANG[survey.language]}",
  "package": "${survey.package}", "package_description": "<from GetPackage>", "module": "${survey.module}",
  "sap_version": "<S/4HANA | ECC, as the system reports>",
  "summary": "<2–4 sentences: what the package does, at a 30,000-ft view>",
  "entry_points": [ { "tcode": "<TCODE or ->", "program": "<PROG>", "short": "<its description>", "persona": "<buyer / receiver / accountant …>" } ],
  "macro": { "nodes": [ { "id": "p1", "num": "1", "label": "<process label>" } ], "edges": [ { "from": "p1", "to": "p2" } ] },
  "processes": [ {
    "label": "<canonical flow label, e.g. PR → PO → GR>", "confidence": 0.8,
    "members": ["<PROG / FUGR in this process>"],
    "overview": "<3–6 sentences, business voice, not technical>",
    "seq": { "actors": [ { "id": "u", "label": "<persona>", "kind": "actor" }, { "id": "p", "label": "<PROG>", "kind": "participant" }, { "id": "db", "label": "<TABLES>", "kind": "participant" } ],
             "items": [ { "m": ["u", "p"], "t": "<TCODE> 실행" }, { "m": ["p", "db"], "t": "SELECT EKKO/EKPO" }, { "m": ["db", "p"], "t": "<rows>", "r": true }, { "alt": "<branch>" }, { "m": ["p", "u"], "t": "<…>" }, { "elselbl": "<other branch>" }, { "m": ["p", "u"], "t": "<…>" }, { "end": true } ] },
    "steps": [ { "step": "<Create PR>", "actor": "<Buyer>", "cbo_object": "<PROG>", "tables": "EBAN, EBKN", "trigger": "TCode <X>", "output": "<Saved PR>" } ],
    "boundary": [ { "direction": "OUT", "external_object": "BAPI_PO_CREATE1", "type": "Std BAPI", "called_from": "<PROG>", "purpose": "<…>" } ],
    "cross_module": ["<only when the process touches another module, else empty>"]
  } ],
  "cross_module": [ { "pair": "MM ↔ FI", "where": "Process 2", "standard_touchpoint": "BAPI_ACC_DOC_POST", "cbo_override": "-" } ],
  "sensitive": [ { "object": "<OBJ>", "type": "<TABL>", "reason": "<personal / bank / price …>" } ],
  "open_questions": ["<what the source could not settle>"],
  "bpml": [
    { "lv": 1, "code": "1", "l1": "<business area, e.g. 구매관리>", "task_desc": "<…>" },
    { "lv": 2, "code": "1.1", "l2": "<process>", "task_desc": "<…>", "process": 1 },
    { "lv": 3, "code": "1.1.1", "l3": "<sub-process>", "task_desc": "<…>" },
    { "lv": 4, "code": "1.1.1.1", "l4": "<activity>", "task_desc": "<…>" },
    { "lv": 5, "code": "1.1.1.1.1", "l5": "<task>", "program": "<PROG>", "tcode": "<TCODE>", "std_cbo": "CBO", "task_desc": "<…>", "io": "<input: … / output: …>", "wricef": "R", "dept": "<…(estimated)>", "legacy": "<…(TBD)>", "note": "-" }
  ]
}`;

function economyPrompt(survey: ProcessSurvey, outDir: string): string {
  const lang = LANG[survey.language];
  const estimated = { ko: "(추정)", en: "(estimated)", ja: "(推定)" }[lang];
  const tbd = { ko: "(확인필요)", en: "(TBD)", ja: "(要確認)" }[lang];
  return [
    `Reverse-engineer the ABAP package ${survey.package} (module ${survey.module}) into its end-to-end business processes, in ${survey.language}: which programs form which document flow (PR → PO → GR → IR, SO → DN → Billing, …), how a user goes through each, which tables and standard functions they touch, and a BPML of it. It is the plugin's package-to-process skill done by one agent.`,
    `Entry programs the reader named: ${entryList(survey)}.`,
    "",
    "Work directly and briefly: no sub-agents, no skills, no questions, no disk search, and do not read the plugin's skill, agent or rule files — everything needed is below. Never call GetTableContents or GetSqlQuery. Say nothing between steps.",
    "",
    `1. Load the SAP tools with one ToolSearch \`select:${SAP_READS}\`. Then in ONE turn: GetPackage for ${survey.package}, and GetPackageContents with \`include_descriptions: true\`. Its answer is usually saved to a file: do NOT read that file — run \`node ../scripts/process/walk.mjs "<the saved file's path>" ${outDir}\` (this app's script, one level above the working directory) and work from what it prints: the programs, transactions, function groups and custom tables, each with its description. (Inline, read the list as it is.)`,
    `2. Entry points: GetTransaction for every transaction walk.mjs listed, all in ONE message, to learn the program each one starts. Entry programs = the programs a transaction starts, plus the ones named above; a program without a transaction counts only when it is clearly a user-facing report or a named entry. Skip includes, test and utility programs.`,
    `3. Sources: GetProgFullCode with \`output: "file"\` for every entry program, and \`type: "FUGR"\` for every function group, all in ONE message. Then run \`node ../scripts/process/scan.mjs ${outDir} <every path those answers listed>\` once and work from what it prints per object — tables read and written, functions, BAPIs and methods called, SUBMIT and CALL TRANSACTION, screens, ALV. Do not read the sources; read one range only when the scan leaves a step unclear.`,
    `4. Group the programs into business processes by their shared core tables and the module's document flow (MM: PR → PO (EBAN, EKKO, EKPO), PO → GR (MSEG, MKPF), GR → IR (RBKP, RSEG, BKPF); SD: order → delivery → billing (VBAK, LIKP, VBRK); …). Every process holds at least one entry program; what is left goes into one "Misc / utility" process with confidence 0. A program serving two flows is listed under both.`,
    `5. Write \`${outDir}/${PROCESS_FILES.data}\` in ONE Write, in this shape — prose in ${survey.language}, SAP names as they are:`,
    "```json",
    processShape(survey),
    "```",
    "   - `seq`: the process's representative scenario — 4–8 actors (people as `actor`, programs and tables as `participant`) and 8–16 items, with `alt`/`opt` + `elselbl` frames for the business branches (rejection, exception, override) and `loop` for repeated checks; `r: true` for a dashed return.",
    "   - `steps`: at most 12 rows per process. `boundary`: one hop only — standard BAPIs and functions, other packages' Z objects.",
    `   - \`bpml\`: a staircase, every level its own row in document order — L1 business areas, L2 the processes above (\`"process": <its number>\`), L3–L4 as the flow needs, L5 one leaf per entry program with its attributes. Never write \`proc_id\` (the builder numbers L5). What the source cannot tell — \`dept\`, \`legacy\` — is marked ${estimated} or ${tbd}. Leave \`seq\` off the rows: the build takes each L2's from its process and draws each L5's from the steps.`,
    "   - No row data anywhere: never sample values.",
    `6. Run \`node ../scripts/process/build.mjs ${outDir}/${PROCESS_FILES.data} ${outDir} ${survey.formats.join(",")}\` — this app's script; it writes the process document and the BPML in the formats asked for. Do not write them yourself and do not open the script. If it reports a problem in process.json, fix that and run it again.`,
    "",
    `Write nothing outside \`${outDir}/\`. Then end with a short briefing for the reader (5–10 lines): the processes found, the entry programs of each, the cross-module touchpoints, and the open questions.`,
    "",
    `Write the report in ${survey.language}.`,
  ].join("\n");
}
