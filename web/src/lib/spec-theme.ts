/**
 * Program → Spec's HTML, in this app's look — for the preview and the
 * download alike.
 *
 * The plugin's converter (`md-to-html.mjs`) writes a complete page: its own
 * stylesheet, then its own script, which builds the toolbar, the folds and the
 * sortable tables. That file is vendored, and a local edit to it is lost at
 * the next update, so the page is restyled from outside instead: a
 * stylesheet after the plugin's, which wins on order, and a script after the
 * plugin's, which works on what it built. Nothing in the spec's text changes.
 *
 * What it changes, against the page as the plugin draws it:
 *   - one ink and hairlines, as in the app, instead of GitHub blue on grey;
 *   - Pretendard at the app's tracking, a clearer type scale, more air
 *     between sections than inside them;
 *   - a centred column; the purpose as a lead paragraph under the title and
 *     the other facts in one line, not five equal cards; no chip row that
 *     repeats the contents;
 *   - one fold toggle instead of two buttons, and no contents button where
 *     the contents are already on screen;
 *   - tables with horizontal rules only, identifiers in monospace, numbers
 *     right-aligned, and sorting only where a table is long enough for it;
 *   - pictures in a framed box with their caption inside it;
 *   - folds that ease open and shut, and fold arrows only on hover;
 *   - the process flow drawn as SVG from the run's data (`spec-flow.ts`).
 */
import { flowSvg, type ImageSpec } from "@/lib/spec-flow";

/** The app's typeface, from the same jsDelivr stylesheet the app loads. */
const TYPE_LINK = `<link rel="stylesheet" crossorigin href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.css">`;

const LIGHT =
  "--bg:#ffffff;--fg:#2b2b2b;--muted:#6b6b6b;--faint:#9a9a9a;--line:#e4e4e4;--line-strong:#cfcfcf;--head:#f7f7f7;--code:#f3f3f3;--link:#2b2b2b;--card:#f7f7f7;--accent:#383838;--hl:#fff6d6;--frame:#f7f7f7;" +
  "--flow-ink:#2b2b2b;--flow-muted:#737373;--flow-bg:#ffffff;--flow-line:#b4b4b4;--flow-box:#ffffff;--flow-box-line:#d6d6d6;--flow-dec:#fff8eb;--flow-dec-line:#e9cf97;--flow-dec-ink:#6f4a00;--flow-term:#2b2b2b;--flow-on-term:#ffffff;--flow-bad:#b42318;--flow-bad-soft:#fef3f2;--flow-bad-line:#f4c7c2";
const DARK =
  "--bg:#161616;--fg:#e6e6e6;--muted:#a3a3a3;--faint:#7a7a7a;--line:#2e2e2e;--line-strong:#3d3d3d;--head:#1d1d1d;--code:#232323;--link:#e6e6e6;--card:#1d1d1d;--accent:#e6e6e6;--hl:#3a3000;--frame:#1b1b1b;" +
  "--flow-ink:#e6e6e6;--flow-muted:#a3a3a3;--flow-bg:#161616;--flow-line:#5c5c5c;--flow-box:#1d1d1d;--flow-box-line:#3a3a3a;--flow-dec:#2a2213;--flow-dec-line:#6b5423;--flow-dec-ink:#f1cf85;--flow-term:#e6e6e6;--flow-on-term:#161616;--flow-bad:#f97066;--flow-bad-soft:#2a1715;--flow-bad-line:#6b2a24";

