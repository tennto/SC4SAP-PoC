/**
 * Display IMG — the live system's SPRO tree, whether each activity has been
 * configured, and what its maintenance screen holds.
 *
 * Everything comes from the system itself through `SapDirect`, so no model is
 * involved and a run costs nothing but SAP round-trips:
 *
 *   tree      TNODEIMG / TNODEIMGT / TNODEIMGR — the IMG structure. A module
 *             is a REF node under the SAP Reference IMG root, and its tree is
 *             itself stitched from REF nodes into further trees, six levels
 *             deep for MM (2,840 nodes, 18 statements, ~8 s measured).
 *   activity  CUS_IMGACH / CUS_IMGACT / CUS_ACTOBJ — what each IMG node runs
 *             and which views, view clusters or tables it maintains; views
 *             resolved to their primary table through DD25L.
 *   status    COUNT(*) per primary table, forty to a UNION ALL statement
 *             (MM: 709 tables, ~30 s). An activity is "configured" when any
 *             of its tables has rows — SAP-delivered entries count, since
 *             the table holds them either way.
 *   screen    the view's fields (DD27S), their labels (DD03M), and up to 50
 *             rows of the primary table and its text table — read only for
 *             customizing / system tables, and only past the blocklist.
 *
 * Tree and status are cached per profile under
 * `<workspace>/.sc4sap/img-cache/<alias>/`. The tree changes only with an
 * upgrade, so it is built once; status is refreshed on request. Both builds
 * run as background jobs the screen polls, because a big module outlasts any
 * sensible HTTP timeout.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { inList, isDdicName, type SapDirect, type SqlRow } from "./sap-direct.ts";

/** Texts in Korean, Japanese and English; the screen picks by its locale. */
export type Texts = { ko?: string; ja?: string; en?: string };

export type ImgModule = { id: string; tree: string; node: string | null; text: Texts };

/** One folder or activity in the tree. `act` marks an activity. */
export type ImgNode = { id: string; text: Texts; act?: string; kids?: ImgNode[] };

export type ImgObject = {
  /** CUS_ACTOBJ type: V view, S/T table, C view cluster, L logical object… */
  type: string;
  name: string;
  /** The table whose rows decide the status, when there is one. */
  table?: string;
};

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
  /** Row count per table; `null` where the count itself failed. */
  counts: Record<string, number | null>;
  checkedAt: string;
};

export type Progress = { phase: string; done: number; total: number };

/** The column of an SM30-style screen. */
/**
 * The column of an SM30-style screen. `id` is `TABLE.FIELD`: a view can show
 * the same field name from two tables, and rows are keyed by it.
 */
export type ScreenColumn = { id: string; name: string; label: Texts; key: boolean; length: number };

export type Screen = {
  object: ImgObject;
  /** `table`: drawn as SM30; `none`: nothing tabular to draw (and why). */
  kind: "table" | "none";
  title?: Texts;
  columns: ScreenColumn[];
  rows: Record<string, string>[];
  total: number | null;
  /** Why rows are missing or partial, when they are. */
  note?: string;
  /** The view cluster this screen is a member of, drawn as its dialog structure. */
  cluster?: string;
};

/** Delivery classes whose rows are configuration rather than business data. */
const CUSTOMIZING_CLASSES = new Set(["C", "G", "E", "S", "W"]);

/** Tables per UNION ALL count statement. 40 measured at ~1.6 s. */
const COUNT_BATCH = 40;

/** Rows drawn per screen, and columns, before the screen says "more". */
const SCREEN_ROWS = 50;
const SCREEN_COLUMNS = 24;

const textOf = (rows: SqlRow[], idKey: string, textKey: string): Map<string, Texts> => {
  const out = new Map<string, Texts>();
  for (const r of rows) {
    const id = r[idKey];
    const text = r[textKey]?.trim();
    if (!id || !text) continue;
    const t = out.get(id) ?? {};
    const lang = r.SPRAS ?? r.DDLANGUAGE;
    if (lang === "3") t.ko = text;
    else if (lang === "J") t.ja = text;
    else t.en = text;
    out.set(id, t);
  }
  return out;
};

/**
 * Children in IMG order. TNODEIMG chains siblings backwards: `BROTHER_ID` is
 * the sibling *before* a node, empty on the first. Later additions often
 * point at the same predecessor (or at themselves), so followers of one node
 * are taken in text order rather than trusted to form a single chain.
 */
