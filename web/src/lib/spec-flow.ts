/**
 * Program → Spec's process flow, drawn here from the run's own data.
 *
 * The plugin draws `image-spec.json.processFlow` as a PNG: one row, however
 * many steps, at 1x. Nine steps came out 1874×175 — shrunk to fit a page its
 * text went to 6px, left at its size it ran off the side — and a decision
 * had no labelled way on. The data behind it is a short list the run writes
 * anyway, so drawing it here costs nothing and adds no model tokens.
 *
 * One SVG, used twice: inline in the HTML spec, where it follows the
 * document's theme through CSS variables, and as a data-URI image in the
 * Markdown spec, where the variables' light fallbacks apply. Either way it is
 * sharp at any zoom and shown at its own size.
 * Excel keeps the plugin's own PNG.
 *
 * Both shapes the plugin accepts are read:
 *   · string[]          `?` before a decision, `!` before the end
 *   · { nodes, edges }  node types start / end / process / decision / io,
 *                        `lane: "right"` for a side path; drawn top-down
 */

type NodeType = "start" | "end" | "process" | "decision" | "io";

/** A message's kind: drawn red, amber, green or blue. Error when not given. */
export type Tone = "error" | "warning" | "success" | "info";
const TONES = new Set<Tone>(["error", "warning", "success", "info"]);

type FlowNode = { id: string; type: NodeType; label: string; lane?: string; tone?: Tone };
type FlowEdge = { from: string; to: string; label?: string };
export type FlowGraph = { nodes: FlowNode[]; edges: FlowEdge[] };

/** Only what is needed here of the run's `image-spec.json`. */
export type ImageSpec = { lang?: string; processFlow?: unknown };

const YES: Record<string, string> = { ko: "예", ja: "はい", en: "Yes" };

// ---- Reading --------------------------------------------------------------

const TYPES = new Set<NodeType>(["start", "end", "process", "decision", "io"]);

/** The flow in `processFlow`, in either shape, or null when there is none. */
export function readFlow(spec: ImageSpec): { graph: FlowGraph; linear: boolean } | null {
  const flow = spec.processFlow;
  if (Array.isArray(flow)) {
    const steps = flow.filter((step): step is string => typeof step === "string" && step.trim() !== "");
    if (steps.length === 0) return null;
    const yes = YES[String(spec.lang ?? "").slice(0, 2)] ?? YES.en!;
    const nodes = steps.map((step, i): FlowNode => {
      const text = step.trim();
      const type: NodeType = text.startsWith("?") ? "decision" : text.startsWith("!") ? "end" : "process";
      return { id: `n${i}`, type, label: type === "process" ? text : text.slice(1).trim() };
    });
    const edges = nodes.slice(1).map((node, i): FlowEdge => ({
      from: nodes[i]!.id,
      to: node.id,
      // The list only ever goes on, so the way on out of a decision is its
      // "yes": the steps are written as the question the run passes.
      ...(nodes[i]!.type === "decision" ? { label: yes } : {}),
    }));
    return { graph: { nodes, edges }, linear: true };
  }
  if (flow && typeof flow === "object" && Array.isArray((flow as FlowGraph).nodes)) {
    const raw = flow as { nodes: unknown[]; edges?: unknown[] };
    const nodes: FlowNode[] = [];
    for (const item of raw.nodes) {
      if (!item || typeof item !== "object") continue;
      const node = item as Record<string, unknown>;
      if (typeof node.id !== "string") continue;
      const type = TYPES.has(node.type as NodeType) ? (node.type as NodeType) : "process";
      nodes.push({
        id: node.id,
        type,
        label: typeof node.label === "string" ? node.label : node.id,
        ...(node.lane === "right" ? { lane: "right" } : {}),
        ...(TONES.has(node.tone as Tone) && node.tone !== "error" ? { tone: node.tone as Tone } : {}),
      });
    }
    const ids = new Set(nodes.map((node) => node.id));
    const edges: FlowEdge[] = [];
    for (const item of raw.edges ?? []) {
      if (!item || typeof item !== "object") continue;
      const edge = item as Record<string, unknown>;
      if (typeof edge.from !== "string" || typeof edge.to !== "string") continue;
      if (!ids.has(edge.from) || !ids.has(edge.to)) continue;
      edges.push({
        from: edge.from,
        to: edge.to,
        ...(typeof edge.label === "string" && edge.label.trim() ? { label: edge.label.trim() } : {}),
      });
    }
    return nodes.length ? { graph: { nodes, edges }, linear: false } : null;
  }
  return null;
}

