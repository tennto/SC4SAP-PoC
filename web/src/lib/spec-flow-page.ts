/**
 * The process flows inside a document page — the HTML spec (`spec-editor.ts`)
 * and the manual (`manual-theme.ts`) — drawn and edited the same way in both.
 *
 * The plugin leaves each flow as a picture with its graph beside it, and its
 * flow editor (`flow-editor.mjs`) draws that graph once someone opens it, in
 * another style than the picture. Here every flow is drawn by the editor's
 * kit as the page loads, in the page's colours (`FLOW_SVG_CSS`): nothing
 * changes when the editor opens, and every flow has its legend.
 *
 * On top of the plugin's editor (`FLOW_CORE`, shared):
 *   - a message's kind (`tone`: error, warning, success, info), picked in the
 *     editor's bar and drawn in its colour, with a legend row for the kinds
 *     a flow uses;
 *   - the flow's title, changed by clicking it, kept in the graph
 *     (`heading`) so undo and Save carry it like any other change;
 *   - a dragged step lining up with the steps it is joined to;
 *   - the editor's text boxes placed right when the preview zooms the page.
 *
 * Then each host ties it in (`FLOW_SPEC`, `FLOW_MANUAL`): who opens the
 * editor, where a change goes, how it is undone and saved.
 *
 * Plain ES2017. Each host defines `lang` before `FLOW_CORE`.
 */
import { FLOW_SVG_CSS } from "@/lib/spec-flow";

export const FLOW_LABELS = {
  ko: {
    tone: "메시지 종류",
    toneShort: "메시지",
    editFlow: "✎ 흐름도 편집",
    doneFlow: "편집 완료",
    tones: { error: "오류", warning: "경고", success: "성공", info: "정보" },
    hint: [["드래그", "이동"], ["가장자리 점 → 다른 도형", "화살표"], ["더블클릭", "글자 수정"], ["제목 클릭", "제목 수정"], ["Delete", "삭제"]],
  },
  en: {
    tone: "Message",
    toneShort: "Message",
    editFlow: "✎ Edit flow",
    doneFlow: "Done",
    tones: { error: "Error", warning: "Warning", success: "Success", info: "Info" },
    hint: [["Drag", "move"], ["Edge dot → another shape", "arrow"], ["Double-click", "edit text"], ["Click the title", "edit the title"], ["Delete", "remove"]],
  },
  ja: {
    tone: "メッセージ種別",
    toneShort: "メッセージ",
    editFlow: "✎ フロー編集",
    doneFlow: "編集完了",
    tones: { error: "エラー", warning: "警告", success: "成功", info: "情報" },
    hint: [["ドラッグ", "移動"], ["縁の点 → 別の図形", "矢印"], ["ダブルクリック", "文字修正"], ["タイトルをクリック", "タイトル修正"], ["Delete", "削除"]],
  },
};

/**
 * The drawing in the page's colours, and the editor's controls in its look:
 * small controls in one row, level with the flow's own close button where it
 * has one (the spec), a rule under them, and room inside the open editor.
 */
