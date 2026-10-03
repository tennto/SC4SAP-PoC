// Inventory a CBO Package: index.md and index.html, built from inventory.json.
//
//   node build-index.mjs <run folder>/inventory.json <run folder>
//
// The agent writes only inventory.json — what it found and what it judged —
// and this lays out the page around it, in one fixed outline for both modes.
// Measured on 2026-10-04 (ZMMPAEK, 362 objects) writing index.md by hand was
// 11k output tokens and 70 seconds of an Economy run, most of it the table of
// every object in the package; the Standard run's agent wrote its own outline
// with no such table at all. Here:
//
//   # <PACKAGE> CBO inventory
//   - **Package** · **Module** · **Flagship programs** · **Scanned** ·
//     **SAP version** · **Objects**          (the cover, cbo-theme.ts lays it out)
//   ## Summary                               (inventory.summary)
//   ## 📌 Pinned …, one ### per flagship program
//   ## one section per kind of frequently used object
//   ## Sensitive objects
//   ## Everything in the package             (_work/objects.json, from objects.mjs,
//                                             else inventory.all_objects)
//
// Then index.html with the plugin's md-to-html.mjs. Labels in ko / en / ja,
// from inventory.lang.
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

// `--keep`: the agent wrote index.md itself (the plugin's Standard mode, whose
// own sections are the point of running it). Then only the table of every
// object is appended, when the page does not have one, and the HTML made.
const args = process.argv.slice(2);
const keep = args.includes("--keep");
const [inventoryPath, runDir] = args.filter((arg) => arg !== "--keep");
if (!inventoryPath || !runDir) {
  console.error("Usage: node build-index.mjs <inventory.json> <run folder> [--keep]");
  process.exit(2);
}

const MD_TO_HTML = resolve(dirname(fileURLToPath(import.meta.url)), "../../plugin_module/scripts/spec/md-to-html.mjs");

const L = {
  ko: {
    title: (p) => `${p} CBO 인벤토리`,
    package: "패키지", module: "모듈", flagship: "플래그십 프로그램", scanned: "스캔 일시", sap: "SAP 버전", objects: "전체 오브젝트",
    none: "없음", summary: "요약", pinned: "📌 고정 — 플래그십 프로그램이 쓰는 오브젝트",
    name: "이름", type: "유형", role: "역할", purpose: "용도", refs: "참조", reuse: "재사용 안내", reason: "사유", description: "설명",
    sensitive: "민감 오브젝트", everything: "패키지 전체 오브젝트", frequent: (k) => `자주 쓰는 ${k}`,
    noneFrequent: "패키지 안에서 기준 이상으로 참조되는 오브젝트가 없습니다.", total: (n) => `${n}개`,
  },
  en: {
    title: (p) => `${p} CBO inventory`,
    package: "Package", module: "Module", flagship: "Flagship programs", scanned: "Scanned", sap: "SAP version", objects: "Objects",
    none: "none", summary: "Summary", pinned: "📌 Pinned — used by flagship programs",
    name: "Name", type: "Type", role: "Role", purpose: "Purpose", refs: "References", reuse: "Reuse hint", reason: "Reason", description: "Description",
    sensitive: "Sensitive objects", everything: "Everything in the package", frequent: (k) => `Frequently used ${k.toLowerCase()}`,
    noneFrequent: "No object is referenced inside the package often enough to count as frequently used.", total: (n) => `${n}`,
  },
  ja: {
    title: (p) => `${p} CBO 棚卸し`,
    package: "パッケージ", module: "モジュール", flagship: "主要プログラム", scanned: "スキャン日時", sap: "SAP バージョン", objects: "オブジェクト数",
    none: "なし", summary: "要約", pinned: "📌 固定 — 主要プログラムが使うオブジェクト",
    name: "名前", type: "種類", role: "役割", purpose: "用途", refs: "参照", reuse: "再利用の目安", reason: "理由", description: "説明",
    sensitive: "機密オブジェクト", everything: "パッケージ内の全オブジェクト", frequent: (k) => `よく使う${k}`,
    noneFrequent: "パッケージ内で基準以上に参照されるオブジェクトはありません。", total: (n) => `${n} 件`,
  },
};

