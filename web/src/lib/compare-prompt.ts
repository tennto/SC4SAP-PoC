/**
 * Compare Programs' prompt, built from its form.
 *
 * The plugin's skill (`compare-programs`, written against 0.6.35; Standard
 * follows 0.6.41's steps — see `precisePrompt`) asks for the 2–5
 * programs, then stops to confirm the comparison dimensions and the output
 * format, and writes `.sc4sap/comparisons/<P1>__vs__<P2>-<date>.md`. On this
 * screen the programs, the dimension set and the formats are form fields,
 * and the files go into the run's own output folder, handed to the page and
 * deleted, as for the other document skills.
 *
 * Two ways to run it, chosen on the form:
 *
 *   Standard — the plugin's skill: a code reviewer per program for the facts,
 *              one analyst for the scoring and the narrative, a module
 *              consultant per module when the programs span two or more, and
 *              a writer for the report.
 *   Economy  — one agent. The sources go to files (`GetProgFullCode` with
 *              `output: "file"`) and through Package → Process's scan with
 *              `--detail` (`scripts/process/scan.mjs`), which prints a few
 *              lines per program — selection fields, authority checks, ALV
 *              columns, logic markers, routines — so the agent reads only the
 *              routines whose logic it must describe, in one turn, and writes
 *              the report in one Write. Its session is `solo`: no sub-agent
 *              or skill in its context.
 */
export type CompareSurvey = {
  /** 2–5 program names, upper case. */
  programs: string[];
  /** The skill's dimension numbers, 1–10. */
  dimensions: number[];
  method: "Economy" | "Precise";
  language: "Korean" | "English" | "Japanese";
  formats: ("md" | "html")[];
};

const LANG: Record<CompareSurvey["language"], string> = { Korean: "ko", English: "en", Japanese: "ja" };

/**
 * The template's section titles as a consultant reads them in the report's
 * language. Left to translate, a writer turned "Executive Summary" into
 * "경영 요약" (management summary) and "Shared baseline" into "공유되는 기초 현황".
 */
const HEADINGS: Partial<Record<CompareSurvey["language"], string>> = {
  Korean:
    "1. 요약 · 2. 상황별 프로그램 선택 가이드 · 3. 공통 기반 · 4. 비교 매트릭스 (4.1 선택 필드, 4.2 출력 컬럼) · " +
    "5. 화면 비교 (5.1 선택 화면, 5.2 출력 리스트) · 6. 프로그램별 상세 (6.x 메시지 비교) · 7. 통합 가능성 · " +
    "8. 리스크 및 확인 필요 사항 · 9. 부록 (9.1 권한 오브젝트, 9.2 테이블 / CDS); fact-list labels 프로그램 · 시나리오 · " +
    "모듈 · 비교 차원 · 결과 · 시스템 · 생성일; legend label 범례",
  Japanese:
    "1. 概要 · 2. 状況別プログラム選択ガイド · 3. 共通基盤 · 4. 比較マトリクス (4.1 選択項目, 4.2 出力列) · " +
    "5. 画面比較 (5.1 選択画面, 5.2 出力リスト) · 6. プログラム別詳細 (6.x メッセージ比較) · 7. 統合の可能性 · " +
    "8. リスクと確認事項 · 9. 付録 (9.1 権限オブジェクト, 9.2 テーブル / CDS); fact-list labels プログラム · シナリオ · " +
    "モジュール · 比較観点 · 結果 · システム · 作成日; legend label 凡例",
};

/** The skill's ten dimensions (comparison-scope.md), by number. */
export const DIMENSIONS: Record<number, string> = {
  1: "Module / domain perspective (MM quantity, CO value, SD margin, FI posting …)",
  2: "Organization / country scope (BUKRS, WERKS, VKORG, country variant)",
  3: "Selection screen — what the user filters on",
  4: "Core data sources — the tables and CDS views that drive the result",
  5: "Business logic — aggregation, currency / unit conversion, derivation",
  6: "Output columns / KPIs — quantity-, value- or tax-centric",
  7: "Authorization objects — which role sees it",
  8: "CBO / enhancement usage — append structures, BAdI implementations, exits",
  9: "Country / legal specifics — e-invoicing, VAT, statutory fields",
  10: "Usage timing / persona — month-end controller, daily clerk, auditor",
};