// ---- Measuring ------------------------------------------------------------

const FONT_SIZE = 13;
const LINE = 18;
const BOX_W = 168;
const PAD_X = 14;
const PAD_Y = 12;
const MIN_H = 52;

/** Advance of one character at `FONT_SIZE`, by script — close enough to wrap. */
function advance(ch: string): number {
  const code = ch.codePointAt(0) ?? 0;
  if (code >= 0x1100 && code <= 0xffdc) return FONT_SIZE * 0.92; // Hangul, kana, CJK
  if (ch === " ") return FONT_SIZE * 0.3;
  return FONT_SIZE * 0.56;
}

const widthOf = (text: string): number => [...text].reduce((sum, ch) => sum + advance(ch), 0);

/** A label broken into lines that fit `max`, at spaces where it can. */
function wrap(label: string, max: number): string[] {
  const lines: string[] = [];
  for (const part of label.split(/\\n|\n/)) {
    let line = "";
    for (const word of part.split(/(\s+)/)) {
      if (word === "") continue;
      const next = line + word;
      if (widthOf(next.trim()) <= max || line.trim() === "") {
        line = next;
        // A single word wider than the box is broken by character.
        while (widthOf(line.trim()) > max) {
          let cut = line.length - 1;
          while (cut > 1 && widthOf(line.slice(0, cut)) > max) cut--;
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

type Placed = FlowNode & { x: number; y: number; w: number; h: number; lines: string[] };

/** How far a decision's ends come to a point. */
const POINT = 16;
/** Room for the mark in front of a message's text. */
const ICON = 20;
const TERM_H = 34;

function measure(node: FlowNode): Placed {
  if (node.type === "start" || node.type === "end") {
    // A terminal is a small pill sized to its word, not a full-width box:
    // it marks where the flow begins and stops, it is not a step.
    const lines = wrap(node.label, BOX_W - 40);
    const w = Math.min(BOX_W, Math.max(76, Math.max(...lines.map(widthOf)) + 36));
    return { ...node, x: 0, y: 0, w, h: Math.max(TERM_H, lines.length * LINE + 14), lines };
  }
  // A decision is a box with pointed ends rather than a diamond, whose text
  // had only the middle half of it to sit in.
  const inner =
    node.type === "decision" ? BOX_W - PAD_X * 2 - POINT
    : node.type === "io" ? BOX_W - PAD_X * 2 - ICON
    : BOX_W - PAD_X * 2;
  const lines = wrap(node.label, inner);
  const h = Math.max(MIN_H, lines.length * LINE + PAD_Y * 2);
  return { ...node, x: 0, y: 0, w: BOX_W, h, lines };
}

// ---- Laying out -----------------------------------------------------------

const GAP_X = 48;
const GAP_Y = 40;
const MARGIN = 20;
/** Steps per row in the linear form: four fit a 760px column at full size. */
const PER_ROW = 4;

type Route = { points: [number, number][]; label?: string };

/** The linear form: rows of four, each row read left to right. */
function layoutLinear(graph: FlowGraph): { nodes: Placed[]; routes: Route[] } {
  const nodes = graph.nodes.map(measure);
  const rows: Placed[][] = [];
  nodes.forEach((node, i) => {
    (rows[Math.floor(i / PER_ROW)] ??= []).push(node);
  });
  let y = MARGIN;
  for (const row of rows) {
    const h = Math.max(...row.map((node) => node.h));
    row.forEach((node, col) => {
      node.x = MARGIN + col * (BOX_W + GAP_X) + (BOX_W - node.w) / 2;
      node.y = y + (h - node.h) / 2;
    });
    y += h + GAP_Y + 12;
  }
  const byId = new Map(nodes.map((node) => [node.id, node]));
  const rowOf = new Map(nodes.map((node, i) => [node.id, Math.floor(i / PER_ROW)]));
  const routes: Route[] = graph.edges.map((edge) => {
    const a = byId.get(edge.from)!;
    const b = byId.get(edge.to)!;
    if (rowOf.get(a.id) === rowOf.get(b.id)) {
      // Rows are centred on one line, so a step and the next share it.
      const y = a.y + a.h / 2;
      return { points: [[a.x + a.w, y], [b.x, y]], label: edge.label };
    }
    // To the next row: down from the last step, back along the gap, down in.
    const mid = a.y + a.h + (b.y - a.y - a.h) / 2;
    return {
      points: [[a.x + a.w / 2, a.y + a.h], [a.x + a.w / 2, mid], [b.x + b.w / 2, mid], [b.x + b.w / 2, b.y]],
      label: edge.label,
    };
  });
  return { nodes, routes };
}

/**
 * The graph form, top-down: the main path in one column, `lane: "right"`
 * nodes beside the step that branches into them. Edges that skip ahead or
 * loop back on the main path run down its left side.
 */
function layoutGraph(graph: FlowGraph): { nodes: Placed[]; routes: Route[] } {
  const nodes = graph.nodes.map(measure);
  const byId = new Map(nodes.map((node) => [node.id, node]));
  const spine = nodes.filter((node) => node.lane !== "right");
  const side = nodes.filter((node) => node.lane === "right");
  // Room on the left only for the skip and loop-back lanes there are.
  const order = new Map(spine.map((node, i) => [node.id, i]));
  const skips = graph.edges.filter((edge) => {
    const a = order.get(edge.from);
    const b = order.get(edge.to);
    return a !== undefined && b !== undefined && b !== a + 1;
  }).length;
  const spineX = MARGIN + (skips ? 16 + skips * 10 : 0);
  const sideX = spineX + BOX_W + GAP_X + 24;

  let y = MARGIN;
  for (const node of spine) {
    node.x = spineX + (BOX_W - node.w) / 2;
    node.y = y;
    y += node.h + GAP_Y;
  }
  // A side node sits level with the node that leads to it, below any side
  // node already there.
  let sideBottom = 0;
  for (const node of side) {
    const from = graph.edges.find((edge) => edge.to === node.id);
    const source = from ? byId.get(from.from) : undefined;
    const level = source ? source.y + source.h / 2 - node.h / 2 : y;
    node.x = sideX;
    node.y = Math.max(level, sideBottom + (sideBottom ? 16 : 0));
    sideBottom = node.y + node.h;
  }

  const index = new Map(spine.map((node, i) => [node.id, i]));
  let lanes = 0;
  const routes: Route[] = graph.edges.map((edge) => {
    const a = byId.get(edge.from)!;
    const b = byId.get(edge.to)!;
    const ai = index.get(a.id);
    const bi = index.get(b.id);
    const cx = (node: Placed) => node.x + node.w / 2;
    const cy = (node: Placed) => node.y + node.h / 2;
    if (ai !== undefined && bi !== undefined) {
      if (bi === ai + 1) return { points: [[cx(a), a.y + a.h], [cx(b), b.y]], label: edge.label };
      // Skip or loop-back along the left edge, one lane further out each.
      const x = spineX - 16 - lanes++ * 10;
      return { points: [[a.x, cy(a)], [x, cy(a)], [x, cy(b)], [b.x, cy(b)]], label: edge.label };
    }
    if (bi === undefined && b.lane === "right" && a.lane !== "right") {
      if (Math.abs(cy(a) - cy(b)) < 1) return { points: [[a.x + a.w, cy(a)], [b.x, cy(b)]], label: edge.label };
      const x = a.x + a.w + GAP_X / 2;
      return { points: [[a.x + a.w, cy(a)], [x, cy(a)], [x, cy(b)], [b.x, cy(b)]], label: edge.label };
    }
    if (a.lane === "right" && bi !== undefined) {
      // Back from a side path: out of its right, round to the main step.
      const x = a.x + a.w + 20;
      const ty = cy(b) < a.y ? b.y + b.h / 2 : cy(b);
      return {
        points: [[a.x + a.w, cy(a)], [x, cy(a)], [x, ty], [b.x + b.w, ty]],
        label: edge.label,
      };
    }
    return { points: [[cx(a), a.y + a.h], [cx(b), b.y]], label: edge.label };
  });
  return { nodes, routes };
}

// ---- Drawing --------------------------------------------------------------

const esc = (text: string): string =>
  text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/**
 * Colours as CSS variables with the light theme behind them: the HTML spec
 * sets the variables for its dark theme, and the Markdown's image copy, which
 * has none, takes the fallbacks.
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
  bad: "var(--flow-bad,#b42318)",
  badSoft: "var(--flow-bad-soft,#fef3f2)",
  badLine: "var(--flow-bad-line,#f4c7c2)",
  warn: "var(--flow-warn,#b54708)",
  warnSoft: "var(--flow-warn-soft,#fffaeb)",
  warnLine: "var(--flow-warn-line,#fedf89)",
  ok: "var(--flow-ok,#067647)",
  okSoft: "var(--flow-ok-soft,#ecfdf3)",
  okLine: "var(--flow-ok-line,#abefc6)",
  info: "var(--flow-info,#175cd3)",
  infoSoft: "var(--flow-info-soft,#eff8ff)",
  infoLine: "var(--flow-info-line,#b2ddff)",
};

/** A message's colours by its kind: the mark and text, the fill, the outline. */
const TONE_COLOURS: Record<Tone, { ink: keyof typeof C; soft: keyof typeof C; line: keyof typeof C }> = {
  error: { ink: "bad", soft: "badSoft", line: "badLine" },
  warning: { ink: "warn", soft: "warnSoft", line: "warnLine" },
  success: { ink: "ok", soft: "okSoft", line: "okLine" },
  info: { ink: "info", soft: "infoSoft", line: "infoLine" },
};

const FONT = `"Pretendard Variable",Pretendard,"Malgun Gothic","Apple SD Gothic Neo","Segoe UI",sans-serif`;

function shape(node: Placed): string {
  const { x, y, w, h } = node;
  switch (node.type) {
    case "start":
    case "end":
      return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${h / 2}" style="fill:${C.term}"/>`;
    case "decision":
      return (
        `<path d="M${x + POINT} ${y}H${x + w - POINT}L${x + w} ${y + h / 2}L${x + w - POINT} ${y + h}H${x + POINT}L${x} ${y + h / 2}Z" ` +
        `style="fill:${C.dec};stroke:${C.decLine};stroke-width:1;stroke-linejoin:round"/>`
      );
    case "io": {
      const cx = x + PAD_X + 7;
      const cy = y + h / 2;
      const tone = TONE_COLOURS[node.tone ?? "error"];
      return (
        `<rect x="${x + 0.5}" y="${y + 0.5}" width="${w - 1}" height="${h - 1}" rx="10" style="fill:${C[tone.soft]};stroke:${C[tone.line]};stroke-width:1"/>` +
        `<circle cx="${cx}" cy="${cy}" r="7" style="fill:${C[tone.ink]}"/>` +
        `<path d="M${cx} ${cy - 3.5}V${cy + 0.8}M${cx} ${cy + 3.2}V${cy + 3.4}" style="stroke:${C[tone.soft]};stroke-width:1.6;stroke-linecap:round"/>`
      );
    }
    default:
      return `<rect x="${x + 0.5}" y="${y + 0.5}" width="${w - 1}" height="${h - 1}" rx="10" style="fill:${C.box};stroke:${C.boxLine};stroke-width:1"/>`;
  }
}

function text(node: Placed): string {
  const terminal = node.type === "start" || node.type === "end";
  const color = terminal
    ? C.onTerm
    : node.type === "io"
      ? C[TONE_COLOURS[node.tone ?? "error"].ink]
      : node.type === "decision"
        ? C.decInk
        : C.ink;
  const weight = terminal || node.type === "decision" ? 600 : 500;
  const size = terminal ? "12.5px" : `${FONT_SIZE}px`;
  const cx = node.x + node.w / 2 + (node.type === "io" ? ICON / 2 : 0);
  const top = node.y + node.h / 2 - ((node.lines.length - 1) * LINE) / 2;
  const spans = node.lines
    .map((line, i) => `<tspan x="${cx}" y="${top + i * LINE}">${esc(line)}</tspan>`)
    .join("");
  return `<text text-anchor="middle" dominant-baseline="central" style="fill:${color};font-weight:${weight};font-size:${size}">${spans}</text>`;
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
    const inLen = Math.hypot(x - px, y - py);
    const outLen = Math.hypot(next[0] - x, next[1] - y);
    const r = Math.min(radius, inLen / 2, outLen / 2);
    const ax = x - (Math.sign(x - px) * r);
    const ay = y - (Math.sign(y - py) * r);
    const bx = x + (Math.sign(next[0] - x) * r);
    const by = y + (Math.sign(next[1] - y) * r);
    d += `L${ax} ${ay}Q${x} ${y} ${bx} ${by}`;
  }
  return d;
}

function route(r: Route): string {
  let label = "";
  if (r.label) {
    const [x0, y0] = r.points[0]!;
    const [x1, y1] = r.points[1]!;
    const w = widthOf(r.label) * 0.9 + 10;
    // On the first leg, just clear of the node it leaves: the knockout
    // behind it breaks the line, so the label reads as part of it.
    const horizontal = Math.abs(y1 - y0) < 1;
    const cx = horizontal ? x0 + Math.min(Math.abs(x1 - x0) / 2, w / 2 + 6) * Math.sign(x1 - x0 || 1) : x0;
    const cy = horizontal ? y0 : y0 + Math.min(Math.abs(y1 - y0) / 2, 14) * Math.sign(y1 - y0 || 1);
    label =
      `<rect x="${cx - w / 2}" y="${cy - 8}" width="${w}" height="16" rx="4" style="fill:${C.bg}"/>` +
      `<text x="${cx}" y="${cy}" text-anchor="middle" dominant-baseline="central" style="fill:${C.muted};font-size:11.5px;font-weight:600">${esc(r.label)}</text>`;
  }
  return `<path d="${rounded(r.points)}" style="fill:none;stroke:${C.line};stroke-width:1.25" marker-end="url(#flow-arrow)"/>${label}`;
}

/** The flow laid out as this page draws it, or null when there is none. */
function laidOut(spec: ImageSpec): { nodes: Placed[]; routes: Route[]; edges: FlowEdge[] } | null {
  const read = readFlow(spec);
  if (!read) return null;
  return { ...(read.linear ? layoutLinear(read.graph) : layoutGraph(read.graph)), edges: read.graph.edges };
}

// ---- Editing --------------------------------------------------------------

/** The plugin's editable form of a flow (`flow-draw.mjs`): every node at its centre. */
export type FreeGraph = {
  layout: "free";
  nodes: { id: string; type: NodeType; label: string; x: number; y: number; tone?: Tone }[];
  edges: { from: string; to: string; label?: string; fromSide?: Side; toSide?: Side }[];
};
type Side = "N" | "E" | "S" | "W";

/** A free graph, already: the shape a flow is saved in once someone has edited it. */
export function isFreeGraph(flow: unknown): flow is FreeGraph {
  return Boolean(flow && typeof flow === "object" && (flow as FreeGraph).layout === "free" && Array.isArray((flow as FreeGraph).nodes));
}

/** Which side of a node a route's end point sits on. */
function sideOf(node: Placed, [x, y]: [number, number]): Side {
  const gaps: [Side, number][] = [
    ["N", Math.abs(y - node.y)],
    ["S", Math.abs(y - (node.y + node.h))],
    ["W", Math.abs(x - node.x)],
    ["E", Math.abs(x - (node.x + node.w))],
  ];
  return gaps.reduce((best, next) => (next[1] < best[1] ? next : best))[0];
}

/**
 * The flow as the plugin's editor takes it, from the picture this page drew:
 * the same positions and the same sides for every arrow, so opening the
 * editor moves nothing. A flow saved from the editor is handed back as it is.
 */
export function freeFlow(spec: ImageSpec): FreeGraph | null {
  if (isFreeGraph(spec.processFlow)) return spec.processFlow;
  const drawn = laidOut(spec);
  if (!drawn) return null;
  const byId = new Map(drawn.nodes.map((node) => [node.id, node]));
  return {
    layout: "free",
    nodes: drawn.nodes.map((node) => ({
      id: node.id,
      type: node.type,
      label: node.label,
      ...(node.tone ? { tone: node.tone } : {}),
      // On the editor's 5px grid, which every drag snaps to: off it, a moved
      // step could never line up with these again.
      x: Math.round((node.x + node.w / 2) / 5) * 5,
      y: Math.round((node.y + node.h / 2) / 5) * 5,
    })),
    edges: drawn.edges.map((edge, i) => {
      const points = drawn.routes[i]!.points;
      return {
        from: edge.from,
        to: edge.to,
        ...(edge.label ? { label: edge.label } : {}),
        fromSide: sideOf(byId.get(edge.from)!, points[0]!),
        toSide: sideOf(byId.get(edge.to)!, points[points.length - 1]!),
      };
    }),
  };
}

/**
 * The plugin's flow drawing (`flow-draw.mjs`) in this page's colours.
 *
 * It writes its colours as attributes; each one it uses is listed here with
 * the variable that replaces it. `context` narrows a node's text to the shape
 * beside it — a decision's text is drawn in the decision's ink, a message's
 * in red. The HTML spec applies these as CSS (`FLOW_SVG_CSS`), so the dark
 * theme reaches them; the Markdown's copy has them written in
 * (`themedFlowSvg`), light.
 */
const PLUGIN_COLOURS: { selector: string; prop: "fill" | "stroke"; colour: keyof typeof C; context?: string }[] = [
  { selector: "rect.fbg", prop: "fill", colour: "bg" },
  { selector: 'rect[fill="#2E6FB0"]', prop: "fill", colour: "term" },
  { selector: 'rect[stroke="#24598F"]', prop: "stroke", colour: "term" },
  { selector: 'polygon[fill="#FFF6D8"]', prop: "fill", colour: "dec" },
  { selector: 'polygon[stroke="#D9A400"]', prop: "stroke", colour: "decLine" },
  { selector: 'polygon[fill="#FCE7E4"]', prop: "fill", colour: "badSoft" },
  { selector: 'polygon[stroke="#C0563E"]', prop: "stroke", colour: "badLine" },
  { selector: 'rect[fill="#F4F8FC"]', prop: "fill", colour: "box" },
  { selector: 'rect[stroke="#5A85AE"]', prop: "stroke", colour: "boxLine" },
  { selector: 'polyline[stroke="#5E7388"]', prop: "stroke", colour: "line" },
  { selector: 'path[fill="#5E7388"]', prop: "fill", colour: "line" },
  { selector: 'rect[stroke="#D7DEE6"]', prop: "fill", colour: "bg" },
  { selector: 'rect[stroke="#D7DEE6"]', prop: "stroke", colour: "bg" },
  { selector: 'text[fill="#56657A"]', prop: "fill", colour: "muted" },
  { selector: 'text[fill="#1E7A46"]', prop: "fill", colour: "muted" },
  { selector: 'text[fill="#B0402F"]', prop: "fill", colour: "muted" },
  { selector: 'text[fill="#0A4F8C"]', prop: "fill", colour: "ink" },
  { selector: 'text[fill="#2B3A4A"]', prop: "fill", colour: "ink" },
  { selector: 'text[fill="#FFFFFF"]', prop: "fill", colour: "onTerm" },
  { selector: 'text[fill="#2B3A4A"]', prop: "fill", colour: "decInk", context: 'g.fn:has(polygon[fill="#FFF6D8"])' },
  { selector: 'text[fill="#2B3A4A"]', prop: "fill", colour: "bad", context: 'g.fn:has(polygon[fill="#FCE7E4"])' },
  // A message's kind, which the page's drawing marks with `data-tone` on the
  // node and on its legend swatch (`spec-flow-page.ts`).
  ...(["warning", "success", "info"] as const).flatMap((tone) => {
    const { ink, soft, line } = TONE_COLOURS[tone];
    const at = `[data-tone="${tone}"]`;
    return [
      { selector: 'polygon[fill="#FCE7E4"]', prop: "fill" as const, colour: soft, context: at },
      { selector: 'polygon[stroke="#C0563E"]', prop: "stroke" as const, colour: line, context: at },
      { selector: 'text[fill="#2B3A4A"]', prop: "fill" as const, colour: ink, context: `g.fn${at}:has(polygon[fill="#FCE7E4"])` },
    ];
  }),
];

/** The light value behind a `var(--x,#light)`. */
const lightOf = (value: string): string => /,([^)]+)\)$/.exec(value)?.[1] ?? value;

/** `PLUGIN_COLOURS` as CSS, for the plugin's drawing inside the HTML spec. */
export const FLOW_SVG_CSS =
  `svg.flow-svg{font-family:${FONT}}` +
  `svg.flow-svg [filter]{filter:none}` +
  PLUGIN_COLOURS.map(
    ({ selector, prop, colour, context }) =>
      `${context ? `svg.flow-svg ${context} ` : "svg.flow-svg "}${selector}{${prop}:${C[colour]}}`,
  ).join("");

/** The plugin's drawing of a flow with this page's light colours written into it. */
export function themedFlowSvg(svg: string): string {
  if (typeof DOMParser === "undefined") return svg;
  const doc = new DOMParser().parseFromString(svg, "image/svg+xml");
  const root = doc.documentElement;
  if (root.nodeName !== "svg") return svg;
  root.setAttribute("font-family", FONT);
  root.querySelectorAll("[filter]").forEach((el) => el.removeAttribute("filter"));
  // Match on the drawing as it came, then write: one rule must not feed the next.
  const writes: [Element, string, string][] = [];
  for (const { selector, prop, colour, context } of PLUGIN_COLOURS) {
    root.querySelectorAll(context ? `${context} ${selector}` : selector).forEach((el) => {
      writes.push([el, prop, lightOf(C[colour])]);
    });
  }
  for (const [el, prop, value] of writes) el.setAttribute(prop, value);
  return new XMLSerializer().serializeToString(root);
}

/** The flow as a standalone SVG document, sized to its content. */
export function flowSvg(spec: ImageSpec): { svg: string; width: number; height: number } | null {
  const drawn = laidOut(spec);
  if (!drawn) return null;
  const { nodes, routes } = drawn;
  const xs = [...nodes.map((node) => node.x + node.w), ...routes.flatMap((r) => r.points.map(([x]) => x))];
  const ys = [...nodes.map((node) => node.y + node.h), ...routes.flatMap((r) => r.points.map(([, y]) => y))];
  const minX = Math.min(0, ...routes.flatMap((r) => r.points.map(([x]) => x - 8)));
  const width = Math.ceil(Math.max(...xs) + MARGIN - minX);
  const height = Math.ceil(Math.max(...ys) + MARGIN);
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" class="spec-flow" viewBox="${minX} 0 ${width} ${height}" width="${width}" height="${height}" role="img" style="font-family:${esc(FONT)};font-size:${FONT_SIZE}px;letter-spacing:-0.01em">` +
    `<defs><marker id="flow-arrow" viewBox="0 0 10 10" refX="8.5" refY="5" markerWidth="9" markerHeight="9" markerUnits="userSpaceOnUse" orient="auto-start-reverse">` +
    `<path d="M2.5 1.5L8.5 5L2.5 8.5" style="fill:none;stroke:${C.line};stroke-width:1.5;stroke-linecap:round;stroke-linejoin:round"/></marker></defs>` +
    `<rect x="${minX}" y="0" width="${width}" height="${height}" style="fill:${C.bg}"/>` +
    routes.map(route).join("") +
    nodes.map((node) => shape(node) + text(node)).join("") +
    `</svg>`;
  return { svg, width, height };
}
