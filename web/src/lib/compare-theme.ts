/**
 * Compare Programs' report as it is shown and saved: the spec's look
 * (`styledSpec`), and on top of it what a comparison needs.
 *
 * - The fact card. The report's front matter is what the converter puts in
 *   the card, key by key as written: `type: program-comparison`, `programs`
 *   as a YAML list that came out as "- P1 - P2", `dimensions_included` as a
 *   bare array, and English keys in a Korean page. Front-matter keys cannot
 *   be anything but ASCII (the converter's pattern), so the card is fixed
 *   here: the type and the language go (the page says both already), each
 *   program is a chip that goes to its own section, the dimensions read by
 *   name, and every label is in the report's language.
 * - The verdict legend under the matrix as a row of marks with dividers
 *   rather than one run of text.
 * - The matrix's left edge in the colour of the row's verdict (the
 *   converter marks every row that differs in the same amber, a variant
 *   too), and not at all in edit mode, where it read as an edit marker.
 * - "Differences only" visibly pressed, with how many rows it hides.
 * - Each program's detail as a card: name, then its facts as label / value.
 * - A little smaller text with more room between lines; titles unchanged.
 *
 * Markup changes are made on the converter's page, before the spec's look, so
 * the edit mode keeps them as the page shows them.
 */
import { DOC_ICON_PATHS } from "@/lib/doc-icons";
import { styledSpec } from "@/lib/spec-theme";

type Lang = "ko" | "en" | "ja";

const LABELS: Record<Lang, Record<string, string>> = {
  ko: { programs: "프로그램", dimensions_included: "비교 차원", generated: "작성일", sap_version: "SAP 버전" },
  en: { programs: "Programs", dimensions_included: "Dimensions", generated: "Generated", sap_version: "SAP version" },
  ja: { programs: "プログラム", dimensions_included: "比較観点", generated: "作成日", sap_version: "SAP バージョン" },
};

/** "Differences only" while on: how many rows it hides. */
const HIDDEN: Record<Lang, string> = { ko: "{n}행 숨김", en: "{n} hidden", ja: "{n} 行非表示" };

/** The verdict picker's four choices, drawn in the page with the app's icons (`doc-icons.ts`). */
const VERDICT_OPTIONS = (
  [
    ["✅", "check-circle", "good", "v-same", "Same"],
    ["🔷", "diamond", "note", "v-var", "Variant"],
    ["⚠️", "warning", "warn", "v-div", "Divergent"],
    ["❓", "question", "ask", "v-unk", "Unclear"],
  ] as const
).map(([emoji, icon, tone, cls, word]) => ({ emoji, path: DOC_ICON_PATHS[icon], tone, cls, word }));

/** A verdict cell's word in any of the report languages: the cell is a picker when it holds just one. */
const VERDICT_WORDS = ["same", "variant", "divergent", "unclear", "동일", "유사", "상이", "불명", "同一", "類似", "相違", "不明"];

/** A presence cell's two choices in the edit mode: ● and ○. */
const PRESENCE: Record<Lang, [string, string]> = { ko: ["있음", "없음"], en: ["Present", "Absent"], ja: ["あり", "なし"] };

/** A comparison table "Differences only" leaves empty: what is in place of its rows. */
const ALL_SAME: Record<Lang, string> = {
  ko: "차이 없음 — {n}행 모두 같음",
  en: "No differences — all {n} rows are the same",
  ja: "差分なし — {n} 行すべて同じ",
};

/** The skill's ten dimensions (`compare-prompt.ts` DIMENSIONS), short. */
const DIMENSION_NAMES: Record<Lang, Record<number, string>> = {
  ko: {
    1: "모듈 관점", 2: "조직 / 국가 범위", 3: "선택 화면", 4: "핵심 데이터 소스", 5: "업무 로직",
    6: "출력 컬럼 / KPI", 7: "권한 오브젝트", 8: "CBO / 인핸스먼트", 9: "국가 / 법적 요건", 10: "사용 시점 / 페르소나",
  },
  en: {
    1: "Module perspective", 2: "Organization / country scope", 3: "Selection screen", 4: "Core data sources",
    5: "Business logic", 6: "Output columns / KPIs", 7: "Authorization objects", 8: "CBO / enhancements",
    9: "Country / legal specifics", 10: "Usage timing / persona",
  },
  ja: {
    1: "モジュール観点", 2: "組織 / 国の範囲", 3: "選択画面", 4: "主要データソース", 5: "業務ロジック",
    6: "出力列 / KPI", 7: "権限オブジェクト", 8: "CBO / 拡張", 9: "国 / 法的要件", 10: "利用タイミング / ペルソナ",
  },
};