function orderSiblings(nodes: SqlRow[], text: (n: SqlRow) => string): SqlRow[] {
  const ids = new Set(nodes.map((n) => n.NODE_ID));
  const after = new Map<string, SqlRow[]>();
  const heads: SqlRow[] = [];
  for (const n of nodes) {
    const prev = n.BROTHER_ID;
    if (!prev || prev === n.NODE_ID || !ids.has(prev)) heads.push(n);
    else after.set(prev, [...(after.get(prev) ?? []), n]);
  }
  const byText = (a: SqlRow, b: SqlRow) => text(a).localeCompare(text(b));
  const out: SqlRow[] = [];
  const seen = new Set<string>();
  const visit = (n: SqlRow) => {
    if (seen.has(n.NODE_ID!)) return;
    seen.add(n.NODE_ID!);
    out.push(n);
    for (const next of (after.get(n.NODE_ID!) ?? []).sort(byText)) visit(next);
  };
  heads.sort(byText).forEach(visit);
  // A cycle leaves nodes unvisited; keep them rather than lose them.
  nodes.filter((n) => !seen.has(n.NODE_ID!)).sort(byText).forEach(visit);
  return out;
}

/** IMG node ids are 32 hexadecimal characters; nothing else reaches a file name. */
function checkModuleId(id: string): void {
  if (!/^[0-9A-F]{32}$/.test(id)) throw new Error(`not a module id: ${id.slice(0, 40)}`);
}

type Job<T> = { progress: Progress; promise: Promise<T>; error?: string; reported?: boolean };

export class ImgService {
  private jobs = new Map<string, Job<unknown>>();

  constructor(
    private readonly sap: SapDirect,
    private readonly workspace: string,
  ) {}

  private dir(alias: string): string {
    const dir = join(this.workspace, ".sc4sap", "img-cache", alias || "default");
    mkdirSync(dir, { recursive: true });
    return dir;
  }

  private read<T>(alias: string, file: string): T | null {
    const path = join(this.dir(alias), file);
    if (!existsSync(path)) return null;
    try {
      return JSON.parse(readFileSync(path, "utf8")) as T;
    } catch {
      return null;
    }
  }

  private write(alias: string, file: string, value: unknown): void {
    // Every read goes to whichever profile is live at the time, so a switch
    // during a build would mix two systems; such a result is not kept.
    if (this.sap.activeAlias() !== alias) {
      throw new Error("the SAP profile changed while this was being read; open it again");
    }
    writeFileSync(join(this.dir(alias), file), JSON.stringify(value));
  }

  /**
   * Start `work` under `key` unless it is already running. The caller polls
   * `job(key)`; a finished job leaves its result in the cache and goes away.
   */
  private start<T>(key: string, work: (p: Progress) => Promise<T>): Job<T> {
    const running = this.jobs.get(key) as Job<T> | undefined;
    // A failed job answers once with its error, so the screen can show it;
    // the next ask (the reader's Retry) starts the work again.
    if (running && !(running.error && running.reported)) {
      if (running.error) running.reported = true;
      return running;
    }
    const progress: Progress = { phase: "start", done: 0, total: 0 };
    const job: Job<T> = { progress, promise: Promise.resolve() as Promise<T> };
    job.promise = work(progress).then(
      (value) => {
        this.jobs.delete(key);
        return value;
      },
      (err: Error) => {
        // Kept until it has been reported once (or a minute has passed).
        job.error = err.message;
        console.error(`[img] ${key} failed: ${err.message}`);
        setTimeout(() => {
          if (this.jobs.get(key) === job) this.jobs.delete(key);
        }, 60_000).unref();
        throw err;
      },
    );
    job.promise.catch(() => {});
    this.jobs.set(key, job as Job<unknown>);
    return job;
  }

  /**
   * The modules the profile says are in use (`SAP_ACTIVE_MODULES`, e.g.
   * `MM,SD,FI,CO`), so the screen can open on the first of them. Read from
   * `sap.env` directly: one non-secret key, where `profiles.ts` would spawn
   * the profile CLI for the whole record.
   */
  private activeModules(alias: string): string[] {
    const env = join(homedir(), ".sc4sap", "profiles", alias, "sap.env");
    if (!alias || !existsSync(env)) return [];
    const line = readFileSync(env, "utf8")
      .split(/\r?\n/)
      .find((l) => l.startsWith("SAP_ACTIVE_MODULES="));
    return line ? line.slice(line.indexOf("=") + 1).split(",").map((m) => m.trim().toUpperCase()).filter(Boolean) : [];
  }

