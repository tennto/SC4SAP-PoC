/**
 * Package → Process's HTML — the process document and the BPML — in this
 * app's look, for the preview and the download alike.
 *
 * Both come out of the plugin's md-to-html.mjs, the converter the spec's HTML
 * comes from, so they take the spec's theme and its edit mode as they are
 * (`styledSpec`). What is particular to them:
 *
 *   - the diagrams: a Standard run inlines the plugin's PNGs of the macro
 *     flow and of each process's sequence diagram, and each is put back here
 *     as the SVG `process-diagrams.ts` draws from the same data — the run's
 *     `process-images.json` — so it follows the page's theme and stays sharp
 *     when zoomed. An Economy run's HTML has those SVGs inline already;
 *   - a sequence diagram with a dozen lifelines is wider than the column: it
 *     keeps its own size and its frame scrolls sideways, instead of being
 *     shrunk until its labels cannot be read;
 *   - the frontmatter's keys (`process_count`, `entry_points` …), which the
 *     converter shows as they are in the fact panel, get their names in the
 *     document's language.
 */
import { processDrawings, type ProcessImages } from "@/lib/process-diagrams";
import { styledSpec } from "@/lib/spec-theme";
import { DOC_ICON_PATHS } from "@/lib/doc-icons";

/** A plugin PNG the run handed over, by its file name: `macro.png`, `seq-1.png`. */
export type DiagramPng = { name: string; base64: string };

/**
 * `html` with each of the plugin's diagram PNGs that has its data in
 * `images` swapped for the drawn SVG.
 */
export function withDrawnDiagrams(html: string, images: ProcessImages | null, pngs: DiagramPng[]): string {
  if (!images || pngs.length === 0) return html;
  const drawings = processDrawings(images);
  let page = html;
  for (const png of pngs) {
    const drawn = drawings.get(png.name.replace(/\.png$/i, ""));
    if (!drawn) continue;
    const at = page.indexOf(`data:image/png;base64,${png.base64}`);
    if (at < 0) continue;
    const start = page.lastIndexOf("<img", at);
    const end = page.indexOf(">", at);
    if (start >= 0 && end > at) page = page.slice(0, start) + drawn.svg + page.slice(end + 1);
  }
  return page;
}

const STYLE = `<style id="sc4sap-process-theme">
figure:has(svg.proc-diagram){overflow-x:auto;text-align:left;-webkit-overflow-scrolling:touch;overscroll-behavior-x:contain}
figure svg.spec-flow.proc-diagram{margin:0}
figure:has(svg.proc-diagram) figcaption{position:sticky;left:0}
/* The BPML table: seventeen columns, the level names and the descriptions
   given room to read instead of a word per line. */
table.bpml-table{min-width:1760px}
table.bpml-table td:nth-child(-n+3){white-space:nowrap}
table.bpml-table td:nth-child(n+4):nth-child(-n+8){min-width:118px}
table.bpml-table td:nth-child(9),table.bpml-table td:nth-child(10){white-space:nowrap}
table.bpml-table td:nth-child(12),table.bpml-table td:nth-child(13){min-width:260px}

main td{vertical-align:top}
/* Korean words stay whole; only a run with no break point (a long name)
   breaks anywhere. A table of eight or more columns keeps a width they can be
   read at and scrolls sideways in its frame; up to seven fit the column. */
main td,main th{word-break:keep-all;overflow-wrap:anywhere}
main table.wide{min-width:880px}
main td code{white-space:nowrap}

/* Direction: a coloured label, not a bare IN / OUT. */
:root{--dir-in-bg:#e7f0fd;--dir-in:#1e4fa3;--dir-out-bg:#fdf0e1;--dir-out:#9a4a06}
@media (prefers-color-scheme: dark){:root:not([data-theme=light]){--dir-in-bg:#15263d;--dir-in:#8ab8f5;--dir-out-bg:#33230f;--dir-out:#f3b26b}}
:root[data-theme=dark]{--dir-in-bg:#15263d;--dir-in:#8ab8f5;--dir-out-bg:#33230f;--dir-out:#f3b26b}
.dir{display:inline-block;padding:1px 8px;border-radius:999px;font:600 11.5px/1.6 ui-monospace,"Cascadia Mono",Consolas,monospace;letter-spacing:.02em;white-space:nowrap}
.dir-in{background:var(--dir-in-bg);color:var(--dir-in)}
.dir-out{background:var(--dir-out-bg);color:var(--dir-out)}
td:has(>.dir){white-space:nowrap}
td>.dir+.dir{margin-left:4px}

/* Open questions: a checkbox, as the app draws one. */
li.task{list-style:none;margin-left:-1.35em;display:flex;gap:8px;align-items:flex-start}
li.task>.doc-ico{flex:none;width:1.1em;height:1.1em;margin:0.28em 0 0;color:var(--muted)}
li.task.done>.doc-ico{color:var(--fg)}
/* In the edit mode a click on the box ticks it or clears it. */
body.editing li.task>.doc-ico{cursor:pointer;border-radius:3px}
body.editing li.task>.doc-ico:hover{color:var(--fg);background:var(--head)}
</style>`;

