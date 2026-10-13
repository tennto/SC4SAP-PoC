/**
 * Analyze Code's report, built here from the run's `review-data.json`
 * (`scripts/review/build.mjs`): an HTML page in the spec's look and a
 * Markdown document, for the preview and the downloads alike.
 *
 * The page's centre is each proposed change as two code panes, the source as
 * it is and as proposed, side by side and scrolled together: line numbers as
 * the SAP editor numbers them, the lines around the change for context, the
 * changed lines marked in red and green, and a
 * button that copies the proposed lines. Under the panes, the analysis and
 * the reasoning for the change. A change whose lines the build script could
 * not find in the source is shown as the proposed code alone, with a note —
 * never with line numbers the model guessed.
 *
 * Light and dark by the same tokens as the spec (`spec-theme.ts`), so the
 * preview follows the app's theme (`HtmlPreview` sends it) and a downloaded
 * file follows the machine.
 */
import { DARK, LIGHT, TYPE_LINK } from "@/lib/spec-theme";

export type ReviewFinding = {
  id: number;
  severity: string;
  location?: string;
  rule?: string;
  finding: string;
  fix?: string;
};

export type ReviewChange = {
  title: string;
  findings?: number[];
  severity?: string;
  /** The include, class or program the lines are in. */
  object?: string;
  start?: number;
  end?: number;
  original: string;
  proposed: string;
  analysis?: string;
  rationale?: string;
  /** The build script found `original` at `start..end` of the source. */
  verified: boolean;
  /** The source around the change, from line `from`. Only when verified. */
  context?: { from: number; lines: string[] };
  fileLines?: number;
};

export type ReviewData = {
  object: string;
  type?: string;
  focus?: string;
  language?: string;
  title?: string;
  summary?: string;
  score?: number;
  topFix?: string;
  findings?: ReviewFinding[];
  changes?: ReviewChange[];
  next?: string[];
  generated?: string;
};

type Lang = "ko" | "en" | "ja";

const SEVERITIES = ["CRITICAL", "HIGH", "MEDIUM", "LOW"] as const;

const TEXT: Record<
  Lang,
  {
    review: string;
    current: string;
    currentSub: string;
    proposed: string;
    proposedSub: string;
    copy: string;
    copied: string;
    copyFailed: string;
    analysis: string;
    rationale: string;
    priority: string;
    lines: (from: number, to: number) => string;
    related: string;
    severity: Record<string, string>;
    lede: string;
    object: string;
    type: string;
    focus: string;
    score: string;
    findingsCount: string;
    changesCount: string;
    date: string;
    topFix: string;
    changesH: string;
    findingsH: string;
    nextH: string;
    noChanges: string;
    unverified: string;
    disclaimer: string;
    cols: [string, string, string, string, string, string];
    all: string;
    theme: string;
    light: string;
    dark: string;
  }
> = {
  ko: {
    review: "코드 리뷰",
    current: "현재 소스",
    currentSub: "수정 대상 줄",
    proposed: "제안 소스",
    proposedSub: "제안된 줄",
    copy: "제안 소스 복사",
    copied: "복사됨",
    copyFailed: "복사하지 못했습니다 — 코드를 직접 선택하세요",
    analysis: "분석 요약",
    rationale: "수정 근거",
    priority: "우선순위",
    lines: (from, to) => (from === to ? `원본 ${from}행` : `원본 ${from}–${to}행`),
    related: "관련 발견",
    severity: { CRITICAL: "치명", HIGH: "높음", MEDIUM: "중간", LOW: "낮음" },
    lede: "요약",
    object: "오브젝트",
    type: "유형",
    focus: "리뷰 관점",
    score: "품질 점수",
    findingsCount: "발견 사항",
    changesCount: "수정 제안",
    date: "작성일",
    topFix: "가장 효과가 큰 수정",
    changesH: "수정 제안",
    findingsH: "전체 발견 사항",
    nextH: "이어서 물어볼 수 있는 것",
    noChanges: "코드 수정 제안이 없습니다.",
    unverified: "원본 줄을 소스에서 찾지 못해 비교 화면 없이 제안 코드만 표시합니다.",
    disclaimer:
      "제안 코드는 SAP에서 구문 검사, 실행, 성능 측정을 거치지 않았습니다. 반영 전에 대상 시스템에서 확인하세요.",
    cols: ["#", "심각도", "위치", "규칙", "내용", "조치"],
    all: "전체",
    theme: "테마",
    light: "라이트 테마",
    dark: "다크 테마",
  },
  en: {
    review: "Code review",
    current: "Current source",
    currentSub: "lines to change",
    proposed: "Proposed source",
    proposedSub: "proposed lines",
    copy: "Copy proposed source",
    copied: "Copied",
    copyFailed: "Could not copy — select the code instead",
    analysis: "Analysis",
    rationale: "Why this change",
    priority: "Priority",
    lines: (from, to) => (from === to ? `original line ${from}` : `original lines ${from}–${to}`),
    related: "Findings",
    severity: { CRITICAL: "Critical", HIGH: "High", MEDIUM: "Medium", LOW: "Low" },
    lede: "Summary",
    object: "Object",
    type: "Type",
    focus: "Focus",
    score: "Quality score",
    findingsCount: "Findings",
    changesCount: "Proposed changes",
    date: "Date",
    topFix: "Most valuable fix",
    changesH: "Proposed changes",
    findingsH: "All findings",
    nextH: "What to ask next",
    noChanges: "No code changes are proposed.",
    unverified: "The original lines were not found in the source, so only the proposed code is shown.",
    disclaimer:
      "The proposed code has not been syntax-checked, run or measured on SAP. Check it on the target system before applying it.",
    cols: ["#", "Severity", "Location", "Rule", "Finding", "Fix"],
    all: "All",
    theme: "Theme",
    light: "Light theme",
    dark: "Dark theme",
  },
  ja: {
    review: "コードレビュー",
    current: "現在のソース",
    currentSub: "修正対象の行",
    proposed: "提案ソース",
    proposedSub: "提案された行",
    copy: "提案ソースをコピー",
    copied: "コピーしました",
    copyFailed: "コピーできませんでした — コードを直接選択してください",
    analysis: "分析の要約",
    rationale: "修正の根拠",
    priority: "優先度",
    lines: (from, to) => (from === to ? `元の ${from} 行` : `元の ${from}–${to} 行`),
    related: "関連する指摘",
    severity: { CRITICAL: "致命的", HIGH: "高", MEDIUM: "中", LOW: "低" },
    lede: "要約",
    object: "オブジェクト",
    type: "種類",
    focus: "観点",
    score: "品質スコア",
    findingsCount: "指摘",
    changesCount: "修正提案",
    date: "作成日",
    topFix: "最も効果の大きい修正",
    changesH: "修正提案",
    findingsH: "すべての指摘",
    nextH: "続けて聞けること",
    noChanges: "コードの修正提案はありません。",
    unverified: "元の行がソースに見つからないため、比較表示なしで提案コードのみを表示します。",
    disclaimer:
      "提案コードは SAP で構文チェック、実行、性能測定を行っていません。適用前に対象システムで確認してください。",
    cols: ["#", "重大度", "場所", "ルール", "内容", "対応"],
    all: "すべて",
    theme: "テーマ",
    light: "ライトテーマ",
    dark: "ダークテーマ",
  },
};