  /** The modules under the SAP Reference IMG, in SPRO order. Cached. */
  async modules(): Promise<{ alias: string; active: string[]; modules: ImgModule[] }> {
    const alias = this.sap.activeAlias();
    const active = this.activeModules(alias);
    const cached = this.read<ImgModule[]>(alias, "modules.json");
    if (cached) return { alias, active, modules: cached };

    const [root] = await this.sap.sql(
      "SELECT TREE_ID, NODE_ID FROM TNODEIMGT\n" +
        "WHERE SPRAS = 'E' AND TEXT = 'SAP Customizing Implementation Guide'",
      5,
    );
    if (!root) throw new Error("the SAP Reference IMG was not found on this system");
    const nodes = await this.sap.sql(
      "SELECT NODE_ID, BROTHER_ID, NODE_TYPE, REFTREE_ID, REFNODE_ID FROM TNODEIMG\n" +
        `WHERE TREE_ID = '${root.TREE_ID}' AND PARENT_ID = '${root.NODE_ID}'`,
    );
    const texts = textOf(
      await this.sap.sql(
        "SELECT NODE_ID, SPRAS, TEXT FROM TNODEIMGT\n" +
          `WHERE TREE_ID = '${root.TREE_ID}' AND SPRAS IN ('3', 'E', 'J')`,
      ),
      "NODE_ID",
      "TEXT",
    );
    const modules = orderSiblings(nodes, (n) => texts.get(n.NODE_ID!)?.en ?? "")
      .filter((n) => n.NODE_TYPE === "REF" && n.REFTREE_ID)
      .map((n) => ({
        id: n.NODE_ID!,
        tree: n.REFTREE_ID!,
        node: n.REFNODE_ID || null,
        text: texts.get(n.NODE_ID!) ?? { en: n.NODE_ID! },
      }));
    this.write(alias, "modules.json", modules);
    return { alias, active, modules };
  }

  /** A module's tree from the cache, or the running build's progress. */
  async tree(moduleId: string): Promise<{ tree: ImgTree } | { progress: Progress; error?: string }> {
    checkModuleId(moduleId);
    const alias = this.sap.activeAlias();
    const cached = this.read<ImgTree>(alias, `tree-${moduleId}.json`);
    if (cached) return { tree: cached };
    const { modules } = await this.modules();
    const module = modules.find((m) => m.id === moduleId);
    if (!module) throw new Error(`no module ${moduleId}`);
    const job = this.start(`${alias}:tree:${moduleId}`, (p) => this.buildTree(alias, module, p));
    return { progress: job.progress, error: job.error };
  }

