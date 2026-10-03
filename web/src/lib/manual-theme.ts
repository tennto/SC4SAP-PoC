/**
 * Program → Manual's HTML, in this app's look — for the preview and the
 * download alike, as `spec-theme.ts` does for the spec.
 *
 * The plugin's builder (`build-manual.mjs`) writes a complete page with its
 * own stylesheet, a script that draws the callouts, and the edit mode. Those
 * files are vendored, so the page is restyled from outside: a stylesheet
 * after the plugin's, which wins on order. Nothing in the manual's text, its
 * screens or its edit mode changes, and a copy saved from the edit mode keeps
 * the look, since it saves the page as it is.
 *
 * What it changes, against the page as the plugin draws it:
 *   - one ink and hairlines, as in the app and the spec, instead of navy
 *     rules and navy table heads;
 *   - Pretendard at the app's tracking and the spec's type scale;
 *   - the cover's facts as one panel of label-over-value pairs;
 *   - each step as a card whose head is a quiet caption, not a dark table;
 *   - tables with horizontal rules only; check points as a quiet note;
 *   - the toolbar, contents and buttons as the spec's;
 *   - the process flow drawn as SVG from the manual's own data
 *     (`spec-flow.ts`), as the spec's is.
 * The callout marks stay the plugin's pink: they point at the screens, and
 * they are the one colour on the page that means "look here".
 */
import { flowSvg } from "@/lib/spec-flow";

/** The app's typeface, as the spec loads it. */
const TYPE_LINK = `<link rel="stylesheet" crossorigin href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.css">`;

/** The spec's palette, mapped onto the manual's own variable names too. */
const LIGHT =
  "--bg:#ffffff;--fg:#2b2b2b;--muted:#6b6b6b;--faint:#9a9a9a;--line:#e4e4e4;--line-strong:#cfcfcf;--head:#f7f7f7;--card:#f7f7f7;--code:#f3f3f3;--frame:#f7f7f7;--link:#2b2b2b;--accent:#2b2b2b;--accent-ink:#ffffff;" +
  "--warn-bg:#fffaf0;--warn-line:#e9cf97;--flag:#8a5a00;" +
  "--msg-s:#15803d;--msg-w:#c2410c;--msg-e:#b42318;--msg-i:#1d4ed8;" +
  "--flow-ink:#2b2b2b;--flow-muted:#737373;--flow-bg:#ffffff;--flow-line:#b4b4b4;--flow-box:#ffffff;--flow-box-line:#d6d6d6;--flow-dec:#fff8eb;--flow-dec-line:#e9cf97;--flow-dec-ink:#6f4a00;--flow-term:#2b2b2b;--flow-on-term:#ffffff;--flow-bad:#b42318;--flow-bad-soft:#fef3f2;--flow-bad-line:#f4c7c2";
const DARK =
  "--bg:#161616;--fg:#e6e6e6;--muted:#a3a3a3;--faint:#7a7a7a;--line:#2e2e2e;--line-strong:#3d3d3d;--head:#1d1d1d;--card:#1d1d1d;--code:#232323;--frame:#1b1b1b;--link:#e6e6e6;--accent:#e6e6e6;--accent-ink:#161616;" +
  "--warn-bg:#1f1a10;--warn-line:#6b5423;--flag:#f1cf85;" +
  "--msg-s:#4ade80;--msg-w:#fb923c;--msg-e:#f97066;--msg-i:#60a5fa;" +
  "--flow-ink:#e6e6e6;--flow-muted:#a3a3a3;--flow-bg:#161616;--flow-line:#5c5c5c;--flow-box:#1d1d1d;--flow-box-line:#3a3a3a;--flow-dec:#2a2213;--flow-dec-line:#6b5423;--flow-dec-ink:#f1cf85;--flow-term:#e6e6e6;--flow-on-term:#161616;--flow-bad:#f97066;--flow-bad-soft:#2a1715;--flow-bad-line:#6b2a24";

const MONO = `ui-monospace,"Cascadia Mono",Consolas,monospace`;

