// Package → Process: every file of an Economy run, from its process.json.
//
//   node build.mjs <process.json> <run folder> <formats: md,html,xlsx>
//
// The plugin's skill has its analyst write the findings as JSON and its
// writer write them out again as Markdown — the same content in output tokens
// twice — and the BPML a third time. Here the agent writes process.json once
// and this lays out the rest:
//
//   - the process document, `process-<YYYYMMDD>-<lang>.md`, in the plugin's
//     document-template outline (frontmatter, contents, overview with the
//     macro flow and the entry points, one section per process with its
//     sequence diagram, step table, boundary and cross-module notes, then the
//     package-level sections), with headings in ko / en / ja;
//   - its diagrams as SVG under `_assets/process/`, drawn by this app's
//     `process-diagrams.ts` — the file the page draws with — and their data as
//     `_img/process-images.json`, the plugin's own spec shape;
//   - the HTML: the Markdown through the plugin's md-to-html.mjs, with each
//     diagram put back inline so it follows the page's theme;
//   - the BPML through the plugin's build-bpml.mjs, one file per format, with
//     each L2 row's diagram taken from its process and each L5 row's drawn
//     from the steps that program takes part in.
//
// Problems in process.json are printed one per line and exit 1, so the agent
// can fix the file and run this again.
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

// Node notes that the diagram file is TypeScript without a package type; the
// agent reading this script's output needs none of that.
process.removeAllListeners("warning");

const here = dirname(fileURLToPath(import.meta.url));
const pluginRoot = resolve(process.env.SC4SAP_PLUGIN_PATH || join(here, "..", "..", "plugin_module"));
const plugin = (path) => import(pathToFileURL(join(pluginRoot, "scripts", path)).href);
const { macroSvg, sequenceSvg } = await import(pathToFileURL(join(here, "..", "..", "web", "src", "lib", "process-diagrams.ts")).href);

const [dataPath, runDir, formatArg = "md,html"] = process.argv.slice(2);
if (!dataPath || !runDir) {
  console.error("Usage: node build.mjs <process.json> <run folder> <md,html,xlsx>");
  process.exit(2);
}
const formats = new Set(formatArg.split(",").map((f) => f.trim()).filter(Boolean));

/**
 * process.json, or — when it is not there — the parts a sub-agent wrote one
 * by one under `<run folder>/_parts/`: `head.json` (every top-level field but
 * the processes and the BPML), `process-01.json`, `process-02.json` … (one
 * process each, in order) and `bpml.json` (the rows). An analyst's whole
 * answer as one reply was cut off at its output limit (measured 2026-10-05,
 * fourteen processes); parts of a few kilobytes each are not. Assembled, it is
 * saved as process.json.
 */
function readData() {
  if (existsSync(dataPath)) return JSON.parse(readFileSync(dataPath, "utf8"));
  const parts = join(dirname(dataPath), "_parts");
  if (!existsSync(parts)) throw new Error("not found, and no _parts/ folder either");
  const read = (name) => {
    try {
      return JSON.parse(readFileSync(join(parts, name), "utf8"));
    } catch (error) {
      throw new Error(`_parts/${name}: ${error.message}`);
    }
  };
  const head = existsSync(join(parts, "head.json")) ? read("head.json") : {};
  const names = readdirSync(parts).filter((f) => /^process-\d+\.json$/.test(f)).sort((a, b) => parseInt(a.slice(8)) - parseInt(b.slice(8)));
  const bpml = existsSync(join(parts, "bpml.json")) ? read("bpml.json") : [];
  const assembled = { ...head, processes: names.map(read), bpml: Array.isArray(bpml) ? bpml : bpml.rows ?? [] };
  writeFileSync(dataPath, `${JSON.stringify(assembled, null, 1)}\n`, "utf8");
  return assembled;
}

let data;
try {
  data = readData();
} catch (error) {
  console.error(`build: ${dataPath}: ${error.message}`);
  process.exit(1);
}

// ---- Checks ---------------------------------------------------------------