const langOf = (data: ReviewData): Lang =>
  /^ko|korean/i.test(data.language ?? "") ? "ko" : /^ja|japanese/i.test(data.language ?? "") ? "ja" : "en";

const esc = (text: unknown): string =>
  String(text ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const sevKey = (severity: string | undefined): string => {
  const upper = (severity ?? "").toUpperCase();
  return (SEVERITIES as readonly string[]).includes(upper) ? upper : "LOW";
};

const lines = (text: string): string[] => (text === "" ? [] : text.replace(/\r\n?/g, "\n").split("\n"));

/** One line as compared for the diff: blanks and case do not count (ABAP). */
const same = (a: string, b: string): boolean =>
  a.replace(/\s+/g, " ").trim().toLowerCase() === b.replace(/\s+/g, " ").trim().toLowerCase();

type Op = { kind: "eq" | "del" | "add"; a?: string; b?: string };

/** The block's lines aligned: equal lines kept, the rest as removed and added. */
function diff(a: string[], b: string[]): Op[] {
  const m = a.length;
  const n = b.length;
  const table: number[][] = Array.from({ length: m + 1 }, () => new Array<number>(n + 1).fill(0));
  for (let i = m - 1; i >= 0; i -= 1) {
    for (let j = n - 1; j >= 0; j -= 1) {
      table[i]![j] = same(a[i]!, b[j]!) ? table[i + 1]![j + 1]! + 1 : Math.max(table[i + 1]![j]!, table[i]![j + 1]!);
    }
  }
  const ops: Op[] = [];
  let i = 0;
  let j = 0;
  while (i < m && j < n) {
    if (same(a[i]!, b[j]!)) ops.push({ kind: "eq", a: a[i++], b: b[j++] });
    else if (table[i + 1]![j]! >= table[i]![j + 1]!) ops.push({ kind: "del", a: a[i++] });
    else ops.push({ kind: "add", b: b[j++] });
  }
  while (i < m) ops.push({ kind: "del", a: a[i++] });
  while (j < n) ops.push({ kind: "add", b: b[j++] });
  return ops;
}

type Cell = { n: number | null; text: string; kind: "ctx" | "blk" | "del" | "add" | "pad" };
type Row = { left: Cell; right: Cell };

/**
 * The two panes as rows of equal count, so they line up and scroll as one:
 * the context, then the block with removed and added lines paired up and
 * blank rows where one side has more, then the context after it with the
 * right side's numbers moved by what the change added or took away.
 */
function rowsOf(change: ReviewChange): Row[] {
  const context = change.context!;
  const start = change.start!;
  const end = change.end!;
  const before = context.lines.slice(0, start - context.from);
  const after = context.lines.slice(end - context.from + 1);
  const shift = lines(change.proposed).length - (end - start + 1);
  const rows: Row[] = [];
  before.forEach((text, k) => {
    const n = context.from + k;
    rows.push({ left: { n, text, kind: "ctx" }, right: { n, text, kind: "ctx" } });
  });
  let left = start;
  let right = start;
  const ops = diff(lines(change.original), lines(change.proposed));
  for (let k = 0; k < ops.length; ) {
    const op = ops[k]!;
    if (op.kind === "eq") {
      rows.push({
        left: { n: left++, text: op.a!, kind: "blk" },
        right: { n: right++, text: op.b!, kind: "blk" },
      });
      k += 1;
      continue;
    }
    // A run of removed and added lines, paired side by side.
    const dels: string[] = [];
    const adds: string[] = [];
    while (k < ops.length && ops[k]!.kind !== "eq") {
      const run = ops[k]!;
      if (run.kind === "del") dels.push(run.a!);
      else adds.push(run.b!);
      k += 1;
    }
    for (let r = 0; r < Math.max(dels.length, adds.length); r += 1) {
      rows.push({
        left: r < dels.length ? { n: left++, text: dels[r]!, kind: "del" } : { n: null, text: "", kind: "pad" },
        right: r < adds.length ? { n: right++, text: adds[r]!, kind: "add" } : { n: null, text: "", kind: "pad" },
      });
    }
  }
  after.forEach((text, k) => {
    const n = end + 1 + k;
    rows.push({ left: { n, text, kind: "ctx" }, right: { n: n + shift, text, kind: "ctx" } });
  });
  return rows;
}

const KEYWORDS = [
  "select-options", "field-symbols", "field-symbol", "start-of-selection", "end-of-selection", "at", "selection-screen",
  "select", "single", "from", "into", "where", "and", "or", "not", "loop", "endloop", "if", "endif", "else", "elseif",
  "case", "when", "endcase", "do", "enddo", "while", "endwhile", "data", "types", "type", "table", "tables", "of", "ref", "to",
  "begin", "end", "form", "endform", "perform", "using", "changing", "method", "endmethod", "methods", "class", "endclass",
  "implementation", "definition", "public", "private", "protected", "section", "call", "function", "exporting",
  "importing", "receiving", "exceptions", "raising", "try", "catch", "endtry", "cleanup", "clear", "refresh", "free",
  "append", "insert", "modify", "delete", "update", "read", "sort", "collect", "move", "value", "new", "corresponding",
  "fields", "up", "rows", "for", "all", "entries", "in", "is", "initial", "bound", "assigned", "join", "inner", "left",
  "outer", "on", "group", "by", "order", "having", "distinct", "exit", "continue", "check", "return", "message", "raise",
  "constants", "parameters", "assign", "unassign", "with", "key", "binary", "search", "index", "transporting", "line",
  "lines", "open", "close", "fetch", "next", "cursor", "package", "size", "commit", "work", "rollback", "authority-check",
  "object", "id", "field", "include", "report", "program", "statics", "describe", "concatenate", "split", "condense",
  "translate", "replace", "find", "write", "format", "convert", "date", "time", "stamp", "zone", "like", "occurs",
  "default", "obligatory", "range", "ranges", "between", "as", "ascending", "descending", "up", "appending", "sy-subrc",
];
const KEYWORD = new RegExp(`(?<![\\w-])(${[...new Set(KEYWORDS)].sort((a, b) => b.length - a.length).map((k) => k.replace(/-/g, "\\-")).join("|")})(?![\\w-])`, "gi");

/** One ABAP line, escaped, with its keywords, literals and comment marked. */
function highlight(line: string): string {
  if (line.startsWith("*")) return `<span class="c">${esc(line)}</span>`;
  let out = "";
  let code = "";
  const flush = (): void => {
    out += esc(code).replace(KEYWORD, '<span class="k">$1</span>');
    code = "";
  };
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i]!;
    if (ch === '"') {
      flush();
      out += `<span class="c">${esc(line.slice(i))}</span>`;
      return out;
    }
    if (ch === "'" || ch === "`" || ch === "|") {
      const close = line.indexOf(ch, i + 1);
      const stop = close < 0 ? line.length : close + 1;
      flush();
      out += `<span class="s">${esc(line.slice(i, stop))}</span>`;
      i = stop - 1;
      continue;
    }
    code += ch;
  }
  flush();
  return out;
}

