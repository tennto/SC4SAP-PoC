// Program → Spec's Excel file, built from one small slot file.
//
//   node build-xlsx.mjs <sheet.json> <image-spec.json|-> <out.xlsx>
//
// The plugin's own route (`build-spec.mjs`) translates the template string by
// string: the agent writes a TR map whose keys are the template's 202 English
// shared strings. Measured on 2026-10-02 (ZMMR00020, Economy, Excel only) that
// map was most of the run — 356 s, of which about 255 s went to discovering
// the 202 keys, deliberating over them and writing them out, at 33k output
// tokens. It also cannot say what the file needs: shared strings are shared,
// so `VBELN`, `R`, `—` and the numbers 1–12 each sit in several cells, and
// remapping one remaps all of them — a key field changed on the data-model
// sheet renames the first ALV column too.
//
// Here the agent writes only what is particular to the program, one value per
// slot (`sheet.json`, shape below), and this script does the rest:
//
//   1. clones the template with the plugin's `cloneTemplate`, translating the
//      fixed labels from the dictionaries below — the same strings in every
//      spec, so nobody should pay to translate them per run;
//   2. writes every slot into its own cell as an inline string, keeping the
//      cell's style, so no two slots can collide;
//   3. renders the selection screen, ALV and process flow with the plugin's
//      `renderScreenImages`, swaps them in with `swapImages`, and leaves the
//      PNGs in `_assets/` beside the file for the page to show.
//
// Unused slots get `—`; a list longer than its slots folds the rest into the
// last row. The template's geometry is never touched.
//
// sheet.json:
// {
//   "lang": "ko" | "en" | "ja",
//   "overview": { "objectName", "objectType", "shortDescription", "reportTitle",
//                 "package", "archetype", "purpose", "audience", "depth",
//                 "sapVersion", "industry", "includes", "localClasses",
//                 "dynpros", "calledTcodes", "note" },
//   "tables":     [ { "table", "access", "keys", "join", "notes" } ],          // 4 slots
//   "cds": "…", "bapis": "…", "badis": "…",                                   // one note each
//   "params":     [ { "name", "type", "required", "default", "description" } ], // 5 slots
//   "warnings":   [ "…" ],                                                     // 5 slots
//   "steps":      [ { "event", "step" } ],                                     // 12 slots
//   "columns":    [ { "field", "description", "length", "edit", "hidden", "note" } ], // 10 slots
//   "auth":       [ { "check", "object", "level", "implemented", "notes" } ],  // 4 slots
//   "exceptions": [ { "trigger", "mechanism", "message", "recovery" } ]        // 3 slots
// }

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const pluginRoot = resolve(process.env.SC4SAP_PLUGIN_PATH || join(here, '..', '..', 'plugin_module'));
const plugin = (path) => import(pathToFileURL(join(pluginRoot, 'scripts', path)).href);

const EMPTY = '—';

// ── Fixed labels ────────────────────────────────────────────────────────────
// Every template string that reads the same in every spec, by its English
// text. English output keeps the template's own wording.

