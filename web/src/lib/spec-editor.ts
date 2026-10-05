/**
 * An edit mode for Program → Spec's HTML, on the model of the manual's.
 *
 * The manual can be edited because the plugin embeds its source (manual.json)
 * and writes the page from it. The spec has no such source: the converter
 * turns Markdown into a page whose scripts then rebuild it — a toolbar, fold
 * buttons, table tools — and this app's own scripts rework it again (the
 * lead paragraph, emoji as icons, annotation tags). Saving the page as it
 * stands would carry all of that into the file, and every script would run a
 * second time on reopening it: two toolbars, folds inside folds.
 *
 * So the page is saved from a copy of itself as it was before any script ran:
 *   - every editable unit (a heading, a paragraph, a list item, a fact, a
 *     caption, a table) gets a `data-ed` number in the page and in the copy;
 *   - the copy goes into the page as JSON, its pictures left out (they are
 *     the bulk of it) and matched back by a `data-ed-img` number on Save;
 *   - Save writes each edited unit, cleaned of what the scripts added, into
 *     the copy, and the copy, with this editor in it again, is the file.
 *
 * In the preview the frame's download is caught by `HtmlPreview` and saved
 * under the run's file name; opened as a file, Save downloads it directly.
 */

const LABELS = {
  ko: {
    edit: "편집", done: "편집 종료", save: "파일 저장", undo: "되돌리기", help: "도움말", ok: "확인",
    insertRow: "아래에 행 추가", delRow: "행 삭제",
    unsaved: "저장하지 않은 변경이 있습니다", saved: "저장했습니다",
    guideTitle: "편집 방법",
    guide: [
      "편집을 누르면 제목 · 문단 · 목록 · 표 칸의 글자를 바로 고칠 수 있습니다. Ctrl+B 굵게, Ctrl+I 기울임.",
      "표는 행 오른쪽의 ＋ / ✕ 로 행을 추가 · 삭제합니다.",
      "실수하면 Ctrl+Z 또는 [되돌리기]. 행 추가 · 삭제는 되돌리기 대상이 아닙니다.",
      "다 고쳤으면 [파일 저장]을 누르세요. 편집본(…-edited.html)이 다운로드되고, 그 파일도 다시 편집할 수 있습니다.",
    ],
  },
  en: {
    edit: "Edit", done: "Done", save: "Save file", undo: "Undo", help: "Help", ok: "OK",
    insertRow: "Insert a row below", delRow: "Delete row",
    unsaved: "Unsaved changes", saved: "Saved",
    guideTitle: "How to edit",
    guide: [
      "Press Edit, then click any heading, paragraph, list item or table cell to change it. Ctrl+B bold, Ctrl+I italic.",
      "In tables, ＋ / ✕ at the end of a row add and delete rows.",
      "Made a mistake? Ctrl+Z or [Undo]. Adding and deleting rows cannot be undone.",
      "When you are done, press [Save file]. An edited copy (…-edited.html) is downloaded, and it can be edited again.",
    ],
  },
  ja: {
    edit: "編集", done: "編集終了", save: "ファイル保存", undo: "元に戻す", help: "ヘルプ", ok: "OK",
    insertRow: "下に行を追加", delRow: "行を削除",
    unsaved: "保存していない変更があります", saved: "保存しました",
    guideTitle: "編集方法",
    guide: [
      "編集を押すと、見出し・段落・リスト・表のセルの文字をそのまま修正できます。Ctrl+B 太字、Ctrl+I 斜体。",
      "表は行末の ＋ / ✕ で行を追加・削除します。",
      "間違えたら Ctrl+Z または［元に戻す］。行の追加・削除は元に戻せません。",
      "終わったら［ファイル保存］を押してください。編集版 (…-edited.html) がダウンロードされ、そのファイルも再び編集できます。",
    ],
  },
};