/**
 * How wide a line is in monospace columns: Hangul, kana and CJK take about
 * two (a little over, to be safe — the panes' widths must not fall short).
 */
const columns = (text: string): number => {
  let width = 0;
  for (const ch of text) width += /[\u1100-\u115f\u2e80-\ua4cf\uac00-\ud7a3\uf900-\ufaff\ufe30-\ufe4f\uff00-\uff60\uffe0-\uffe6]/.test(ch) ? 2.2 : 1;
  return Math.ceil(width);
};

/** The widest line of either pane, so both are as wide and scroll alike. */
const widest = (rows: Row[]): number =>
  rows.reduce((most, row) => Math.max(most, columns(row.left.text), columns(row.right.text)), 0);

function pane(rows: Row[], side: "left" | "right", id: string, cols: number): string {
  const body = rows
    .map((row) => {
      const cell = row[side];
      return `<div class="ln-row ${cell.kind}"><span class="ln">${cell.n ?? ""}</span><span class="tx">${cell.kind === "pad" ? "" : highlight(cell.text) || " "}</span></div>`;
    })
    .join("");
  return `<div class="code-wrap"><div class="code" data-sync="${id}"><div class="code-in" style="--cols:${cols}">${body}</div></div></div>`;
}

function changeHtml(change: ReviewChange, index: number, t: (typeof TEXT)[Lang]): string {
  const id = `chg-${index + 1}`;
  const sev = sevKey(change.severity);
  const where = [
    change.object ? `<code>${esc(change.object)}</code>` : "",
    change.verified && change.start && change.end ? esc(t.lines(change.start, change.end)) : "",
    change.findings?.length ? `${esc(t.related)} ${change.findings.map((f) => `#${esc(f)}`).join(", ")}` : "",
  ].filter(Boolean);
  const head = `<div class="chg-head"><h3 id="${id}"><span class="chg-no">${index + 1}</span>${esc(change.title)}</h3><span class="sev sev-${sev.toLowerCase()}">${esc(t.severity[sev])}</span></div>`;
  const copySource = `<textarea class="copy-src" id="${id}-src" hidden>${esc(change.proposed)}</textarea>`;
  const copyButton = `<button type="button" class="copy" data-for="${id}-src" title="${esc(t.copy)}" aria-label="${esc(t.copy)}" data-label="${esc(t.copy)}" data-done="${esc(t.copied)}" data-failed="${esc(t.copyFailed)}"><svg class="i-copy" viewBox="0 0 24 24" aria-hidden="true"><rect x="8.5" y="8.5" width="11" height="11" rx="2.2"/><path d="M15.5 8.5V6.7a2.2 2.2 0 0 0-2.2-2.2H6.7a2.2 2.2 0 0 0-2.2 2.2v6.6a2.2 2.2 0 0 0 2.2 2.2h1.8"/></svg><svg class="i-done" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg></button>`;
  let code: string;
  if (change.verified && change.context && change.start && change.end) {
    const rows = rowsOf(change);
    code = `<div class="compare">
<div class="pane"><div class="pane-head"><b>${esc(t.current)}</b><span>${esc(t.currentSub)}</span></div>${pane(rows, "left", id, widest(rows))}</div>
<div class="pane"><div class="pane-head"><b>${esc(t.proposed)}</b><span>${esc(t.proposedSub)}</span>${copyButton}</div>${pane(rows, "right", id, widest(rows))}</div>
</div>`;
  } else {
    const rows: Row[] = lines(change.proposed).map((text) => ({
      left: { n: null, text: "", kind: "pad" },
      right: { n: null, text, kind: "add" },
    }));
    code = `<p class="note">${esc(t.unverified)}</p>
<div class="compare single"><div class="pane"><div class="pane-head"><b>${esc(t.proposed)}</b><span>${esc(t.proposedSub)}</span>${copyButton}</div>${pane(rows, "right", id, widest(rows))}</div></div>`;
  }
  const analysis = change.analysis ? `<h4 class="label">${esc(t.analysis)}</h4><p>${esc(change.analysis)}</p>` : "";
  const rationale = change.rationale
    ? `<h4 class="label">${esc(t.rationale)}</h4><div class="reason"><b>${esc(change.title)}</b><span class="reason-meta">${[
        `${esc(t.priority)} ${esc(t.severity[sev])}`,
        change.verified && change.start && change.end ? esc(t.lines(change.start, change.end)) : "",
      ]
        .filter(Boolean)
        .join(" · ")}</span><p>${esc(change.rationale)}</p></div>`
    : "";
  return `<article class="chg">${head}${where.length ? `<p class="chg-where">${where.join(" · ")}</p>` : ""}${code}${copySource}${analysis}${rationale}</article>`;
}