const problems = [];
const arr = (value) => (Array.isArray(value) ? value : []);
if (!data.package) problems.push("`package` is missing");
if (arr(data.processes).length === 0) problems.push("`processes` is empty");
arr(data.processes).forEach((p, i) => {
  if (!p.label) problems.push(`processes[${i}]: \`label\` is missing`);
  if (!p.seq || arr(p.seq.actors).length === 0) problems.push(`processes[${i}]: \`seq.actors\` is empty`);
  if (arr(p.steps).length === 0) problems.push(`processes[${i}]: \`steps\` is empty`);
});
const bpmlRows = arr(data.bpml);
if (formats.has("xlsx") && bpmlRows.length === 0) problems.push("`bpml` is empty");
bpmlRows.forEach((r, i) => {
  if (![1, 2, 3, 4, 5].includes(r.lv)) problems.push(`bpml[${i}]: \`lv\` must be 1–5`);
  if (r.proc_id) problems.push(`bpml[${i}]: remove \`proc_id\` — the builder numbers L5 rows`);
});
if (problems.length) {
  for (const p of problems) console.error(`process.json: ${p}`);
  process.exit(1);
}

// ---- Standard tables at the boundary ---------------------------------------
//
// The plugin's analyst lists, in each process's external boundary, the
// standard tables its programs read (EBAN, EKKO …) as well as the BAPIs and
// external systems — measured on ZMMPAEK, 14 of its 23 index rows. The scan
// already knows those tables, so they are added here, one row per program,
// rather than written out by the agent: where the agent's own rows do not
// name the table already.
const scanPath = join(runDir, "_work", "scan.json");
if (existsSync(scanPath)) {
  let scan = {};
  try {
    scan = JSON.parse(readFileSync(scanPath, "utf8"));
  } catch {
    scan = {};
  }
  // A function module named as a member belongs to the group that defines it.
  const owner = {};
  for (const [main, s] of Object.entries(scan)) for (const fm of s.functions_defined ?? []) owner[fm] = main;
  const standard = (t) => !/^[ZY]/i.test(t) && !/^\//.test(t);
  const READ = { ko: "조회", ja: "参照", en: "read" };
  const WRITE = { ko: "갱신", ja: "更新", en: "write" };
  for (const p of arr(data.processes)) {
    p.boundary = arr(p.boundary);
    const named = p.boundary.map((b) => String(b.external_object ?? "").toUpperCase()).join(" ");
    const mains = [...new Set(arr(p.members).map((m) => String(m).toUpperCase()).map((m) => (scan[m] ? m : owner[m])).filter(Boolean))];
    for (const main of mains) {
      const s = scan[main];
      for (const [dir, list] of [["IN", s.reads ?? []], ["OUT", s.writes ?? []]]) {
        const tables = list.filter(standard).filter((t) => !new RegExp(`\\b${t}\\b`).test(named));
        if (tables.length === 0) continue;
        p.boundary.push({ direction: dir, external_object: tables.join(", "), type: "Std Table", called_from: main, purpose: (dir === "IN" ? READ : WRITE)[String(data.lang).slice(0, 2)] ?? (dir === "IN" ? "read" : "write") });
      }
    }
  }
}

// ---- Labels ---------------------------------------------------------------