const STYLE = `<style id="sc4sap-manual-theme">
:root{${LIGHT}}
@media (prefers-color-scheme: dark){:root:not([data-theme=light]){${DARK}}}
:root[data-theme=dark]{${DARK}}

html body{font:15px/1.72 "Pretendard Variable",Pretendard,-apple-system,BlinkMacSystemFont,"Apple SD Gothic Neo","Segoe UI","Noto Sans KR","Malgun Gothic",sans-serif;letter-spacing:-0.03rem;-webkit-font-smoothing:antialiased}
code,pre,kbd,samp{letter-spacing:normal}
::selection{background:color-mix(in srgb,var(--fg) 16%,transparent)}
a{color:var(--link);text-decoration-color:var(--line-strong);text-underline-offset:3px}
code{font:500 0.86em/1.4 ${MONO};background:var(--code);border:1px solid var(--line);border-radius:5px;padding:1px 5px}

/* Toolbar: the spec's. Edit is the page's one primary action. */
.topbar{height:52px;padding:0 24px;gap:4px;background:color-mix(in srgb,var(--bg) 86%,transparent);backdrop-filter:saturate(1.4) blur(10px);-webkit-backdrop-filter:saturate(1.4) blur(10px);border-bottom:1px solid var(--line)}
.topbar .t{font-size:14px;font-weight:600;color:var(--fg)}
.topbar .t code{font-size:12px}
.topbar button{border:0;background:none;border-radius:8px;padding:6px 10px;font-size:13px;color:var(--muted);transition:background .15s,color .15s}
.topbar button:hover{background:var(--head);color:var(--fg)}
.topbar #edit-btn{background:var(--fg);color:var(--bg);font-weight:600;padding:6px 12px;margin-right:4px}
.topbar #edit-btn:hover{background:color-mix(in srgb,var(--fg) 86%,var(--bg))}

/* Column */
[id]{scroll-margin-top:72px}
.layout{max-width:1240px;padding:0 24px 96px;gap:0 56px}
@media (min-width:1100px){.layout{grid-template-columns:200px minmax(0,960px);justify-content:center}}
main{max-width:960px;width:100%;margin:0 auto}

/* Contents */
@media (min-width:1100px){.toc{top:72px;padding:40px 0 20px}}
.toc ol ol{padding-left:12px}
.toc a{padding:5px 10px;border-left:1.5px solid var(--line);border-radius:0;color:var(--muted);line-height:1.45;transition:color .15s,border-color .15s}
.toc a:hover{background:none;color:var(--fg);border-left-color:var(--line-strong)}

/* Type */
h1,h2,h3,h4{letter-spacing:-0.02em;color:var(--fg)}
h2{font-size:21px;line-height:1.35;font-weight:700;border:0;padding:0;margin:64px 0 16px}
h3{font-size:16.5px;line-height:1.45;font-weight:650;margin:36px 0 10px}
h4{font-size:15px;font-weight:650;margin:22px 0 8px}
p,ul,ol{margin:0 0 14px}
ul,ol{padding-left:1.35em}
li{margin:0 0 6px}
li::marker{color:var(--faint)}

/* Cover: the title, then the facts as one panel. Each dt/dd pair is a
   column, label over value, so the plugin's list needs no new markup. */
.cover{padding:56px 0 8px;border:0;gap:0}
.cover .kicker{font-size:12.5px;font-weight:500;letter-spacing:0;color:var(--faint);margin:0 0 10px}
.cover h1{font-size:30px;line-height:1.25;font-weight:700;margin:0 0 28px}
.cover .meta{display:grid;grid-template-rows:auto auto;grid-auto-flow:column;grid-auto-columns:minmax(0,1fr);gap:4px 28px;margin:0 0 12px;padding:18px 22px;background:var(--head);border:1px solid var(--line);border-radius:12px;font-size:14px}
.cover .meta dt{font-size:11.5px;font-weight:500;color:var(--faint);line-height:1.4}
.cover .meta dd{margin:0;font-weight:500;color:var(--fg);line-height:1.5;overflow-wrap:anywhere}
.cover .meta+.kicker{margin:4px 0 0}
@media (max-width:700px){.cover .meta{grid-template-rows:none;grid-auto-flow:row;grid-template-columns:max-content 1fr;gap:6px 18px}}

/* Tables: horizontal rules only, the head a quiet band. */
table{border-collapse:separate;border-spacing:0;border:1px solid var(--line);border-radius:10px;overflow:hidden;margin:10px 0 20px}
th,td{border:0;border-bottom:1px solid var(--line);padding:10px 14px;line-height:1.55}
tr:last-child>td,tr:last-child>th{border-bottom:0}
th{background:var(--head);font-size:12.5px;font-weight:600;color:var(--muted);white-space:nowrap}
td{font-size:14px}
td code{white-space:nowrap}
/* Short columns — a code, a type, a flag — take only what they need, so
   the long text columns beside them cannot squeeze their heads onto two
   lines. */
table[data-array=messages] td:nth-child(-n+2),table[data-array^=fields] td:first-child,td[data-flag]{width:1%;white-space:nowrap}
/* Code cells: a label when they hold a value, nothing at all when they do
   not, and while one is being typed in, plain text in the field's box — the
   pill around a live editor read as broken. */
td>code:has(>span:empty),body.editing td>code:has(>.ed-quill){background:none;border:0;padding:0;border-radius:0}
body.editing td>code:has(>.ed-quill){font:inherit;letter-spacing:inherit}
body.editing td>code>span[data-c]:empty{display:inline-block;min-width:6em;min-height:1.5em;vertical-align:middle;outline:1px dashed color-mix(in srgb,var(--fg) 22%,transparent);outline-offset:3px;border-radius:3px}
body.editing td>code>.ed-quill{min-width:8em}
/* The field being typed in, in every table and text: an input's box. */
body.editing .ed-quill{outline:0!important;box-shadow:0 0 0 1.5px var(--fg);border-radius:6px;background:var(--bg)}
body.editing .ed-quill .ql-editor{padding:3px 6px}
/* Messages: code and type centred, the type in its SAP colour — success
   green, warning orange, error and abort red, information blue. */
table[data-array=messages] th:nth-child(-n+2),table[data-array=messages] td:nth-child(-n+2){text-align:center}
table[data-array=messages] td[data-msg]{font-weight:700}
td[data-msg=S]{color:var(--msg-s)}
td[data-msg=W]{color:var(--msg-w)}
td[data-msg=E],td[data-msg=A],td[data-msg=X]{color:var(--msg-e)}
td[data-msg=I]{color:var(--msg-i)}

/* Badges */
.flag{font-size:11.5px;font-weight:600;color:var(--flag);background:var(--warn-bg);border:1px solid var(--warn-line);border-radius:999px;padding:0 8px;line-height:1.7}

/* Scenarios and steps: each step a card; its head a caption, the step's
   own action set as its title. */
.scenario-goal{color:var(--muted);font-size:14px;margin:-2px 0 16px}
.step{border:1px solid var(--line);border-radius:14px;padding:18px 20px 20px;margin:16px 0;background:var(--bg)}
.step-head{border:0;border-radius:0;margin:0 0 16px;padding:0 0 12px;border-bottom:1px solid var(--line);overflow:visible}
.step-head th,.step-head td{border:0;padding:2px 0;background:none;vertical-align:baseline}
.step-head th{width:112px;font-size:11.5px;font-weight:500;color:var(--faint);border-color:transparent}
.step-head td{font-size:13.5px;color:var(--muted)}
.step-head tr:nth-child(2) td{font-size:16px;font-weight:650;color:var(--fg);letter-spacing:-0.02em}
/* On screen the picture takes the card's full width and the numbered
   instructions follow under it: beside a 300px column the screen was drawn
   too small to read. Print keeps the plugin's slide layout, side by side. */
.step-body{gap:18px}
@media screen{.step-body.has-screen{grid-template-columns:minmax(0,1fr)}}
.step-body.has-screen .callouts{padding:0 2px}
.screen{padding:14px;background:#ffffff;border:1px solid var(--line);border-radius:10px}
.screen figcaption{color:#6b6b6b;font-size:12.5px;margin-top:10px}
.callouts{gap:12px}
.callouts>li{grid-template-columns:24px 1fr;gap:10px;font-size:14.5px;line-height:1.6}
/* The number in its circle, centred both ways: a grid cell the size of the
   circle, a line box no taller than the digits, figures of one width. */
.num{display:inline-grid;place-items:center;width:22px;height:22px;padding:0;font-size:12px;font-weight:700;line-height:1;font-variant-numeric:tabular-nums;letter-spacing:0;margin-top:1px}
.callouts ul{font-size:13.5px;line-height:1.55}
.step-note{font-size:14px;color:var(--muted);margin:14px 0 0}
.step-note b,.step-note strong{color:var(--fg)}
/* "Result:" as a label beside its text, the text's second line under the
   text and not under the label. The edit mode's inline-block field had put
   the text on a line of its own, half under the label. */
.step-note:not([hidden]):has(>strong:first-child){display:grid;grid-template-columns:max-content minmax(0,1fr);gap:0 8px;align-items:baseline}
body.editing .step-note[hidden]:has(>strong:first-child){display:grid!important}
body.editing .step-note>[data-k]{display:block;min-height:1.5em}

/* Check points: a quiet note on a warm ground, edged evenly. */
.checkpoints{margin:16px 0 8px;padding:14px 18px;background:var(--warn-bg);border:1px solid var(--warn-line);border-radius:10px}
.checkpoints h4{font-size:13.5px;margin:0 0 8px}
.checkpoints li{font-size:14px}
.checkpoints .src{font:500 11.5px/1.5 ${MONO};letter-spacing:normal;color:var(--faint)}

/* The process flow, drawn from the manual's data. */
.screen.flow{background:var(--bg);padding:20px;text-align:center}
.screen.flow>svg{display:block;width:auto;max-width:100%;height:auto;margin:0 auto}

.doc-end{margin:64px 0 0;padding:28px 0 0;border-top:1px solid var(--line);font-size:13px}
.doc-end strong{font-size:15px;font-weight:650}

/* ---- Edit mode ---- */

/* The guide: wide enough that each line of it is one line, in a smaller
   size, with room between the text and its button. */
.ed-guide{background:rgb(12 12 12 / 0.42);backdrop-filter:blur(2px)}
.ed-guide>div{max-width:min(720px,calc(100vw - 32px));padding:28px 32px 24px;border-radius:16px;border:1px solid var(--line);box-shadow:0 24px 64px -16px rgb(0 0 0 / 0.35)}
.ed-guide h3{font-size:17px;font-weight:700;margin:0 0 14px}
.ed-guide ol{margin:0 0 28px;padding-left:20px;font-size:13.5px;line-height:1.8;color:var(--fg)}
.ed-guide li{margin:0 0 2px}
.ed-guide li::marker{color:var(--faint);font-variant-numeric:tabular-nums}
@media (min-width:760px){.ed-guide li{white-space:nowrap}}
.ed-guide>div>button{display:block;margin-left:auto;font-size:13.5px;font-weight:600;padding:8px 22px;border-radius:9px;border:0;background:var(--fg);color:var(--bg)}
.ed-guide>div>button:hover{background:color-mix(in srgb,var(--fg) 86%,var(--bg))}

/* The controls on the page: quiet buttons of one height, a softer hint of
   the field outlines, and small marks for delete and insert. */
body.editing .ed-tools{gap:4px;margin:0 0 14px;padding:0 0 12px;border-bottom:1px dashed var(--line)}
body.editing .ed-tools button,body.editing .ed-addrow{display:inline-flex;align-items:center;gap:5px;height:28px;padding:0 10px;font-size:12.5px;font-weight:500;color:var(--muted);background:var(--bg);border:1px solid var(--line);border-radius:8px;transition:background .15s,color .15s,border-color .15s}
body.editing .ed-tools button:hover,body.editing .ed-addrow:hover{background:var(--head);color:var(--fg);border-color:var(--line-strong)}
body.editing .ed-tools button:nth-child(4):hover{color:var(--msg-e);border-color:color-mix(in srgb,var(--msg-e) 40%,var(--line))}
body.editing .ed-addrow{margin:-6px 0 20px}
/* The editor's buttons start with a glyph; the script below puts it in its
   own span, and draws the plus and the cross as one pair of icons — the
   two characters come from different fonts at different sizes. */
.ed-glyph{display:inline-block;font-size:11px;line-height:1}
.ed-glyph>svg{display:block;width:10px;height:10px;stroke:currentColor;stroke-width:1.6;stroke-linecap:round;fill:none}
body.editing .ed-x,body.editing .ed-rowtools button{display:inline-grid;place-items:center;width:22px;height:22px;padding:0;margin:0 2px;font-size:10.5px;line-height:1;color:var(--faint);background:none;border:1px solid transparent;border-radius:6px;transition:background .15s,color .15s}
body.editing .ed-x:hover,body.editing .ed-rowtools button:hover{background:var(--head);color:var(--fg);border-color:var(--line)}
body.editing .ed-x:hover,body.editing .ed-rowtools button:last-child:hover{color:var(--msg-e)}
body.editing td.ed-rowtools{padding:6px 8px;vertical-align:middle}
/* Columns hold the widths they had when editing began (the script below
   measures them), so typing in a cell does not reflow the table. */
body.editing table.ed-table[data-frozen]{table-layout:fixed}
body.editing table.ed-table[data-frozen]>thead>tr>th{width:var(--ed-w)}
body.editing table.ed-table[data-frozen] td{overflow-wrap:anywhere}
body.editing td.ed-rowtools>button{vertical-align:middle}
body.editing .callouts>li>.ed-x{align-self:center}
body.editing [data-p],body.editing [data-k],body.editing [data-c]{outline:1px dashed color-mix(in srgb,var(--fg) 22%,transparent);outline-offset:3px;border-radius:3px}
body.editing [data-p]:hover,body.editing [data-k]:hover,body.editing [data-c]:hover{outline-color:color-mix(in srgb,var(--fg) 45%,transparent)}
body.editing .step.ed-current{box-shadow:0 0 0 2px color-mix(in srgb,var(--fg) 70%,transparent)}
/* While editing, Save is the one filled button; "Done editing" steps back. */
body.editing .topbar #edit-btn{background:none;color:var(--fg);box-shadow:inset 0 0 0 1px var(--line-strong)}
body.editing .topbar #edit-btn:hover{background:var(--head)}
.ed-bar{gap:4px}
.ed-bar .status{font-size:12px;color:var(--faint);margin-right:6px}
/* The bar's controls join the toolbar's own row, so "Done editing" can sit
   before "Save file": undo, help, done, save, then print and theme. */
.ed-bar:not([hidden]){display:contents}
.topbar>.t{order:0}
.ed-bar>.status{order:1}
.ed-bar>button:not(.primary){order:2}
.topbar>#edit-btn{order:3}
.ed-bar>button.primary{order:4;display:inline-flex;align-items:center;gap:6px;margin-right:4px}
.ed-bar>button.primary svg{width:14px;height:14px;stroke:currentColor;stroke-width:1.8;fill:none;stroke-linecap:round;stroke-linejoin:round}
.topbar>#print-btn{order:5}
.topbar>#theme-btn{order:6}

@media print{
  :root,:root:not([data-theme=light]),:root[data-theme=dark]{${LIGHT}}
  .step{border:0;border-radius:0;padding:0}
  table{border-radius:0}
}
</style>`;