const counts = (findings: ReviewFinding[]): Record<string, number> => {
  const by: Record<string, number> = { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0 };
  for (const finding of findings) by[sevKey(finding.severity)]! += 1;
  return by;
};

export function reviewHtml(data: ReviewData): string {
  const lang = langOf(data);
  const t = TEXT[lang];
  const findings = data.findings ?? [];
  const changes = data.changes ?? [];
  const by = counts(findings);
  const title = data.title || `${data.object} — ${t.review}`;
  const date = (data.generated ?? new Date().toISOString()).slice(0, 10);
  const facts: [string, string][] = [
    [t.object, `<code>${esc(data.object)}</code>`],
    ...(data.type ? ([[t.type, esc(data.type)]] as [string, string][]) : []),
    [t.focus, esc(!data.focus || data.focus === "All" ? t.all : data.focus)],
    ...(typeof data.score === "number" ? ([[t.score, `${esc(data.score)}<small>/10</small>`]] as [string, string][]) : []),
    [
      t.findingsCount,
      SEVERITIES.filter((s) => by[s]! > 0)
        .map((s) => `<span class="sev sev-${s.toLowerCase()}">${esc(t.severity[s])} ${by[s]}</span>`)
        .join(" ") || "0",
    ],
    [t.changesCount, String(changes.length)],
    [t.date, esc(date)],
  ];
  const findingRows = findings
    .map(
      (f) =>
        `<tr><td class="num">${esc(f.id)}</td><td><span class="sev sev-${sevKey(f.severity).toLowerCase()}">${esc(t.severity[sevKey(f.severity)])}</span></td><td class="loc">${esc(f.location)}</td><td>${esc(f.rule)}</td><td>${esc(f.finding)}</td><td>${esc(f.fix)}</td></tr>`,
    )
    .join("");
  return `<!doctype html>
<html lang="${lang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
${TYPE_LINK}
${STYLE}
</head>
<body>
<div class="theme" role="group" aria-label="${esc(t.theme)}">
<button type="button" data-set-theme="light" title="${esc(t.light)}" aria-label="${esc(t.light)}"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4.2"/><path d="M12 2.5v2.2M12 19.3v2.2M2.5 12h2.2M19.3 12h2.2M5.3 5.3l1.6 1.6M17.1 17.1l1.6 1.6M5.3 18.7l1.6-1.6M17.1 6.9l1.6-1.6"/></svg></button>
<button type="button" data-set-theme="dark" title="${esc(t.dark)}" aria-label="${esc(t.dark)}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 14.6A8.2 8.2 0 0 1 9.4 4a8.2 8.2 0 1 0 10.6 10.6z"/></svg></button>
</div>
<main>
<header class="hero">
<p class="kicker">${esc(t.review)}</p>
<h1>${esc(title)}</h1>
${data.summary ? `<div class="lede"><span class="lede-label">${esc(t.lede)}</span><p>${esc(data.summary)}</p></div>` : ""}
<dl class="facts">${facts.map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${v}</dd></div>`).join("")}</dl>
${data.topFix ? `<div class="top"><span class="lede-label">${esc(t.topFix)}</span><p>${esc(data.topFix)}</p></div>` : ""}
</header>
<section>
<h2>${esc(t.changesH)}</h2>
${changes.length ? changes.map((change, index) => changeHtml(change, index, t)).join("\n") : `<p class="muted">${esc(t.noChanges)}</p>`}
<p class="disclaimer">${esc(t.disclaimer)}</p>
</section>
${
  findings.length
    ? `<section><h2>${esc(t.findingsH)}</h2><div class="table-wrap"><table><thead><tr>${t.cols.map((c) => `<th>${esc(c)}</th>`).join("")}</tr></thead><tbody>${findingRows}</tbody></table></div></section>`
    : ""
}
${data.next?.length ? `<section><h2>${esc(t.nextH)}</h2><ol>${data.next.map((n) => `<li>${esc(n)}</li>`).join("")}</ol></section>` : ""}
</main>
${SCRIPT}
</body>
</html>`;
}

/** A Markdown table cell: one line, no pipes breaking the row. */
const cell = (text: unknown): string =>
  String(text ?? "").replace(/\r?\n/g, " ").replace(/\|/g, "\\|").trim() || "—";

export function reviewMarkdown(data: ReviewData): string {
  const t = TEXT[langOf(data)];
  const findings = data.findings ?? [];
  const changes = data.changes ?? [];
  const by = counts(findings);
  const out: string[] = [];
  out.push(`# ${data.title || `${data.object} — ${t.review}`}`, "");
  if (data.summary) out.push(data.summary, "");
  const facts = [
    `**${t.object}** \`${data.object}\``,
    `**${t.focus}** ${!data.focus || data.focus === "All" ? t.all : data.focus}`,
    ...(typeof data.score === "number" ? [`**${t.score}** ${data.score}/10`] : []),
    `**${t.findingsCount}** ${SEVERITIES.filter((s) => by[s]! > 0).map((s) => `${t.severity[s]} ${by[s]}`).join(", ") || "0"}`,
  ];
  out.push(facts.join(" · "), "");
  if (data.topFix) out.push(`> **${t.topFix}** — ${data.topFix}`, "");

  out.push(`## ${t.changesH}`, "");
  if (changes.length === 0) out.push(t.noChanges, "");
  changes.forEach((change, index) => {
    const sev = sevKey(change.severity);
    out.push(`### ${index + 1}. ${change.title}`, "");
    const meta = [
      `\`${t.severity[sev]}\``,
      change.object ? `\`${change.object}\`` : "",
      change.verified && change.start && change.end ? t.lines(change.start, change.end) : "",
      change.findings?.length ? `${t.related} ${change.findings.map((f) => `#${f}`).join(", ")}` : "",
    ].filter(Boolean);
    out.push(meta.join(" · "), "");
    if (change.verified && change.context && change.start && change.end) {
      // The change as a diff, with three lines either side of it.
      const rows = rowsOf(change);
      const first = rows.findIndex((row) => row.left.kind !== "ctx");
      let last = rows.length - 1;
      while (last > 0 && rows[last]!.left.kind === "ctx") last -= 1;
      const shown = rows.slice(Math.max(0, first - 3), Math.min(rows.length, last + 4));
      const diffLines: string[] = [];
      for (const row of shown) {
        if (row.left.kind === "ctx" || row.left.kind === "blk") diffLines.push(`  ${row.left.text}`);
        else {
          if (row.left.kind === "del") diffLines.push(`- ${row.left.text}`);
          if (row.right.kind === "add") diffLines.push(`+ ${row.right.text}`);
        }
      }
      // Removed lines before added ones within each run, as a diff reads.
      out.push("```diff", ...regroup(diffLines), "```", "");
    } else {
      out.push(`_${t.unverified}_`, "", "```abap", change.proposed, "```", "");
    }
    if (change.analysis) out.push(`**${t.analysis}** — ${change.analysis}`, "");
    if (change.rationale) out.push(`**${t.rationale}** — ${change.rationale}`, "");
  });
  out.push(`_${t.disclaimer}_`, "");

  if (findings.length) {
    out.push(`## ${t.findingsH}`, "", `| ${t.cols.join(" | ")} |`, `|${t.cols.map(() => "---").join("|")}|`);
    for (const f of findings) {
      out.push(
        `| ${cell(f.id)} | ${cell(t.severity[sevKey(f.severity)])} | ${cell(f.location)} | ${cell(f.rule)} | ${cell(f.finding)} | ${cell(f.fix)} |`,
      );
    }
    out.push("");
  }
  if (data.next?.length) {
    out.push(`## ${t.nextH}`, "", ...data.next.map((n, i) => `${i + 1}. ${n}`), "");
  }
  return out.join("\n");
}