/** The skill's default bundle; the other three are opt-in. */
export const DEFAULT_DIMENSIONS = [1, 2, 3, 5, 6, 7, 10];

/** The report's file name without its extension, as the skill names it plus the language. */
export function compareBase(survey: CompareSurvey): string {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const lang = LANG[survey.language];
  const name = `${survey.programs.map((p) => p.replace(/\//g, "_")).join("__vs__")}-${date}-${lang}`;
  return name.length > 120 ? `compare-${date}-${lang}` : name;
}

export function comparePrompt(survey: CompareSurvey, outDir: string): string {
  return survey.method === "Precise" ? precisePrompt(survey, outDir) : economyPrompt(survey, outDir);
}

const dimensionList = (survey: CompareSurvey): string =>
  survey.dimensions.map((n) => `${n}. ${DIMENSIONS[n]}`).join("\n");

const htmlStep = (outDir: string, base: string): string =>
  `\`node <plugin>/scripts/spec/md-to-html.mjs ${outDir}/${base}.md ${outDir}/${base}.html\``;

/**
 * Standard: the plugin's skill (0.6.41) for the analysis — Haiku checkers for
 * the facts, the Opus analyst, the module consultants, the Sonnet writer with
 * its screens — and this host for the rest. The skill's page is built with
 * `--editable` and carries the plugin's own editor; this app puts its own
 * edit mode on every document (`compare-theme.ts` → `styledSpec`), so the
 * page is built plain, as Economy's is. One language, no English companion,
 * no Excel copy, no review question, no history or versions: the run's
 * folder holds one `.md`, its `.html` and the screen pictures.
 */