/**
 * Marks each message's type cell with its letter (`data-msg="E"`) for the
 * colours above, and again whenever the edit mode changes the table — CSS
 * cannot read a cell's text. Kept in the page, so a saved copy keeps it.
 */
const SCRIPT = `<script id="sc4sap-manual-theme-script">
(function () {
  // The edit mode's buttons, as it adds them: the leading glyph in a span.
  var GLYPH = /^([\\uFF0B\\u2715\\u25B2\\u25BC\\u29C9\\u21BA])\\s?([\\s\\S]*)$/;
  var BUTTONS = '.ed-addrow,.ed-tools button,.ed-rowtools button,.ed-x';
  function glyphs() {
    document.querySelectorAll(BUTTONS).forEach(function (button) {
      if (button.querySelector('.ed-glyph')) return;
      var match = GLYPH.exec(button.textContent || '');
      if (!match) return;
      var glyph = document.createElement('span');
      glyph.className = 'ed-glyph';
      var path = match[1] === '\\uFF0B' ? 'M5 1V9M1 5H9' : match[1] === '\\u2715' ? 'M2 2L8 8M8 2L2 8' : null;
      if (path) glyph.innerHTML = '<svg viewBox="0 0 10 10" aria-hidden="true"><path d="' + path + '"/></svg>';
      else glyph.textContent = match[1];
      button.textContent = '';
      button.appendChild(glyph);
      if (match[2]) button.appendChild(document.createTextNode(match[2]));
    });
    // "Save" downloads a file: say so, with the icon for it.
    var save = document.querySelector('.ed-bar>button.primary');
    if (save && !save.hasAttribute('data-file')) {
      save.setAttribute('data-file', '');
      save.innerHTML = '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M8 2.5v7.5M4.8 7 8 10.2 11.2 7M3 12.5h10"/></svg>' + SAVE_LABEL;
    }
  }
  var SAVE_LABEL = ({ ko: '\\uD30C\\uC77C \\uC800\\uC7A5', ja: '\\u30D5\\u30A1\\u30A4\\u30EB\\u4FDD\\u5B58' })[(document.documentElement.lang || '').slice(0, 2)] || 'Save file';
  var queued = false;
  new MutationObserver(function () {
    if (queued) return;
    queued = true;
    requestAnimationFrame(function () { queued = false; glyphs(); });
  }).observe(document.body, { subtree: true, childList: true });
})();
(function () {
  // On entering the edit mode, each table's column widths are measured and
  // held (CSS above, only while editing); leaving it lets them go.
  function freeze(on) {
    document.querySelectorAll('table.ed-table').forEach(function (table) {
      var heads = table.querySelectorAll(':scope>thead>tr>th');
      if (!on) {
        table.removeAttribute('data-frozen');
        heads.forEach(function (th) { th.style.removeProperty('--ed-w'); });
        return;
      }
      var widths = Array.prototype.map.call(heads, function (th) { return th.getBoundingClientRect().width; });
      heads.forEach(function (th, i) { th.style.setProperty('--ed-w', widths[i] + 'px'); });
      table.setAttribute('data-frozen', '');
    });
  }
  var editing = document.body.classList.contains('editing');
  new MutationObserver(function () {
    var now = document.body.classList.contains('editing');
    if (now === editing) return;
    editing = now;
    // After the edit mode has added its row tools and laid the table out.
    if (now) requestAnimationFrame(function () { requestAnimationFrame(function () { freeze(true); }); });
    else freeze(false);
  }).observe(document.body, { attributes: true, attributeFilter: ['class'] });
})();
(function () {
  // The plugin's badges on the screens set their number 4 units below the
  // circle's centre, which sits low in most fonts: centre it on the circle.
  function centre() {
    document.querySelectorAll('g.callout-badge').forEach(function (badge) {
      var circle = badge.querySelector('circle'), label = badge.querySelector('text');
      if (!circle || !label || label.getAttribute('data-centred')) return;
      label.setAttribute('y', circle.getAttribute('cy'));
      label.setAttribute('x', circle.getAttribute('cx'));
      label.setAttribute('dominant-baseline', 'central');
      label.setAttribute('text-anchor', 'middle');
      label.setAttribute('data-centred', '1');
    });
  }
  centre();
  var queued = false;
  new MutationObserver(function () {
    if (queued) return;
    queued = true;
    requestAnimationFrame(function () { queued = false; centre(); });
  }).observe(document.body, { subtree: true, childList: true });
})();
(function () {
  // Tab moves to the next field (Shift+Tab to the one before) instead of
  // typing a tab into this one. Runs before the editor's own keys.
  var FIELDS = '[data-p],[data-k],[data-c]';
  addEventListener('keydown', function (event) {
    if (event.key !== 'Tab' || event.altKey || event.ctrlKey || event.metaKey) return;
    var target = event.target instanceof Element ? event.target : null;
    var current = target && (target.closest('.ed-quill') || target.closest(FIELDS));
    if (!current || !document.body.classList.contains('editing')) return;
    var fields = Array.prototype.filter.call(document.querySelectorAll(FIELDS), function (field) {
      return field.getClientRects().length > 0 && !field.closest('[hidden]');
    });
    var at = fields.indexOf(current);
    var next = fields[at + (event.shiftKey ? -1 : 1)];
    event.preventDefault();
    event.stopImmediatePropagation();
    if (!next) return;
    next.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true, view: window }));
    if (next.isContentEditable) next.focus();
    next.scrollIntoView({ block: 'nearest' });
  }, true);
})();
(function () {
  // The cover and the toolbar follow the revision history's last row: its
  // version, date and author, as soon as they are typed.
  var table = document.querySelector('table[data-array=revisions]');
  var cover = document.querySelector('.cover .meta');
  if (!table || !cover) return;
  var LABELS = {
    version: ['\\uBC84\\uC804', 'Version', '\\u7248'],
    date: ['\\uC77C\\uC790', 'Date', '\\u65E5\\u4ED8'],
    author: ['\\uC791\\uC131\\uC790', 'Author', '\\u4F5C\\u6210\\u8005'],
  };
  function dd(key) {
    var found = null;
    cover.querySelectorAll('dt').forEach(function (dt) {
      if (LABELS[key].indexOf((dt.textContent || '').trim()) >= 0) found = dt.nextElementSibling;
    });
    return found;
  }
  function text(row, key) {
    var span = row.querySelector('[data-c=' + key + ']');
    // A cell being typed in holds the editor and its toolbar: read the text.
    var source = span && (span.querySelector('.ql-editor') || span);
    return source ? (source.textContent || '').trim() : '';
  }
  function sync() {
    var rows = table.querySelectorAll(':scope>tbody>tr');
    var last = null;
    for (var i = rows.length - 1; i >= 0 && !last; i--) if (text(rows[i], 'version')) last = rows[i];
    if (!last) return;
    var version = text(last, 'version');
    var shown = /^v/i.test(version) ? version : 'v' + version;
    var cell = dd('version');
    if (cell && cell.textContent !== shown) cell.textContent = shown;
    ['date', 'author'].forEach(function (key) {
      var value = text(last, key), cell = dd(key);
      if (cell && value && cell.textContent !== value) cell.textContent = value;
    });
    var bar = document.querySelector('.topbar .t');
    var tail = bar && bar.lastChild;
    if (tail && tail.nodeType === 3) {
      var updated = tail.textContent.replace(/v[^\\s]*\\s*$/, shown);
      if (updated !== tail.textContent) tail.textContent = updated;
    }
  }
  sync();
  new MutationObserver(sync).observe(table, { subtree: true, childList: true, characterData: true });
})();
(function () {
  var table = document.querySelector('table[data-array=messages]');
  if (!table) return;
  function paint() {
    table.querySelectorAll('span[data-c=type]').forEach(function (span) {
      var cell = span.closest('td');
      var letter = (span.textContent || '').trim().charAt(0).toUpperCase();
      if (!cell) return;
      if (letter) cell.setAttribute('data-msg', letter);
      else cell.removeAttribute('data-msg');
    });
  }
  paint();
  new MutationObserver(paint).observe(table, { subtree: true, childList: true, characterData: true });
})();
</script>`;