  private async buildTree(alias: string, module: ImgModule, p: Progress): Promise<ImgTree> {
    const sap = this.sap;
    const nodes: SqlRow[] = [];
    const nodeTexts: SqlRow[] = [];
    const refs: SqlRow[] = [];

    // Breadth-first over REF links: every round reads all trees found so far.
    p.phase = "structure";
    const seen = new Set([module.tree]);
    let frontier = [module.tree];
    while (frontier.length) {
      const next: string[] = [];
      for (const row of await sap.sqlIn(frontier, (l) =>
        "SELECT TREE_ID, NODE_ID, PARENT_ID, BROTHER_ID, NODE_TYPE, REFTREE_ID, REFNODE_ID\n" +
        `FROM TNODEIMG WHERE TREE_ID IN ${l}`, 100)) {
        nodes.push(row);
        const ref = row.REFTREE_ID;
        if (ref && !seen.has(ref)) {
          seen.add(ref);
          next.push(ref);
        }
      }
      nodeTexts.push(...(await sap.sqlIn(frontier, (l) =>
        "SELECT NODE_ID, SPRAS, TEXT FROM TNODEIMGT\n" +
        `WHERE SPRAS IN ('3', 'E', 'J') AND TREE_ID IN ${l}`, 100)));
      refs.push(...(await sap.sqlIn(frontier, (l) =>
        "SELECT r~NODE_ID, r~REF_OBJECT FROM TNODEIMGR AS r\n" +
        "INNER JOIN TNODEIMG AS n ON n~NODE_ID = r~NODE_ID\n" +
        `WHERE r~REF_TYPE = 'COBJ' AND n~TREE_ID IN ${l}`, 100)));
      p.done = seen.size - next.length;
      p.total = seen.size;
      frontier = next;
    }

    // What each activity is called and what it maintains.
    p.phase = "activities";
    const activityOf = new Map(
      refs.filter((r) => r.NODE_ID && r.REF_OBJECT).map((r) => [r.NODE_ID!, r.REF_OBJECT!]),
    );
    const actIds = [...new Set(activityOf.values())];
    p.done = 0;
    p.total = actIds.length;
    const headers = await sap.sqlIn(actIds, (l) =>
      `SELECT ACTIVITY, C_ACTIVITY, TCODE FROM CUS_IMGACH\nWHERE ACTIVITY IN ${l}`);
    const actTexts = textOf(
      await sap.sqlIn(actIds, (l) =>
        `SELECT ACTIVITY, SPRAS, TEXT FROM CUS_IMGACT\nWHERE SPRAS IN ('3', 'E', 'J') AND ACTIVITY IN ${l}`,
        // Three languages for 200 activities came back as a bare 400 from
        // ADT (measured on MM); 100 at a time passes.
        100),
      "ACTIVITY",
      "TEXT",
    );
    const cActs = [...new Set(headers.map((h) => h.C_ACTIVITY).filter((v): v is string => !!v))];
    const objects = await sap.sqlIn(cActs, (l) =>
      `SELECT ACT_ID, OBJECTTYPE, OBJECTNAME, TCODE FROM CUS_ACTOBJ\nWHERE ACT_ID IN ${l}`);
    p.done = actIds.length;

    // Views and tables to the one table whose rows say "configured".
    p.phase = "tables";
    // A view cluster is judged by its header view, the first in VCLSTRUC:
    // the one every other member hangs off.
    const clusters = [...new Set(objects.filter((o) => o.OBJECTTYPE === "C")
      .map((o) => o.OBJECTNAME!).filter(isDdicName))];
    const headerOf = new Map<string, string>();
    for (const m of (await sap.sqlIn(clusters, (l) =>
      `SELECT VCLNAME, OBJECT, OBJPOS FROM VCLSTRUC
WHERE VCLNAME IN ${l}`))
      .sort((x, y) => (x.OBJPOS ?? "").localeCompare(y.OBJPOS ?? ""))) {
      if (!headerOf.has(m.VCLNAME!)) headerOf.set(m.VCLNAME!, m.OBJECT!);
    }
    const names = [...new Set([
      ...objects.filter((o) => "VST".includes(o.OBJECTTYPE ?? "-")).map((o) => o.OBJECTNAME!),
      ...headerOf.values(),
    ].filter(isDdicName))];
    // A view may sit on another view; follow each chain to its table.
    const rootOf = new Map<string, string>();
    let pending = names;
    for (let depth = 0; depth < 4 && pending.length; depth++) {
      const found = await sap.sqlIn(pending, (l) =>
        `SELECT VIEWNAME, ROOTTAB FROM DD25L\nWHERE AS4LOCAL = 'A' AND VIEWNAME IN ${l}`);
      for (const v of found) {
        for (const [name, root] of rootOf) if (root === v.VIEWNAME) rootOf.set(name, v.ROOTTAB!);
        if (!rootOf.has(v.VIEWNAME!)) rootOf.set(v.VIEWNAME!, v.ROOTTAB!);
      }
      pending = [...new Set(found.map((v) => v.ROOTTAB!))].filter(isDdicName);
    }
    const candidates = [...new Set(names.map((n) => rootOf.get(n) ?? n))];
    const transparent = new Set((await sap.sqlIn(candidates, (l) =>
      `SELECT TABNAME, TABCLASS FROM DD02L\nWHERE AS4LOCAL = 'A' AND TABNAME IN ${l}`))
      .filter((d) => ["TRANSP", "POOL", "CLUSTER"].includes(d.TABCLASS ?? ""))
      .map((d) => d.TABNAME!));

    const objectsOf = new Map<string, ImgObject[]>();
    for (const o of objects) {
      const own = o.OBJECTTYPE === "C" ? headerOf.get(o.OBJECTNAME!) : o.OBJECTNAME!;
      const table = own ? (rootOf.get(own) ?? own) : "";
      const list = objectsOf.get(o.ACT_ID!) ?? [];
      // CUS_ACTOBJ can list one object twice (D:IMGDUMMY under two positions).
      if (list.some((x) => x.type === (o.OBJECTTYPE ?? "") && x.name === o.OBJECTNAME)) continue;
      list.push({
        type: o.OBJECTTYPE ?? "",
        name: o.OBJECTNAME!,
        ...(transparent.has(table) ? { table } : {}),
      });
      objectsOf.set(o.ACT_ID!, list);
    }
    const acts: Record<string, ImgActivity> = {};
    for (const h of headers) {
      acts[h.ACTIVITY!] = {
        text: actTexts.get(h.ACTIVITY!) ?? { en: h.ACTIVITY! },
        ...(h.TCODE ? { tcode: h.TCODE } : {}),
        objects: objectsOf.get(h.C_ACTIVITY ?? "") ?? [],
      };
    }

    // Stitch the trees together into one.
    const texts = textOf(nodeTexts, "NODE_ID", "TEXT");
    const byId = new Map(nodes.map((n) => [n.NODE_ID!, n]));
    const kidsOf = new Map<string, SqlRow[]>();
    const rootsOf = new Map<string, SqlRow[]>();
    for (const n of nodes) {
      if (n.PARENT_ID) kidsOf.set(n.PARENT_ID, [...(kidsOf.get(n.PARENT_ID) ?? []), n]);
      else rootsOf.set(n.TREE_ID!, [...(rootsOf.get(n.TREE_ID!) ?? []), n]);
    }
    const label = (n: SqlRow): Texts => {
      const act = activityOf.get(n.NODE_ID!);
      const own = texts.get(n.NODE_ID!) ?? (act ? acts[act]?.text : undefined);
      // A REF node often carries only an English text; the node it points at
      // may have the Korean one (NATO Stock Number… is such a node).
      const ref = n.REFNODE_ID ? texts.get(n.REFNODE_ID) : undefined;
      if (own || ref) return { ...ref, ...own, ko: own?.ko ?? ref?.ko, en: own?.en ?? ref?.en };
      return { en: act ?? n.NODE_TYPE ?? "?" };
    };
    const childrenOf = (n: SqlRow): SqlRow[] => {
      if (n.NODE_TYPE !== "REF") return kidsOf.get(n.NODE_ID!) ?? [];
      const target = n.REFNODE_ID ? byId.get(n.REFNODE_ID) : undefined;
      if (target) return kidsOf.get(target.NODE_ID!) ?? [];
      return (rootsOf.get(n.REFTREE_ID!) ?? []).flatMap((r) => kidsOf.get(r.NODE_ID!) ?? []);
    };
    const onPath = new Set<string>();
    // Two REF nodes can include the same tree, so one node may appear twice;
    // the screen keys on ids, so a repeat gets a suffix.
    const used = new Map<string, number>();
    const uniqueId = (id: string): string => {
      const n = used.get(id) ?? 0;
      used.set(id, n + 1);
      return n ? `${id}~${n}` : id;
    };
    const build = (n: SqlRow): ImgNode | null => {
      const act = activityOf.get(n.NODE_ID!);
      if (act) return acts[act] ? { id: uniqueId(n.NODE_ID!), text: label(n), act } : null;
      if (onPath.has(n.NODE_ID!)) return null;
      onPath.add(n.NODE_ID!);
      const kids = orderSiblings(childrenOf(n), (k) => label(k).en ?? "")
        .map(build)
        .filter((k): k is ImgNode => k !== null);
      onPath.delete(n.NODE_ID!);
      return kids.length ? { id: uniqueId(n.NODE_ID!), text: label(n), kids } : null;
    };
    const top = (module.node ? byId.get(module.node) : undefined) ?? rootsOf.get(module.tree)?.[0];
    const root: ImgNode = {
      id: module.id,
      text: module.text,
      kids: top
        ? orderSiblings(kidsOf.get(top.NODE_ID!) ?? [], (k) => label(k).en ?? "")
            .map(build)
            .filter((k): k is ImgNode => k !== null)
        : [],
    };

    const tree: ImgTree = { alias, module, root, acts, builtAt: new Date().toISOString() };
    this.write(alias, `tree-${module.id}.json`, tree);
    return tree;
  }