/** `- a`, `+ b`, `- c`, `+ d` → `- a`, `- c`, `+ b`, `+ d`: each changed run's removals first. */
function regroup(diffLines: string[]): string[] {
  const out: string[] = [];
  let dels: string[] = [];
  let adds: string[] = [];
  const flush = (): void => {
    out.push(...dels, ...adds);
    dels = [];
    adds = [];
  };
  for (const line of diffLines) {
    if (line.startsWith("- ")) dels.push(line);
    else if (line.startsWith("+ ")) adds.push(line);
    else {
      flush();
      out.push(line);
    }
  }
  flush();
  return out;
}

const CODE_LIGHT =
  "--code-bg:#ffffff;--code-head:#f7f7f7;--ln:#a3a3a3;--blk-bg:#fff8f7;--blk-bg-r:#f4fbf6;--del-bg:#ffebe9;--del-line:#cf222e;--add-bg:#dafbe1;--add-line:#1a7f37;--pad-bg:#f6f6f6;--sb:#d0d0d0;--sb-hover:#a8a8a8;--k:#0550ae;--s:#0a3069;--c:#6e7781;--label:#1a7f37;" +
  "--sev-critical:#b42318;--sev-critical-bg:#fef3f2;--sev-high:#b54708;--sev-high-bg:#fffaeb;--sev-medium:#175cd3;--sev-medium-bg:#eff8ff;--sev-low:#525252;--sev-low-bg:#f5f5f5";