export const FLOW_PAGE_STYLE = `${FLOW_SVG_CSS}
.flow-edit-btn{display:none}
body.editing .flow-edit-btn{display:inline-block}
figure:has(svg.flow-svg){background:var(--bg)}
.flow-fig .flow-canvas>svg{border-radius:8px}
.fe-bar{display:none!important}
.fe-tools button,.fe-tools select,.flow-edit-btn{font:inherit;font-size:12px;padding:4px 10px;border:1px solid var(--line);border-radius:6px;background:var(--bg);color:var(--fg);cursor:pointer}
.fe-tools button:hover,.flow-edit-btn:hover{background:var(--head);border-color:var(--line-strong)}
.fe-tools button:disabled,.fe-tools select:disabled{opacity:.45;cursor:default}
.flow-fig.fe-on{outline:1.5px solid color-mix(in srgb,var(--fg) 55%,transparent);padding:14px 16px 16px;outline-offset:0;border-radius:12px}
.fe-label{font-family:inherit;font-size:13px;border:1.5px solid var(--fg);background:var(--bg);color:var(--fg)}
.flow-fig .fe-tools{gap:4px;margin:0 0 14px;padding:0 96px 12px 0;min-height:26px;justify-content:flex-start;text-align:left;border-bottom:1px solid var(--line)}
.flow-fig:not(:has(>.flow-edit-btn)) .fe-tools{padding-right:0}
.flow-fig .fe-tools button,.flow-fig .fe-tools select{height:26px;padding:0 7px;font:inherit;font-size:12px;line-height:24px;border-radius:6px}
.flow-fig.fe-on>.flow-edit-btn{top:14px;right:16px;height:26px;padding:0 10px;font-size:12px;line-height:24px}
.flow-fig .fe-tools .fe-sep{flex-basis:100%;height:0;margin:0}
.flow-fig .fe-tools .fe-hint{flex-basis:100%;display:flex;flex-wrap:wrap;gap:6px 18px;margin-top:10px;font-size:11.5px;line-height:1.6;color:var(--faint)}
.flow-fig .fe-hint kbd{font:inherit;font-size:11px;margin-right:6px;padding:1px 7px;border:1px solid var(--line);border-radius:4px;background:var(--head);color:var(--muted)}
.flow-fig.fe-on text.fh{cursor:text}
.flow-fig rect.fh-box{fill:transparent;stroke:color-mix(in srgb,var(--fg) 30%,transparent);stroke-width:1;stroke-dasharray:4 3;cursor:text;pointer-events:all}
.flow-fig rect.fh-box:hover{stroke:color-mix(in srgb,var(--fg) 60%,transparent)}
`;

/**
 * Shared by both hosts. A host registers each flow (`flowRegister`) before
 * the editor is attached to it, then sets `f.ctl` (the editor) and
 * `f.commit(prevGraph)` (where a change goes) and calls `flowEnhance(f)`.
 */