function precisePrompt(survey: CompareSurvey, outDir: string): string {
  const base = compareBase(survey);
  const dim8 = survey.dimensions.includes(8);
  const screens = survey.dimensions.includes(3) || survey.dimensions.includes(6);
  return [
    `/sc4sap:compare-programs ${survey.programs.join(", ")}`,
    "",
    "Every question the skill would ask is answered here: do not ask any, and do not call AskUserQuestion.",
    "- Step 0: skip the trust-session bootstrap (this host grants the permissions itself) and the edited-page import (there is none).",
    `- Step 1: the programs are ${survey.programs.join(", ")}. Resolve each with SearchObject in ONE message; if one is not found or is ambiguous, stop and say which — do not ask. Skip the Names / version / history step: the files are named below.`,
    `- Step 2: do not show the scope prompt. The dimensions are ${survey.dimensions.join(", ")}:`,
    dimensionList(survey),
    `  lang = ${LANG[survey.language]}, english = false, excel = false.`,
    `- Step 3: the checkers as the skill says, one per program in ONE message. Add to each checker's prompt: "Skip GetWhereUsed and the transport history."${dim8 ? "" : " and \"Dimension 8 is off: no enhancement reads.\""} Step 3b (T100 texts) as the skill says.`,
    "- Steps 4 and 4b: as the skill says.",
    `- Step 5: the writer as the skill says, with these paths: screen specs in \`${outDir}/_img/<PROG>.image-spec.json\`${screens ? `, rendered into \`${outDir}/_assets/${base}/<PROG>/\`` : ""}, and the report written to \`${outDir}/${base}.md\`${screens ? ` with the pictures referenced as \`_assets/${base}/<PROG>/selection.png\` / \`alv.png\`` : ""}. Tell the writer three more things:`,
    `  1. The decision tree in §2 is not Mermaid. Write it to \`${outDir}/_img/decision.image-spec.json\` as \`{"lang": "${LANG[survey.language]}", "processFlow": {"nodes": [...], "edges": [...]}}\` — the same tree the Mermaid block would have held — every question and every answer the decision needs, nothing left out to make it smaller — as nodes \`{"id", "type", "label"}\` with type "decision" for a question and "end" for a program to use, and edges \`{"from", "to", "label"}\` labelled with the answer. An answer that settles the choice goes straight to that program's "end" node; only an answer that leaves it open goes on to the next question — never route a settled answer through a later question. Its layout is the page's to make: no positions or lanes — render it with \`node <plugin>/scripts/spec/render-md-images.mjs ${outDir}/_img/decision.image-spec.json ${outDir}/_assets/${base}/decision/\`, and put \`![<decision tree title>](_assets/${base}/decision/flow.png)\` where the Mermaid block would be.`,
    `  2. The report is in ${survey.language}, as the template's rule 11 says: every heading, table header, fact-list label, per-program label, the legend's own label and the decision tree's text translated. The one exception is the four verdict words, which stay in English in the legend line, every verdict cell and the Result fact: ✅ Same · 🔷 Variant · ⚠️ Divergent · ❓ Unclear.${HEADINGS[survey.language] ? ` Use these section titles: ${HEADINGS[survey.language]}.` : ""}`,
    "  3. In the matrix tables a program's column holds ● or ○ and nothing else — no \"● (SEQ_NO)\", no \"● (required)\", no line numbers. Anything worth saying about that cell (a different field name, a condition, where it is set) goes in the row's note column, named by program.",
    survey.formats.includes("html")
      ? `- Step 5.1: build the page WITHOUT --editable, --version or --note: ${htmlStep(outDir, base)}. A ⚠ line is a defect: fix the .md and run the same command again.`
      : "- Step 5.1: no HTML page; the .md is the report.",
    "- Skip Steps 5.1b (Excel), 5.2 (review question), 5.3 (English companion) and 6 (follow-up menu). End with the skill's completion block, with these file paths.",
    "",
    "Host notes for this run (they change nothing the skill decides, only how it gets there):",
    "- Skip the Response_Prefix and Phase_Banner conventions: do not read model-routing-rule.md or model-dispatch-mode.md for them.",
    "- The SAP context is given: S/4HANA, ABAP release 758; industry and country not set. Do not read config.json or sap.env, and do not search the disk: every file named here is under the plugin root given in your system prompt.",
    "- Make independent SAP reads in the same turn.",
    "- Run every Agent in the foreground — never `run_in_background` — and wait for its result in this same turn: this host ends the run, and takes its files, when your turn ends.",
    "- Keep every file inside the output folder above — never /tmp or another folder — and run one plain command per Bash call.",
    "",
    `Write the report in ${survey.language}.`,
  ].join("\n");
}

/** The SAP reads an Economy run makes, by the names ToolSearch needs. */
const sapReads = (dim8: boolean): string =>
  ["SearchObject", "GetObjectInfo", "GetProgFullCode", "GetTextElement", ...(dim8 ? ["GetEnhancements"] : [])]
    .map((name) => `mcp__plugin_sc4sap_sap__${name}`)
    .join(",");

/**
 * The report's outline, stated here rather than read from the plugin's
 * report-template.md, as Program → Spec's Economy states its outline.
 */