const CODE_DARK =
  "--code-bg:#111111;--code-head:#1a1a1a;--ln:#5f5f5f;--blk-bg:#241719;--blk-bg-r:#14221a;--del-bg:#3d1d1f;--del-line:#f85149;--add-bg:#173a25;--add-line:#3fb950;--pad-bg:#171717;--sb:#c8c8c8;--sb-hover:#ffffff;--k:#79c0ff;--s:#a5d6ff;--c:#8b949e;--label:#47cd89;" +
  "--sev-critical:#f97066;--sev-critical-bg:#2a1715;--sev-high:#fdb022;--sev-high-bg:#2a1f0d;--sev-medium:#84caff;--sev-medium-bg:#102037;--sev-low:#bdbdbd;--sev-low-bg:#222222";

const STYLE = `<style>
:root{${LIGHT};${CODE_LIGHT}}
@media (prefers-color-scheme: dark){:root:not([data-theme=light]){${DARK};${CODE_DARK}}}
:root[data-theme=dark]{${DARK};${CODE_DARK}}
*{box-sizing:border-box}
html{background:var(--bg)}
body{margin:0;background:var(--bg);color:var(--fg);font:15px/1.72 "Pretendard Variable",Pretendard,-apple-system,BlinkMacSystemFont,"Apple SD Gothic Neo","Segoe UI","Noto Sans KR","Malgun Gothic",sans-serif;letter-spacing:-0.03rem;-webkit-font-smoothing:antialiased}
main{max-width:1240px;margin:0 auto;padding:8px 32px 96px}
code,.code,.loc{letter-spacing:normal}
code{font:500 0.9em/1.4 ui-monospace,"Cascadia Mono",Consolas,monospace;background:var(--code);border:1px solid var(--line);border-radius:5px;padding:1px 5px}
h1,h2,h3,h4{letter-spacing:-0.02em;color:var(--fg)}
h1{font-size:30px;line-height:1.25;font-weight:700;margin:6px 0 18px}
h2{font-size:21px;line-height:1.35;font-weight:700;margin:56px 0 18px}
p{margin:0 0 14px;line-height:1.85}
.muted,.chg-where{color:var(--muted)}
.kicker{margin:40px 0 0;font-size:12.5px;font-weight:600;color:var(--faint)}
.lede{margin:0 0 24px;max-width:56em}
.lede-label{display:block;font-size:11.5px;font-weight:500;color:var(--faint);line-height:1.4;margin:0 0 4px}
.lede p{font-size:17px;line-height:1.7;margin:0}
.facts{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:16px 28px;margin:0 0 20px;padding:18px 22px;background:var(--head);border:1px solid var(--line);border-radius:12px}
.facts>div{min-width:0}
.facts dt{font-size:11.5px;font-weight:500;color:var(--faint);line-height:1.4;margin:0 0 4px}
.facts dd{margin:0;font-size:14px;font-weight:500;line-height:1.6;color:var(--fg)}
.facts dd small{color:var(--muted);font-weight:400}
.facts .sev{margin:0 4px 4px 0}
.top{padding:14px 18px;border:1px solid var(--line);background:var(--head);border-radius:10px;margin:0 0 8px}
.top .lede-label{color:var(--label);font-weight:600}
.top p{margin:0;font-size:15px}
.sev{display:inline-block;padding:0 8px;border-radius:999px;font-size:12px;font-weight:600;line-height:1.75;white-space:nowrap}
.sev-critical{color:var(--sev-critical);background:var(--sev-critical-bg)}
.sev-high{color:var(--sev-high);background:var(--sev-high-bg)}
.sev-medium{color:var(--sev-medium);background:var(--sev-medium-bg)}
.sev-low{color:var(--sev-low);background:var(--sev-low-bg)}

/* One proposed change */
.chg{margin:0 0 56px}
.chg-head{display:flex;align-items:center;gap:12px;flex-wrap:wrap;margin:0 0 4px}
.chg-head h3{font-size:17px;font-weight:650;margin:0;display:flex;align-items:center;gap:10px}
.chg-no{display:inline-grid;place-items:center;width:24px;height:24px;border-radius:7px;background:var(--fg);color:var(--bg);font-size:12.5px;font-weight:700}
.chg-where{font-size:13px;margin:0 0 14px}
.note{font-size:13.5px;color:var(--sev-high);margin:0 0 10px}
.compare{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:16px;margin:0 0 22px}
.compare.single{grid-template-columns:minmax(0,1fr)}
.pane{border:1px solid var(--line-strong);border-radius:10px;overflow:hidden;background:var(--code-bg);min-width:0}
.pane-head{display:flex;align-items:center;gap:8px;height:42px;padding:0 7px 0 14px;background:var(--code-head);border-bottom:1px solid var(--line)}
.pane-head b,.pane-head span{line-height:20px;white-space:nowrap}
.pane-head b{font-size:14px;font-weight:700}
.pane-head span{font-size:12px;color:var(--faint);padding-top:1px}
.copy{margin-left:auto;display:grid;place-items:center;width:28px;height:28px;padding:0;border:0;border-radius:7px;background:none;color:var(--muted);cursor:pointer;transition:background .15s,color .15s}
.copy:hover{background:var(--line);color:var(--fg)}
.copy svg{width:16px;height:16px;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}
.copy .i-done,.copy.done .i-copy{display:none}
.copy.done .i-done{display:block}
.copy.done{color:var(--add-line)}
.copy.failed{color:var(--del-line)}
.code{max-height:420px;overflow:auto;padding:6px 0;font:13px/22px ui-monospace,"Cascadia Mono",Consolas,"D2Coding",monospace}
/* Both panes of a change as wide as its widest line, so they scroll sideways
   alike and end at the same bottom. */
.code-in{width:max(100%,calc(var(--cols,0) * 1ch + 96px))}
/* A row is one line high even when empty: a padding row that collapsed put
   the two panes out of line. */
.ln-row{display:flex;min-width:max-content;min-height:22px;border-left:3px solid transparent}
.ln{flex:none;width:56px;padding:0 14px 0 0;text-align:right;color:var(--ln);user-select:none;font-variant-numeric:tabular-nums}
.tx{white-space:pre;padding-right:12px}
.ln-row.blk{background:var(--blk-bg)}
.pane:last-child .ln-row.blk,.compare.single .ln-row.blk{background:var(--blk-bg-r)}
.ln-row.del{background:var(--del-bg);border-left-color:var(--del-line)}
.ln-row.add{background:var(--add-bg);border-left-color:var(--add-line)}
.ln-row.pad{background:repeating-linear-gradient(-45deg,var(--pad-bg) 0 6px,transparent 6px 12px)}
.k{color:var(--k);font-weight:500}
.s{color:var(--s)}
.c{color:var(--c);font-style:italic}
/* Scrollbars: thin, rounded, in the page's colours, not the system's grey
   slabs with arrows. WebKit's own rules where it has them (Chromium ignores
   them once scrollbar-color is set), the standard properties elsewhere. */
::-webkit-scrollbar{width:10px;height:10px}
::-webkit-scrollbar-track,::-webkit-scrollbar-corner{background:transparent}
::-webkit-scrollbar-thumb{background:var(--sb);border-radius:999px;border:3px solid transparent;background-clip:padding-box}
::-webkit-scrollbar-thumb:hover{background:var(--sb-hover);background-clip:padding-box}
::-webkit-scrollbar-button{display:none;width:0;height:0}
@supports not selector(::-webkit-scrollbar){*{scrollbar-width:thin;scrollbar-color:var(--sb) transparent}}

/* Theme switch, top right */
.theme{position:fixed;top:12px;right:14px;z-index:5;display:flex;gap:1px;padding:2px;border:1px solid var(--line);border-radius:999px;background:color-mix(in srgb,var(--bg) 88%,transparent);backdrop-filter:blur(8px)}
.theme button{display:grid;place-items:center;width:24px;height:24px;border:0;border-radius:999px;background:none;color:var(--muted);cursor:pointer;transition:background .15s,color .15s}
.theme button:hover{color:var(--fg)}
.theme button[aria-pressed=true]{background:var(--fg);color:var(--bg)}
.theme svg{width:13px;height:13px;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}
.theme button[data-set-theme=dark] svg{fill:currentColor;stroke:none}
@media (prefers-reduced-motion:reduce){.theme button,.copy{transition:none}}

h4.label{font-size:14.5px;font-weight:700;color:var(--label);margin:20px 0 8px}
.reason{border:1px solid var(--line);border-radius:10px;padding:16px 18px;background:var(--head)}
.reason b{display:block;font-size:15px;margin:0 0 2px}
.reason-meta{display:block;font-size:12.5px;color:var(--faint);margin:0 0 10px}
.reason p{margin:0}
.disclaimer{font-size:13px;color:var(--muted);border-top:1px solid var(--line);padding-top:14px}

/* Findings */
.table-wrap{border:1px solid var(--line);border-radius:10px;overflow:auto}
table{border-collapse:collapse;width:100%}
th,td{border-bottom:1px solid var(--line);padding:10px 14px;line-height:1.55;text-align:left;vertical-align:top}
tbody tr:last-child td{border-bottom:0}
th{background:var(--head);font-size:12.5px;font-weight:600;color:var(--muted);white-space:nowrap}
td{font-size:14px}
td.num{text-align:right;font-variant-numeric:tabular-nums;color:var(--muted)}
td.loc{font:500 12.5px/1.55 ui-monospace,"Cascadia Mono",Consolas,monospace}
ol{padding-left:1.35em}
li{margin:0 0 8px;line-height:1.75}

@media (max-width:900px){
  main{padding:8px 16px 72px}
  .compare{grid-template-columns:minmax(0,1fr)}
  .code{max-height:360px}
  table{min-width:640px}
}
@media print{
  .code{max-height:none;overflow:visible}
  .copy,.theme{display:none}
  .compare{grid-template-columns:minmax(0,1fr)}
}
</style>`;