const lang = ["ko", "en", "ja"].includes(String(data.lang).slice(0, 2)) ? String(data.lang).slice(0, 2) : "en";
const L = {
  ko: {
    title: "End-to-End 비즈니스 프로세스", contents: "목차", overview: "개요", macro: "매크로 프로세스 흐름", entry: "진입점",
    entryHead: ["TCode", "프로그램", "설명", "주요 사용자"], process: "프로세스", confidence: "신뢰도", members: "구성",
    programs: "개 객체", pOverview: "개요", scenario: "대표 시나리오", steps: "단계 표",
    stepHead: ["#", "단계", "수행자", "CBO 객체", "테이블", "트리거", "산출물"], boundary: "외부 경계 (1-hop)",
    boundaryHead: ["방향", "외부 객체", "유형", "호출 위치", "목적"], boundaryNote: "경계는 한 단계(1-hop)까지만 다룹니다.",
    crossProc: "모듈 간 연계", cross: "모듈 간 연계 (패키지 수준)", crossHead: ["모듈 쌍", "위치", "표준 연계점", "CBO 오버라이드"],
    index: "외부 경계 색인", indexNote: "패키지 밖 호출을 방향별로 모은 목록입니다.", indexHead: ["객체", "유형", "방향", "패키지 내 호출/피호출", "프로세스"],
    sensitive: "민감 객체", sensitiveNote: "인지 목적으로만 나열합니다. 행 단위 접근은 데이터 추출 정책을 따릅니다.", sensitiveHead: ["객체", "유형", "민감 사유"],
    noSensitive: "민감 객체로 표시된 항목이 없습니다.", questions: "미결 사항", noQuestions: "없음",
    facts: { pkg: "패키지", module: "모듈", sap: "SAP 버전", count: "프로세스 수", entries: "진입점", generated: "생성일" },
    footer: "`/sc4sap:package-to-process`로 생성됨", seqAlt: "대표 시나리오", macroAlt: "매크로 프로세스 흐름",
  },
  en: {
    title: "End-to-End Business Process", contents: "Contents", overview: "Overview", macro: "Macro Flow", entry: "Entry Points",
    entryHead: ["TCode", "Program", "Short text", "Typical persona"], process: "Process", confidence: "Confidence", members: "Members",
    programs: " objects", pOverview: "Overview", scenario: "Representative Scenario", steps: "Step Table",
    stepHead: ["#", "Step", "Actor", "CBO Object", "Tables", "Trigger", "Output"], boundary: "External Boundary (1-hop)",
    boundaryHead: ["Direction", "External Object", "Type", "Called From", "Purpose"], boundaryNote: "Boundary = one hop only.",
    crossProc: "Cross-Module Notes", cross: "Cross-Module Notes (Package-level)", crossHead: ["Module Pair", "Where it appears", "Standard touchpoint", "CBO override?"],
    index: "External Boundary Index", indexNote: "Every out-of-package call, by direction.", indexHead: ["Object", "Type", "Direction", "Caller / callee in package", "Process"],
    sensitive: "Sensitive Objects", sensitiveNote: "Listed for awareness; row-level access remains gated by the data-extraction policy.", sensitiveHead: ["Object", "Type", "Sensitivity reason"],
    noSensitive: "No sensitive objects flagged.", questions: "Open Questions", noQuestions: "None",
    facts: { pkg: "Package", module: "Module", sap: "SAP version", count: "Processes", entries: "Entry points", generated: "Generated" },
    footer: "Generated by `/sc4sap:package-to-process`", seqAlt: "Representative scenario", macroAlt: "Macro process flow",
  },
  ja: {
    title: "End-to-End ビジネスプロセス", contents: "目次", overview: "概要", macro: "マクロプロセスフロー", entry: "エントリポイント",
    entryHead: ["TCode", "プログラム", "説明", "主な利用者"], process: "プロセス", confidence: "信頼度", members: "構成",
    programs: " オブジェクト", pOverview: "概要", scenario: "代表シナリオ", steps: "ステップ表",
    stepHead: ["#", "ステップ", "実行者", "CBO オブジェクト", "テーブル", "トリガー", "成果物"], boundary: "外部境界 (1-hop)",
    boundaryHead: ["方向", "外部オブジェクト", "種別", "呼出元", "目的"], boundaryNote: "境界は 1 ホップまでです。",
    crossProc: "モジュール間連携", cross: "モジュール間連携 (パッケージ単位)", crossHead: ["モジュール組", "箇所", "標準連携点", "CBO 上書き"],
    index: "外部境界索引", indexNote: "パッケージ外の呼出を方向別にまとめた一覧です。", indexHead: ["オブジェクト", "種別", "方向", "パッケージ内の呼出元/先", "プロセス"],
    sensitive: "機微オブジェクト", sensitiveNote: "認識のための一覧です。行レベルのアクセスはデータ抽出ポリシーに従います。", sensitiveHead: ["オブジェクト", "種別", "理由"],
    noSensitive: "機微オブジェクトはありません。", questions: "未決事項", noQuestions: "なし",
    facts: { pkg: "パッケージ", module: "モジュール", sap: "SAP バージョン", count: "プロセス数", entries: "エントリポイント", generated: "生成日" },
    footer: "`/sc4sap:package-to-process` で生成", seqAlt: "代表シナリオ", macroAlt: "マクロプロセスフロー",
  },
}[lang];