const STYLE = `<style id="sc4sap-spec-theme">
:root{${LIGHT}}
@media (prefers-color-scheme: dark){:root:not([data-theme=light]){${DARK}}}
:root[data-theme=dark]{${DARK}}

html body{font:15px/1.72 "Pretendard Variable",Pretendard,-apple-system,BlinkMacSystemFont,"Apple SD Gothic Neo","Segoe UI","Noto Sans KR","Malgun Gothic",sans-serif;letter-spacing:-0.03rem;-webkit-font-smoothing:antialiased}
code,pre,kbd,samp,.anno,td.id{letter-spacing:normal}
::selection{background:color-mix(in srgb,var(--accent) 18%,transparent)}

/* Column */
.layout{max-width:1160px;padding:0 24px 96px;gap:0 56px}
main{max-width:820px;width:100%;margin:0 auto}
@media (min-width:1100px){.layout{grid-template-columns:200px minmax(0,820px);justify-content:center}}

/* Type */
h1,h2,h3,h4{letter-spacing:-0.02em;color:var(--fg)}
h1{font-size:30px;line-height:1.25;font-weight:700;margin:48px 0 12px}
h2{font-size:21px;line-height:1.35;font-weight:700;border:0;padding:0;margin:48px 0 14px}
h3{font-size:16.5px;font-weight:650;margin:32px 0 10px}
h4{font-size:15px;font-weight:650;margin:24px 0 8px}
.sec>h2:first-child{margin-top:48px}
p,ul,ol,blockquote,pre,.table-wrap,figure,details{margin:0 0 14px}
ul,ol{padding-left:1.35em}
li{margin:0 0 6px}
li::marker{color:var(--faint)}
a{color:var(--link);text-decoration-color:var(--line-strong);text-underline-offset:3px}
a:hover{text-decoration-color:currentColor}
h2 a.hash{display:none}
blockquote{border-left:2px solid var(--line-strong);color:var(--muted);padding:2px 0 2px 16px}
hr{border-top-color:var(--line)}
.tech{color:var(--muted);font-size:14px}

/* Code and annotations */
code{font:500 0.9em/1.4 ui-monospace,"Cascadia Mono",Consolas,monospace;background:var(--code);border:1px solid var(--line);border-radius:5px;padding:1px 5px}
pre{background:var(--code);border:1px solid var(--line);border-radius:10px;padding:14px 16px}
pre code{border:0;font-size:13px;line-height:1.6}
.anno{display:inline-block;margin-left:6px;padding:0 6px;border-radius:4px;background:var(--head);border:1px solid var(--line);color:var(--muted);font:500 12px/1.6 ui-monospace,"Cascadia Mono",Consolas,monospace;font-style:normal;vertical-align:1px}

/* Title block: the title, the purpose under it, then the facts as one
   panel of label-over-value pairs on a grid. A row split by rules left the
   first item without one and read as a stray. */
.hero{padding:0;border:0;margin:0 0 8px}
.hero h1{margin-bottom:18px}
.lede{margin:0 0 28px;max-width:46em}
.lede-label{display:block;font-size:11.5px;font-weight:500;color:var(--faint);line-height:1.4;margin:0 0 4px}
.lede p{font-size:17px;line-height:1.7;color:var(--fg);margin:0}
.facts{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:16px 28px;margin:0 0 32px;padding:18px 22px;background:var(--head);border:1px solid var(--line);border-radius:12px}
.facts>div{background:none;border:0;border-radius:0;padding:0;min-width:0}
.facts>div.wide{grid-column:1/-1}
.facts dt{font-size:11.5px;font-weight:500;color:var(--faint);text-transform:none;letter-spacing:0;line-height:1.4;margin:0 0 4px}
.facts dd{margin:0;font-size:14px;font-weight:500;line-height:1.5;color:var(--fg);word-break:keep-all;overflow-wrap:anywhere}
.chips{display:none}

/* Toolbar */
.toolbar{padding:0 24px;height:52px;gap:4px;background:color-mix(in srgb,var(--bg) 86%,transparent);backdrop-filter:saturate(1.4) blur(10px);border-bottom:1px solid var(--line)}
.toolbar .title{font-size:14px;font-weight:600;color:var(--fg)}
.toolbar button{border:0;background:none;border-radius:8px;padding:6px 10px;font-size:13px;color:var(--muted);transition:background .15s,color .15s}
.toolbar button:hover{background:var(--head);color:var(--fg);border-color:transparent}
.toolbar button[aria-pressed=true]{background:var(--fg);color:var(--bg)}
.toolbar .seg{background:var(--head);border-radius:9px;padding:2px}
.toolbar .seg button{border-radius:7px!important;border:0!important;padding:4px 10px}
.toolbar .seg button[aria-pressed=true]{background:var(--bg);color:var(--fg);box-shadow:0 0 0 1px var(--line)}
.toolbar .is-hidden{display:none}
@media (min-width:1100px){.toolbar .contents-button{display:none}}

/* Contents */
.toc{font-size:13.5px}
@media (min-width:1100px){.toc{top:76px}.toc>details>summary{font-size:12px;font-weight:600;color:var(--faint);margin:0 0 8px}}
.toc ol{margin:0}
.toc a{padding:5px 10px;border-left:1.5px solid var(--line);border-radius:0;color:var(--muted);line-height:1.45;transition:color .15s,border-color .15s}
.toc a:hover{background:none;color:var(--fg)}
.toc a.active{background:none;color:var(--fg);border-left-color:var(--fg);font-weight:600}

/* Tables */
.table-wrap{border:1px solid var(--line);border-radius:10px;margin:0 0 20px}
th,td{border-right:0;border-bottom:1px solid var(--line);padding:10px 14px;line-height:1.55}
th{background:var(--head);font-size:12.5px;font-weight:600;color:var(--muted);white-space:nowrap}
td{font-size:14px}
tbody tr:hover{background:color-mix(in srgb,var(--head) 60%,transparent)}
td.id{font:500 13px/1.55 ui-monospace,"Cascadia Mono",Consolas,monospace}
td.num,th.num{text-align:right;font-variant-numeric:tabular-nums}
th.sortable::after{content:"";margin:0}
th.sortable:hover::after{content:"↕";opacity:.45;margin-left:.4em}
th[aria-sort=ascending]::after{content:"↑";opacity:.9;margin-left:.4em}
th[aria-sort=descending]::after{content:"↓";opacity:.9;margin-left:.4em}
.tbl-tools input,.tbl-tools button{border-radius:8px}
a.xref{text-decoration:none}
a.xref:hover{text-decoration:underline;text-decoration-color:var(--line-strong)}

/* Pictures */
figure{margin:16px 0 20px;padding:20px;background:var(--frame);border:1px solid var(--line);border-radius:12px;text-align:center}
figure img{border:0;border-radius:6px;background:transparent;display:block;margin:0 auto}
figure svg.spec-flow{display:block;margin:0 auto;max-width:100%;height:auto}
figcaption{margin-top:14px;font-size:12.5px;color:var(--muted);text-align:left}
figure:has(svg.spec-flow){background:var(--bg)}

/* Folding */
button.fold{left:-1.5em;top:.35em;opacity:0;transition:opacity .15s,transform .2s}
h2:hover>button.fold,button.fold:focus-visible,.sec.collapsed>h2>button.fold{opacity:1}
.sec.collapsed>.sec-body{display:grid}
.sec.collapsed>h2{margin-bottom:0}
.sec.collapsed+.sec>h2{margin-top:28px}
.sec-body{display:grid;grid-template-rows:1fr;transition:grid-template-rows .22s cubic-bezier(.16,1,.3,1),opacity .22s}
.sec-body>.sec-inner{min-height:0;overflow:hidden}
.sec.collapsed>.sec-body{grid-template-rows:0fr;opacity:0}
@media (prefers-reduced-motion:reduce){.sec-body,button.fold,.toc a,.toolbar button{transition:none}}

@media print{
  .sec.collapsed>.sec-body{grid-template-rows:1fr;opacity:1}
  .sec-body>.sec-inner{overflow:visible}
  figure{background:none;border:1px solid #ccc}
  .facts>div{border-left-color:#ccc}
}
</style>`;

