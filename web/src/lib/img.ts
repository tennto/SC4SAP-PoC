/**
 * Display IMG — the shapes the backend's `/img/*` routes answer with, and the
 * derivations the screen makes from them.
 *
 * The backend reads everything live from the SAP system (see
 * `src/server/img.ts`); nothing here is sample data. Mirrors the backend
 * types by hand, as `types.ts` does for the rest of the API.
 */
import type { Locale } from "./i18n/locale";

export type Texts = { ko?: string; ja?: string; en?: string };

export type ImgModule = { id: string; tree: string; node: string | null; text: Texts };

export type ImgNode = { id: string; text: Texts; act?: string; kids?: ImgNode[] };

export type ImgObject = { type: string; name: string; table?: string };

export type ImgActivity = { text: Texts; tcode?: string; objects: ImgObject[] };

export type ImgTree = {
  alias: string;
  module: ImgModule;
  root: ImgNode;
  acts: Record<string, ImgActivity>;
  builtAt: string;
};

export type ImgStatus = {
  alias: string;
  counts: Record<string, number | null>;
  checkedAt: string;
};

export type Progress = { phase: string; done: number; total: number };

/** `id` is `TABLE.FIELD`, which rows are keyed by; `name` is the field. */
export type ScreenColumn = { id: string; name: string; label: Texts; key: boolean; length: number };

export type Screen = {
  object: ImgObject;
  kind: "table" | "none";
  title?: Texts;
  columns: ScreenColumn[];
  rows: Record<string, string>[];
  total: number | null;
  note?: string;
  cluster?: string;
};

/** The screen's language where SAP has the text; English otherwise. */
export function pick(texts: Texts | undefined, locale: Locale): string {
  if (!texts) return "";
  if (locale === "ko") return texts.ko || texts.en || "";
  if (locale === "ja") return texts.ja || texts.en || "";
  return texts.en || texts.ko || texts.ja || "";
}

/**
 * Configured: some table behind the activity has rows. Empty: every table
 * was counted and none has. Unknown: nothing countable (a BAdI, a program,
 * a logical object) or a count that failed. Unchecked: no check has run.
 */
export type ActStatus = "set" | "empty" | "unknown" | "unchecked";

export function activityStatus(act: ImgActivity | undefined, status: ImgStatus | null): ActStatus {
  const tables = (act?.objects ?? []).map((o) => o.table).filter((t): t is string => !!t);
  if (!tables.length) return "unknown";
  if (!status) return "unchecked";
  const counts = tables.map((t) => status.counts[t]);
  if (counts.some((c) => typeof c === "number" && c > 0)) return "set";
  if (counts.every((c) => c === 0)) return "empty";
  return "unknown";
}

export type Tally = Record<ActStatus, number> & { total: number };

export const emptyTally = (): Tally => ({ set: 0, empty: 0, unknown: 0, unchecked: 0, total: 0 });

/** Per folder: how many activities under it are in each state. */
export function tallyTree(tree: ImgTree, status: ImgStatus | null): Map<string, Tally> {
  const out = new Map<string, Tally>();
  const walk = (node: ImgNode): Tally => {
    const tally = emptyTally();
    if (node.act) {
      tally[activityStatus(tree.acts[node.act], status)] += 1;
      tally.total = 1;
    }
    for (const kid of node.kids ?? []) {
      const sub = walk(kid);
      tally.set += sub.set;
      tally.empty += sub.empty;
      tally.unknown += sub.unknown;
      tally.unchecked += sub.unchecked;
      tally.total += sub.total;
    }
    out.set(node.id, tally);
    return tally;
  };
  walk(tree.root);
  return out;
}

/** Child → parent, for the breadcrumb and for unfolding a path. */
export function parentMap(root: ImgNode): Map<string, ImgNode> {
  const out = new Map<string, ImgNode>();
  const walk = (node: ImgNode) => {
    for (const kid of node.kids ?? []) {
      out.set(kid.id, node);
      walk(kid);
    }
  };
  walk(root);
  return out;
}

/**
 * The module abbreviation SAP people say aloud, keyed by the IMG node's
 * English text. Only modules with a settled short name are listed; the rest
 * show their name alone.
 */
const ABBREVIATIONS: Record<string, string> = {
  "Materials Management": "MM",
  "Sales and Distribution": "SD",
  "Financial Accounting": "FI",
  "Controlling": "CO",
  "Production": "PP",
  "Production Planning for Process Industries": "PP-PI",
  "Plant Maintenance and Customer Service": "PM",
  "Customer Service": "CS",
  "Quality Management": "QM",
  "Project System": "PS",
  "Logistics Execution": "LE",
  "Logistics - General": "LO",
  "Investment Management": "IM",
  "Enterprise Controlling": "EC",
  "Real Estate": "RE",
  "Flexible Real Estate Management (RE-FX)": "RE-FX",
  "Personnel Management": "PA",
  "Time Management": "PT",
  "Payroll": "PY",
  "Training and Event Management": "PE",
  "Cross-Application Components": "CA",
  "Financial Supply Chain Management": "FSCM",
  "Warehouse Management": "WM",
  "SCM Extended Warehouse Management": "EWM",
  "Transportation Management": "TM",
  "Environment, Health and Safety": "EHS",
  "Governance, Risk and Compliance": "GRC",
  "Public Sector Management": "PSM",
  "Joint Venture Accounting": "JVA",
  "SAP Global Trade Services, edition for SAP HANA": "GTS",
};

export function abbreviation(module: ImgModule): string | undefined {
  return module.text.en ? ABBREVIATIONS[module.text.en] : undefined;
}

/**
 * A module as the picker shows it. A translated name gets its abbreviation
 * — "자재 관리(MM)" — because the abbreviation is what a Korean or Japanese
 * consultant reads first; the English name already is the long form.
 */
export function moduleName(module: ImgModule, locale: Locale): string {
  const name = pick(module.text, locale);
  const short = abbreviation(module);
  // "Flexible Real Estate Management (RE-FX)" already carries it.
  return short && locale !== "en" && !name.includes(`(${short})`) ? `${name}(${short})` : name;
}

/**
 * Every module's display name, with a repeat numbered: SAP lists two nodes
 * both called "Financial Accounting", and a list that shows the same name
 * twice gives no way to tell which is which.
 */
export function moduleNames(modules: ImgModule[], locale: Locale): Map<string, string> {
  const seen = new Map<string, number>();
  const out = new Map<string, string>();
  for (const m of modules) {
    const name = moduleName(m, locale);
    const n = (seen.get(name) ?? 0) + 1;
    seen.set(name, n);
    out.set(m.id, n > 1 ? `${name} · ${n}` : name);
  }
  return out;
}
