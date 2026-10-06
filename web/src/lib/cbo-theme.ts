/**
 * Inventory a CBO Package's HTML: the spec's look (`styledSpec`), plus the
 * two things an inventory's page needs that a spec's does not.
 *
 * - A cover. The converter makes the facts panel only from `**Label**: value`
 *   bullets, and the plugin's stocker writes `Label: value` — so its cover
 *   came out as a plain list (ZMMPAEK, Standard, 2026-10-04). A list of
 *   label-and-value lines straight under the title becomes the same panel.
 * - The summary in a box, as the page's first read.
 *
 * The prompts ask for the bold form as well (`cbo-prompt.ts`); this keeps a
 * run that does not follow it from looking broken.
 */
import { styledSpec } from "@/lib/spec-theme";
import { DOC_ICON_PATHS } from "@/lib/doc-icons";

/**
 * Section heading → icon, by what the heading says, in ko / en / ja: [icon,
 * tone, pattern]. First match wins, so the narrower subjects come first.
 */
const HEADING_RULES: [string, string, string][] = [
  ["warning", "warn", "민감|sensitive|機密|個人情報"],
  ["push-pin", "accent", "고정|pinned|핀|플래그십|대표 프로그램|flagship|固定|主要プログラム"],
  ["link-simple", "plain", "크로스|모듈 간|cross[- ]?module|連携|ギャップ"],
  ["wrench", "plain", "함수\\s*그룹|함수\\s*모듈|function|汎用"],
  ["puzzle-piece", "plain", "확장|extension|include|拡張"],
  ["chart-bar", "plain", "패턴|구조 분석|pattern|structure|パターン|構造"],
  ["info", "plain", "연결되지|미연결|미사용|unlinked|unused|未使用|未接続"],
  ["gear", "plain", "logic[- ]?heavy|로직"],
  ["folder", "plain", "전체 오브젝트|패키지 전체|everything|all objects|全オブジェクト"],
  ["check-circle", "accent", "자주|빈번|frequently|primary|よく使う|頻"],
];

const HEADING_PATHS = Object.fromEntries(
  [...new Set(HEADING_RULES.map(([icon]) => icon))].map((icon) => [icon, DOC_ICON_PATHS[icon] ?? ""]),
);

const STYLE = `<style id="sc4sap-cbo-theme">
/* Reading rhythm: more air between paragraphs, list items and sections
   than the spec's, because an inventory is read in passes, not straight
   through. */
main p{line-height:1.85;margin:0 0 18px}
main li{line-height:1.75;margin:0 0 9px}
main ul,main ol{margin:0 0 20px}
main h2{margin:72px 0 18px}
main h3{margin:40px 0 14px;font-size:16px}
main .sec>h2:first-child{margin-top:72px}
main .table-wrap>table,main table{margin:0}
main .table-wrap{margin:8px 0 28px}
main th,main td{padding:12px 16px}
main td{line-height:1.65}
main .hero h1{margin-top:56px}
main .facts{margin-bottom:28px;padding:20px 24px;gap:18px 32px}

/* The cover: package and module; flagship, scanned and SAP version; the
   objects walked across the whole width. */
.facts.cbo-cover{grid-template-columns:repeat(3,minmax(0,1fr))}
.facts.cbo-cover>.f-c1{grid-column:1}
.facts.cbo-cover>.f-c2{grid-column:2}
.facts.cbo-cover>.f-c3{grid-column:3}
.facts.cbo-cover>.f-full{grid-column:1/-1}
@media (max-width:640px){
  .facts.cbo-cover{grid-template-columns:repeat(2,minmax(0,1fr))}
  .facts.cbo-cover>.f-c1,.facts.cbo-cover>.f-c2,.facts.cbo-cover>.f-c3{grid-column:auto}
  .facts.cbo-cover>.f-full{grid-column:1/-1}
}

/* The summary: the page's first read, in a box. */
.sec.cbo-summary{margin:8px 0 12px;padding:24px 28px 10px;background:var(--head);border:1px solid var(--line);border-radius:14px}
.sec.cbo-summary>h2,main .sec.cbo-summary>h2:first-child{margin:0 0 12px;font-size:12.5px;font-weight:600;letter-spacing:0;color:var(--muted)}
.sec.cbo-summary>h2 button.fold{display:none}
.sec.cbo-summary p{font-size:15.5px;line-height:1.9;color:var(--fg);margin:0 0 16px}
main .sec.cbo-summary+.sec>h2{margin-top:56px}
.cbo-no{font-variant-numeric:tabular-nums;color:var(--muted);font-weight:600;margin-right:2px}
.toc .cbo-no{color:inherit;font-weight:inherit}
@media (max-width:700px){
  main th,main td{padding:9px 12px}
  main h2,main .sec>h2:first-child{margin-top:52px}
  .sec.cbo-summary{padding:18px 18px 6px}
  main .facts{padding:16px 18px}
}
@media print{.sec.cbo-summary{background:none}}
</style>`;