/** Inserts `added` just before `</body>`, or at the end when there is none. */
function inBody(html: string, added: string): string {
  const at = html.toLowerCase().lastIndexOf("</body>");
  return at < 0 ? html + added : html.slice(0, at) + added + html.slice(at);
}

/**
 * The edit guide, one short sentence a line. The plugin's has five long
 * items that wrap in any dialog a page can hold, and says edits are kept in
 * the browser, which the preview's sandbox does not allow.
 */
const GUIDE: Record<string, string[]> = {
  ko: [
    "글자를 클릭하면 바로 고칠 수 있습니다.",
    "글자를 선택하면 굵게 · 강조 · 목록 버튼이 나타납니다.",
    "화면 위 번호는 드래그해서 옮깁니다.",
    "스텝 위 버튼으로 번호를 추가하고, 스텝을 이동 · 복제 · 삭제합니다.",
    "표는 행 끝의 ＋ / ✕로 행을 추가 · 삭제하고, ● 칸은 클릭해 켜고 끕니다.",
    "스텝을 클릭하고 Ctrl+V 하면 그림 대신 실제 캡처 화면이 들어갑니다.",
    "실수했으면 Ctrl+Z(되돌리기)를 누릅니다.",
    "다 고쳤으면 [저장]을 누르고, 받은 파일을 담당 컨설턴트에게 보내 주세요.",
  ],
  en: [
    "Click any text to change it.",
    "Select text for the bold, highlight and list buttons.",
    "Drag a number on the screen to move it.",
    "The buttons above a step add callouts and move, duplicate or delete the step.",
    "In tables, ＋ / ✕ at the end of a row add and delete rows; click a ● cell to switch it.",
    "Click a step and press Ctrl+V to use a real screenshot instead of the drawing.",
    "Made a mistake? Press Ctrl+Z (Undo).",
    "When you are done, press [Save] and send the file to your consultant.",
  ],
  ja: [
    "文字をクリックするとそのまま修正できます。",
    "文字を選択すると 太字 · 強調 · リスト のボタンが出ます。",
    "画面上の番号はドラッグで移動します。",
    "ステップ上のボタンで番号を追加し、ステップを移動 · 複製 · 削除します。",
    "表は行末の ＋ / ✕ で行を追加 · 削除し、● の欄はクリックで切り替えます。",
    "ステップをクリックして Ctrl+V で、図の代わりに実際のキャプチャを使えます。",
    "間違えたら Ctrl+Z（元に戻す）を押します。",
    "終わったら［保存］を押し、ファイルを担当コンサルタントに送ってください。",
  ],
};