  /** A module's last status check, and the running check's progress if any. */
  status(moduleId: string): { status: ImgStatus | null; progress?: Progress; error?: string } {
    checkModuleId(moduleId);
    const alias = this.sap.activeAlias();
    const job = this.jobs.get(`${alias}:status:${moduleId}`);
    if (job?.error) job.reported = true;
    return {
      status: this.read<ImgStatus>(alias, `status-${moduleId}.json`),
      ...(job ? (job.error ? { error: job.error } : { progress: job.progress }) : {}),
    };
  }

  /** Recount a module's tables. Needs the tree; returns the job's progress. */
  refreshStatus(moduleId: string): Progress {
    checkModuleId(moduleId);
    const alias = this.sap.activeAlias();
    const tree = this.read<ImgTree>(alias, `tree-${moduleId}.json`);
    if (!tree) throw new Error("the tree has not been read yet");
    const tables = [...new Set(Object.values(tree.acts).flatMap((a) =>
      a.objects.map((o) => o.table).filter((t): t is string => !!t && isDdicName(t))))];
    return this.start(`${alias}:status:${moduleId}`, async (p) => {
      p.phase = "count";
      p.total = tables.length;
      const counts: Record<string, number | null> = {};
      for (let i = 0; i < tables.length; i += COUNT_BATCH) {
        const batch = tables.slice(i, i + COUNT_BATCH);
        try {
          await this.countInto(batch, counts);
        } catch {
          // One table the database will not count fails the whole UNION;
          // count that batch one by one so only the bad table is lost. The
          // single count is a bare COUNT(*): the MCP blocklist exempts only
          // aggregate-only projections, and the 'TAB' literal of the batch
          // form gets tables such as PACT or PAMS_* (caught by the HR
          // pattern PA*) refused as row extraction.
          for (const t of batch) {
            try {
              const [row] = await this.sap.sql(`SELECT COUNT(*) AS CNT FROM ${t}`, 1);
              counts[t] = Number(row?.CNT ?? 0);
            } catch {
              counts[t] = null;
            }
          }
        }
        p.done = Math.min(tables.length, i + COUNT_BATCH);
      }
      const status: ImgStatus = { alias, counts, checkedAt: new Date().toISOString() };
      this.write(alias, `status-${moduleId}.json`, status);
      return status;
    }).progress;
  }