const FLOW_CORE = String.raw`
  var FL = window.sc4sapFlow, FK = window.sc4sapFlowKit;
  var FT = __FLOW_LABELS__;
  FT = FT[lang] || FT.en;
  var TONES = ['error', 'warning', 'success', 'info'];
  var flows = [];

  function fesc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  function fclone(o) { return JSON.parse(JSON.stringify(o)); }
  function toneOf(n) { return TONES.indexOf(n.tone) > 0 ? n.tone : 'error'; }
  function figures(root) { return Array.prototype.slice.call(root.querySelectorAll('figure.flow-fig')); }

  // The kit's drawing, with each message's kind, the title marked for
  // editing, and a legend row for the kinds a flow uses.
  function decorate(svg, graph, o) {
    var used = {};
    (graph.nodes || []).forEach(function (n) {
      if ((n.type || 'process') !== 'io') return;
      var t = toneOf(n);
      used[t] = true;
      if (t === 'error') return;
      var tag = '<g class="fn" data-id="' + fesc(n.id) + '"';
      svg = svg.split(tag).join(tag + ' data-tone="' + t + '"');
    });
    if (o.heading) svg = svg.replace(/<text([^>]*fill="#0A4F8C")/, '<text class="fh"$1');
    var kinds = TONES.filter(function (t) { return used[t]; });
    if (!o.legend || !(used.warning || used.success || used.info)) return svg;
    var vb = /viewBox="([-\d.]+) ([-\d.]+) ([\d.]+) ([\d.]+)"/.exec(svg);
    if (!vb) return svg;
    var x = +vb[1], y = +vb[2], w = +vb[3], h = +vb[4], add = 26, sc = o.scale || 1;
    // The legend's one "message" entry, red, says less than the kinds do:
    // it goes, and a row of its own names each kind the flow uses.
    svg = svg.replace(/<polygon points="[^"]*" fill="#FCE7E4" stroke="#C0563E"\/><text[^>]*>[^<]*<\/text>/, '');
    // The three left, moved half a cell over to sit in the middle again.
    var legendAt = svg.search(/<rect x="[^"]*" y="[^"]*" width="22" height="13" rx="6\.5"/);
    if (legendAt >= 0) svg = svg.slice(0, legendAt) + '<g transform="translate(82.5 0)">' + svg.slice(legendAt).replace(/<\/svg>$/, '</g></svg>');
    var row = y + h + 4, cell = 92, lead = 16 + FT.tone.length * 12;
    var x0 = x + w / 2 - (lead + cell * kinds.length) / 2;
    var items = '<text x="' + x0 + '" y="' + (row + 1) + '" font-size="11.5" font-weight="700" fill="#56657A">' + fesc(FT.tone) + '</text>'
      + kinds.map(function (t, i) {
        var lx = x0 + lead + i * cell;
        return '<g data-tone="' + t + '"><polygon points="' + (lx + 4) + ',' + (row - 9) + ' ' + (lx + 22) + ',' + (row - 9) + ' ' + (lx + 18) + ',' + (row + 4) + ' ' + lx + ',' + (row + 4) + '" fill="#FCE7E4" stroke="#C0563E"/></g>'
          + '<text x="' + (lx + 30) + '" y="' + (row + 1) + '" font-size="11.5" fill="#56657A">' + fesc(FT.tones[t]) + '</text>';
      }).join('');
    return svg
      .replace(vb[0], 'viewBox="' + x + ' ' + y + ' ' + w + ' ' + (h + add) + '"')
      .replace(/(<svg[^>]*?) height="[\d.]+"/, function (m, a) { return a + ' height="' + Math.round((h + add) * sc) + '"'; })
      .replace(/(<rect class="fbg"[^>]*?height=")[\d.]+"/, function (m, a) { return a + (h + add) + '"'; })
      .replace(/<\/svg>$/, items + '</svg>');
  }

  // A step being dragged (the editor keeps its frame while it is) lines up
  // with a step it is joined to once it comes within a few pixels, so the
  // arrow between them runs straight.
  var ALIGN = 12;
  function align(graph, id) {
    var nodes = graph.nodes || [], n = null, byId = {};
    nodes.forEach(function (m) { byId[m.id] = m; if (m.id === id) n = m; });
    if (!n) return;
    var bx = null, by = null;
    (graph.edges || []).forEach(function (e) {
      var m = e.from === id ? byId[e.to] : e.to === id ? byId[e.from] : null;
      if (!m || m === n) return;
      var dx = Math.abs(m.x - n.x), dy = Math.abs(m.y - n.y);
      if (dx <= ALIGN && (bx === null || dx < Math.abs(bx - n.x))) bx = m.x;
      if (dy <= ALIGN && (by === null || dy < Math.abs(by - n.y))) by = m.y;
    });
    if (bx !== null) n.x = bx;
    if (by !== null) n.y = by;
  }

  if (FK && FK.draw && !FK.sc4sapDecorated) {
    var kitDraw = FK.draw;
    FK.sc4sapDecorated = true;
    FK.draw = function (graph, o) {
      o = o || {};
      if (o.frame && o.edit && o.edit.sel && o.edit.sel.kind === 'node') align(graph, o.edit.sel.id);
      // A title the reader changed lives in the graph.
      if (graph.heading) o = Object.assign({}, o, { heading: graph.heading });
      var r = kitDraw(graph, o);
      var f = o.sc4sapFlow != null ? flows[o.sc4sapFlow] : null;
      // The editor's own drawing says what is selected; a drawing for the
      // file (staticSvg) says nothing about it.
      if (f) {
        f.G = graph;
        if ('edit' in o) {
          f.sel = o.edit ? o.edit.sel : null;
          syncTone(f);
          // The editor puts this drawing in the page right after: then mark
          // the title as something to click.
          if (o.edit) Promise.resolve().then(function () { boxTitle(f); });
        }
      }
      r.svg = decorate(r.svg, graph, o);
      return r;
    };
  }

  // The preview zooms the page with CSS zoom; boxes laid over the drawing
  // are placed in the page's own pixels, so measured ones are scaled back.
  function unzoom(el) {
    var w = el.getBoundingClientRect().width;
    return w ? el.offsetWidth / w : 1;
  }
  // The editor's own text box (a step's or an arrow's text) is placed the
  // same way, from measured pixels: put it where it belongs.
  function fixLabelBoxes(fig) {
    new MutationObserver(function (records) {
      var k = unzoom(fig);
      if (Math.abs(k - 1) < 0.01) return;
      records.forEach(function (rec) {
        Array.prototype.forEach.call(rec.addedNodes, function (n) {
          if (!n.classList || !n.classList.contains('fe-label') || n.hasAttribute('data-unzoomed')) return;
          n.setAttribute('data-unzoomed', '');
          ['left', 'top', 'width', 'height'].forEach(function (p) {
            var v = parseFloat(n.style[p]);
            if (!isNaN(v)) n.style[p] = (v * k) + 'px';
          });
        });
      });
    }).observe(fig, { childList: true });
  }

  function boxTitle(f) {
    var t = f.fig.querySelector('.flow-canvas text.fh');
    if (!t || t.previousElementSibling && t.previousElementSibling.classList.contains('fh-box')) return;
    var b = t.getBBox();
    var r = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    r.setAttribute('class', 'fh-box');
    r.setAttribute('x', b.x - 10);
    r.setAttribute('y', b.y - 5);
    r.setAttribute('width', b.width + 20);
    r.setAttribute('height', b.height + 10);
    r.setAttribute('rx', 5);
    t.parentNode.insertBefore(r, t);
  }

  // A message's kind, beside the editor's own shape picker.
  function selIo(f) {
    if (!f.sel || f.sel.kind !== 'node' || !f.G) return null;
    for (var i = 0; i < f.G.nodes.length; i++) {
      var n = f.G.nodes[i];
      if (n.id === f.sel.id) return (n.type || 'process') === 'io' ? n : null;
    }
    return null;
  }
  function syncTone(f) {
    if (!f.tone) return;
    var n = selIo(f);
    f.tone.disabled = !n;
    f.tone.value = n ? toneOf(n) : 'error';
  }

  /** A flow known to this script; its index goes to the kit in the editor's options. */
  function flowRegister(fig, cfg, key) {
    var f = { fig: fig, cfg: cfg, key: key };
    f.i = flows.push(f) - 1;
    cfg.opts = Object.assign({}, cfg.opts || {}, { sc4sapFlow: f.i });
    return f;
  }
  /** The open editor drawn again, after a change made to its graph from outside it. */
  function flowRedraw(f) { if (f.redraw) f.redraw(); else f.ctl.setEditing(true); }
  /** The editor's options without this script's own. */
  function optsOf(f) { var o = fclone(f.cfg.opts); delete o.sc4sapFlow; return o; }

  function flowEnhance(f) {
    fixLabelBoxes(f.fig);
    var tools = f.fig.querySelector(':scope > .fe-tools');
    if (!tools) return;
    var shape = tools.querySelector('select');
    var tone = document.createElement('select');
    tone.title = FT.tone;
    TONES.forEach(function (t) {
      var o = document.createElement('option');
      o.value = t;
      o.textContent = FT.toneShort + ': ' + FT.tones[t];
      tone.appendChild(o);
    });
    tone.addEventListener('change', function () {
      var n = selIo(f);
      if (!n) return;
      var prev = fclone(f.G);
      if (tone.value === 'error') delete n.tone; else n.tone = tone.value;
      flowRedraw(f);
      f.commit(prev);
    });
    if (shape) shape.insertAdjacentElement('afterend', tone);
    else tools.appendChild(tone);
    f.tone = tone;
    syncTone(f);
    // A row of its own for changing the chosen step, under the row that adds steps.
    if (shape) {
      var sep = document.createElement('span');
      sep.className = 'fe-sep';
      shape.insertAdjacentElement('beforebegin', sep);
    }
    var hint = tools.querySelector('.fe-hint');
    if (hint) {
      hint.innerHTML = FT.hint.map(function (p) { return '<span><kbd>' + fesc(p[0]) + '</kbd> ' + fesc(p[1]) + '</span>'; }).join('');
    }
    // The title: a click on it, or on the dashed box round it, changes it.
    // Caught on the way down, ahead of the editor, which would take the press
    // for a click on empty space.
    f.fig.addEventListener('pointerdown', function (e) {
      var hit = e.target instanceof Element ? e.target.closest('text.fh, rect.fh-box') : null;
      if (!hit || !f.fig.classList.contains('fe-on') || e.button !== 0) return;
      var t = f.fig.querySelector('.flow-canvas text.fh');
      if (!t) return;
      e.preventDefault();
      e.stopPropagation();
      var fr = f.fig.getBoundingClientRect(), r = t.getBoundingClientRect(), k = unzoom(f.fig);
      var box = document.createElement('input');
      box.className = 'fe-label';
      box.setAttribute('data-unzoomed', '');
      var w = Math.max(240, r.width * k + 40);
      box.style.left = Math.max(0, (r.left + r.width / 2 - fr.left) * k - w / 2) + 'px';
      box.style.top = ((r.top - fr.top) * k - 6) + 'px';
      box.style.width = w + 'px';
      box.style.height = (r.height * k + 12) + 'px';
      box.value = t.textContent || '';
      var done = false;
      // A press anywhere else ends it. Blur alone does not: the editor takes
      // presses on the flow with preventDefault, so the box keeps its focus.
      function outside(ev) { if (ev.target !== box) close(true); }
      function close(keep) {
        if (done) return;
        done = true;
        document.removeEventListener('pointerdown', outside, true);
        var v = box.value.trim();
        box.remove();
        if (!keep || !v || v === (t.textContent || '')) return;
        var prev = fclone(f.G);
        f.G.heading = v;
        flowRedraw(f);
        f.commit(prev);
      }
      box.addEventListener('keydown', function (ev) {
        ev.stopPropagation();
        // Enter that ends a Hangul or kana composition is not the end of the title.
        if (ev.isComposing || ev.keyCode === 229) return;
        if (ev.key === 'Enter') { ev.preventDefault(); close(true); }
        else if (ev.key === 'Escape') close(false);
      });
      box.addEventListener('blur', function () { close(true); });
      f.fig.appendChild(box);
      setTimeout(function () {
        box.focus();
        box.select();
        document.addEventListener('pointerdown', outside, true);
      });
    }, true);
  }
`;