const LABELS = {
  ko: {
    'Field': '항목', 'Value': '값', 'Object Name': '오브젝트명', 'Object Type': '오브젝트 유형',
    'Short Description': '내역', 'Report Title': '리포트 제목', 'Package': '패키지',
    'Archetype': '유형', 'Purpose': '목적', 'Audience': '대상 독자', 'Depth': '상세 수준',
    'Language': '언어', 'SAP Version': 'SAP 버전', 'Industry': '산업', 'Includes': 'Include',
    'Local Classes': '로컬 클래스', 'Dynpros / GUI Status': '화면 / GUI Status',
    'Called TCodes': '호출 T-Code', 'Generated At': '작성일', 'Note': '비고',
    'Data Model': '데이터 모델', 'Table': '테이블', 'Access': '접근', 'Key Fields': '키 필드',
    'Join Type': '조인 유형', 'Notes': '비고', 'CDS Views': 'CDS 뷰', 'BAPIs / RFCs': 'BAPI / RFC',
    'BAdIs / Enhancements': 'BAdI / Enhancement', 'Parameters': '선택 조건', 'Type': '유형',
    'Required': '필수', 'Default': '기본값', 'Description': '설명', 'Processing Logic': '처리 로직',
    'Event / FORM': '이벤트 / FORM', 'Step': '처리 내용', 'Process Flow Chart': '처리 흐름도',
    'Output': '출력', 'Order': '순서', 'Field Description': '필드 설명', 'Length': '길이',
    'Edit': '편집', 'Hidden': '숨김', 'Authorizations': '권한', 'Check': '점검 항목',
    'Auth Object': '권한 오브젝트', 'Level': '수준', 'Implemented?': '구현 여부',
    'Exceptions': '예외 처리', 'Trigger': '발생 조건', 'Mechanism': '처리 방식',
    'Message / Exception': '메시지 / 예외', 'Recovery': '복구 방법',
  },
  ja: {
    'Field': '項目', 'Value': '値', 'Object Name': 'オブジェクト名', 'Object Type': 'オブジェクトタイプ',
    'Short Description': '内容', 'Report Title': 'レポートタイトル', 'Package': 'パッケージ',
    'Archetype': '類型', 'Purpose': '目的', 'Audience': '対象読者', 'Depth': '詳細レベル',
    'Language': '言語', 'SAP Version': 'SAP バージョン', 'Industry': '業種', 'Includes': 'インクルード',
    'Local Classes': 'ローカルクラス', 'Dynpros / GUI Status': '画面 / GUI ステータス',
    'Called TCodes': '呼出 T-Code', 'Generated At': '作成日', 'Note': '備考',
    'Data Model': 'データモデル', 'Table': 'テーブル', 'Access': 'アクセス', 'Key Fields': 'キー項目',
    'Join Type': '結合タイプ', 'Notes': '備考', 'CDS Views': 'CDS ビュー', 'BAPIs / RFCs': 'BAPI / RFC',
    'BAdIs / Enhancements': 'BAdI / 拡張', 'Parameters': '選択条件', 'Type': 'タイプ',
    'Required': '必須', 'Default': '初期値', 'Description': '説明', 'Processing Logic': '処理ロジック',
    'Event / FORM': 'イベント / FORM', 'Step': '処理内容', 'Process Flow Chart': '処理フロー図',
    'Output': '出力', 'Order': '順序', 'Field Description': '項目説明', 'Length': '長さ',
    'Edit': '編集', 'Hidden': '非表示', 'Authorizations': '権限', 'Check': 'チェック項目',
    'Auth Object': '権限オブジェクト', 'Level': 'レベル', 'Implemented?': '実装有無',
    'Exceptions': '例外処理', 'Trigger': '発生条件', 'Mechanism': '処理方式',
    'Message / Exception': 'メッセージ / 例外', 'Recovery': '復旧方法',
  },
};

// Sheet tabs, in workbook order. At most 31 characters, none of []:*?/\.
const SHEETS = {
  en: ['Overview', 'Data Model', 'Inputs & Screens', 'Processing Logic', 'Output', 'Authorizations', 'Exceptions'],
  ko: ['프로그램 개요', '데이터 모델', '입력 및 화면', '처리 로직', '출력', '권한', '예외 처리'],
  ja: ['プログラム概要', 'データモデル', '入力と画面', '処理ロジック', '出力', '権限', '例外処理'],
};

const HEADINGS = {
  en: { overview: (p) => `Program Overview (${p})`, inputs: (p) => `Inputs & Screens · ${p}` },
  ko: { overview: (p) => `프로그램 개요 (${p})`, inputs: (p) => `입력 및 화면 · ${p}` },
  ja: { overview: (p) => `プログラム概要 (${p})`, inputs: (p) => `入力と画面 · ${p}` },
};

const LANGUAGE_NAME = { en: 'English', ko: '한국어', ja: '日本語' };

// ── Slots ───────────────────────────────────────────────────────────────────

/** Fits a list to `n` slots: pads with nulls, folds any surplus into the last. */
function fit(list, n, fold) {
  const items = Array.isArray(list) ? list.slice() : [];
  if (items.length > n) {
    const rest = items.splice(n - 1);
    items.push(fold(rest));
  }
  while (items.length < n) items.push(null);
  return items;
}

const text = (value) => (value === undefined || value === null || String(value).trim() === '' ? EMPTY : String(value));
const joinField = (rows, key) => rows.map((r) => r?.[key]).filter((v) => v != null && v !== '').join(' / ');