const outline = (survey: CompareSurvey): string => {
  const has = (n: number): boolean => survey.dimensions.includes(n);
  return [
    "--- (YAML front-matter, one line per key, no YAML lists or brackets: type: program-comparison, programs: P1, P2, generated: <date>, language: <code>, dimensions_included: 1, 2, 3, sap_version: S/4HANA (ABAP 758)) ---",
    "# <Program comparison report>: <P1> vs <P2> …",
    "## 1. Executive summary — exactly 3 sentences: the shared scenario, the biggest divergence, the recommendation",
    "## 2. Shared baseline — business scenario, shared selection fields, shared output purpose",
    "## 3. Comparison matrix — a legend line (✅ Same · 🔷 Variant · ⚠️ Divergent · ❓ Unclear), then one table: # | Dimension | <one column per program> | Verdict; one row per dimension above, `#` its number as listed above, each cell a short phrase",
    "## 4. Per-program detail — a ### per program: package, persona, core data sources, business logic summary, main authorizations" +
      (has(8) ? ", CBO / enhancements" : ""),
    "## 5. Recommendation — table: Use-case | Recommended program | Reason (4–6 rows)",
    "## 6. Consolidation opportunities — bullets; leave the section out when there are none",
    "## 7. Risks & open questions — what a consultant must confirm with the business, and every ❓",
    "## 8. Appendix — 8.1 Authorization objects verbatim: Program | Object | Fields; 8.2 Main tables: Program | Table / CDS | Read or write" +
      (has(8) ? "; 8.3 CBO / enhancements: Program | Type | Object | Purpose" : ""),
  ].join("\n");
};

function economyPrompt(survey: CompareSurvey, outDir: string): string {
  const base = compareBase(survey);
  const dim8 = survey.dimensions.includes(8);
  return [
    `Compare the ABAP programs ${survey.programs.join(", ")} for a functional consultant, in ${survey.language}. They share one business scenario and differ by module, country, persona or timing: say why each variant exists and which to use when — business intent, not code quality. It is the plugin's compare-programs skill done by one agent.`,
    "",
    "The dimensions to compare:",
    dimensionList(survey),
    "",
    "Work directly and briefly: no sub-agents, no skills, no questions, no disk search, and do not read the plugin's skill, agent or rule files — everything needed is below. Never call GetTableContents or GetSqlQuery: source and metadata only. Say nothing between steps.",
    "",
    `1. Load the SAP tools with one ToolSearch \`select:${sapReads(dim8)}\`. Then in ONE turn, for every program: GetObjectInfo, GetProgFullCode with \`output: "file"\`, and GetTextElement (the program's title and labels)${dim8 ? ", GetEnhancements" : ""}. A program not found: SearchObject for it once; still nothing, stop and say which.`,
    `2. Run \`node ../scripts/process/scan.mjs ${outDir} <every path the GetProgFullCode answers listed> --detail\` once (this app's script; one command on one line). Per program it prints the tables read and written, the functions, BAPIs and classes called, the screens, the selection fields with their types, every AUTHORITY-CHECK with its fields ("none in the source" when there is none), the ALV columns with their heading text symbols (Σ = subtotalled), markers of the business logic, and the FORM routines. Do not Grep for any of that again.`,
    "3. Only for what the scan cannot say — how the main routines compute (business logic, persona) — Read the include files holding those routines, every one you need in ONE turn; no Grep, no second round. The text symbols (TEXT-C01 …) are in the GetTextElement answers.",
    `4. Judge each dimension per program: ✅ Same, 🔷 Variant (differs in a comparable way), ⚠️ Divergent (fundamentally different), ❓ Unclear (the source does not say). The ⚠️ rows are the story of why each program exists.`,
    `5. Write the report in ONE Write to \`${outDir}/${base}.md\`, in this outline, and do not edit it afterwards:`,
    "```",
    outline(survey),
    "```",
    `   Section titles, table headers and the legend in ${survey.language}; program, table and authorization object names as they are. No code snippets — say load-bearing details in business terms. A value the source cannot settle is "❓" in the matrix and a line in section 7.`,
    ...(survey.formats.includes("html") ? [`6. Convert it: ${htmlStep(outDir, base)}.`] : []),
    "",
    `Write nothing outside \`${outDir}/\`. Then end with a short summary for the reader (3–5 lines): the biggest divergence, how many dimensions differ, and which program to use when.`,
    "",
    `Write the report in ${survey.language}.`,
  ].join("\n");
}