/** Kinds of object, in the order their sections appear, by language. */
const KINDS = [
  ["TABL", { ko: "테이블", en: "Tables", ja: "テーブル" }],
  ["STRU", { ko: "구조", en: "Structures", ja: "構造" }],
  ["VIEW", { ko: "뷰", en: "Views", ja: "ビュー" }],
  ["DTEL", { ko: "데이터 엘리먼트", en: "Data elements", ja: "データエレメント" }],
  ["CLAS", { ko: "클래스", en: "Classes", ja: "クラス" }],
  ["INTF", { ko: "인터페이스", en: "Interfaces", ja: "インタフェース" }],
  ["FUGR", { ko: "함수 그룹", en: "Function groups", ja: "汎用モジュールグループ" }],
  ["FUNC", { ko: "함수 모듈", en: "Function modules", ja: "汎用モジュール" }],
  ["PROG", { ko: "프로그램", en: "Programs", ja: "プログラム" }],
];

const inv = JSON.parse(readFileSync(inventoryPath, "utf8"));
const lang = ["ko", "en", "ja"].includes(String(inv.lang).slice(0, 2)) ? String(inv.lang).slice(0, 2) : "en";
const T = L[lang];

/** A table cell: one line, no pipes. */
const cell = (value) => String(value ?? "").replace(/\r?\n/g, " ").replace(/\|/g, "\\|").trim() || " ";
const code = (value) => (value ? `\`${String(value).replace(/`/g, "")}\`` : " ");
const table = (heads, rows) =>
  [`| ${heads.join(" | ")} |`, `|${heads.map(() => "---").join("|")}|`, ...rows.map((r) => `| ${r.map(cell).join(" | ")} |`)].join("\n");

const kindOf = (type) => {
  const t = String(type || "").toUpperCase();
  const h = t.split("/")[0];
  if (h === "TABL" && /\/DS$/.test(t)) return "STRU";
  if (h === "FUGR" && /\/FF$/.test(t)) return "FUNC";
  if (h === "DDLS") return "VIEW";
  return h;
};

// Every object in the package: the list objects.mjs wrote, else the one in
// inventory.json (a small package's list comes back inline, not as a file).
const objectsFile = join(runDir, "_work", "objects.json");
const everything = existsSync(objectsFile)
  ? JSON.parse(readFileSync(objectsFile, "utf8"))
  : Array.isArray(inv.all_objects) ? inv.all_objects : [];

const counts = {};
for (const [type] of everything) counts[kindOf(type)] = (counts[kindOf(type)] ?? 0) + 1;
const countLine = everything.length
  ? `${T.total(everything.length)} (${Object.entries(counts).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${v}`).join(", ")})`
  : String(inv.object_count ?? "");

const objects = Array.isArray(inv.objects) ? inv.objects : [];
const keyPrograms = Array.isArray(inv.key_programs) ? inv.key_programs : [];
const pinned = objects.filter((o) => Array.isArray(o.used_by_key_programs) && o.used_by_key_programs.length > 0);
const frequent = objects.filter((o) => !pinned.includes(o));

const out = [];
out.push(`# ${T.title(inv.package ?? "")}`, "");
out.push(`- **${T.package}**: ${code(inv.package)}`);
out.push(`- **${T.module}**: ${inv.module ?? ""}`);
out.push(`- **${T.flagship}**: ${keyPrograms.length ? keyPrograms.map(code).join(", ") : T.none}`);
out.push(`- **${T.scanned}**: ${String(inv.scanned_at ?? "").slice(0, 10)}`);
out.push(`- **${T.sap}**: ${inv.sap_version ?? ""}`);
out.push(`- **${T.objects}**: ${countLine}`, "");