  private async countInto(tables: string[], counts: Record<string, number | null>): Promise<void> {
    const rows = await this.sap.sql(
      tables.map((t) => `SELECT '${t}' AS TAB, COUNT(*) AS CNT FROM ${t}`).join("\nUNION ALL\n"),
      tables.length + 1,
    );
    for (const r of rows) counts[r.TAB!.trim()] = Number(r.CNT ?? 0);
  }

  /** The SM30-style screens of one activity, read live. */
  async screens(moduleId: string, activity: string): Promise<Screen[]> {
    checkModuleId(moduleId);
    const alias = this.sap.activeAlias();
    const tree = this.read<ImgTree>(alias, `tree-${moduleId}.json`);
    const act = tree && Object.hasOwn(tree.acts, activity) ? tree.acts[activity] : undefined;
    if (!act) throw new Error(`no activity ${activity} in this module`);
    const out: Screen[] = [];
    for (const object of act.objects.slice(0, 6)) {
      if (object.type === "C" && isDdicName(object.name)) {
        // A view cluster: one screen per member view, in cluster order.
        const members = await this.sap.sql(
          "SELECT OBJECT, OBJPOS FROM VCLSTRUC\n" +
            `WHERE VCLNAME = '${object.name}' ORDER BY OBJPOS`,
          20,
        );
        for (const m of members.slice(0, 6)) {
          out.push({ ...(await this.screen({ type: "V", name: m.OBJECT! })), cluster: object.name });
        }
      } else {
        out.push(await this.screen(object));
      }
    }
    return out;
  }

  /**
   * The table under a view. A maintenance view may sit on another view
   * (VV_T161_VB on V_T161 on T161), so the chain is followed to the end.
   */
  private async rootTable(name: string): Promise<{ root: string; isView: boolean }> {
    let current = name;
    let isView = false;
    for (let depth = 0; depth < 4; depth++) {
      const [view] = await this.sap.sql(
        `SELECT ROOTTAB FROM DD25L\nWHERE AS4LOCAL = 'A' AND VIEWNAME = '${current}'`, 1);
      if (!view?.ROOTTAB) break;
      isView = true;
      current = view.ROOTTAB;
    }
    if (!isDdicName(current)) throw new Error(`unexpected table name ${current}`);
    return { root: current, isView };
  }