// The look of the manual's edit mode as this app draws it (`manual-theme.ts`),
// with "Save file" out of the edit mode: always on the bar, so edits can be
// saved after Done too. One button is filled at a time — Save file while
// there is something unsaved, otherwise Edit (outside the edit mode) — and
// Done is outlined.
const STYLE = `<style id="sc4sap-spec-editor-style">
.toolbar .ed-edit{background:var(--fg);color:var(--bg);font-weight:600;padding:6px 12px;margin-right:4px}
.toolbar .ed-edit:hover{background:color-mix(in srgb,var(--fg) 86%,var(--bg));color:var(--bg)}
body.editing .toolbar .ed-edit,body.doc-dirty .toolbar .ed-edit{background:none;color:var(--fg);box-shadow:inset 0 0 0 1px var(--line-strong)}
body.editing .toolbar .ed-edit:hover,body.doc-dirty .toolbar .ed-edit:hover{background:var(--head)}
.toolbar .ed-save{display:inline-flex;align-items:center;gap:6px;color:var(--fg);box-shadow:inset 0 0 0 1px var(--line-strong);padding:6px 12px;margin-right:4px}
.toolbar .ed-save:hover{background:var(--head);color:var(--fg)}
body.doc-dirty .toolbar .ed-save{background:var(--fg);color:var(--bg);font-weight:600;box-shadow:none}
body.doc-dirty .toolbar .ed-save:hover{background:color-mix(in srgb,var(--fg) 86%,var(--bg));color:var(--bg)}
.toolbar .ed-save svg{width:14px;height:14px;stroke:currentColor;stroke-width:1.8;fill:none;stroke-linecap:round;stroke-linejoin:round}
.toolbar .ed-status{font-size:12px;color:var(--faint);margin-right:6px;max-width:40vw;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.toolbar [hidden]{display:none!important}

body.editing [data-ed]:not(table),body.editing table[data-ed] td:not(.ed-rowtools),body.editing table[data-ed] th:not(.ed-rowtools){outline:1px dashed color-mix(in srgb,var(--fg) 22%,transparent);outline-offset:3px;border-radius:3px;cursor:text}
body.editing [data-ed]:not(table):hover,body.editing table[data-ed] td:not(.ed-rowtools):hover,body.editing table[data-ed] th:not(.ed-rowtools):hover{outline-color:color-mix(in srgb,var(--fg) 45%,transparent)}
body.editing [contenteditable=true]:focus{outline:2px solid color-mix(in srgb,var(--fg) 70%,transparent);background:color-mix(in srgb,var(--fg) 4%,transparent)}
body.editing button.fold{display:none}

.ed-rowtools{display:none}
body.editing td.ed-rowtools,body.editing th.ed-rowtools{display:table-cell;width:1%;white-space:nowrap;padding:6px 8px;vertical-align:middle}
body.editing .ed-rowtools button{display:inline-grid;place-items:center;width:22px;height:22px;padding:0;margin:0 2px;line-height:1;color:var(--faint);background:none;border:1px solid transparent;border-radius:6px;cursor:pointer;vertical-align:middle;transition:background .15s,color .15s}
body.editing .ed-rowtools button:hover{background:var(--head);color:var(--fg);border-color:var(--line)}
body.editing .ed-rowtools button:last-child:hover{color:var(--flow-bad)}
.ed-rowtools svg{display:block;width:10px;height:10px;stroke:currentColor;stroke-width:1.6;stroke-linecap:round;fill:none}

.ed-guide{position:fixed;inset:0;z-index:40;display:flex;align-items:center;justify-content:center;background:rgb(12 12 12 / 0.42);backdrop-filter:blur(2px)}
.ed-guide>div{max-width:min(720px,calc(100vw - 32px));margin:16px;padding:28px 32px 24px;background:var(--bg);color:var(--fg);border:1px solid var(--line);border-radius:16px;box-shadow:0 24px 64px -16px rgb(0 0 0 / 0.35)}
.ed-guide h3{font-size:17px;font-weight:700;margin:0 0 14px}
.ed-guide ol{margin:0 0 28px;padding-left:20px;font-size:13.5px;line-height:1.8;color:var(--fg)}
.ed-guide li{margin:0 0 2px}
.ed-guide li::marker{color:var(--faint);font-variant-numeric:tabular-nums}
@media (min-width:760px){.ed-guide li{white-space:nowrap}}
.ed-guide>div>button{display:block;margin-left:auto;font:inherit;font-size:13.5px;font-weight:600;padding:8px 22px;border-radius:9px;border:0;background:var(--fg);color:var(--bg);cursor:pointer}
.ed-guide>div>button:hover{background:color-mix(in srgb,var(--fg) 86%,var(--bg))}
@media print{.ed-rowtools,.ed-guide,.toolbar .ed-only,.toolbar .ed-edit{display:none!important}}
</style>`;