/**
 * The spec: every flow drawn by the kit as the page loads, its "Edit flow"
 * button (the plugin's) shown in the edit mode, its changes in the edit
 * mode's undo, unsaved state and Save, and each drawing handed to the app
 * the page is shown in (`HtmlPreview`, `useSpecFlowEdits`). Runs inside the
 * spec's edit-mode function: `lang`, `main`, `editing` and `touched` are its.
 */
export const FLOW_PART = FLOW_CORE + String.raw`
  function flowData(fig) {
    var s = fig.querySelector(':scope > script.flow-graph');
    try { return s ? JSON.parse(s.textContent) : null; } catch (e) { return null; }
  }
  var flowLabelsEl = document.getElementById('flow-editor-labels');
  var flowL = flowLabelsEl ? JSON.parse(flowLabelsEl.textContent) : null;
  var flowUndo = [], lastFlow = false;

  // Each flow's drawing, to the app showing this page.
  function postFlow(f) {
    if (parent === window) return;
    parent.postMessage({
      type: 'sc4sap-flow', key: f.key, graph: f.ctl.get(), opts: optsOf(f),
      svg: f.ctl.staticSvg(), edited: f.fig.hasAttribute('data-flow-edited'),
    }, '*');
  }
  function flowChanged(f, prevGraph) {
    flowUndo.push({ f: f, graph: prevGraph });
    lastFlow = true;
    f.fig.setAttribute('data-flow-edited', '');
    touched();
    postFlow(f);
  }
  function undoFlow() {
    var u = flowUndo.pop();
    if (!u) return;
    u.f.ctl.set(u.graph);
    lastFlow = flowUndo.length > 0;
    postFlow(u.f);
  }

  // Every flow drawn by the kit now, the same as when its editor opens.
  if (FL && FL.attach && FK && flowL) {
    figures(document).forEach(function (fig) {
      var d = flowData(fig);
      if (!d || !d.graph) return;
      var f = flowRegister(fig, { graph: d.graph, opts: d.opts, labels: flowL }, d.key);
      f.cfg.onChange = function (next, prev) { flowChanged(f, prev); };
      f.commit = function (prev) { flowChanged(f, prev); };
      f.ctl = FL.attach(fig, f.cfg);
      flowEnhance(f);
      postFlow(f);
    });
  }
  // Undo: the flows' own changes, most recent first, when one was the last edit.
  main.addEventListener('input', function () { lastFlow = false; });
  document.addEventListener('keydown', function (e) {
    if (!editing || !lastFlow || !(e.ctrlKey || e.metaKey) || e.shiftKey || String(e.key).toLowerCase() !== 'z') return;
    var t = e.target;
    if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return;
    e.preventDefault();
    e.stopImmediatePropagation();
    undoFlow();
  }, true);

  // On Save: each edited flow's drawing in place of its picture, and its
  // graph marked edited — the editor opens on it again, and the plugin's
  // flow-editor.mjs --import reads it back.
  function saveFlows(doc) {
    var sources = figures(doc);
    flows.forEach(function (f) {
      var i = figures(document).indexOf(f.fig);
      var target = sources[i];
      if (!target || !f.fig.hasAttribute('data-flow-edited')) return;
      Array.prototype.slice.call(target.children).forEach(function (c) {
        if (c.tagName !== 'FIGCAPTION' && c.tagName !== 'SCRIPT') c.remove();
      });
      var canvas = doc.createElement('div');
      canvas.className = 'flow-canvas';
      canvas.innerHTML = f.ctl.staticSvg();
      target.insertBefore(canvas, target.firstChild);
      var s = target.querySelector(':scope > script.flow-graph');
      var d = flowData(f.fig);
      if (s && d) {
        d.graph = f.ctl.get();
        d.opts = optsOf(f);
        d.edited = true;
        s.textContent = JSON.stringify(d).replace(/</g, '\\u003c');
      }
    });
  }
`;