// ---- Markdown helpers -----------------------------------------------------

const cell = (value) => String(value ?? "").replace(/\r?\n/g, " ").replace(/\|/g, "\\|").trim() || "-";
const table = (head, rows) =>
  [`| ${head.join(" | ")} |`, `|${head.map(() => "---").join("|")}|`, ...rows.map((r) => `| ${r.map(cell).join(" | ")} |`)].join("\n");
/** The anchor md-to-html gives a heading (lower case, spaces to hyphens, punctuation dropped). */
const slug = (text) =>
  String(text).toLowerCase().trim().replace(/[^\p{L}\p{N}\s_-]/gu, "").replace(/\s/g, "-");

const now = new Date();
const pad = (n) => String(n).padStart(2, "0");
const ymd = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}`;
const stamp = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}`;
const pkg = String(data.package).toUpperCase();
const processes = arr(data.processes);

// ---- Diagrams -------------------------------------------------------------

const assetDir = join(runDir, "_assets", "process");
mkdirSync(assetDir, { recursive: true });
mkdirSync(join(runDir, "_img"), { recursive: true });

const macro = data.macro && arr(data.macro.nodes).length
  ? data.macro
  : { nodes: processes.map((p, i) => ({ id: `p${i + 1}`, num: String(i + 1), label: p.label })), edges: [] };
const drawn = { macro: macroSvg(macro) };
processes.forEach((p, i) => (drawn[`seq-${i + 1}`] = sequenceSvg(p.seq)));
for (const [name, d] of Object.entries(drawn)) if (d) writeFileSync(join(assetDir, `${name}.svg`), d.svg, "utf8");
writeFileSync(
  join(runDir, "_img", "process-images.json"),
  `${JSON.stringify({ lang, macro, processes: processes.map((p, i) => ({ slug: String(i + 1), title: p.label, seq: p.seq })) }, null, 1)}\n`,
  "utf8",
);
const image = (name, alt) => (drawn[name] ? `![${alt}](_assets/process/${name}.svg)` : "");

// ---- The process document -------------------------------------------------

const entries = arr(data.entry_points);
const sections = processes.map((p, i) => `${i + 1}. ${L.process}: ${p.label}`);
const md = [];
md.push(
  "---",
  `package: ${pkg}`,
  `module: ${data.module ?? "-"}`,
  `sap_version: ${data.sap_version ?? "n/a"}`,
  `generated_at: ${stamp}`,
  `process_count: ${processes.length}`,
  `language: ${lang}`,
  "---",
  "",
  `# 📋 ${pkg} — ${L.title}`,
  "",
);
if (data.package_description) md.push(`> ${data.package_description}`, "");
md.push(`## ${L.contents}`, "");
for (const title of [`0. ${L.overview}`, ...sections, L.cross, L.index, L.sensitive, L.questions]) md.push(`- [${title}](#${slug(title)})`);
md.push("", `## 0. ${L.overview}`, "", cell(data.summary) === "-" ? "" : String(data.summary), "", `### ${L.macro}`, "", image("macro", `${pkg} ${L.macroAlt}`), "");
md.push(`### ${L.entry}`, "", table(L.entryHead, entries.map((e) => [e.tcode, e.program, e.short, e.persona])), "", "---", "");