// Plain ES2017. Runs after the plugin's script and this app's theme, so the
// toolbar it adds its buttons to is already there.
const SCRIPT = String.raw`<script id="sc4sap-spec-editor">
(function () {
  var srcEl = document.getElementById('sc4sap-spec-source');
  var main = document.querySelector('main');
  if (!srcEl || !main) return;
  var ALL = __LABELS__;
  var lang = (document.documentElement.lang || '').slice(0, 2).toLowerCase();
  var T = ALL[lang] || ALL.en;
  var editing = false, dirty = false;

  // The toolbar: the plugin's, or one of our own when a page has none.
  var bar = document.querySelector('.toolbar');
  if (!bar) {
    bar = document.createElement('div');
    bar.className = 'toolbar';
    document.body.insertBefore(bar, document.body.firstChild);
  }
  function button(text, cls, onClick) {
    var b = document.createElement('button');
    b.type = 'button';
    b.className = cls;
    b.textContent = text;
    b.addEventListener('click', onClick);
    return b;
  }
  // As the manual lays them out: status, undo, help, Edit / Done, Save file,
  // then the page's own buttons. Here they go right after the title. Undo
  // and help only while editing; the status and Save file always.
  var status = document.createElement('span');
  status.className = 'ed-status';
  var undoBtn = button('↶ ' + T.undo, 'ed-only', function () { document.execCommand('undo'); });
  undoBtn.title = 'Ctrl+Z';
  var helpBtn = button('? ' + T.help, 'ed-only', showGuide);
  var saveBtn = button(T.save, 'ed-save', save);
  saveBtn.innerHTML = '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M8 2.5v7.5M4.8 7 8 10.2 11.2 7M3 12.5h10"/></svg>';
  saveBtn.appendChild(document.createTextNode(T.save));
  var editBtn = button(T.edit, 'ed-edit', function () { editing ? stop() : start(); });
  var group = [status, undoBtn, helpBtn, editBtn, saveBtn];
  [undoBtn, helpBtn].forEach(function (el) { el.hidden = true; });

  // The preview's own download button asks for the page as it stands: the
  // edited copy when there is something unsaved, else word to use the
  // original (\`HtmlPreview\`).
  addEventListener('message', function (e) {
    if (e.source !== parent || !e.data || e.data.type !== 'sc4sap-preview-request') return;
    if (dirty) save();
    else parent.postMessage({ type: 'sc4sap-preview-clean' }, '*');
  });
  var anchor = bar.querySelector(':scope > .title');
  group.forEach(function (el) {
    if (anchor) { anchor.insertAdjacentElement('afterend', el); anchor = el; }
    else bar.appendChild(el);
  });

  function units() { return Array.prototype.slice.call(main.querySelectorAll('[data-ed]')); }
  function cellsOf(table) {
    return Array.prototype.filter.call(table.querySelectorAll('th, td'), function (c) { return !c.classList.contains('ed-rowtools'); });
  }
  function editableEls() {
    var out = [];
    units().forEach(function (el) {
      if (el.tagName === 'TABLE') out = out.concat(cellsOf(el));
      else out.push(el);
    });
    return out;
  }
  function setStatus(text) { status.textContent = text || ''; }

  function rowTools(row) {
    var head = row.parentNode && row.parentNode.tagName === 'THEAD';
    var cell = document.createElement(head ? 'th' : 'td');
    cell.className = 'ed-rowtools';
    cell.setAttribute('contenteditable', 'false');
    if (!head) {
      var plus = cell.appendChild(button('', '', function () {
        var copy = row.cloneNode(true);
        Array.prototype.forEach.call(copy.cells, function (c) {
          if (c.classList.contains('ed-rowtools')) c.remove(); else c.innerHTML = '';
        });
        row.parentNode.insertBefore(copy, row.nextSibling);
        Array.prototype.forEach.call(copy.cells, function (c) { c.setAttribute('contenteditable', 'true'); });
        copy.appendChild(rowTools(copy));
        if (copy.cells[0]) copy.cells[0].focus();
        touched();
      }));
      plus.title = T.insertRow;
      plus.innerHTML = '<svg viewBox="0 0 10 10" aria-hidden="true"><path d="M5 1V9M1 5H9"/></svg>';
      var cross = cell.appendChild(button('', '', function () {
        if (row.parentNode.rows.length > 1) { row.remove(); touched(); }
      }));
      cross.title = T.delRow;
      cross.innerHTML = '<svg viewBox="0 0 10 10" aria-hidden="true"><path d="M2 2L8 8M8 2L2 8"/></svg>';
    }
    return cell;
  }

  function start() {
    editing = true;
    document.body.classList.add('editing');
    editBtn.textContent = T.done;
    [undoBtn, helpBtn].forEach(function (el) { el.hidden = false; });
    editableEls().forEach(function (el) {
      el.setAttribute('contenteditable', 'true');
      Array.prototype.forEach.call(el.querySelectorAll('button, .doc-ico, svg'), function (b) { b.setAttribute('contenteditable', 'false'); });
    });
    units().forEach(function (el) {
      if (el.tagName !== 'TABLE') return;
      Array.prototype.forEach.call(el.rows, function (row) { row.appendChild(rowTools(row)); });
    });
    setStatus(dirty ? T.unsaved : '');
  }

  function stop() {
    editing = false;
    document.body.classList.remove('editing');
    editBtn.textContent = T.edit;
    [undoBtn, helpBtn].forEach(function (el) { el.hidden = true; });
    Array.prototype.forEach.call(main.querySelectorAll('[contenteditable]'), function (el) { el.removeAttribute('contenteditable'); });
    Array.prototype.forEach.call(main.querySelectorAll('.ed-rowtools'), function (el) { el.remove(); });
  }

  function touched() { dirty = true; document.body.classList.add('doc-dirty'); setStatus(T.unsaved); }
  main.addEventListener('input', function () { if (editing) touched(); });
  // While editing, a click in a table head places the caret; it does not sort.
  document.addEventListener('click', function (e) {
    if (!editing || !(e.target instanceof Element)) return;
    if (e.target.closest('th') && !e.target.closest('.ed-rowtools')) e.stopPropagation();
  }, true);

  function showGuide() {
    var box = document.createElement('div');
    box.className = 'ed-guide';
    var card = document.createElement('div');
    var h = document.createElement('h3');
    h.textContent = T.guideTitle;
    var ol = document.createElement('ol');
    T.guide.forEach(function (line) { var li = document.createElement('li'); li.textContent = line; ol.appendChild(li); });
    var ok = button(T.ok, '', function () { box.remove(); });
    card.appendChild(h); card.appendChild(ol); card.appendChild(ok);
    box.appendChild(card);
    box.addEventListener('click', function (e) { if (e.target === box) box.remove(); });
    document.body.appendChild(box);
    ok.focus();
  }

  // What the page's scripts put inside a unit, taken back out.
  function clean(el) {
    var copy = el.cloneNode(true);
    Array.prototype.forEach.call(copy.querySelectorAll('.ed-rowtools, button'), function (n) { n.remove(); });
    Array.prototype.forEach.call(copy.querySelectorAll('.doc-ico'), function (n) {
      n.replaceWith(document.createTextNode(n.getAttribute('data-emoji') || ''));
    });
    Array.prototype.forEach.call(copy.querySelectorAll('span.anno'), function (n) {
      var em = document.createElement('em');
      em.textContent = '(' + n.textContent + ')';
      n.replaceWith(em);
    });
    var all = [copy].concat(Array.prototype.slice.call(copy.querySelectorAll('*')));
    all.forEach(function (n) {
      n.removeAttribute('contenteditable');
      if (n.tagName === 'TH') { n.removeAttribute('tabindex'); n.removeAttribute('aria-sort'); }
      if (n.tagName === 'TR') { n.removeAttribute('style'); n.removeAttribute('hidden'); }
      if (n.classList) {
        ['id', 'num', 'sortable'].forEach(function (c) { if (n.tagName === 'TD' || n.tagName === 'TH') n.classList.remove(c); });
        if (!n.classList.length) n.removeAttribute('class');
      }
    });
    return copy;
  }

  function stripImages(doc) {
    Array.prototype.forEach.call(doc.querySelectorAll('img[data-ed-img]'), function (img) { img.removeAttribute('src'); });
  }
  function json(text) { return JSON.stringify(text).replace(/</g, '\\u003c'); }

  function save() {
    var doc = new DOMParser().parseFromString(JSON.parse(srcEl.textContent), 'text/html');
    // Headings as they were, to carry a renamed one into the contents.
    var oldHeads = {};
    Array.prototype.forEach.call(doc.querySelectorAll('h1[id], h2[id], h3[id], h4[id]'), function (h) { oldHeads[h.id] = h.textContent.trim(); });

    Array.prototype.forEach.call(doc.querySelectorAll('[data-ed]'), function (target) {
      var live = main.querySelector('[data-ed="' + target.getAttribute('data-ed') + '"]');
      if (!live) return;
      var edited = clean(live);
      if (target.tagName === 'TABLE') {
        var head = edited.tHead, srcHead = target.tHead;
        if (head && srcHead) srcHead.innerHTML = head.innerHTML;
        var bodies = edited.tBodies, srcBodies = target.tBodies;
        for (var i = 0; i < srcBodies.length && i < bodies.length; i++) srcBodies[i].innerHTML = bodies[i].innerHTML;
      } else {
        target.innerHTML = edited.innerHTML;
      }
    });

    Array.prototype.forEach.call(doc.querySelectorAll('nav.toc a[href^="#"]'), function (a) {
      var id = a.getAttribute('href').slice(1);
      try { id = decodeURIComponent(id); } catch (e) {}
      var h = doc.getElementById(id);
      if (h && oldHeads[id] !== undefined && a.textContent.trim() === oldHeads[id]) a.textContent = h.textContent.trim();
    });
    var h1 = doc.querySelector('main h1');
    if (h1) {
      var title = doc.querySelector('title');
      if (title && title.textContent.trim() === (oldHeads[h1.id] || '')) title.textContent = h1.textContent.trim();
    }

    // The copy for the next edit, before the pictures go back in.
    var next = doc.cloneNode(true);
    stripImages(next);
    var nextSource = '<!DOCTYPE html>\n' + next.documentElement.outerHTML;

    Array.prototype.forEach.call(doc.querySelectorAll('img[data-ed-img]'), function (img) {
      var live = document.querySelector('img[data-ed-img="' + img.getAttribute('data-ed-img') + '"]');
      if (live) img.setAttribute('src', live.getAttribute('src'));
    });

    var html = '<!DOCTYPE html>\n' + doc.documentElement.outerHTML;
    var style = document.getElementById('sc4sap-spec-editor-style');
    var me = document.getElementById('sc4sap-spec-editor');
    var added = '<script type="application/json" id="sc4sap-spec-source">' + json(nextSource) + '<\/script>' + (me ? me.outerHTML : '');
    var at = html.toLowerCase().lastIndexOf('</head>');
    if (style && at >= 0) html = html.slice(0, at) + style.outerHTML + html.slice(at);
    at = html.toLowerCase().lastIndexOf('</body>');
    html = at >= 0 ? html.slice(0, at) + added + html.slice(at) : html + added;

    var name = decodeURIComponent((location.pathname.split('/').pop() || 'spec.html')).replace(/(-edited)?\.html?$/i, '') + '-edited.html';
    var url = URL.createObjectURL(new Blob([html], { type: 'text/html;charset=utf-8' }));
    var a = document.createElement('a');
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 10000);
    dirty = false;
    document.body.classList.remove('doc-dirty');
    setStatus(T.saved);
  }
})();
</script>`.replace("__LABELS__", JSON.stringify(LABELS));