out.push(`## ${T.summary}`, "", String(inv.summary ?? "").trim() || T.noneFrequent, "");

if (pinned.length) {
  out.push(`## ${T.pinned}`, "");
  const programs = keyPrograms.length ? keyPrograms : [...new Set(pinned.flatMap((o) => o.used_by_key_programs))];
  for (const program of programs) {
    const mine = pinned.filter((o) => o.used_by_key_programs.includes(program));
    if (!mine.length) continue;
    out.push(`### ${program}`, "");
    out.push(table([T.name, T.type, T.purpose, T.reuse], mine.map((o) => [code(o.name), o.type, o.purpose, o.reuse_hint])), "");
  }
}

const groups = new Map();
for (const o of frequent) {
  const k = kindOf(o.type);
  if (!groups.has(k)) groups.set(k, []);
  groups.get(k).push(o);
}
const order = [...KINDS.map(([k]) => k), ...[...groups.keys()].filter((k) => !KINDS.some(([kk]) => kk === k))];
for (const k of order) {
  const list = groups.get(k);
  if (!list?.length) continue;
  const label = KINDS.find(([kk]) => kk === k)?.[1][lang] ?? k;
  out.push(`## ${T.frequent(label)}`, "");
  out.push(
    table(
      [T.name, T.role, T.purpose, T.refs, T.reuse],
      list.map((o) => [code(o.name), o.role, o.purpose, o.ref_count ?? "", o.reuse_hint]),
    ),
    "",
  );
}

const sensitive = Array.isArray(inv.sensitive) ? inv.sensitive : [];
if (sensitive.length) {
  out.push(`## ${T.sensitive}`, "");
  out.push(table([T.name, T.reason], sensitive.map((s) => [code(s.name), [s.reason, s.fields ? `(${[].concat(s.fields).join(", ")})` : ""].join(" ")])), "");
}

if (everything.length) {
  out.push(`## ${T.everything}`, "");
  const sorted = [...everything].sort((a, b) => kindOf(a[0]).localeCompare(kindOf(b[0])) || String(a[1]).localeCompare(String(b[1])));
  out.push(table([T.type, T.name, T.description], sorted.map(([type, name, description]) => [kindOf(type), code(name), description])), "");
}

const mdPath = join(runDir, "index.md");
const htmlPath = join(runDir, "index.html");
if (keep && existsSync(mdPath)) {
  // The agent's own page, untouched but for the table of every object at the
  // end — unless it already has one.
  let page = readFileSync(mdPath, "utf8").trimEnd();
  const hasAll = /^##\s.*(everything in the package|패키지 전체|전체 오브젝트 목록|全オブジェクト)/im.test(page);
  if (!hasAll && everything.length) {
    const sorted = [...everything].sort((a, b) => kindOf(a[0]).localeCompare(kindOf(b[0])) || String(a[1]).localeCompare(String(b[1])));
    page += `\n\n## ${T.everything}\n\n${table([T.type, T.name, T.description], sorted.map(([type, name, description]) => [kindOf(type), code(name), description]))}`;
  }
  writeFileSync(mdPath, `${page}\n`, "utf8");
} else {
  writeFileSync(mdPath, `${out.join("\n").trim()}\n`, "utf8");
}
const result = spawnSync(process.execPath, [MD_TO_HTML, mdPath, htmlPath], { encoding: "utf8" });
if (result.status !== 0) {
  console.error(`build-index: md-to-html failed: ${result.stderr || result.stdout}`);
  process.exit(1);
}
console.log(
  keep
    ? `build-index: kept the agent's ${mdPath}, added the object table (${everything.length} objects), wrote ${htmlPath}`
    : `build-index: wrote ${mdPath} and ${htmlPath} — ${pinned.length} pinned, ${frequent.length} frequently used, ${sensitive.length} sensitive, ${everything.length} objects listed`,
);