const SCRIPT = `<script id="sc4sap-cbo-theme-script">
(function () {
  var hero = document.querySelector('.hero');
  // The cover: "Label: value" lines under the title, as the facts panel.
  if (hero && !hero.querySelector('.facts')) {
    var list = hero.querySelector(':scope > ul:not(.chips)');
    var items = list ? Array.prototype.slice.call(list.children) : [];
    var pairs = items.map(function (li) {
      var match = /^\\s*([^:<\\uFF1A]{1,40})[:\\uFF1A]\\s*([\\s\\S]*)$/.exec(li.innerHTML);
      return match ? [match[1].trim(), match[2].trim()] : null;
    });
    if (pairs.length >= 2 && pairs.every(Boolean)) {
      var facts = document.createElement('dl');
      facts.className = 'facts';
      pairs.forEach(function (pair) {
        var item = document.createElement('div');
        var dt = document.createElement('dt');
        var dd = document.createElement('dd');
        dt.innerHTML = pair[0];
        dd.innerHTML = pair[1];
        if ((dd.textContent || '').length > 40) item.className = 'wide';
        item.appendChild(dt);
        item.appendChild(dd);
        facts.appendChild(item);
      });
      list.replaceWith(facts);
    }
  }
  // The cover's facts in three rows, whatever order the run wrote them in:
  // package and module; flagship programs, scanned and SAP version; then
  // the objects walked across the whole width. Anything else follows.
  var cover = hero && hero.querySelector('.facts');
  if (cover) {
    var ROWS = [
      ['c1', /\\uD328\\uD0A4\\uC9C0|package|\\u30D1\\u30C3\\u30B1\\u30FC\\u30B8/i],
      ['c2', /\\uBAA8\\uB4C8|module|\\u30E2\\u30B8\\u30E5\\u30FC\\u30EB/i],
      ['c1', /\\uD50C\\uB798\\uADF8\\uC2ED|\\uD575\\uC2EC|flagship|\\u4E3B\\u8981/i],
      ['c2', /\\uC2A4\\uCE94|scan|\\u30B9\\u30AD\\u30E3\\u30F3|\\uC77C\\uC2DC|\\uC77C\\uC790/i],
      ['c3', /SAP/],
      ['full', /\\uC624\\uBE0C\\uC81D\\uD2B8|\\uAC1D\\uCCB4|object|\\u30AA\\u30D6\\u30B8\\u30A7\\u30AF\\u30C8|\\uADDC\\uBAA8/i],
    ];
    var items = Array.prototype.slice.call(cover.children);
    var placed = [];
    // Package and flagship programs show their names only — the run often
    // adds a description or a title in brackets after them.
    function namesOnly(dd) {
      var codes = dd.querySelectorAll('code');
      var names = codes.length
        ? Array.prototype.map.call(codes, function (c) { return (c.textContent || '').trim(); })
        : ((dd.textContent || '').match(/\\b[A-Z][A-Z0-9_\\/]{2,}\\b/g) || []);
      names = names.filter(function (name, i) { return name && names.indexOf(name) === i; });
      if (!names.length) return;
      dd.innerHTML = '';
      names.forEach(function (name, i) {
        if (i) dd.appendChild(document.createTextNode(', '));
        var code = document.createElement('code');
        code.textContent = name;
        dd.appendChild(code);
      });
    }
    ROWS.forEach(function (row, r) {
      for (var k = 0; k < items.length; k++) {
        var dt = items[k].querySelector('dt');
        if (placed.indexOf(items[k]) < 0 && dt && row[1].test(dt.textContent || '')) {
          items[k].classList.remove('wide');
          items[k].classList.add('f-' + row[0]);
          if (r === 0 || r === 2) {
            var dd = items[k].querySelector('dd');
            if (dd) namesOnly(dd);
          }
          placed.push(items[k]);
          break;
        }
      }
    });
    items.forEach(function (item) {
      if (placed.indexOf(item) < 0) { item.classList.remove('wide'); item.classList.add('f-full'); placed.push(item); }
    });
    placed.forEach(function (item) { cover.appendChild(item); });
    cover.classList.add('cbo-cover');
  }
  // The summary, boxed: the first section whose heading says so.
  var SUMMARY = /^(\\uC694\\uC57D|summary|\\u8981\\u7D04|\\uAC1C\\uC694|overview)$/i;
  // A heading's own words: without its fold button and its # link.
  function words(heading) {
    var copy = heading.cloneNode(true);
    copy.querySelectorAll('button, a.hash').forEach(function (el) { el.remove(); });
    return (copy.textContent || '').trim();
  }
  var sections = document.querySelectorAll('main .sec');
  for (var i = 0; i < sections.length; i++) {
    var h2 = sections[i].querySelector('h2');
    var text = h2 ? words(h2) : '';
    if (SUMMARY.test(text)) { sections[i].classList.add('cbo-summary'); break; }
  }
  // Numbered headings — 1., 2. for sections, 1.1, 1.2 under them — on the
  // page and in its contents alike. The summary box is not numbered; a number
  // the run wrote itself is replaced rather than doubled.
  var LEADING = /^\\s*\\d+(?:\\.\\d+)*[.)]?\\s+/;
  // The number goes first in the heading's own content — before an icon
  // that replaced an emoji, after the fold button and the # link.
  function prefix(el, label) {
    var walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    var node;
    while ((node = walker.nextNode())) {
      if (node.parentElement && node.parentElement.closest('a.hash, button')) continue;
      if (!node.textContent.trim()) continue;
      node.textContent = node.textContent.replace(LEADING, '');
      break;
    }
    var first = null;
    for (var c = 0; c < el.childNodes.length; c++) {
      var child = el.childNodes[c];
      if (child.nodeType === 1 && child.matches('button, a.hash')) continue;
      first = child;
      break;
    }
    var mark = document.createElement('span');
    mark.className = 'cbo-no';
    mark.textContent = label + ' ';
    el.insertBefore(mark, first);
  }
  function number(heading, label) {
    prefix(heading, label);
    var link = heading.id && document.querySelector('.toc a[href="#' + CSS.escape(heading.id) + '"]');
    if (link) prefix(link, label);
  }
  // Break points after the slashes and commas of a long list of names in a
  // table cell (ZMMD00060/70/180/…), so it wraps at a name, not mid-number.
  var cells = document.querySelectorAll('main td');
  for (var q = 0; q < cells.length; q++) {
    var walk = document.createTreeWalker(cells[q], NodeFilter.SHOW_TEXT);
    var texts = [];
    while (walk.nextNode()) texts.push(walk.currentNode);
    texts.forEach(function (node) {
      if (!/[^\\s]{24,}/.test(node.nodeValue)) return;
      node.nodeValue = node.nodeValue.replace(/([\\/,])(?=\\S)/g, '$1\\u200B');
    });
  }
  // An icon on every section heading by what it is about, whether or not
  // the run wrote an emoji there — the same page from every run.
  var RULES = ${JSON.stringify(HEADING_RULES)};
  var PATHS = ${JSON.stringify(HEADING_PATHS)};
  function iconFor(text) {
    for (var r = 0; r < RULES.length; r++) if (new RegExp(RULES[r][2], 'i').test(text)) return RULES[r];
    return null;
  }
  function addIcon(el, rule) {
    if (el.querySelector('.doc-ico')) return;
    var first = null;
    for (var c = 0; c < el.childNodes.length; c++) {
      var child = el.childNodes[c];
      if (child.nodeType === 1 && child.matches('button, a.hash')) continue;
      first = child;
      break;
    }
    var span = document.createElement('span');
    span.className = 'doc-ico t-' + rule[1];
    span.setAttribute('aria-hidden', 'true');
    span.innerHTML = '<svg viewBox="0 0 256 256">' + PATHS[rule[0]] + '</svg>';
    el.insertBefore(span, first);
  }
  for (var h = 0; h < sections.length; h++) {
    if (sections[h].classList.contains('cbo-summary')) continue;
    var title = sections[h].querySelector('h2');
    var rule = title && iconFor(words(title));
    if (!rule) continue;
    addIcon(title, rule);
    var entry = title.id && document.querySelector('.toc a[href="#' + CSS.escape(title.id) + '"]');
    if (entry) addIcon(entry, rule);
  }
  // The revision history is not numbered either, as in the manual: it is
  // about the document, not part of what it says.
  var REVISION = /^(개정\\s*이력|revision\\s+history|改訂履歴)$/i;
  var n = 0;
  for (var s = 0; s < sections.length; s++) {
    if (sections[s].classList.contains('cbo-summary')) continue;
    var head = sections[s].querySelector('h2');
    if (!head) continue;
    if (REVISION.test(words(head))) continue;
    n += 1;
    number(head, n + '.');
    var subs = sections[s].querySelectorAll('h3');
    for (var m = 0; m < subs.length; m++) number(subs[m], n + '.' + (m + 1));
  }
})();
</script>`;

/** Inserts `added` just before `</tag>`, or at the end when there is none. */
function before(html: string, tag: "head" | "body", added: string): string {
  const at = html.toLowerCase().lastIndexOf(`</${tag}>`);
  return at < 0 ? html + added : html.slice(0, at) + added + html.slice(at);
}

export function styledCbo(html: string): string {
  return before(before(styledSpec(html, null), "head", STYLE), "body", SCRIPT);
}
