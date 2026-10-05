/**
 * Package → Process's diagrams, drawn here from the run's data.
 *
 * The plugin draws the macro process map and one sequence diagram per process
 * as PNGs (`render-process-images.mjs`), from a small JSON the run writes
 * anyway — `{ lang, macroTitle, macro: { nodes, edges }, processes: [{ slug,
 * title, seq: { actors, items } }] }`. Drawn here instead they come out in
 * this app's look, as the spec's flow does (`spec-flow.ts`): one SVG, inline
 * in the HTML where it follows the document's theme through CSS variables,
 * and as an image file beside the Markdown, where the light fallbacks apply.
 * Sharp at any zoom, and no headless browser.
 *
 * Self-contained on purpose — no imports — so the Economy build
 * (`scripts/process/build.mjs`) runs this very file under Node, which strips
 * the types, and the page and the files can never draw two different things.
 *
 * The sequence items are the plugin's v13 shape:
 *   { m: [from, to], t }          a call          { m, t, r: true }  its return
 *   { note, over: [ids] }         a note          { alt | opt | loop: label }
 *   { elselbl: label }            the other way   { end: true }       frame end
 */

export type MacroNode = { id: string; num?: string; label: string };
export type MacroEdge = { from: string; to: string };
export type Macro = { nodes: MacroNode[]; edges: MacroEdge[] };

export type SeqActor = { id: string; label: string; kind?: "actor" | "participant" };
export type SeqItem = {
  m?: [string, string];
  t?: string;
  r?: boolean;
  note?: string;
  over?: string[];
  alt?: string;
  opt?: string;
  loop?: string;
  elselbl?: string;
  end?: boolean;
};
export type Seq = { actors: SeqActor[]; items: SeqItem[] };

/** The JSON the run leaves as `_img/process-images.json`. */
export type ProcessImages = {
  lang?: string;
  macroTitle?: string;
  macro?: Macro;
  processes?: { slug: string; title?: string; seq?: Seq }[];
};

export type Drawn = { svg: string; width: number; height: number };

// ---- Text ------------------------------------------------------------------

const FONT_SIZE = 13;
const LINE = 17;
const FONT = `"Pretendard Variable",Pretendard,"Malgun Gothic","Apple SD Gothic Neo","Segoe UI",sans-serif`;

/** Advance of one character at `size`, by script — close enough to wrap. */
function advance(ch: string, size: number): number {
  const code = ch.codePointAt(0) ?? 0;
  if (code >= 0x1100 && code <= 0xffdc) return size * 0.92; // Hangul, kana, CJK
  if (ch === " ") return size * 0.3;
  if (/[A-Z0-9_]/.test(ch)) return size * 0.62;
  return size * 0.54;
}

const widthOf = (text: string, size = FONT_SIZE): number =>
  [...text].reduce((sum, ch) => sum + advance(ch, size), 0);