/** The card's programs and dimensions, under a front-matter key or the skill's fact-list label. */
const PROGRAMS = /^(programs|프로그램|プログラム)$/i;
const DIMENSIONS = /^(dimensions_included|dimensions?|비교\s*차원|차원|比較観点|観点)$/i;

/** The verdict counts ("Divergent 2 · Variant 4 · …"), one chip each. */
const RESULT = /^(result|결과|結果)$/i;

/** A verdict word written without its mark gets it, so the chip shows the verdict's icon. */
const MARKS: [RegExp, string][] = [
  [/^(same|동일|同一)/i, "✅"],
  [/^(variant|유사|類似)/i, "🔷"],
  [/^(divergent|상이|相違)/i, "⚠️"],
  [/^(unclear|불명|不明)/i, "❓"],
];
function withMark(part: string): string {
  if (/^(✅|🔷|⚠|❓)/u.test(part)) return part;
  const hit = MARKS.find(([word]) => word.test(part));
  return hit ? `${hit[1]} ${part}` : part;
}

/** Card entries that only repeat what the page already says. */
const DROPPED = new Set(["type", "language", "lang"]);

const ITEM = /<div\b([^>]*)>\s*<dt\b([^>]*)>([\s\S]*?)<\/dt>\s*<dd\b([^>]*)>([\s\S]*?)<\/dd>\s*<\/div>/g;

function langOf(html: string): Lang {
  const m = html.match(/<html\b[^>]*\blang="([a-z]{2})/i);
  const code = m?.[1]?.toLowerCase();
  return code === "ko" || code === "ja" ? code : "en";
}

const escapeAttr = (text: string): string => text.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");

/**
 * The program names in a card value — "- P1 - P2", "[P1, P2]", "P1, P2",
 * each maybe a converter link — as chips. A chip goes to the program's own
 * section (`### P1 — …`); the converter's link went to the first table row
 * that names it, which is somewhere in the recommendation.
 */
function programChips(value: string, html: string): string {
  const text = value.replace(/<[^>]*>/g, " ");
  const names = [...new Set(text.match(/[A-Z0-9_/]{3,}/g) ?? [])];
  if (!names.length) return value;
  return names
    .map((name) => {
      // The whole name, not a part of a longer one: ZMMR0002 is not ZMMR00020.
      const slug = name.toLowerCase().replace(/[/]/g, "");
      const id = html.match(new RegExp(`<h3 id="([^"]*(?<![a-z0-9])${slug}(?![a-z0-9])[^"]*)"`))?.[1];
      return id
        ? `<a class="prog-chip" href="#${escapeAttr(id)}">${name}</a>`
        : `<span class="prog-chip">${name}</span>`;
    })
    .join("");
}

/**
 * The dimension numbers — "[1, 2, 3]", "1, 2, 3", or the skill's fact
 * "7 (1·2·3·5·6·7·10)" — by name, one label each; anything else as it is.
 */
function dimensions(value: string, lang: Lang): string {
  const list = value.match(/\(([^)]*)\)/)?.[1] ?? value;
  const numbers = list.replace(/[[\]]/g, "").split(/[\s,·]+/).filter(Boolean).map(Number);
  if (!numbers.length || numbers.some((n) => !DIMENSION_NAMES[lang][n])) return value;
  return numbers.map((n) => `<span class="dim-chip">${DIMENSION_NAMES[lang][n]}</span>`).join("");
}

function readableFacts(html: string, lang: Lang): string {
  return html.replace(/<dl class="facts"([^>]*)>([\s\S]*?)<\/dl>/, (_all, attrs: string, body: string) => {
    const items = body.replace(ITEM, (item, divAttrs: string, dtAttrs: string, key: string, ddAttrs: string, value: string) => {
      const k = key.trim();
      if (DROPPED.has(k)) return "";
      // Front-matter keys get a label in the report's language; the skill's
      // own fact list (0.6.36 on) is in that language already.
      const label = LABELS[lang][k] ?? k;
      const kind = PROGRAMS.test(k) ? "programs" : DIMENSIONS.test(k) ? "dimensions" : RESULT.test(k) ? "result" : null;
      if (!kind && label === k) return item;
      const shown =
        kind === "programs" ? programChips(value, html)
        : kind === "dimensions" ? dimensions(value, lang)
        : kind === "result" ? value.split(/\s+·\s+/).map((part) => `<span class="res-chip">${withMark(part.trim())}</span>`).join("")
        : value;
      return `<div${divAttrs}><dt${dtAttrs}>${label}</dt><dd${ddAttrs}>${shown}</dd></div>`;
    });
    return `<dl class="facts"${attrs}>${items}</dl>`;
  });
}