// Plain ES2017, run after the plugin's own script. `L` is its labels.
const SCRIPT = `<script id="sc4sap-spec-theme-script">
(function () {
  var main = document.querySelector('main');
  if (!main) return;
  var labels = typeof L === 'object' && L ? L : {};

  // The one-line purpose as the lead under the title, still under its own
  // label; every other fact stays in the panel. Only that one: "업무 목적"
  // or any other label that merely mentions a purpose is left where it is.
  var facts = document.querySelector('.hero .facts');
  if (facts) {
    var purpose = null;
    var PURPOSE = /^(목적|purpose|目的)$|한\\s*줄\\s*목적|one[-\\s]line\\s*purpose|一行/i;
    Array.prototype.forEach.call(facts.children, function (item) {
      var dt = item.querySelector('dt');
      if (!purpose && dt && PURPOSE.test(dt.textContent.trim())) purpose = item;
    });
    if (purpose) {
      var lede = document.createElement('div');
      lede.className = 'lede';
      var label = document.createElement('span');
      label.className = 'lede-label';
      label.innerHTML = purpose.querySelector('dt').innerHTML;
      var text = document.createElement('p');
      text.innerHTML = purpose.querySelector('dd').innerHTML;
      lede.appendChild(label);
      lede.appendChild(text);
      purpose.remove();
      var h1 = document.querySelector('.hero h1') || document.querySelector('main h1');
      if (h1) h1.insertAdjacentElement('afterend', lede);
    }
  }

  // A long fact takes the panel's whole width rather than squeezing a column.
  if (facts) Array.prototype.forEach.call(facts.children, function (item) {
    var dd = item.querySelector('dd');
    if (dd && dd.textContent.trim().length > 36) item.classList.add('wide');
  });

  // Contents: which section is current. The plugin marks the last heading
  // that has scrolled past the top, which the last short sections never do —
  // the page ends first — so a link to one of them was followed and not
  // marked. Here, after the plugin's pass: a heading just jumped to stays
  // current while it is on screen, and at the bottom the last one visible is.
  var tocLinks = Array.prototype.slice.call(document.querySelectorAll('nav.toc a[href^="#"]'));
  var targetOf = function (a) {
    var raw = a.getAttribute('href').slice(1);
    try { raw = decodeURIComponent(raw); } catch (e) {}
    return document.getElementById(raw);
  };
  var pinned = null;
  var mark = function (link) {
    tocLinks.forEach(function (a) { a.classList.toggle('active', a === link); });
  };
  var current = function () {
    var pairs = tocLinks.map(function (a) { return [a, targetOf(a)]; })
      .filter(function (p) { return p[1] && p[1].offsetParent; });
    if (!pairs.length) return null;
    if (pinned) {
      var t = targetOf(pinned);
      var r = t && t.getBoundingClientRect();
      if (r && r.top >= 0 && r.top < innerHeight - 40) return pinned;
      pinned = null;
    }
    var root = document.scrollingElement || document.documentElement;
    if (root.scrollTop + innerHeight >= root.scrollHeight - 2) {
      for (var i = pairs.length - 1; i >= 0; i--) {
        if (pairs[i][1].getBoundingClientRect().top < innerHeight - 40) return pairs[i][0];
      }
    }
    var found = null;
    pairs.forEach(function (p) { if (p[1].getBoundingClientRect().top < 100) found = p[0]; });
    return found;
  };
  if (tocLinks.length) {
    var waiting = false;
    addEventListener('scroll', function () {
      if (waiting) return;
      waiting = true;
      // Behind the plugin's own 60ms pass, so this has the last word.
      setTimeout(function () { waiting = false; mark(current()); }, 90);
    }, { passive: true });
    // Scrolling by hand lets go of the jump.
    ['wheel', 'touchmove', 'keydown'].forEach(function (type) {
      addEventListener(type, function () { pinned = null; }, { passive: true });
    });
    tocLinks.forEach(function (a) {
      a.addEventListener('click', function () {
        pinned = a;
        setTimeout(function () { mark(a); }, 100);
      });
    });
  }

  // Toolbar: one fold toggle, and the contents button marked so it can go
  // where the contents are on screen.
  var bar = document.querySelector('.toolbar');
  if (bar) {
    var byText = function (text) {
      return Array.prototype.find.call(bar.querySelectorAll(':scope > button'), function (b) {
        return b.textContent === text;
      });
    };
    var contents = labels.contents && byText(labels.contents);
    if (contents) contents.classList.add('contents-button');
    var expand = labels.expandAll && byText(labels.expandAll);
    var collapse = labels.collapseAll && byText(labels.collapseAll);
    if (expand && collapse) {
      expand.classList.add('is-hidden');
      collapse.classList.add('is-hidden');
      var toggle = document.createElement('button');
      toggle.type = 'button';
      var sync = function () {
        var anyOpen = !!document.querySelector('section.sec:not(.collapsed)');
        toggle.textContent = anyOpen ? labels.collapseAll : labels.expandAll;
      };
      toggle.addEventListener('click', function () {
        (document.querySelector('section.sec:not(.collapsed)') ? collapse : expand).click();
        sync();
      });
      collapse.insertAdjacentElement('afterend', toggle);
      document.addEventListener('click', function (e) {
        if (e.target.closest && e.target.closest('button.fold')) setTimeout(sync);
      });
      sync();
    }
  }

  // Each section's body in one box, so a fold can ease rather than cut.
  Array.prototype.forEach.call(document.querySelectorAll('section.sec'), function (section) {
    var h2 = section.querySelector(':scope > h2');
    if (!h2) return;
    var bodyBox = document.createElement('div');
    bodyBox.className = 'sec-body';
    var inner = document.createElement('div');
    inner.className = 'sec-inner';
    bodyBox.appendChild(inner);
    while (h2.nextSibling) inner.appendChild(h2.nextSibling);
    section.appendChild(bodyBox);
  });

  // "(FORM get_data)" after a step: a small tag, not Korean in italics.
  Array.prototype.forEach.call(main.querySelectorAll('li em, p em'), function (em) {
    var t = em.textContent.trim();
    if (!/^\\(.*\\)$/.test(t)) return;
    var tag = document.createElement('span');
    tag.className = 'anno';
    tag.textContent = t.slice(1, -1).trim();
    em.replaceWith(tag);
  });

  // Tables: identifiers in monospace, numbers to the right, and sorting only
  // where there are enough rows for it to help.
  var ID = /^[A-Z][A-Z0-9_\\/-]{2,}$/;
  var NUM = /^[-+]?[\\d.,]+%?$/;
  Array.prototype.forEach.call(main.querySelectorAll('table:not(.meta)'), function (table) {
    var body = table.tBodies[0];
    if (!body) return;
    var rows = Array.prototype.slice.call(body.rows);
    var heads = table.tHead ? Array.prototype.slice.call(table.tHead.rows[0].cells) : [];
    var cols = heads.length || (rows[0] ? rows[0].cells.length : 0);
    for (var c = 0; c < cols; c++) {
      var cells = rows.map(function (r) { return r.cells[c]; }).filter(function (x) { return x && x.textContent.trim() && x.textContent.trim() !== '—'; });
      if (!cells.length) continue;
      var ids = cells.filter(function (x) { return x.textContent.trim().split(/[\\s,]+/).every(function (w) { return ID.test(w); }); }).length;
      var nums = cells.filter(function (x) { return NUM.test(x.textContent.trim()); }).length;
      var cls = nums === cells.length && nums >= 2 ? 'num' : ids / cells.length >= 0.8 ? 'id' : null;
      if (!cls) continue;
      cells.forEach(function (x) { x.classList.add(cls); });
      if (cls === 'num' && heads[c]) heads[c].classList.add('num');
    }
    if (rows.length < 10 && heads.length) {
      heads.forEach(function (th) {
        var bare = th.cloneNode(true);
        bare.classList.remove('sortable');
        bare.removeAttribute('tabindex');
        th.replaceWith(bare);
      });
    }
  });
})();
</script>`;