processes.forEach((p, i) => {
  const n = i + 1;
  const members = arr(p.members);
  md.push(`## ${sections[i]}`, "");
  md.push(`> ${L.confidence}: ${typeof p.confidence === "number" ? p.confidence.toFixed(2) : cell(p.confidence)} · ${L.members}: ${members.length}${L.programs}${members.length ? ` (${members.map((m) => `\`${m}\``).join(", ")})` : ""}`, "");
  md.push(`### ${n}.1 ${L.pOverview}`, "", String(p.overview ?? ""), "");
  md.push(`### ${n}.2 ${L.scenario}`, "", image(`seq-${n}`, `${L.process} ${n} ${L.seqAlt}`), "");
  md.push(`### ${n}.3 ${L.steps}`, "", table(L.stepHead, arr(p.steps).map((s, k) => [k + 1, s.step, s.actor, s.cbo_object, s.tables, s.trigger, s.output])), "");
  if (arr(p.boundary).length) {
    md.push(`### ${n}.4 ${L.boundary}`, "", table(L.boundaryHead, arr(p.boundary).map((b) => [b.direction, b.external_object, b.type, b.called_from, b.purpose])), "", `> ${L.boundaryNote}`, "");
  }
  if (arr(p.cross_module).length) {
    md.push(`### ${n}.5 ${L.crossProc}`, "", ...arr(p.cross_module).map((c) => `- ${c}`), "");
  }
  md.push("---", "");
});

md.push(`## ${L.cross}`, "");
md.push(arr(data.cross_module).length ? table(L.crossHead, arr(data.cross_module).map((c) => [c.pair, c.where, c.standard_touchpoint, c.cbo_override])) : `- ${L.noQuestions}`, "");

// The index: every boundary row of every process, one row per object and direction.
const index = new Map();
processes.forEach((p, i) => {
  for (const b of arr(p.boundary)) {
    const key = `${b.external_object}|${b.direction}`;
    const row = index.get(key) ?? { object: b.external_object, type: b.type, direction: b.direction, callers: new Set(), procs: new Set() };
    if (b.called_from) row.callers.add(b.called_from);
    row.procs.add(i + 1);
    index.set(key, row);
  }
});
md.push(`## ${L.index}`, "", `> ${L.indexNote}`, "");
md.push(
  index.size
    ? table(L.indexHead, [...index.values()].sort((a, b) => String(a.direction).localeCompare(String(b.direction)) || String(a.object).localeCompare(String(b.object))).map((r) => [r.object, r.type, r.direction, [...r.callers].join(", "), [...r.procs].join(", ")]))
    : `- ${L.noQuestions}`,
  "",
);
md.push(`## ${L.sensitive}`, "", `> ${L.sensitiveNote}`, "");
md.push(arr(data.sensitive).length ? table(L.sensitiveHead, arr(data.sensitive).map((s) => [s.object, s.type, s.reason])) : L.noSensitive, "");
md.push(`## ${L.questions}`, "");
md.push(...(arr(data.open_questions).length ? arr(data.open_questions).map((q) => `- [ ] ${q}`) : [`- ${L.noQuestions}`]), "");
md.push("---", "", `> ${L.footer} · ${stamp}`, "");

const markdown = md.join("\n").replace(/\n{3,}/g, "\n\n");
const base = `process-${ymd}-${lang}`;
const written = [];
// Excel alone still leaves the document readable, as the plugin does.
const wantMd = formats.has("md") || !formats.has("html");
if (wantMd) {
  writeFileSync(join(runDir, `${base}.md`), markdown, "utf8");
  written.push(`${base}.md`);
}

/** md-to-html inlines each SVG as a data-URI image; put the SVG itself back, so the page's theme reaches it. */
function inlineSvgs(html) {
  return html.replace(/<img\s+src="data:image\/svg\+xml;base64,([^"]+)"[^>]*>/g, (whole, b64) => {
    try {
      const svg = Buffer.from(b64, "base64").toString("utf8").replace(/^\s*<\?xml[^>]*\?>\s*/, "");
      return svg.startsWith("<svg") ? svg : whole;
    } catch {
      return whole;
    }
  });
}