// Plain ES2017. Panes of one change scroll together; each opens on its
// change; the copy button copies the proposed lines.
const SCRIPT = `<script>
(function () {
  // Theme: light or dark, chosen here. Remembered where the page may keep
  // it (a saved file); in the app's preview the app's theme is sent in, and
  // a choice here holds until the app's theme changes.
  var root = document.documentElement;
  var KEY = 'sc4sap.review.theme';
  try {
    var kept = localStorage.getItem(KEY);
    if (kept === 'light' || kept === 'dark') root.setAttribute('data-theme', kept);
  } catch (e) {}
  var dark = window.matchMedia ? matchMedia('(prefers-color-scheme: dark)') : null;
  var current = function () {
    var set = root.getAttribute('data-theme');
    return set === 'light' || set === 'dark' ? set : dark && dark.matches ? 'dark' : 'light';
  };
  var switches = document.querySelectorAll('[data-set-theme]');
  var mark = function () {
    var now = current();
    Array.prototype.forEach.call(switches, function (button) {
      button.setAttribute('aria-pressed', String(button.getAttribute('data-set-theme') === now));
    });
  };
  Array.prototype.forEach.call(switches, function (button) {
    button.addEventListener('click', function () {
      var theme = button.getAttribute('data-set-theme');
      root.setAttribute('data-theme', theme);
      try { localStorage.setItem(KEY, theme); } catch (e) {}
    });
  });
  new MutationObserver(mark).observe(root, { attributes: true, attributeFilter: ['data-theme'] });
  if (dark && dark.addEventListener) dark.addEventListener('change', mark);
  mark();

  var groups = {};
  Array.prototype.forEach.call(document.querySelectorAll('.code[data-sync]'), function (box) {
    var key = box.getAttribute('data-sync');
    (groups[key] = groups[key] || []).push(box);
  });
  Object.keys(groups).forEach(function (key) {
    var boxes = groups[key];
    var busy = false;
    boxes.forEach(function (box) {
      box.addEventListener('scroll', function () {
        if (busy) return;
        busy = true;
        boxes.forEach(function (other) {
          if (other !== box) { other.scrollTop = box.scrollTop; other.scrollLeft = box.scrollLeft; }
        });
        requestAnimationFrame(function () { busy = false; });
      }, { passive: true });
    });
    // Open on the change, centred where it fits.
    var box = boxes[0];
    var first = box.querySelector('.ln-row.del, .ln-row.add, .ln-row.blk');
    if (!first) return;
    var rows = box.querySelectorAll('.ln-row.del, .ln-row.add, .ln-row.blk');
    var last = rows[rows.length - 1];
    var height = last.offsetTop + last.offsetHeight - first.offsetTop;
    var top = Math.max(0, first.offsetTop - Math.max(24, (box.clientHeight - height) / 2));
    boxes.forEach(function (other) { other.scrollTop = top; });
  });

  function fallback(text) {
    var area = document.createElement('textarea');
    area.value = text;
    area.setAttribute('readonly', '');
    area.style.position = 'fixed';
    area.style.opacity = '0';
    document.body.appendChild(area);
    area.select();
    var ok = false;
    try { ok = document.execCommand('copy'); } catch (e) {}
    area.remove();
    return ok;
  }
  document.addEventListener('click', function (event) {
    var button = event.target instanceof Element ? event.target.closest('button.copy') : null;
    if (!button) return;
    var source = document.getElementById(button.getAttribute('data-for'));
    if (!source) return;
    var text = source.value;
    var label = button.getAttribute('data-label');
    var show = function (ok) {
      var said = ok ? button.getAttribute('data-done') : button.getAttribute('data-failed');
      button.setAttribute('title', said);
      button.setAttribute('aria-label', said);
      button.classList.toggle('done', ok);
      button.classList.toggle('failed', !ok);
      setTimeout(function () {
        button.setAttribute('title', label);
        button.setAttribute('aria-label', label);
        button.classList.remove('done', 'failed');
      }, 1800);
    };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () { show(true); }, function () { show(fallback(text)); });
    } else {
      show(fallback(text));
    }
  });
})();
</script>`;