/** Inserts `added` just before `</tag>`, or at the end when there is none. */
function before(html: string, tag: "head" | "body", added: string): string {
  const at = html.toLowerCase().lastIndexOf(`</${tag}>`);
  return at < 0 ? html + added : html.slice(0, at) + added + html.slice(at);
}

/**
 * The spec as it is shown and saved: restyled, and with the plugin's flow
 * picture replaced by the drawn one when the run's image data is at hand.
 *
 * `flowPngBase64` is the plugin's `flow.png`, which the converter inlined as
 * a data URI; the `<img>` carrying exactly that is the one replaced.
 */
export function styledSpec(
  html: string,
  flow?: { spec: ImageSpec; flowPngBase64: string } | null,
): string {
  let page = html;
  if (flow) {
    const drawn = flowSvg(flow.spec);
    const marker = `data:image/png;base64,${flow.flowPngBase64}`;
    const at = drawn ? page.indexOf(marker) : -1;
    if (drawn && at >= 0) {
      const start = page.lastIndexOf("<img", at);
      const end = page.indexOf(">", at);
      if (start >= 0 && end > at) page = page.slice(0, start) + drawn.svg + page.slice(end + 1);
    }
  }
  return before(before(page, "head", TYPE_LINK + STYLE), "body", SCRIPT);
}