/** Every slot cell, as { sheet number: { cell: value } }. */
function slotCells(spec, lang) {
  const o = spec.overview ?? {};
  const program = o.objectName || 'PROGRAM';
  const cells = { 1: {}, 2: {}, 3: {}, 4: {}, 5: {}, 6: {}, 7: {} };

  // Sheet 1 — overview, C5:C22.
  cells[1].B2 = HEADINGS[lang].overview(program);
  const overview = [
    o.objectName, o.objectType, o.shortDescription, o.reportTitle, o.package, o.archetype,
    o.purpose, o.audience, o.depth, LANGUAGE_NAME[lang], o.sapVersion, o.industry,
    o.includes, o.localClasses, o.dynpros, o.calledTcodes,
    `${new Date().toISOString().slice(0, 10)} (SC4SAP /program-to-spec)`, o.note,
  ];
  overview.forEach((value, i) => { cells[1][`C${5 + i}`] = text(value); });

  // Sheet 2 — tables B5:F8, then the CDS / BAPI / BAdI notes in F10:F12.
  const tables = fit(spec.tables, 4, (rest) => ({
    table: joinField(rest, 'table'), access: joinField(rest, 'access'), keys: joinField(rest, 'keys'),
    join: joinField(rest, 'join'), notes: joinField(rest, 'notes'),
  }));
  tables.forEach((t, i) => {
    const row = 5 + i;
    cells[2][`B${row}`] = text(t?.table);
    cells[2][`C${row}`] = text(t?.access);
    cells[2][`D${row}`] = text(t?.keys);
    cells[2][`E${row}`] = text(t?.join);
    cells[2][`F${row}`] = text(t?.notes);
  });
  cells[2].F10 = text(spec.cds);
  cells[2].F11 = text(spec.bapis);
  cells[2].F12 = text(spec.badis);

  // Sheet 3 — heading, parameters C35:M39, warnings B42:B46.
  cells[3].B2 = HEADINGS[lang].inputs(program);
  const params = fit(spec.params, 5, (rest) => ({
    name: joinField(rest, 'name'), type: joinField(rest, 'type'), required: joinField(rest, 'required'),
    default: joinField(rest, 'default'), description: joinField(rest, 'description'),
  }));
  params.forEach((p, i) => {
    const row = 35 + i;
    cells[3][`C${row}`] = text(p?.name);
    cells[3][`F${row}`] = text(p?.type);
    cells[3][`H${row}`] = p ? String(p.required ?? '') : EMPTY;
    cells[3][`J${row}`] = p ? String(p.default ?? '') : EMPTY;
    cells[3][`M${row}`] = text(p?.description);
  });
  fit(spec.warnings, 5, (rest) => rest.join(' / ')).forEach((w, i) => {
    cells[3][`B${42 + i}`] = w == null ? EMPTY : (String(w).startsWith('⚠') ? String(w) : `⚠ ${w}`);
  });

  // Sheet 4 — steps C5:D16. The numbers in column B stay.
  fit(spec.steps, 12, (rest) => ({ event: joinField(rest, 'event'), step: joinField(rest, 'step') }))
    .forEach((s, i) => {
      cells[4][`C${5 + i}`] = text(s?.event);
      cells[4][`D${5 + i}`] = text(s?.step);
    });

  // Sheet 5 — ALV columns C5:H14. The order numbers in column B stay.
  fit(spec.columns, 10, (rest) => ({
    field: joinField(rest, 'field'), description: joinField(rest, 'description'), length: EMPTY,
    edit: EMPTY, hidden: EMPTY, note: joinField(rest, 'note'),
  })).forEach((c, i) => {
    const row = 5 + i;
    cells[5][`C${row}`] = text(c?.field);
    cells[5][`D${row}`] = text(c?.description);
    cells[5][`E${row}`] = text(c?.length);
    cells[5][`F${row}`] = text(c?.edit);
    cells[5][`G${row}`] = text(c?.hidden);
    cells[5][`H${row}`] = c ? String(c.note ?? '') : EMPTY;
  });

  // Sheet 6 — authorizations B5:F8.
  fit(spec.auth, 4, (rest) => ({
    check: joinField(rest, 'check'), object: joinField(rest, 'object'), level: joinField(rest, 'level'),
    implemented: joinField(rest, 'implemented'), notes: joinField(rest, 'notes'),
  })).forEach((a, i) => {
    const row = 5 + i;
    cells[6][`B${row}`] = text(a?.check);
    cells[6][`C${row}`] = text(a?.object);
    cells[6][`D${row}`] = text(a?.level);
    cells[6][`E${row}`] = text(a?.implemented);
    cells[6][`F${row}`] = text(a?.notes);
  });

  // Sheet 7 — exceptions B5:E7.
  fit(spec.exceptions, 3, (rest) => ({
    trigger: joinField(rest, 'trigger'), mechanism: joinField(rest, 'mechanism'),
    message: joinField(rest, 'message'), recovery: joinField(rest, 'recovery'),
  })).forEach((e, i) => {
    const row = 5 + i;
    cells[7][`B${row}`] = text(e?.trigger);
    cells[7][`C${row}`] = text(e?.mechanism);
    cells[7][`D${row}`] = text(e?.message);
    cells[7][`E${row}`] = text(e?.recovery);
  });

  return cells;
}

// ── XML ─────────────────────────────────────────────────────────────────────