/**
 * The manual: its process flow drawn by the kit as the page loads. The
 * manual's own edit mode attaches the editor (`manual-editor.mjs`) and keeps
 * the flow in `manual.processFlow`, with its undo and Save; the attach is
 * caught here so the editor gets the same additions as the spec's. The
 * manual opened the editor with its whole edit mode; here, as in the spec,
 * the flow's own "Edit flow" button opens it and "Done" closes it, and the
 * edit mode's end closes it too. A whole script of its own, after the
 * plugin's.
 */
export const FLOW_MANUAL_SCRIPT = String.raw`<script id="sc4sap-manual-flow">
(function () {
  var lang = (document.documentElement.lang || '').slice(0, 2).toLowerCase();
` + FLOW_CORE + String.raw`
  if (!FL || !FL.attach || !FK) return;
  var fig = document.querySelector('figure.flow-fig[data-flow]');
  var seedEl = document.getElementById('flow-seed');
  var source = document.getElementById('manual-source');
  if (!fig || !seedEl) return;
  var seed = JSON.parse(seedEl.textContent);
  // A saved page holds the edited flow in its manual, as the editor reads it.
  var graph = seed.graph;
  try {
    var pf = source ? JSON.parse(source.textContent).processFlow : null;
    if (pf && pf.layout === 'free' && pf.nodes) graph = pf;
  } catch (e) {}
  if (!graph) return;
  if (!fig.querySelector(':scope > .flow-canvas')) {
    var canvas = document.createElement('div');
    canvas.className = 'flow-canvas';
    canvas.innerHTML = FK.draw(graph, Object.assign({}, seed.opts || {}, { uid: 'mfs' })).svg;
    Array.prototype.slice.call(fig.children).forEach(function (c) { c.remove(); });
    fig.appendChild(canvas);
  }
  var attach = FL.attach;
  FL.attach = function (target, cfg) {
    if (target !== fig) return attach.call(FL, target, cfg);
    var f = flowRegister(target, cfg, 'processFlow');
    f.ctl = attach.call(FL, target, cfg);
    // A change of kind or title goes where a drag goes: the manual's own
    // handler, which keeps it in the manual and in its undo.
    f.commit = function (prev) { if (cfg.onChange) cfg.onChange(fclone(f.G), prev); };
    // The edit mode only ever closes the editor; its button opens it.
    var raw = f.ctl.setEditing;
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'flow-edit-btn';
    function open(on) {
      raw.call(f.ctl, on);
      btn.textContent = on ? FT.doneFlow : FT.editFlow;
    }
    f.redraw = function () { raw.call(f.ctl, true); };
    f.ctl.setEditing = function (on) { if (!on) open(false); };
    btn.addEventListener('click', function (e) {
      e.preventDefault();
      e.stopPropagation();
      open(!target.classList.contains('fe-on'));
    });
    open(false);
    target.appendChild(btn);
    flowEnhance(f);
    return f.ctl;
  };
})();
</script>`;