  private async screen(object: ImgObject): Promise<Screen> {
    const none = (note: string): Screen => ({ object, kind: "none", columns: [], rows: [], total: null, note });
    if (!"VST".includes(object.type) || !isDdicName(object.name)) {
      return none(`type ${object.type || "?"} has no table to draw`);
    }
    const sap = this.sap;
    const name = object.name;
    const { root, isView } = await this.rootTable(name);

    // Fields and their tables: from the view when it is one, else the table.
    const [fieldRows, condRows, titleRows] = await Promise.all([
      isView
        ? sap.sql("SELECT OBJPOS, TABNAME, FIELDNAME, KEYFLAG FROM DD27S\n" +
            `WHERE AS4LOCAL = 'A' AND VIEWNAME = '${name}' ORDER BY OBJPOS`)
        : sap.sql("SELECT POSITION, FIELDNAME, KEYFLAG FROM DD03L\n" +
            `WHERE AS4LOCAL = 'A' AND TABNAME = '${name}' ORDER BY POSITION`),
      isView
        ? sap.sql("SELECT TABNAME, FIELDNAME, OPERATOR, CONSTANTS FROM DD28S\n" +
            `WHERE AS4LOCAL = 'A' AND CONDNAME = '${name}'`)
        : Promise.resolve([] as SqlRow[]),
      sap.sql(isView
        ? "SELECT DDLANGUAGE, VIEWNAME AS NAME, DDTEXT FROM DD25T\n" +
          `WHERE AS4LOCAL = 'A' AND DDLANGUAGE IN ('3', 'E', 'J') AND VIEWNAME = '${name}'`
        : "SELECT DDLANGUAGE, TABNAME AS NAME, DDTEXT FROM DD02T\n" +
          `WHERE AS4LOCAL = 'A' AND DDLANGUAGE IN ('3', 'E', 'J') AND TABNAME = '${name}'`, 4,
      ).catch(() => [] as SqlRow[]),
    ]);
    const fields = fieldRows
      .filter((f) => !f.FIELDNAME!.startsWith("."))
      .map((f) => ({ table: isView ? f.TABNAME! : root, field: f.FIELDNAME!, key: f.KEYFLAG === "X" }));
    if (!fields.length) return none(`${name} has no fields in the dictionary`);
    // A field of a view on a view names the inner view; read it as its table.
    const named = [...new Set(fields.map((f) => f.table))].filter((t) => t !== root && isDdicName(t));
    const resolved = new Map(
      await Promise.all(named.map(async (t) => [t, (await this.rootTable(t)).root] as const)),
    );
    for (const f of fields) f.table = resolved.get(f.table) ?? f.table;
    const conds: string[] = [];
    for (const c of condRows) {
      // Only plain equality on the primary table is carried over; anything
      // else is left out and the screen may show more rows than SM30 would.
      const value = c.CONSTANTS?.trim();
      const table = resolved.get(c.TABNAME!) ?? c.TABNAME;
      if (table === root && c.OPERATOR?.trim() === "EQ" && value && /^'[^']*'$/.test(value)) {
        conds.push(`${c.FIELDNAME} = ${value}`);
      }
    }

    const tables = [...new Set(fields.map((f) => f.table))].filter(isDdicName);
    // Lines stay under ADT's 255-character limit (see `inList`): one
    // condition and one field per line.
    const where = conds.length ? `\nWHERE ${conds.join("\n  AND ")}` : "";
    const [meta, deliveryRows, countRows] = await Promise.all([
      sap.sqlIn(tables, (l) =>
        "SELECT TABNAME, FIELDNAME, DDLANGUAGE, SCRTEXT_M, SCRTEXT_L, REPTEXT, LENG, DATATYPE, KEYFLAG\n" +
        `FROM DD03M WHERE DDLANGUAGE IN ('3', 'E', 'J') AND TABNAME IN ${l}`),
      sap.sqlIn(tables, (l) =>
        `SELECT TABNAME, CONTFLAG FROM DD02L\nWHERE AS4LOCAL = 'A' AND TABNAME IN ${l}`),
      sap.sql(`SELECT COUNT(*) AS CNT FROM ${root}${where}`, 1).catch(() => [] as SqlRow[]),
    ]);
    const metaOf = new Map<string, { label: Texts; length: number; type: string; key: boolean }>();
    for (const m of meta) {
      const id = `${m.TABNAME}-${m.FIELDNAME}`;
      const entry = metaOf.get(id) ??
        { label: {}, length: Number(m.LENG ?? 10), type: m.DATATYPE ?? "", key: m.KEYFLAG === "X" };
      const label = (m.SCRTEXT_M || m.REPTEXT || m.SCRTEXT_L)?.trim();
      if (label) entry.label[m.DDLANGUAGE === "3" ? "ko" : m.DDLANGUAGE === "J" ? "ja" : "en"] = label;
      metaOf.set(id, entry);
    }
    const typeOf = (table: string, field: string) => metaOf.get(`${table}-${field}`)?.type;
    // The client and language columns are not shown in SM30 either.
    const shown = fields
      .filter((f) => typeOf(f.table, f.field) !== "CLNT" && typeOf(f.table, f.field) !== "LANG")
      .slice(0, SCREEN_COLUMNS);
    const delivery = new Map(deliveryRows.map((d) => [d.TABNAME!, d.CONTFLAG ?? ""]));
    const title = textOf(titleRows, "NAME", "DDTEXT").get(name);