const escapeXml = (s) => String(s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
  // Characters XML 1.0 cannot carry at all.
  .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '');

/** Writes each value into its cell as an inline string, keeping the cell's style. */
function writeCells(xml, values) {
  let out = xml;
  for (const [ref, value] of Object.entries(values)) {
    const cell = new RegExp(`<c r="${ref}"([^>]*?)(?:/>|>[\\s\\S]*?</c>)`);
    const match = out.match(cell);
    if (!match) throw new Error(`build-xlsx: template has no cell ${ref}`);
    const style = match[1].match(/\ss="\d+"/)?.[0] ?? '';
    const body = value === ''
      ? `<c r="${ref}"${style}/>`
      : `<c r="${ref}"${style} t="inlineStr"><is><t xml:space="preserve">${escapeXml(value)}</t></is></c>`;
    out = out.replace(cell, body);
  }
  return out;
}

function renameSheets(xml, names) {
  let i = 0;
  return xml.replace(/<sheet ([^>]*?)name="[^"]*"/g, (whole, before) => {
    const name = names[i++];
    return name ? `<sheet ${before}name="${escapeXml(name)}"` : whole;
  });
}

// ── Build ───────────────────────────────────────────────────────────────────

export async function buildXlsx({ sheetPath, imageSpecPath, outPath, verbose = true }) {
  const spec = JSON.parse(readFileSync(sheetPath, 'utf8'));
  const lang = ['ko', 'ja', 'en'].includes(spec.lang) ? spec.lang : 'en';

  const { cloneTemplate } = await plugin('spec/template-clone.mjs');
  const { unzipEntries, zipFiles } = await plugin('spec/xlsx-zip.mjs');
  cloneTemplate({ outPath, tr: LABELS[lang] ?? {}, verbose: false });

  const cells = slotCells(spec, lang);
  const entries = unzipEntries(readFileSync(outPath));
  for (const entry of entries) {
    const sheet = entry.name.match(/^xl\/worksheets\/sheet(\d)\.xml$/);
    if (sheet && cells[sheet[1]]) {
      entry.data = Buffer.from(writeCells(entry.data.toString('utf8'), cells[sheet[1]]), 'utf8');
    } else if (entry.name === 'xl/workbook.xml') {
      entry.data = Buffer.from(renameSheets(entry.data.toString('utf8'), SHEETS[lang]), 'utf8');
    }
  }
  writeFileSync(outPath, zipFiles(entries));

  let images = 'none';
  if (imageSpecPath && imageSpecPath !== '-' && existsSync(imageSpecPath)) {
    const imageSpec = JSON.parse(readFileSync(imageSpecPath, 'utf8'));
    const { renderScreenImages } = await plugin('spec/screen-image-renderer.mjs');
    const { swapImages } = await plugin('spec/image-swap.mjs');
    const rendered = await renderScreenImages(
      { ...imageSpec, lang: imageSpec.lang ?? lang },
      { renderButtonFlows: false, renderScreens: false },
    );
    swapImages({
      xlsxPath: outPath,
      selectionPng: rendered.selection?.pngBuffer,
      alvPng: rendered.alv?.pngBuffer,
      processFlowPng: rendered.processFlow?.pngBuffer,
      verbose: false,
    });
    // The page shows these beside the download; they cost nothing more now.
    const assets = join(dirname(outPath), '_assets');
    mkdirSync(assets, { recursive: true });
    const names = { selection: 'selection.png', alv: 'alv.png', processFlow: 'flow.png' };
    const done = [];
    for (const [slot, file] of Object.entries(names)) {
      if (!rendered[slot]?.pngBuffer) continue;
      writeFileSync(join(assets, file), rendered[slot].pngBuffer);
      done.push(slot);
    }
    images = done.join(', ') || 'none rendered (no headless browser?)';
  }

  if (verbose) console.log(`build-xlsx: wrote ${outPath} — images: ${images}`);
  return { outPath };
}

const thisFile = fileURLToPath(import.meta.url);
if (process.argv[1] && resolve(process.argv[1]) === thisFile) {
  const [sheetPath, imageSpecPath, outPath] = process.argv.slice(2);
  if (!sheetPath || !outPath) {
    console.error('Usage: node build-xlsx.mjs <sheet.json> <image-spec.json|-> <out.xlsx>');
    process.exit(2);
  }
  try {
    await buildXlsx({
      sheetPath: resolve(sheetPath),
      imageSpecPath: imageSpecPath && imageSpecPath !== '-' ? resolve(imageSpecPath) : null,
      outPath: resolve(outPath),
    });
  } catch (e) {
    console.error(e.message);
    process.exit(1);
  }
}