/** A label broken into lines that fit `max`, at spaces where it can. */
function wrap(label: string, max: number, size = FONT_SIZE): string[] {
  const lines: string[] = [];
  for (const part of String(label ?? "").split(/\\n|\n/)) {
    let line = "";
    // Spaces, and after a slash or a comma and before a bracket, so a run of
    // names like `EKKO/EKPO/EKET(PO)` breaks between them, not inside one.
    for (const word of part.split(/(\s+)|(?<=[\/,·])|(?=[(（])/)) {
      if (word === undefined) continue;
      if (word === "") continue;
      const next = line + word;
      if (widthOf(next.trim(), size) <= max || line.trim() === "") {
        line = next;
        while (widthOf(line.trim(), size) > max) {
          let cut = line.length - 1;
          while (cut > 1 && widthOf(line.slice(0, cut), size) > max) cut--;
          lines.push(line.slice(0, cut).trim());
          line = line.slice(cut);
        }
      } else {
        lines.push(line.trim());
        line = word.trimStart();
      }
    }
    if (line.trim()) lines.push(line.trim());
  }
  return lines.length ? lines : [""];
}

const esc = (text: string): string =>
  String(text ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/**
 * Colours as CSS variables with the light theme behind them — the same
 * variables the spec's flow uses, which the HTML documents set for both
 * themes; an SVG file beside the Markdown takes the fallbacks.
 */
const C = {
  ink: "var(--flow-ink,#2b2b2b)",
  muted: "var(--flow-muted,#737373)",
  bg: "var(--flow-bg,#ffffff)",
  line: "var(--flow-line,#b4b4b4)",
  box: "var(--flow-box,#ffffff)",
  boxLine: "var(--flow-box-line,#d6d6d6)",
  dec: "var(--flow-dec,#fff8eb)",
  decLine: "var(--flow-dec-line,#e9cf97)",
  decInk: "var(--flow-dec-ink,#6f4a00)",
  term: "var(--flow-term,#2b2b2b)",
  onTerm: "var(--flow-on-term,#ffffff)",
};

function textLines(lines: string[], cx: number, cy: number, style: string, anchor = "middle"): string {
  const top = cy - ((lines.length - 1) * LINE) / 2;
  const spans = lines.map((line, i) => `<tspan x="${cx}" y="${top + i * LINE}">${esc(line)}</tspan>`).join("");
  return `<text text-anchor="${anchor}" dominant-baseline="central" style="${style}">${spans}</text>`;
}

/**
 * How far a drawing may shrink to fit the column: below three quarters its
 * labels stop being readable, so a wider one keeps that size and its frame
 * scrolls sideways (`process-theme.ts`).
 */
const MIN_SCALE = 0.75;

function frame(id: string, width: number, height: number, body: string, label: string): string {
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" class="spec-flow proc-diagram" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" role="img" aria-label="${esc(label)}" style="min-width:${Math.round(width * MIN_SCALE)}px;font-family:${esc(FONT)};font-size:${FONT_SIZE}px;letter-spacing:-0.01em">` +
    `<defs>` +
    `<marker id="${id}-a" viewBox="0 0 10 10" refX="8.5" refY="5" markerWidth="9" markerHeight="9" markerUnits="userSpaceOnUse" orient="auto-start-reverse"><path d="M1.5 1.5L8.5 5L1.5 8.5Z" style="fill:${C.ink}"/></marker>` +
    `<marker id="${id}-o" viewBox="0 0 10 10" refX="8.5" refY="5" markerWidth="9" markerHeight="9" markerUnits="userSpaceOnUse" orient="auto-start-reverse"><path d="M2 1.5L8.5 5L2 8.5" style="fill:none;stroke:${C.muted};stroke-width:1.4;stroke-linecap:round;stroke-linejoin:round"/></marker>` +
    `<marker id="${id}-l" viewBox="0 0 10 10" refX="8.5" refY="5" markerWidth="9" markerHeight="9" markerUnits="userSpaceOnUse" orient="auto-start-reverse"><path d="M2.5 1.5L8.5 5L2.5 8.5" style="fill:none;stroke:${C.line};stroke-width:1.5;stroke-linecap:round;stroke-linejoin:round"/></marker>` +
    `</defs>` +
    `<rect x="0" y="0" width="${width}" height="${height}" style="fill:${C.bg}"/>` +
    body +
    `</svg>`
  );
}

/** Ids unique per drawing, so two SVGs inline in one page keep their own markers. */
let serial = 0;
const nextId = (stem: string): string => `${stem}${(serial = (serial + 1) % 1e6).toString(36)}`;

// ---- Macro process map -----------------------------------------------------

const BOX_W = 176;
const MARGIN = 20;

type Placed = MacroNode & { x: number; y: number; w: number; h: number; lines: string[] };

/**
 * The processes left to right in the order the edges lead, a column per step
 * along the longest path; parallel processes share a column, one above the
 * other. A plain chain of more than four wraps into rows of four.
 */
export function macroSvg(macro: Macro | undefined, title?: string): Drawn | null {
  const nodes = (macro?.nodes ?? []).filter((n) => n && typeof n.id === "string");
  if (nodes.length === 0) return null;
  const ids = new Set(nodes.map((n) => n.id));
  const edges = (macro?.edges ?? []).filter((e) => e && ids.has(e.from) && ids.has(e.to) && e.from !== e.to);

  const placed: Placed[] = nodes.map((n, i) => {
    const lines = wrap(n.label, BOX_W - 52);
    return { ...n, num: n.num ?? String(i + 1), x: 0, y: 0, w: BOX_W, h: Math.max(56, lines.length * LINE + 26), lines };
  });
  const byId = new Map(placed.map((n) => [n.id, n]));

  // Columns by longest path from a source; a cycle is broken by visit order.
  const layer = new Map<string, number>();
  const incoming = new Map<string, string[]>();
  for (const e of edges) incoming.set(e.to, [...(incoming.get(e.to) ?? []), e.from]);
  const visiting = new Set<string>();
  const depth = (id: string): number => {
    const known = layer.get(id);
    if (known !== undefined) return known;
    if (visiting.has(id)) return 0;
    visiting.add(id);
    const d = Math.max(-1, ...(incoming.get(id) ?? []).map(depth)) + 1;
    visiting.delete(id);
    layer.set(id, d);
    return d;
  };
  placed.forEach((n) => depth(n.id));

  const chain = edges.length === placed.length - 1 && placed.every((n) => (incoming.get(n.id)?.length ?? 0) <= 1) &&
    new Set(layer.values()).size === placed.length;
  const GAP_X = 52;
  const GAP_Y = 28;
  type Route = [number, number][];
  const routes: Route[] = [];

  if (chain && placed.length > 4) {
    const order = [...placed].sort((a, b) => layer.get(a.id)! - layer.get(b.id)!);
    let y = MARGIN;
    for (let r = 0; r * 4 < order.length; r++) {
      const row = order.slice(r * 4, r * 4 + 4);
      const h = Math.max(...row.map((n) => n.h));
      row.forEach((n, c) => {
        n.x = MARGIN + c * (BOX_W + GAP_X);
        n.y = y + (h - n.h) / 2;
      });
      y += h + GAP_Y + 16;
    }
    for (let i = 1; i < order.length; i++) {
      const a = order[i - 1]!;
      const b = order[i]!;
      if (Math.floor((i - 1) / 4) === Math.floor(i / 4)) {
        routes.push([[a.x + a.w, a.y + a.h / 2], [b.x, b.y + b.h / 2]]);
      } else {
        const mid = a.y + a.h + (b.y - a.y - a.h) / 2;
        routes.push([[a.x + a.w / 2, a.y + a.h], [a.x + a.w / 2, mid], [b.x + b.w / 2, mid], [b.x + b.w / 2, b.y]]);
      }
    }
  } else {
    const columns: Placed[][] = [];
    for (const n of placed) (columns[layer.get(n.id)!] ??= []).push(n);
    const heights = columns.map((col) => (col ?? []).reduce((s, n) => s + n.h, 0) + Math.max(0, (col ?? []).length - 1) * GAP_Y);
    const tallest = Math.max(...heights);
    columns.forEach((col, c) => {
      let y = MARGIN + (tallest - heights[c]!) / 2;
      for (const n of col ?? []) {
        n.x = MARGIN + c * (BOX_W + GAP_X);
        n.y = y;
        y += n.h + GAP_Y;
      }
    });
    for (const e of edges) {
      const a = byId.get(e.from)!;
      const b = byId.get(e.to)!;
      const ay = a.y + a.h / 2;
      const by = b.y + b.h / 2;
      if (b.x > a.x) {
        const mx = a.x + a.w + GAP_X / 2;
        routes.push(Math.abs(ay - by) < 1 ? [[a.x + a.w, ay], [b.x, by]] : [[a.x + a.w, ay], [mx, ay], [mx, by], [b.x, by]]);
      } else {
        // Back or across: under both boxes.
        const low = Math.max(a.y + a.h, b.y + b.h) + 14;
        routes.push([[a.x + a.w / 2, a.y + a.h], [a.x + a.w / 2, low], [b.x + b.w / 2, low], [b.x + b.w / 2, b.y + b.h]]);
      }
    }
  }

  const titleH = title ? 30 : 0;
  for (const n of placed) n.y += titleH;
  for (const r of routes) for (const p of r) p[1] += titleH;
  const width = Math.ceil(Math.max(...placed.map((n) => n.x + n.w), ...routes.flat().map(([x]) => x)) + MARGIN);
  const height = Math.ceil(Math.max(...placed.map((n) => n.y + n.h), ...routes.flat().map(([, y]) => y)) + MARGIN);
  const id = nextId("pm");

  const body =
    (title ? `<text x="${MARGIN}" y="${MARGIN + 6}" dominant-baseline="central" style="fill:${C.muted};font-size:12px;font-weight:600">${esc(title)}</text>` : "") +
    routes.map((r) => `<path d="${rounded(r)}" style="fill:none;stroke:${C.line};stroke-width:1.4" marker-end="url(#${id}-l)"/>`).join("") +
    placed
      .map((n) => {
        const cx = n.x + 30;
        const cy = n.y + n.h / 2;
        return (
          `<rect x="${n.x + 0.5}" y="${n.y + 0.5}" width="${n.w - 1}" height="${n.h - 1}" rx="12" style="fill:${C.box};stroke:${C.boxLine};stroke-width:1"/>` +
          `<circle cx="${cx - 8}" cy="${cy}" r="11" style="fill:${C.term}"/>` +
          `<text x="${cx - 8}" y="${cy}" text-anchor="middle" dominant-baseline="central" style="fill:${C.onTerm};font-size:11.5px;font-weight:700;font-variant-numeric:tabular-nums">${esc(n.num ?? "")}</text>` +
          textLines(n.lines, n.x + 42, cy, `fill:${C.ink};font-weight:600`, "start")
        );
      })
      .join("");
  return { svg: frame(id, width, height, body, title ?? "process map"), width, height };
}

/** An orthogonal path with its corners rounded. */
function rounded(points: [number, number][], radius = 10): string {
  let d = `M${points[0]![0]} ${points[0]![1]}`;
  for (let i = 1; i < points.length; i++) {
    const [x, y] = points[i]!;
    const next = points[i + 1];
    if (!next) {
      d += `L${x} ${y}`;
      break;
    }
    const [px, py] = points[i - 1]!;
    const r = Math.min(radius, Math.hypot(x - px, y - py) / 2, Math.hypot(next[0] - x, next[1] - y) / 2);
    d += `L${x - Math.sign(x - px) * r} ${y - Math.sign(y - py) * r}Q${x} ${y} ${x + Math.sign(next[0] - x) * r} ${y + Math.sign(next[1] - y) * r}`;
  }
  return d;
}

// ---- Sequence diagram ------------------------------------------------------

const HEAD_H = 44;
const MSG_MAX = 230;
const NOTE_MAX = 220;

type Row =
  | { kind: "msg"; from: number; to: number; lines: string[]; ret: boolean; h: number }
  | { kind: "note"; cols: number[]; lines: string[]; h: number }
  | { kind: "open"; type: "alt" | "opt" | "loop"; label: string; h: number }
  | { kind: "else"; label: string; h: number }
  | { kind: "close"; h: number };

/**
 * Lifelines left to right in the order the actors are given; people in a
 * filled head, programs and tables in an outlined one. Columns are as far
 * apart as the longest message between them needs, so no label is cut.
 */
export function sequenceSvg(seq: Seq | undefined, title?: string): Drawn | null {
  const actors = (seq?.actors ?? []).filter((a) => a && typeof a.id === "string");
  if (actors.length === 0) return null;
  const col = new Map(actors.map((a, i) => [a.id, i]));
  const heads = actors.map((a) => {
    const lines = wrap(a.label || a.id, 132, 12.5);
    return { lines, w: Math.max(96, Math.min(156, Math.max(...lines.map((l) => widthOf(l, 12.5))) + 28)), person: a.kind === "actor" };
  });
  const headH = Math.max(HEAD_H, ...heads.map((h) => h.lines.length * 16 + 18));

  // Rows, with an actor named but not declared added on the right.
  const ensure = (id: string): number => {
    const known = col.get(id);
    if (known !== undefined) return known;
    actors.push({ id, label: id, kind: "participant" });
    heads.push({ lines: wrap(id, 132, 12.5), w: Math.max(96, widthOf(id, 12.5) + 28), person: false });
    col.set(id, actors.length - 1);
    return actors.length - 1;
  };
  const rows: Row[] = [];
  for (const item of seq?.items ?? []) {
    if (!item || typeof item !== "object") continue;
    if (Array.isArray(item.m) && item.m.length === 2) {
      const from = ensure(String(item.m[0]));
      const to = ensure(String(item.m[1]));
      const lines = wrap(item.t ?? "", MSG_MAX, 12.5);
      rows.push({ kind: "msg", from, to, lines, ret: !!item.r, h: lines.length * 16 + (from === to ? 40 : 22) });
    } else if (typeof item.note === "string") {
      const cols = (item.over ?? []).map((id) => ensure(String(id)));
      const lines = wrap(item.note, NOTE_MAX, 12);
      rows.push({ kind: "note", cols: cols.length ? cols : [0], lines, h: lines.length * 15 + 26 });
    } else if (item.alt !== undefined || item.opt !== undefined || item.loop !== undefined) {
      const type = item.alt !== undefined ? "alt" : item.opt !== undefined ? "opt" : "loop";
      rows.push({ kind: "open", type, label: String(item[type] ?? ""), h: 34 });
    } else if (item.elselbl !== undefined) {
      rows.push({ kind: "else", label: String(item.elselbl), h: 30 });
    } else if (item.end) {
      rows.push({ kind: "close", h: 16 });
    }
  }

  // Column centres: each gap wide enough for the heads beside it, then
  // widened for every message across it, the narrow spans first.
  const n = actors.length;
  const gaps = Array.from({ length: Math.max(0, n - 1) }, (_, i) => Math.max(120, heads[i]!.w / 2 + heads[i + 1]!.w / 2 + 24));
  const spans = rows
    .filter((r): r is Extract<Row, { kind: "msg" }> => r.kind === "msg" && r.from !== r.to)
    .map((r) => ({ a: Math.min(r.from, r.to), b: Math.max(r.from, r.to), need: Math.max(...r.lines.map((l) => widthOf(l, 12.5))) + 36 }))
    .sort((x, y) => x.b - x.a - (y.b - y.a));
  for (const s of spans) {
    const have = gaps.slice(s.a, s.b).reduce((sum, g) => sum + g, 0);
    if (have < s.need) for (let i = s.a; i < s.b; i++) gaps[i]! += (s.need - have) / (s.b - s.a);
  }
  // A self call's label sits to the right of its line.
  const selfRoom = Math.max(0, ...rows.filter((r): r is Extract<Row, { kind: "msg" }> => r.kind === "msg" && r.from === r.to && r.from === n - 1).map((r) => Math.max(...r.lines.map((l) => widthOf(l, 12.5))) + 40));
  const left = MARGIN + Math.max(heads[0]!.w / 2, 30) + 10;
  const xs: number[] = [left];
  for (const g of gaps) xs.push(xs[xs.length - 1]! + g);

  const titleH = title ? 30 : 0;
  const top = MARGIN + titleH;
  let y = top + headH + 18;
  const parts: string[] = [];
  const frames: { type: string; label: string; y: number; elses: { y: number; label: string }[]; depth: number }[] = [];
  const closed: { type: string; label: string; y0: number; y1: number; elses: { y: number; label: string }[]; depth: number }[] = [];
  const id = nextId("sq");

  for (const r of rows) {
    if (r.kind === "msg") {
      const x1 = xs[r.from]!;
      const x2 = xs[r.to]!;
      const style = r.ret
        ? `fill:none;stroke:${C.muted};stroke-width:1.2;stroke-dasharray:5 4`
        : `fill:none;stroke:${C.ink};stroke-width:1.3`;
      const marker = r.ret ? `${id}-o` : `${id}-a`;
      const textY = y + (r.lines.length * 16) / 2 - 4;
      const lineY = y + r.lines.length * 16 + 4;
      if (r.from === r.to) {
        parts.push(
          textLines(r.lines, x1 + 14, y + (r.lines.length * 16) / 2 - 2, `fill:${r.ret ? C.muted : C.ink};font-size:12.5px`, "start"),
          `<path d="M${x1} ${lineY}H${x1 + 34}V${lineY + 18}H${x1 + 4}" style="${style}" marker-end="url(#${marker})"/>`,
        );
      } else {
        const tip = x2 > x1 ? x2 - 2 : x2 + 2;
        parts.push(
          textLines(r.lines, (x1 + x2) / 2, textY, `fill:${r.ret ? C.muted : C.ink};font-size:12.5px`),
          `<path d="M${x1} ${lineY}H${tip}" style="${style}" marker-end="url(#${marker})"/>`,
        );
      }
      y += r.h;
    } else if (r.kind === "note") {
      const cols = r.cols.map((c) => xs[c]!);
      const lo = Math.min(...cols);
      const hi = Math.max(...cols);
      const w = Math.max(hi - lo + 60, Math.max(...r.lines.map((l) => widthOf(l, 12))) + 24);
      const cx = (lo + hi) / 2;
      parts.push(
        `<rect x="${cx - w / 2}" y="${y + 4}" width="${w}" height="${r.h - 10}" rx="6" style="fill:${C.dec};stroke:${C.decLine};stroke-width:1"/>`,
        textLines(r.lines, cx, y + 4 + (r.h - 10) / 2, `fill:${C.decInk};font-size:12px`),
      );
      y += r.h;
    } else if (r.kind === "open") {
      frames.push({ type: r.type, label: r.label, y, elses: [], depth: frames.length });
      y += r.h;
    } else if (r.kind === "else") {
      const f = frames[frames.length - 1];
      if (f) f.elses.push({ y: y + 6, label: r.label });
      y += r.h;
    } else {
      const f = frames.pop();
      if (f) closed.push({ ...f, y0: f.y, y1: y + 6 });
      y += r.h;
    }
  }
  // Frames never closed end with the diagram.
  while (frames.length) {
    const f = frames.pop()!;
    closed.push({ ...f, y0: f.y, y1: y + 6 });
  }
  const bottom = y + 10;

  const x0 = MARGIN;
  const x1 = xs[n - 1]! + Math.max(heads[n - 1]!.w / 2, 30) + 10 + selfRoom;
  const frameSvg = closed
    .sort((a, b) => a.depth - b.depth)
    .map((f) => {
      const inset = f.depth * 8;
      const fx = x0 + inset;
      const fw = x1 - x0 - inset * 2;
      const tag = `${f.type}${f.label ? ` · ${f.label}` : ""}`;
      const tw = Math.min(fw - 20, widthOf(tag, 11.5) + 18);
      return (
        `<rect x="${fx}" y="${f.y0 + 4}" width="${fw}" height="${f.y1 - f.y0}" rx="8" style="fill:none;stroke:${C.boxLine};stroke-width:1"/>` +
        `<path d="M${fx} ${f.y0 + 12}a8 8 0 0 1 8 -8H${fx + tw}V${f.y0 + 16}l-6 6H${fx}Z" style="fill:${C.box};stroke:${C.boxLine};stroke-width:1"/>` +
        `<text x="${fx + 9}" y="${f.y0 + 14}" dominant-baseline="central" style="fill:${C.muted};font-size:11.5px;font-weight:600">${esc(tag)}</text>` +
        f.elses
          .map(
            (e) =>
              `<path d="M${fx} ${e.y}H${fx + fw}" style="stroke:${C.boxLine};stroke-width:1;stroke-dasharray:4 4"/>` +
              `<text x="${fx + 10}" y="${e.y + 11}" dominant-baseline="central" style="fill:${C.muted};font-size:11.5px;font-weight:600">[${esc(e.label)}]</text>`,
          )
          .join("")
      );
    })
    .join("");

  const lifelines = xs
    .map((x) => `<path d="M${x} ${top + headH}V${bottom}" style="stroke:${C.boxLine};stroke-width:1;stroke-dasharray:3 4"/>`)
    .join("");
  const headSvg = heads
    .map((h, i) => {
      const x = xs[i]! - h.w / 2;
      const fill = h.person ? `fill:${C.term}` : `fill:${C.box};stroke:${C.boxLine};stroke-width:1`;
      const ink = h.person ? C.onTerm : C.ink;
      return (
        `<rect x="${x + 0.5}" y="${top + 0.5}" width="${h.w - 1}" height="${headH - 1}" rx="${h.person ? headH / 2 : 10}" style="${fill}"/>` +
        textLines(h.lines, xs[i]!, top + headH / 2, `fill:${ink};font-size:12.5px;font-weight:600`)
      );
    })
    .join("");

  const width = Math.ceil(x1 + MARGIN);
  const height = Math.ceil(bottom + MARGIN);
  const body =
    (title ? `<text x="${MARGIN}" y="${MARGIN + 6}" dominant-baseline="central" style="fill:${C.muted};font-size:12px;font-weight:600">${esc(title)}</text>` : "") +
    frameSvg +
    lifelines +
    headSvg +
    parts.join("");
  return { svg: frame(id, width, height, body, title ?? "sequence diagram"), width, height };
}

/** Every drawing in a process-images.json, by the plugin's file names. */
export function processDrawings(spec: ProcessImages): Map<string, Drawn> {
  const out = new Map<string, Drawn>();
  const macro = macroSvg(spec.macro, spec.macroTitle);
  if (macro) out.set("macro", macro);
  for (const p of spec.processes ?? []) {
    const drawn = sequenceSvg(p.seq, p.title);
    if (drawn && p.slug !== undefined) out.set(`seq-${p.slug}`, drawn);
  }
  return out;
}