/** JSON inside a `<script>`: nothing in it may close the element. */
const embed = (value: unknown): string =>
  JSON.stringify(value)
    .replace(/</g, "\\u003c")
    .split(String.fromCharCode(0x2028)).join("\\u2028")
    .split(String.fromCharCode(0x2029)).join("\\u2029");

const EDITOR_LABELS = /(<script type="application\/json" id="editor-labels">)([\s\S]*?)(<\/script>)/;
const MANUAL_SOURCE = /(<script type="application\/json" id="manual-source">)([\s\S]*?)(<\/script>)/;

/** The editor's labels with the guide above. */
function withGuide(html: string, lang: string): string {
  const guide = GUIDE[lang.slice(0, 2).toLowerCase()];
  const match = EDITOR_LABELS.exec(html);
  if (!guide || !match) return html;
  try {
    const labels = JSON.parse(match[2]!) as Record<string, unknown>;
    const replaced = match[1]! + embed({ ...labels, guide }) + match[3]!;
    return html.slice(0, match.index) + replaced + html.slice(match.index + match[0].length);
  } catch {
    return html;
  }
}

const unescapeHtml = (text: string): string =>
  text.replace(/&quot;/g, '"').replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&");

/** A cell the builder wrote with its `inline()` markup, back to that markup. */
function markupOf(cell: string): string {
  return unescapeHtml(
    cell
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<span class="bl">([\s\S]*?)<\/span>/g, "- $1")
      .replace(/<strong>([\s\S]*?)<\/strong>/g, "**$1**")
      .replace(/<mark class="em">([\s\S]*?)<\/mark>/g, "==$1==")
      .replace(/<code>([\s\S]*?)<\/code>/g, "`$1`")
      .replace(/<[^>]+>/g, ""),
  );
}