    const columns: ScreenColumn[] = shown.map((f) => {
      const m = metaOf.get(`${f.table}-${f.field}`);
      return {
        id: `${f.table}.${f.field}`,
        name: f.field,
        label: m && (m.label.en || m.label.ko) ? m.label : { en: f.field },
        key: f.key,
        length: m?.length ?? 10,
      };
    });
    const base: Screen = {
      object,
      kind: "table",
      ...(title ? { title } : {}),
      columns,
      rows: [],
      total: countRows[0] && Number.isFinite(Number(countRows[0].CNT)) ? Number(countRows[0].CNT) : null,
    };

    if (!CUSTOMIZING_CLASSES.has(delivery.get(root) ?? "")) {
      return { ...base, note: `${root} holds application data (delivery class ${delivery.get(root) || "?"}); rows are not read` };
    }
    const keyFields = [...metaOf.entries()]
      .filter(([id, m]) => id.startsWith(`${root}-`) && m.key && m.type !== "CLNT")
      .map(([id]) => id.slice(root.length + 1));
    const select = [...new Set([...keyFields, ...shown.filter((f) => f.table === root).map((f) => f.field)])];
    if (!select.length) return { ...base, note: `${root} has no fields of its own on this screen` };
    const query = `SELECT ${select.join(",\n  ")}\nFROM ${root}${where}`;
    const refusal = await sap.checkBlocklist(query);
    if (refusal) return { ...base, note: refusal.split("\n")[0] };
    const rows = await sap.sql(query, SCREEN_ROWS);

    // Each joined table — usually a text table — is read for the keys it
    // shares with the primary table, in Korean or else English.
    const joined = new Map<string, { keys: string[]; rows: SqlRow[] }>();
    for (const table of tables.filter((t) => t !== root)) {
      const wanted = shown.filter((f) => f.table === table).map((f) => f.field);
      const keys = keyFields.filter((k) => metaOf.get(`${table}-${k}`)?.key);
      if (!wanted.length || !keys.length || !rows.length) continue;
      if (!CUSTOMIZING_CLASSES.has(delivery.get(table) ?? "")) continue;
      const lang = [...metaOf.entries()]
        .find(([id, m]) => id.startsWith(`${table}-`) && m.type === "LANG" && m.key)?.[0]
        .slice(table.length + 1);
      const values = [...new Set(rows.map((r) => r[keys[0]!] ?? "").filter(Boolean))];
      if (!values.length) continue;
      const textQuery =
        `SELECT ${[...new Set([...(lang ? [lang] : []), ...keys, ...wanted])].join(",\n  ")}\n` +
        `FROM ${table}\nWHERE ${lang ? `${lang} IN ('3', 'E') AND ` : ""}${keys[0]!} IN ${inList(values)}`;
      if (await sap.checkBlocklist(textQuery)) continue;
      const found = await sap.sql(textQuery, 5000).catch(() => [] as SqlRow[]);
      // English first, so a Korean row for the same key wins below.
      joined.set(table, {
        keys,
        rows: lang ? [...found.filter((r) => r[lang] !== "3"), ...found.filter((r) => r[lang] === "3")] : found,
      });
    }
    base.rows = rows.map((r) => {
      const out: Record<string, string> = {};
      for (const f of shown) {
        let value = f.table === root ? r[f.field] : undefined;
        const join = joined.get(f.table);
        if (join) {
          value = join.rows.filter((t) => join.keys.every((k) => (t[k] ?? "") === (r[k] ?? ""))).pop()?.[f.field];
        }
        out[`${f.table}.${f.field}`] = (value ?? "").trim();
      }
      return out;
    });
    return base;
  }
}