/** Elements a reader edits, inside the spec's body. */
const UNITS = "h1, h2, h3, h4, p, li, dt, dd, figcaption, table";

/**
 * `html` with the edit mode in it, or as it was where there is no DOM to
 * mark it with (rendering on the server) or it has one already (a saved
 * copy, opened again).
 */
export function editableSpec(html: string): string {
  if (typeof DOMParser === "undefined" || html.includes('id="sc4sap-spec-source"')) return html;
  const doc = new DOMParser().parseFromString(html, "text/html");
  const main = doc.querySelector("main");
  if (!main) return html;

  let n = 0;
  main.querySelectorAll(UNITS).forEach((el) => {
    if (el.closest("nav, .toolbar, pre")) return;
    // Inside a table the table is the unit; a list item that holds blocks
    // leaves them to be units of their own.
    if (el.tagName !== "TABLE" && el.parentElement?.closest("table")) return;
    if (el.tagName === "LI" && el.querySelector("p, ul, ol, table, pre, blockquote, div")) return;
    el.setAttribute("data-ed", String(n++));
  });
  let k = 0;
  doc.querySelectorAll("img").forEach((img) => img.setAttribute("data-ed-img", String(k++)));

  const page = `<!DOCTYPE html>\n${doc.documentElement.outerHTML}`;
  doc.querySelectorAll("img[data-ed-img]").forEach((img) => img.removeAttribute("src"));
  const source = `<!DOCTYPE html>\n${doc.documentElement.outerHTML}`;
  const holder = `<script type="application/json" id="sc4sap-spec-source">${JSON.stringify(source).replace(/</g, "\\u003c")}</script>`;

  const head = page.toLowerCase().lastIndexOf("</head>");
  const withStyle = head < 0 ? STYLE + page : page.slice(0, head) + STYLE + page.slice(head);
  const body = withStyle.toLowerCase().lastIndexOf("</body>");
  return body < 0
    ? withStyle + holder + SCRIPT
    : withStyle.slice(0, body) + holder + SCRIPT + withStyle.slice(body);
}