if (formats.has("html")) {
  const { mdToHtml } = await plugin("spec/md-to-html.mjs");
  // Images are resolved against the run folder, where _assets/ is.
  const html = inlineSvgs(mdToHtml(markdown, { baseDir: resolve(runDir), lang, title: `${pkg} — ${L.title}` }));
  writeFileSync(join(runDir, `${base}.html`), html, "utf8");
  written.push(`${base}.html`);
}

// ---- The BPML -------------------------------------------------------------

const bpmlFormats = ["xlsx", "md", "html"].filter((f) => formats.has(f));
const counts = {};
if (bpmlRows.length && bpmlFormats.length) {
  /** The steps a program takes part in, across every process. */
  const stepsOf = (program) => {
    const out = [];
    for (const p of processes) for (const s of arr(p.steps)) if (String(s.cbo_object ?? "").toUpperCase().includes(String(program).toUpperCase())) out.push(s);
    return out;
  };
  const leafSeq = (row) => {
    const program = String(row.program ?? "").trim();
    if (!program) return null;
    const steps = stepsOf(program);
    const entry = entries.find((e) => String(e.program).toUpperCase() === program.toUpperCase());
    const persona = (entry && entry.persona) || (steps[0] && steps[0].actor) || row.dept || "User";
    const tables = [...new Set(steps.flatMap((s) => String(s.tables ?? "").split(/[,/]\s*/)).map((t) => t.trim()).filter((t) => t && t !== "-"))];
    const actors = [
      { id: "u", label: String(persona).replace(/\s*\(.*\)$/, ""), kind: "actor" },
      { id: "p", label: row.tcode && row.tcode !== "-" ? `${program} (${row.tcode})` : program, kind: "participant" },
    ];
    if (tables.length) actors.push({ id: "db", label: tables.slice(0, 4).join(", ") + (tables.length > 4 ? " …" : ""), kind: "participant" });
    const items = [{ m: ["u", "p"], t: row.l5 || row.task_desc || program }];
    for (const s of steps.slice(0, 6)) {
      if (tables.length) {
        items.push({ m: ["p", "db"], t: s.step });
        items.push({ m: ["db", "p"], t: s.tables, r: true });
      } else {
        items.push({ m: ["p", "p"], t: s.step });
      }
    }
    const last = steps[steps.length - 1];
    items.push({ m: ["p", "u"], t: (last && last.output) || row.io || "", r: true });
    return { actors, items };
  };
  const rows = bpmlRows.map((r) => {
    const row = { ...r };
    const n = Number(row.process);
    delete row.process;
    if (!row.seq && row.lv === 2 && n >= 1 && processes[n - 1]) row.seq = processes[n - 1].seq;
    if (!row.seq && row.lv === 5) {
      const seq = leafSeq(row);
      if (seq) row.seq = seq;
    }
    return row;
  });
  // An L3 or L4 row the analyst gave no scenario: its leaves in order — the
  // department hands each task to its program and gets its output back —
  // rather than the builder's one-box-per-level skeleton.
  const clean = (text) => String(text ?? "").replace(/\s*[(（][^)）]*[)）]\s*$/, "").trim();
  rows.forEach((row) => {
    if (row.seq || row.lv < 3 || row.lv > 4) return;
    const leaves = rows.filter((r) => r.lv === 5 && String(r.code).startsWith(`${row.code}.`)).slice(0, 6);
    if (leaves.length === 0) return;
    const actors = [];
    const idOf = new Map();
    const add = (label, kind) => {
      if (!label) return null;
      if (!idOf.has(label)) {
        idOf.set(label, `a${idOf.size}`);
        actors.push({ id: idOf.get(label), label, kind });
      }
      return idOf.get(label);
    };
    const items = [];
    for (const leaf of leaves) {
      const who = add(clean(leaf.dept) || clean(entries.find((e) => e.program === leaf.program)?.persona) || "User", "actor");
      const what = add(leaf.program ? (leaf.tcode && leaf.tcode !== "-" ? `${leaf.program} (${leaf.tcode})` : leaf.program) : clean(leaf.l5), "participant");
      if (!what) continue;
      items.push({ m: [who, what], t: leaf.l5 || leaf.task_desc || "" });
      const output = String(leaf.io ?? "").split(/\s*\/\s*/).find((part) => /출력|output|出力/i.test(part));
      items.push({ m: [what, who], t: output ? output.replace(/^[^:：]*[:：]\s*/, "") : leaf.task_desc || "", r: true });
    }
    if (actors.length) row.seq = { actors, items };
  });
  const meta = {
    package: pkg,
    module: data.module ?? "",
    sap_version: data.sap_version ?? "n/a",
    abap_release: "n/a",
    industry: "n/a",
    country: "n/a",
    active_modules: [data.module].filter(Boolean),
    generated_at: stamp,
    language: lang,
    entry_points: entries.map((e) => ({ program: e.program, tcode: e.tcode, short: e.short, persona: e.persona })),
  };
  writeFileSync(join(runDir, "_img", `bpml-${ymd}-${lang}.json`), `${JSON.stringify({ meta, rows }, null, 1)}\n`, "utf8");
  const { buildBpml, buildBpmlMd } = await plugin("spec/build-bpml.mjs");
  for (const r of rows) counts[r.lv] = (counts[r.lv] ?? 0) + 1;
  for (const f of bpmlFormats) {
    const out = join(runDir, `bpml-${ymd}-${lang}.${f}`);
    // Each builder numbers the rows it is given; a fresh copy each time.
    const copy = structuredClone(rows);
    if (f === "xlsx") {
      const res = await buildBpml({ meta, rows: copy, outPath: out });
      if (res && res.failed > 0) {
        // Diagram rasterising failed for some rows: once more, the cached ones are skipped.
        await buildBpml({ meta, rows: structuredClone(rows), outPath: out });
      }
    } else {
      // The builder's Markdown, with each detail diagram it linked redrawn by
      // this app's renderer from the same row — the process document's look,
      // themed in the HTML — and the HTML made from that Markdown.
      const res = buildBpmlMd({ meta, rows: copy, outPath: out.replace(/\.html$/, ".md"), write: f === "md" });
      // The builder captions each diagram "<code> flow" in English whatever
      // the language.
      const FLOW = { ko: "흐름", ja: "フロー", en: "flow" }[lang];
      const markdown = (res.markdown ?? (f === "md" ? readFileSync(out, "utf8") : "")).replace(/!\[([^\]]*?) flow\]\(/g, `![$1 ${FLOW}](`);
      if (f === "md") writeFileSync(out, markdown, "utf8");
      const refs = [...markdown.matchAll(/!\[[^\]]*\]\((_img\/bpml-flows-[^)]+\.svg)\)/g)].map((m) => m[1]);
      const drawnRows = rows.filter((r) => r.lv >= 2);
      if (refs.length === drawnRows.length) {
        refs.forEach((ref, i) => {
          const d = drawnRows[i].seq ? sequenceSvg(drawnRows[i].seq) : null;
          if (d) writeFileSync(join(runDir, ref), d.svg, "utf8");
        });
      } else {
        console.error(`build: BPML diagrams kept as the builder drew them (${refs.length} links for ${drawnRows.length} rows)`);
      }
      if (f === "html") {
        const { mdToHtml } = await plugin("spec/md-to-html.mjs");
        writeFileSync(out, inlineSvgs(mdToHtml(markdown, { baseDir: resolve(runDir), lang, title: `${pkg} — BPML` })), "utf8");
      }
    }
    if (existsSync(out)) written.push(`bpml-${ymd}-${lang}.${f}`);
  }
}

console.log(`build: ${processes.length} processes, ${Object.values(drawn).filter(Boolean).length} diagrams, BPML rows ${Object.entries(counts).map(([lv, c]) => `L${lv} ${c}`).join(" / ") || "-"}`);
console.log(`written: ${written.join(", ")}`);