const REVISION_COLS = ["version", "date", "author", "note"] as const;

/**
 * The revision history as a table the edit mode can change: rows added and
 * deleted, every cell edited, like the field and message tables.
 *
 * The builder draws it from its history file, not from manual.json, as a
 * plain table. Here it becomes one of the edit mode's own tables, bound to a
 * `revisions` array that is added to the embedded manual with the rows as
 * they are, so a cell opens on its text. A copy saved from the edit mode
 * keeps the table and the array; the plugin's builder ignores the key.
 */
function editableRevisions(html: string, source: ManualSource | null): string {
  const section = /<section id="revision"[^>]*>[\s\S]*?<\/section>/.exec(html);
  const sourceTag = MANUAL_SOURCE.exec(html);
  if (!section || !source || !sourceTag) return html;
  const table = /<table><thead>([\s\S]*?)<\/thead><tbody>([\s\S]*?)<\/tbody><\/table>/.exec(section[0]);
  if (!table) return html;
  const rows = [...table[2]!.matchAll(/<tr>([\s\S]*?)<\/tr>/g)].map((row) =>
    [...row[1]!.matchAll(/<td>([\s\S]*?)<\/td>/g)].map((cell) => cell[1]!),
  );
  const revisions = rows.map((cells) =>
    Object.fromEntries(REVISION_COLS.map((key, i) => [key, markupOf(cells[i] ?? "")])),
  );
  const cols = REVISION_COLS.map((key) => ({ key, kind: "text" }));
  const body = rows
    .map(
      (cells, i) =>
        `<tr data-row="${i}">` +
        REVISION_COLS.map((key, c) => `<td><span data-c="${key}">${cells[c] ?? ""}</span></td>`).join("") +
        `</tr>`,
    )
    .join("");
  const edTable =
    `<table class="ed-table" data-array="revisions" data-cols="${JSON.stringify(cols).replace(/"/g, "&quot;")}">` +
    `<thead>${table[1]}</thead><tbody>${body}</tbody></table>`;
  const newSection = section[0].replace(table[0], edTable);
  const newSource =
    sourceTag[1]! + embed({ manual: { ...source.manual, revisions }, version: source.version }) + sourceTag[3]!;
  // The source comes after the section, so replacing it first keeps the
  // section's offset.
  let page = html.slice(0, sourceTag.index) + newSource + html.slice(sourceTag.index + sourceTag[0].length);
  page = page.slice(0, section.index) + newSection + page.slice(section.index + section[0].length);
  return page;
}