/** "범례: ✅ Same · 🔷 Variant · …" → a label and marks with dividers between them. */
function legend(html: string): string {
  return html.replace(
    /<p>((?:범례|Legend|凡例)\s*[:：])\s*([\s\S]*?)<\/p>/i,
    (all, label: string, rest: string) => {
      const items = rest.split(/\s+[·|]\s+/).map((s) => s.trim()).filter(Boolean);
      if (items.length < 2) return all;
      const marks = items.map((item) => `<span class="lg-item">${item}</span>`).join("");
      return `<p class="cmp-legend"><span class="lg-label">${label.replace(/\s*[:：]$/, "")}</span>${marks}</p>`;
    },
  );
}

/**
 * The decision tree's heading: the plugin's renderer gives every main flow
 * its default one ("처리 흐름도", "Process flow"), which is wrong for a
 * decision tree; the picture's own title (its alt text) is used instead.
 */
const unescapeHtml = (text: string): string =>
  text
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#0*39;|&apos;/g, "'")
    .replace(/&amp;/g, "&");

function flowHeadings(html: string): string {
  return html.replace(/<figure class="flow-fig">([\s\S]*?)<\/figure>/g, (all, inner: string) => {
    const alt = inner.match(/<img\b[^>]*\balt="([^"]+)"/)?.[1];
    const m = inner.match(/(<script type="application\/json" class="flow-graph">)([\s\S]*?)(<\/script>)/);
    if (!alt || !m) return all;
    try {
      const data = JSON.parse(m[2]!) as { opts?: Record<string, unknown> };
      data.opts = { ...data.opts, heading: unescapeHtml(alt) };
      // A function, so a "$&" in a label is not read as a replacement pattern.
      return all.replace(m[0], () => m[1] + JSON.stringify(data).replace(/</g, "\\u003c") + m[3]);
    } catch {
      return all;
    }
  });
}

/** The per-program section by its title: "4." in the Economy outline, "6." in the skill's template. */
const PER_PROGRAM = /per-program|프로그램별|プログラム別/i;

/**
 * The per-program section marked, so its programs draw as cards. One fact
 * per row (the skill's template puts two on a line, "**Package**: … ·
 * **Persona**: …"), and each value in an element of its own without the
 * colon after the label: the card sets label and value apart, and the edit
 * mode edits them apart.
 */