const KEYS: Record<string, Record<string, string>> = {
  ko: { package: "패키지", module: "모듈", sap_version: "SAP 버전", abap_release: "ABAP 릴리스", industry: "산업", country: "국가", active_modules: "활성 모듈", generated_at: "생성 일시", generator: "생성기", entry_points: "진입점", process_count: "프로세스 수", language: "언어" },
  ja: { package: "パッケージ", module: "モジュール", sap_version: "SAP バージョン", abap_release: "ABAP リリース", industry: "業種", country: "国", active_modules: "有効モジュール", generated_at: "生成日時", generator: "生成元", entry_points: "エントリポイント", process_count: "プロセス数", language: "言語" },
  en: { package: "Package", module: "Module", sap_version: "SAP version", abap_release: "ABAP release", industry: "Industry", country: "Country", active_modules: "Active modules", generated_at: "Generated", generator: "Generator", entry_points: "Entry points", process_count: "Processes", language: "Language" },
};

// String.raw: the regular expressions below keep their backslashes.
const SCRIPT = String.raw`<script id="sc4sap-process-theme-script">
(function () {
  var all = ${JSON.stringify(KEYS)};
  var names = all[(document.documentElement.lang || '').slice(0, 2)] || all.en;
  // The BPML table, by its first column.
  Array.prototype.forEach.call(document.querySelectorAll('main table'), function (table) {
    var first = table.querySelector('thead th');
    if (first && first.textContent.trim() === 'Lv') table.classList.add('bpml-table');
    else if (table.querySelectorAll('thead th').length >= 8) table.classList.add('wide');
  });
  Array.prototype.forEach.call(document.querySelectorAll('.facts dt'), function (dt) {
    var key = dt.textContent.trim();
    // The entry points have their own table in the overview; on the cover
    // they were a wall of program names.
    if (key === 'entry_points') { dt.parentElement.remove(); return; }
    if (Object.prototype.hasOwnProperty.call(names, key)) dt.textContent = names[key];
  });

  var main = document.querySelector('main');
  if (!main) return;
  // Without the fold arrow and the # link the plugin's script puts in front.
  var headingText = function (h) { return (h.textContent || '').replace(/^[^\p{L}\p{N}]+/u, '').replace(/[#\s]+$/, '').trim(); };

  // The contents inside the document: the page's own contents column already
  // lists every section, so the copy in the text goes — with its entry there.
  Array.prototype.forEach.call(main.querySelectorAll('h2'), function (h2) {
    if (!/^(목차|table of contents|contents|目次)$/i.test(headingText(h2))) return;
    var link = h2.id && document.querySelector('nav.toc a[href="#' + h2.id + '"]');
    if (link && link.closest('li')) link.closest('li').remove();
    var section = h2.closest('section');
    if (section && section.querySelector('h2') === h2) { section.remove(); return; }
    var next = h2.nextElementSibling;
    while (next && next.tagName !== 'H2') { var gone = next; next = next.nextElementSibling; gone.remove(); }
    h2.remove();
  });

  // The BPML's package overview — label: value bullets — as the cover's fact
  // panel under the title, the way the process document opens.
  Array.prototype.forEach.call(main.querySelectorAll('h2'), function (h2) {
    if (!/^(패키지 개요|package overview|パッケージ概要)$/i.test(headingText(h2))) return;
    var list = h2.nextElementSibling;
    while (list && list.tagName !== 'UL' && list.tagName !== 'H2') list = list.nextElementSibling;
    if (!list || list.tagName !== 'UL' || document.querySelector('.facts')) return;
    var dl = document.createElement('dl');
    dl.className = 'facts';
    Array.prototype.forEach.call(list.children, function (li) {
      var label = li.querySelector('strong');
      if (!label) return;
      var item = document.createElement('div');
      var dt = document.createElement('dt');
      dt.textContent = label.textContent.replace(/[:：]\s*$/, '');
      var dd = document.createElement('dd');
      dd.textContent = li.textContent.slice(li.textContent.indexOf(label.textContent) + label.textContent.length).replace(/^\s*[:：]\s*/, '');
      item.appendChild(dt);
      item.appendChild(dd);
      dl.appendChild(item);
    });
    if (!dl.children.length) return;
    var h1 = main.querySelector('h1');
    if (h1) h1.insertAdjacentElement('afterend', dl);
    var link = h2.id && document.querySelector('nav.toc a[href="#' + h2.id + '"]');
    if (link && link.closest('li')) link.closest('li').remove();
    var section = h2.closest('section');
    if (section && section.querySelector('h2') === h2 && !section.contains(dl)) section.remove();
    else { list.remove(); h2.remove(); }
  });

  // IN / OUT as coloured labels, wherever a cell says only that.
  var DIR = { IN: 'in', INBOUND: 'in', '인바운드': 'in', OUT: 'out', OUTBOUND: 'out', '아웃바운드': 'out' };
  // Both ways ("IN/OUT", "OUT / IN", "양방향" …) as the two labels side by side.
  var BOTH = /^(IN\s*[\/,&+·-]?\s*OUT|OUT\s*[\/,&+·-]?\s*IN|INOUT|BOTH|BIDIRECTIONAL|양방향|双方向)$/i;
  var label = function (kind, text) { return '<span class="dir dir-' + kind + '">' + text + '</span>'; };
  Array.prototype.forEach.call(main.querySelectorAll('td'), function (td) {
    if (td.querySelector('.dir') || td.children.length) return;
    var text = td.textContent.trim();
    if (BOTH.test(text)) { td.innerHTML = label('in', 'IN') + ' ' + label('out', 'OUT'); return; }
    var kind = DIR[text.toUpperCase()] || DIR[text];
    if (!kind) return;
    td.innerHTML = label(kind, text);
  });

  // "[ ] question" / "[x] done": a checkbox icon. The marker is kept on the
  // icon, so an edited copy saves it back as it was written.
  var BOX = ${JSON.stringify({ open: DOC_ICON_PATHS["square"], done: DOC_ICON_PATHS["check-square"] })};
  Array.prototype.forEach.call(main.querySelectorAll('li'), function (li) {
    if (li.classList.contains('task')) return;
    var first = li.firstChild;
    if (!first || first.nodeType !== 3) return;
    var m = /^\s*\[( |x|X)\]\s*/.exec(first.nodeValue);
    if (!m) return;
    var done = m[1] !== ' ';
    first.nodeValue = first.nodeValue.slice(m[0].length);
    var icon = document.createElement('span');
    icon.className = 'doc-ico';
    icon.setAttribute('aria-hidden', 'true');
    icon.setAttribute('data-emoji', m[0]);
    icon.innerHTML = '<svg viewBox="0 0 256 256">' + (done ? BOX.done : BOX.open) + '</svg>';
    var body = document.createElement('span');
    while (li.firstChild) body.appendChild(li.firstChild);
    li.appendChild(icon);
    li.appendChild(body);
    li.classList.add('task');
    if (done) li.classList.add('done');
  });

  // Editing: the box is a control. Its marker is what the edit mode saves
  // (data-emoji), so ticking it changes that and tells the editor something
  // changed.
  document.addEventListener('click', function (e) {
    if (!document.body.classList.contains('editing') || !(e.target instanceof Element)) return;
    var icon = e.target.closest('li.task > .doc-ico');
    if (!icon) return;
    e.preventDefault();
    var li = icon.parentElement;
    var done = !li.classList.contains('done');
    li.classList.toggle('done', done);
    icon.setAttribute('data-emoji', done ? '[x] ' : '[ ] ');
    icon.innerHTML = '<svg viewBox="0 0 256 256">' + (done ? BOX.done : BOX.open) + '</svg>';
    li.dispatchEvent(new Event('input', { bubbles: true }));
  }, true);
})();
</script>`;

/** Inserts `added` just before `</tag>`, or at the end when there is none. */
function before(html: string, tag: "head" | "body", added: string): string {
  const at = html.toLowerCase().lastIndexOf(`</${tag}>`);
  return at < 0 ? html + added : html.slice(0, at) + added + html.slice(at);
}

/** The process document or the BPML as shown and saved. */
export function styledProcess(html: string, images: ProcessImages | null = null, pngs: DiagramPng[] = []): string {
  // Ahead of the spec's theme, whose script reads the fact panel; the edit
  // mode's copy of the page is taken with these in it.
  return styledSpec(before(before(withDrawnDiagrams(html, images, pngs), "head", STYLE), "body", SCRIPT));
}