type ManualSource = {
  manual: Record<string, unknown> & { lang?: string; processFlow?: unknown };
  version: unknown;
};

/** The manual as its builder embedded it — see `build-manual.mjs`. */
function manualSource(html: string): ManualSource | null {
  const match = MANUAL_SOURCE.exec(html);
  if (!match) return null;
  try {
    const parsed = JSON.parse(match[2]!) as { manual?: ManualSource["manual"]; version?: unknown };
    return parsed.manual ? { manual: parsed.manual, version: parsed.version } : null;
  } catch {
    return null;
  }
}

/** The "process flow" heading in each of the builder's languages. */
const FLOW_HEADINGS = ["처리 흐름", "Process Flow", "処理フロー"];

/** Inserts `added` just before `</head>`, or at the start when there is none. */
function inHead(html: string, added: string): string {
  const at = html.toLowerCase().indexOf("</head>");
  return at < 0 ? added + html : html.slice(0, at) + added + html.slice(at);
}

/**
 * The manual as it is shown and saved: restyled, and with the builder's flow
 * picture replaced by the drawn one. A page that was restyled already — a
 * copy saved from the edit mode — is left as it is.
 */
export function styledManual(html: string): string {
  if (html.includes('id="sc4sap-manual-theme"')) return html;
  let page = html;
  const source = manualSource(html);
  const manual = source?.manual ?? null;
  const drawn = manual?.processFlow ? flowSvg({ lang: manual.lang, processFlow: manual.processFlow }) : null;
  if (drawn) {
    for (const heading of FLOW_HEADINGS) {
      const marker = `<h3>${heading}</h3><figure class="screen">`;
      const at = page.indexOf(marker);
      if (at < 0) continue;
      const end = page.indexOf("</figure>", at);
      if (end < 0) break;
      page =
        page.slice(0, at) +
        `<h3>${heading}</h3><figure class="screen flow">${drawn.svg}</figure>` +
        page.slice(end + "</figure>".length);
      break;
    }
  }
  // Revisions first: it reads the source the flow step left untouched.
  page = editableRevisions(page, source);
  page = withGuide(page, String(manual?.lang ?? ""));
  return inBody(inHead(page, TYPE_LINK + STYLE), SCRIPT);
}