function perProgram(html: string): string {
  return html.replace(/<section class="sec"( aria-labelledby="[^"]*">\s*<h2\b[\s\S]*?<\/section>)/g, (all, rest: string) => {
    const title = rest.match(/<h2\b[^>]*>([\s\S]*?)<\/h2>/)?.[1]?.replace(/<[^>]*>/g, "") ?? "";
    if (!PER_PROGRAM.test(title)) return all;
    let n = 0;
    const body = rest
      // Inside a list item only: "· **Label**:" in a paragraph stays as it is.
      .replace(/<li>((?:(?!<\/li>|<[uo]l\b)[\s\S])*)<\/li>/g, (_li, inner: string) =>
        `<li>${inner.replace(/\s+·\s+(?=<strong>[^<]*<\/strong>\s*[:：])/g, "</li>\n<li>")}</li>`,
      )
      .replace(
        /(<li><strong>[^<]*<\/strong>)\s*[:：]?\s*((?:(?!<\/li>|<[uo]l\b)[\s\S])*)<\/li>/g,
        (_li, label: string, value: string) => `${label}<span class="pp-val">${value.trim()}</span></li>`,
      )
      // "### P1 — What it is": the name and the description apart, numbered.
      .replace(
        /(<h3\b[^>]*>(?:<a class="hash"[^>]*>#<\/a>)?)([^<]*?)\s+[—–-]\s+([^<]*)<\/h3>/g,
        // The heading's own number ("6.1 ") goes: the badge is the number.
        (_h, open: string, name: string, sub: string) =>
          `${open}<span class="pp-no">${++n}</span><span class="pp-text"><span class="pp-name">${name.trim().replace(/^\d+(\.\d+)*\.?\s+/, "")}</span>` +
          `<span class="pp-sub">${sub.trim()}</span></span></h3>`,
      );
    return '<section class="sec per-program"' + body;
  });
}

const STYLE = `<style id="sc4sap-compare-theme">
/* Reading: a little smaller, more room between lines; titles as they are. */
html body{font-size:14.5px}
main p{line-height:1.95}
main li{line-height:1.9}
main td{line-height:1.7}
.toc li{margin:0 0 4px}
.toc a{padding-top:7px;padding-bottom:7px}

/* A wider column: the matrix and the side-by-side screens need the room. */
.layout{max-width:1340px}
main{max-width:1020px}
@media (min-width:1100px){.layout{grid-template-columns:200px minmax(0,1020px)}}

/* Screens side by side: the two boxes one height, each picture its box's
   full width (they are drawn at 2x, so they stay sharp), captions level. */
.fig-row{align-items:stretch}
.fig-row>figure{display:flex;flex-direction:column;justify-content:space-between;margin:0}
.fig-row>figure img{width:100%;height:auto}

/* SAP names in key cells: the converter marks only some of them (td.id),
   which the spec theme sets in monospace — "S_EBELN" mono next to a bold
   "EBELN". One look for all of them here: the body font, bold. */
main td.id{font:inherit;font-weight:600;letter-spacing:0}

/* Presence (● / ○): a dot drawn dead centre of its cell, the column's head
   centred over it; the glyph stays in the cell for copying and editing. */
table td.pr{text-align:center;vertical-align:middle;font-size:0;line-height:0}
table td.pr::before{content:"";display:inline-block;width:10px;height:10px;border-radius:50%;box-sizing:border-box;vertical-align:middle}
table td.pr-yes::before{background:var(--tip)}
table td.pr-no::before{border:1.5px solid color-mix(in srgb,var(--fg) 30%,transparent);opacity:1}
table th.pr-col{text-align:center}
body.editing table.cmp td.pr{cursor:pointer}

body.editing .facts dd:has(.prog-chip),body.editing .facts dd:has(.dim-chip),body.editing .facts dd:has(.res-chip){outline:0!important;cursor:default}

/* Programs in the fact card */
.facts>div:has(.prog-chip){grid-column:span 2}
.facts .prog-chip{display:inline-flex;align-items:center;height:26px;padding:0 11px;margin:2px 6px 2px 0;border:1px solid var(--line);border-radius:999px;background:var(--bg);font-size:13px;font-weight:600;line-height:1;color:var(--fg);text-decoration:none;letter-spacing:0}
.facts a.prog-chip:hover{border-color:var(--line-strong);background:var(--head)}
/* The dimensions: quieter labels than the programs', the whole card wide. */
.facts>div:has(.dim-chip){grid-column:1/-1}
/* The verdict counts, one chip each; the card's columns a little wider so a
   short fact ("MM (구매) · 패키지 ZMMPAEK") is not broken over two lines. */
.facts{grid-template-columns:repeat(auto-fit,minmax(210px,1fr))}
.facts>div:has(.res-chip){grid-column:span 2}
.facts .res-chip{display:inline-flex;align-items:center;gap:5px;margin:2px 14px 2px 0;font-size:13.5px;font-weight:500;white-space:nowrap}
.facts .res-chip .doc-ico{margin:0}
.facts .dim-chip{display:inline-flex;align-items:center;height:24px;padding:0 9px;margin:2px 6px 2px 0;border-radius:6px;background:color-mix(in srgb,var(--fg) 7%,transparent);font-size:12.5px;font-weight:500;line-height:1;color:var(--fg);letter-spacing:0}

/* Verdict legend */
.cmp-legend{display:flex;flex-wrap:wrap;align-items:center;row-gap:6px;font-size:13px;color:var(--muted)}
.cmp-legend .lg-label{font-weight:600;color:var(--fg);margin-right:14px}
.cmp-legend .lg-item{display:inline-flex;align-items:center;gap:6px;padding:0 14px;border-left:1px solid var(--line)}
.cmp-legend .lg-label+.lg-item{padding-left:0;border-left:0}
.cmp-legend .doc-ico{margin:0}


/* The matrix's left edge: the row's verdict, none for "same", none while editing. */
table.cmp tr[data-diff] td:first-child{box-shadow:none}
table.cmp tr:has(td.v-div) td:first-child{box-shadow:inset 3px 0 0 var(--warning,#9a6700)}
table.cmp tr:has(td.v-var) td:first-child{box-shadow:inset 3px 0 0 var(--note,#0969da)}
table.cmp tr:has(td.v-unk) td:first-child{box-shadow:inset 3px 0 0 var(--important,#8250df)}
body.editing table.cmp tr td:first-child{box-shadow:none}
.toolbar button .hidden-n{margin-left:6px;font-size:11.5px;opacity:.75}


table.cmp tr.cmp-empty td{padding:14px;text-align:center;font-size:13px;color:var(--muted);box-shadow:none!important}

/* The verdict picker (edit mode) */
/* A picker cell: its caret at the right edge, as a select's. */
body.editing table.cmp td.v-pick,body.editing table.cmp td.pr{position:relative;cursor:pointer;padding-right:30px}
body.editing table.cmp td.v-pick::after,body.editing table.cmp td.pr::after{content:"";position:absolute;right:14px;top:50%;width:6px;height:6px;margin-top:-5px;border-right:1.5px solid var(--muted);border-bottom:1.5px solid var(--muted);transform:rotate(45deg);opacity:.7}
.v-menu{position:fixed;z-index:50;display:flex;flex-direction:column;min-width:150px;padding:4px;background:var(--bg);border:1px solid var(--line);border-radius:10px;box-shadow:0 8px 24px rgba(0,0,0,.12)}
.v-menu button{display:flex;align-items:center;gap:8px;padding:7px 10px;border:0;border-radius:7px;background:none;font:inherit;font-size:13px;font-weight:500;color:var(--fg);text-align:left;cursor:pointer}
.v-menu button:hover,.v-menu button:focus-visible{background:var(--head);outline:0}
.v-menu button[aria-checked=true]{font-weight:700}
.v-menu .doc-ico{margin:0}
.v-menu.pr-menu{min-width:0}
.v-menu .v-dot{display:inline-block;width:10px;height:10px;border-radius:50%;box-sizing:border-box;margin:0 3px}
.v-menu .v-dot.pr-yes{background:var(--tip,#1a7f37)}
.v-menu .v-dot.pr-no{border:1.5px solid color-mix(in srgb,var(--fg) 30%,transparent)}

/* Per-program detail: one card per program, its facts as label / value. */
.per-program h3:has(+ ul){display:flex;align-items:center;gap:14px;margin:28px 0 0;padding:16px 18px;border:1px solid var(--line);border-bottom:0;border-radius:12px 12px 0 0;background:var(--head);font-size:15.5px;line-height:1.3}
.per-program h3 .pp-no{flex:none;display:grid;place-items:center;width:30px;height:30px;border-radius:8px;background:var(--fg);color:var(--bg);font-size:13px;font-weight:700;line-height:1;letter-spacing:0;font-variant-numeric:tabular-nums;text-box:trim-both cap alphabetic;user-select:none}
body.editing .per-program h3 .pp-no{outline:0;cursor:default}
.per-program h3 .pp-text{display:flex;flex-direction:column;gap:3px;min-width:0}
.per-program h3 .pp-name{font-size:16px;font-weight:700;letter-spacing:0;color:var(--fg)}
.per-program h3 .pp-sub{font-size:13px;font-weight:500;color:var(--muted);letter-spacing:-0.01em}
.per-program h3+ul{list-style:none;margin:0 0 8px;padding:6px 18px;border:1px solid var(--line);border-radius:0 0 12px 12px}
.per-program h3+ul>li{display:grid;grid-template-columns:9.5em minmax(0,1fr);align-items:baseline;gap:0 18px;margin:0;padding:11px 0;border-top:1px solid var(--line)}
.per-program h3+ul>li:first-child{border-top:0}
.per-program h3+ul>li>strong:first-child{font-weight:600;color:var(--muted);font-size:13px}
@media (max-width:600px){.per-program h3+ul>li{grid-template-columns:1fr;gap:2px}}
/* Edit mode inside a card: the dashed boxes drawn inward, so they stay off
   the card's edges and off each other; the row and the card none. */
body.editing .per-program h3{outline-offset:-5px!important;border-radius:12px 12px 0 0}
body.editing .per-program h3+ul,body.editing .per-program h3+ul>li{outline:0!important}
body.editing .per-program h3+ul>li>[contenteditable=true]{outline-offset:2px!important;padding:2px 4px;margin:-2px -4px;border-radius:5px}
body.editing .per-program h3+ul>li>.pp-val{display:block;min-height:1.5em}
</style>`;

const script = (lang: Lang): string => `<script id="sc4sap-compare-theme-script">
(function () {
  // A presence cell is the dot alone. A writer's "● (SEQ_NO)" or "● (필수)"
  // left a black glyph and a phrase in the column, so the cell becomes the
  // plain dot and the phrase moves to the row's note column, named by program.
  var NOTE_HEAD = /^(비고|note|notes|remark|remarks|備考)$/i;
  Array.prototype.forEach.call(document.querySelectorAll('main table'), function (table) {
    if (!table.tHead || !table.tBodies[0]) return;
    var heads = Array.prototype.map.call(table.tHead.rows[0].cells, function (th) { return th.textContent.trim(); });
    var noteCol = heads.findIndex(function (h) { return NOTE_HEAD.test(h); });
    Array.prototype.forEach.call(table.tBodies[0].rows, function (row) {
      var moved = [];
      Array.prototype.forEach.call(row.cells, function (cell, col) {
        if (cell.classList.contains('pr')) return;
        var m = /^\\s*([●○])\\s*(.*)$/.exec(cell.textContent);
        if (!m || !m[2]) return;
        var extra = m[2].replace(/^\\((.*)\\)$/, '$1').trim();
        cell.textContent = m[1];
        cell.className = 'pr ' + (m[1] === '●' ? 'pr-yes' : 'pr-no');
        if (extra) moved.push((heads[col] ? heads[col] + ': ' : '') + extra);
      });
      if (!moved.length) return;
      var note = noteCol >= 0 ? row.cells[noteCol] : null;
      if (!note) { row.title = moved.join(' · '); return; }
      var had = note.textContent.trim() && note.textContent.trim() !== '—' && note.textContent.trim() !== '-';
      if (!had) note.textContent = '';
      note.insertAdjacentText('beforeend', (had ? ' · ' : '') + moved.join(' · '));
    });
  });
  // A presence column (every body cell ● / ○): its head centred over the dots.
  Array.prototype.forEach.call(document.querySelectorAll('main table'), function (table) {
    if (!table.tHead || !table.tBodies[0]) return;
    var rows = Array.prototype.slice.call(table.tBodies[0].rows);
    Array.prototype.forEach.call(table.tHead.rows[0].cells, function (th, col) {
      var cells = rows.map(function (r) { return r.cells[col]; }).filter(Boolean);
      if (cells.length && cells.every(function (c) { return c.classList.contains('pr'); })) th.classList.add('pr-col');
    });
  });
  // A comparison table with no difference at all: under "Differences only"
  // it would be a bare header, so a line says why its rows are gone.
  // Hidden by attribute, not by style: the table's TSV copy skips hidden rows.
  var empties = [];
  Array.prototype.forEach.call(document.querySelectorAll('table.cmp'), function (table) {
    var body = table.tBodies[0];
    if (!body || !table.tHead || !body.querySelector('tr[data-diff]')) return;
    var row = document.createElement('tr');
    row.className = 'cmp-empty';
    row.hidden = true;
    var cell = document.createElement('td');
    cell.colSpan = table.tHead.rows[0].cells.length;
    row.appendChild(cell);
    body.appendChild(row);
    empties.push({ body: body, row: row, cell: cell });
  });
  var update = function () {
    var on = document.body.classList.contains('diff-only');
    empties.forEach(function (e) {
      var same = e.body.querySelectorAll('tr[data-diff="0"]').length;
      var none = same > 0 && !e.body.querySelector('tr[data-diff="1"]');
      e.cell.textContent = ${JSON.stringify(ALL_SAME[lang])}.replace('{n}', same);
      e.row.hidden = !(on && none);
    });
  };
  update();
  new MutationObserver(update).observe(document.body, { attributes: true, attributeFilter: ['class'] });
  // A verdict picked in the edit mode can leave a table with no difference, or give it one.
  document.addEventListener('cmp-verdict', update);
})();
(function () {
  // "Differences only": how many rows it hides, while it is on.
  var button = Array.prototype.find.call(document.querySelectorAll('.toolbar button'), function (b) {
    return /^(차이만 보기|Differences only|差分のみ)$/.test(b.textContent);
  });
  var note = document.createElement('span');
  note.className = 'hidden-n';
  var sync = function () {
    if (!button) return;
    var hidden = document.querySelectorAll('table.cmp tr[data-diff="0"]').length;
    var on = button.getAttribute('aria-pressed') === 'true' && hidden > 0;
    note.textContent = ${JSON.stringify(HIDDEN[lang])}.replace('{n}', hidden);
    if (on && !note.parentNode) button.appendChild(note);
    if (!on && note.parentNode) note.remove();
  };
  if (button) new MutationObserver(sync).observe(button, { attributes: true, attributeFilter: ['aria-pressed'] });
  sync();

  // The verdict column in edit mode: picked from the legend's marks, not
  // typed. The pick rewrites the cell as the converter writes one — the mark
  // (an icon carrying its emoji, which Save writes back), the word, the
  // verdict class — and the row's data-diff, so the cell colour, the left
  // edge and "Differences only" follow it.
  var CLASSES = [['✅', 'v-same'], ['🔷', 'v-var'], ['⚠', 'v-div'], ['❓', 'v-unk']];
  var classOf = function (emoji) {
    var hit = CLASSES.filter(function (c) { return emoji.indexOf(c[0]) === 0; })[0];
    return hit ? hit[1] : null;
  };
  // The four verdicts with their icons, drawn here: a report the writer left
  // without its legend line still gets them. A legend's own word for one
  // (another language) is used when there is a legend.
  var VERDICTS = ${JSON.stringify(VERDICT_OPTIONS)};
  var legendWord = {};
  Array.prototype.forEach.call(document.querySelectorAll('.cmp-legend .lg-item'), function (item) {
    var ico = item.querySelector('.doc-ico');
    var cls = ico ? classOf(ico.getAttribute('data-emoji') || '') : null;
    if (cls) legendWord[cls] = item.textContent.trim();
  });
  var verdicts = VERDICTS.map(function (v) {
    var ico = document.createElement('span');
    ico.className = 'doc-ico t-' + v.tone;
    ico.setAttribute('aria-hidden', 'true');
    ico.setAttribute('data-emoji', v.emoji + ' ');
    ico.innerHTML = '<svg viewBox="0 0 256 256">' + v.path + '</svg>';
    return { ico: ico, word: legendWord[v.cls] || v.word, cls: v.cls };
  });
  // A verdict cell is a picker only when it holds a verdict and nothing else
  // ("⚠️ Divergent"); one with a sentence after its mark ("❓ 확인되지 않음 —
  // 운영 반영 전 확인 필요") stays text, which a pick would throw away.
  var words = verdicts.map(function (o) { return o.word.toLowerCase(); })
    .concat(${JSON.stringify(VERDICT_WORDS)});
  Array.prototype.forEach.call(document.querySelectorAll('table.cmp td.v'), function (cell) {
    var text = cell.textContent.replace(/^[\\s\\S]*?(\\p{L})/u, '$1').trim().toLowerCase();
    if (words.indexOf(text) >= 0) cell.classList.add('v-pick');
  });
  // A presence cell (● / ○) the same way: present or absent, from a list.
  var PRESENCE = ${JSON.stringify(PRESENCE[lang])};
  var presences = [
    { glyph: '●', word: PRESENCE[0], cls: 'pr-yes' },
    { glyph: '○', word: PRESENCE[1], cls: 'pr-no' },
  ];
  var PICKABLE = 'table.cmp td.v-pick, table.cmp td.pr';
  var optionsFor = function (cell) { return cell.classList.contains('pr') ? presences : verdicts; };
  var cells = function () { return Array.prototype.slice.call(document.querySelectorAll(PICKABLE)); };
  var menu = null;
  var close = function () { if (menu) { menu.remove(); menu = null; } };
  var pick = function (cell, o) {
    cell.textContent = '';
    if (o.glyph) {
      cell.textContent = o.glyph;
      cell.classList.remove('pr-yes', 'pr-no');
    } else {
      var ico = o.ico.cloneNode(true);
      ico.setAttribute('contenteditable', 'false');
      cell.appendChild(ico);
      cell.appendChild(document.createTextNode(o.word));
      CLASSES.forEach(function (c) { cell.classList.remove(c[1]); });
    }
    cell.classList.add(o.cls);
    // The row differs as the converter decides it: by its verdicts when it
    // has any, else by any absent mark.
    var row = cell.parentElement;
    var vs = row.querySelectorAll('td.v');
    var differs = vs.length
      ? Array.prototype.some.call(vs, function (c) { return !c.classList.contains('v-same'); })
      : Array.prototype.some.call(row.querySelectorAll('td.pr'), function (c) { return c.classList.contains('pr-no'); });
    row.setAttribute('data-diff', differs ? '1' : '0');
    document.dispatchEvent(new Event('cmp-verdict'));
    // The edit mode counts the page as changed on an input event.
    cell.dispatchEvent(new Event('input', { bubbles: true }));
    sync();
  };
  var open = function (cell) {
    close();
    menu = document.createElement('div');
    menu.className = cell.classList.contains('pr') ? 'v-menu pr-menu' : 'v-menu';
    menu.setAttribute('role', 'menu');
    optionsFor(cell).forEach(function (o) {
      var b = document.createElement('button');
      b.type = 'button';
      b.setAttribute('role', 'menuitemradio');
      b.setAttribute('aria-checked', String(cell.classList.contains(o.cls)));
      if (o.glyph) {
        var dot = document.createElement('span');
        dot.className = 'v-dot ' + o.cls;
        b.appendChild(dot);
      } else {
        b.appendChild(o.ico.cloneNode(true));
      }
      b.appendChild(document.createTextNode(o.word));
      b.addEventListener('click', function (e) { e.stopPropagation(); pick(cell, o); close(); cell.focus({ preventScroll: true }); });
      menu.appendChild(b);
    });
    document.body.appendChild(menu);
    // Fixed to the viewport under the cell, or over it when there is no room
    // below; scrolling closes it rather than leaving it behind.
    // The preview zooms the page with CSS zoom, which the box is measured
    // in and the menu's left / top are not: both go through it.
    var root = document.documentElement;
    var z = root.currentCSSZoom || parseFloat(root.style.zoom) || 1;
    var b = cell.getBoundingClientRect();
    var r = { left: b.left / z, top: b.top / z, bottom: b.bottom / z };
    var vw = root.clientWidth / z, vh = root.clientHeight / z;
    menu.style.left = Math.max(8, Math.min(r.left, vw - menu.offsetWidth - 8)) + 'px';
    menu.style.top = (r.bottom + 4 + menu.offsetHeight > vh ? Math.max(8, r.top - 4 - menu.offsetHeight) : r.bottom + 4) + 'px';
    var current = menu.querySelector('[aria-checked=true]') || menu.querySelector('button');
    if (current) current.focus({ preventScroll: true });
  };
  var arm = function () {
    // The card's programs, dimensions and verdict counts are the page's
    // reading of the report, not text to edit; their labels still are.
    Array.prototype.forEach.call(document.querySelectorAll('.facts dd:has(.prog-chip), .facts dd:has(.dim-chip), .facts dd:has(.res-chip)'), function (dd) {
      dd.setAttribute('contenteditable', 'false');
    });
    // A program card's number is the page's, not text to edit.
    Array.prototype.forEach.call(document.querySelectorAll('.per-program .pp-no'), function (n) {
      n.setAttribute('contenteditable', 'false');
    });
    // A card row is a label and a value, each edited on its own; the row
    // itself is not a box to type in.
    Array.prototype.forEach.call(document.querySelectorAll('.per-program li:has(> .pp-val)'), function (li) {
      li.setAttribute('contenteditable', 'false');
      Array.prototype.forEach.call(li.querySelectorAll(':scope > strong, :scope > .pp-val'), function (part) {
        part.setAttribute('contenteditable', 'true');
      });
    });
    cells().forEach(function (cell) {
      cell.setAttribute('contenteditable', 'false');
      cell.setAttribute('tabindex', '0');
      cell.setAttribute('aria-haspopup', 'menu');
    });
  };
  var disarm = function () {
    close();
    cells().forEach(function (cell) { cell.removeAttribute('tabindex'); cell.removeAttribute('aria-haspopup'); });
  };
  document.addEventListener('click', function (e) {
    var cell = document.body.classList.contains('editing') && e.target instanceof Element ? e.target.closest(PICKABLE) : null;
    if (cell) { e.preventDefault(); open(cell); return; }
    if (menu && !(e.target instanceof Element && e.target.closest('.v-menu'))) close();
  });
  addEventListener('scroll', close, { passive: true, capture: true });
  document.addEventListener('keydown', function (e) {
    if (!document.body.classList.contains('editing')) return;
    if (e.key === 'Escape') { close(); return; }
    var cell = e.target instanceof Element ? e.target.closest(PICKABLE) : null;
    if (cell && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); open(cell); }
  });
  // The edit mode makes every cell editable as it starts; after it, these
  // become pickers again, and stop being ones when it ends.
  new MutationObserver(function () {
    if (document.body.classList.contains('editing')) arm(); else disarm();
  }).observe(document.body, { attributes: true, attributeFilter: ['class'] });
})();
</script>`;

/** Inserts `added` just before `</tag>`, or at the end when there is none. */
function before(html: string, tag: "head" | "body", added: string): string {
  const at = html.toLowerCase().lastIndexOf(`</${tag}>`);
  return at < 0 ? html + added : html.slice(0, at) + added + html.slice(at);
}

/** `flow`: the decision tree, drawn and edited as a spec's process flow is (`styledSpec`). */
export function styledCompare(html: string, flow?: Parameters<typeof styledSpec>[1]): string {
  const lang = langOf(html);
  const page = styledSpec(flowHeadings(perProgram(legend(readableFacts(html, lang)))), flow);
  return before(before(page, "head", STYLE), "body", script(lang));
}
