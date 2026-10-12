// Package → Process: what each program does with the database, from its source.
//
//   node scan.mjs <run folder> <source file or folder> [more …]
//
// The process document needs, per program, the tables it reads and writes,
// the functions, BAPIs and classes it calls, the programs and transactions it
// hands over to, its screens and its ALV — not its source. GetProgFullCode
// with `output: "file"` writes the source under the MCP output folder
// (`<MCP output>/src/<main object>/<object>.abap`, includes and all) and
// returns only paths; this reads those files and prints a few lines per main
// object, so the agent never reads a source. A 3,000-line report is ~40k
// tokens read once and carried through every later turn; its summary here is
// a handful of lines.
//
// Pattern-based, not a parser: comments and literals are stripped first, and
// a name is taken as a database table only where the statement says so
// (SELECT … FROM, JOIN, UPDATE … SET, DELETE FROM, INSERT INTO) or where it
// does not look like an internal table (gt_, lt_, it_ … prefixes).
// It also writes `<run folder>/_work/scan.json` with the same facts.
//
// `--detail` (Compare Programs) adds what a comparison asks of each program:
// the selection-screen fields with their types, each AUTHORITY-CHECK with
// its fields, the ALV columns with their headings, markers of the business
// logic (COLLECT, subtotals, conversions …) and the FORM routines. Measured
// 2026-10-12: without it an Economy comparison spent nine Grep and Read calls,
// each a turn of its whole context, finding the same lines.
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { basename, dirname, join } from "node:path";

const args = process.argv.slice(2);
const detail = args.includes("--detail");
const [runDir, ...inputs] = args.filter((arg) => arg !== "--detail");
if (!runDir || inputs.length === 0) {
  console.error("Usage: node scan.mjs <run folder> <source file or folder> [more …] [--detail]");
  process.exit(2);
}

/** Every .abap file under the inputs, with the main object it belongs to. */
function collect(path, found) {
  if (!existsSync(path)) {
    console.error(`scan: not found: ${path}`);
    return;
  }
  if (statSync(path).isDirectory()) {
    for (const entry of readdirSync(path)) collect(join(path, entry), found);
  } else if (/\.abap$/i.test(path)) {
    found.push(path);
  }
}
const files = [];
for (const input of inputs) collect(input, files);
if (files.length === 0) {
  console.error("scan: no .abap files in what was given");
  process.exit(1);
}

/** `<MCP output>/src/<MAIN>/<object>.abap` → MAIN; anything else → its own name. */
const mainOf = (file) => {
  const parent = basename(dirname(file));
  // The folder is named `<main>.prog` / `<main>.fugr` / `<main>.clas`.
  return basename(dirname(dirname(file))).toLowerCase() === "src"
    ? parent.replace(/\.(prog|fugr|clas|intf)$/i, "").toUpperCase()
    : basename(file).replace(/(\.(prog|incl|fugr|func|clas))?\.abap$/i, "").toUpperCase();
};

/** The source without comments and with literals blanked (a literal's text kept apart). */
function clean(text) {
  const literals = [];
  const code = text
    .split(/\r?\n/)
    .filter((line) => !line.startsWith("*"))
    .map((line) => {
      let out = "";
      let quote = null;
      for (let i = 0; i < line.length; i++) {
        const ch = line[i];
        if (quote) {
          if (ch === quote) {
            quote = null;
            out += ch;
          } else {
            literals[literals.length - 1] += ch;
          }
          continue;
        }
        if (ch === '"') break;
        if (ch === "'" || ch === "`" || ch === "|") {
          quote = ch;
          literals.push("");
          out += `${ch}§${literals.length - 1}§`;
          continue;
        }
        out += ch;
      }
      return out;
    })
    .join("\n");
  return { code, literals };
}

const LOCAL = /^(g|l|i|w|s|c|p)?(t|s|v|wa|r|o|ty|tt|x)?_|^(it|wa|lt|gt|ls|gs|lv|gv|lo|go|lr|gr|ty|tt|t|s|w)_|^<.*>$|^@|^\(/i;
const TABLE = /^[A-Z\/][A-Z0-9_\/]{2,29}$/i;
const isTable = (name) => TABLE.test(name) && !LOCAL.test(name);

function scan(code, literals) {
  const flat = code.replace(/\s+/g, " ");
  const lit = (token) => {
    const m = /§(\d+)§/.exec(token);
    return m ? literals[Number(m[1])] ?? "" : token;
  };
  const found = { reads: new Set(), writes: new Set(), fms: new Set(), classes: new Set(), submits: new Set(), tcodes: new Set(), screens: new Set(), auth: new Set(), alv: new Set(), functions: new Set() };
  const each = (re, fn) => {
    for (const m of flat.matchAll(re)) fn(m);
  };
  each(/\bFROM\s+([A-Z\/][\w\/]*)/gi, (m) => {
    const before = flat.slice(Math.max(0, m.index - 60), m.index);
    // DELETE … FROM <db> is a write; READ/LOOP/DELETE <itab> FROM is not a table.
    if (/\bDELETE\s+$/i.test(before) && isTable(m[1])) found.writes.add(m[1].toUpperCase());
    else if (/\b(SELECT|JOIN)\b/i.test(before) || /\bSELECT\b[^.]*$/i.test(flat.slice(Math.max(0, m.index - 400), m.index))) {
      if (isTable(m[1])) found.reads.add(m[1].toUpperCase());
    }
  });
  each(/\bJOIN\s+([A-Z\/][\w\/]*)/gi, (m) => isTable(m[1]) && found.reads.add(m[1].toUpperCase()));
  each(/\bUPDATE\s+([A-Z\/][\w\/]*)\s+(SET|FROM)\b/gi, (m) => isTable(m[1]) && found.writes.add(m[1].toUpperCase()));
  each(/\bINSERT\s+(INTO\s+)?([A-Z\/][\w\/]*)\s+(FROM|VALUES)\b/gi, (m) => isTable(m[2]) && found.writes.add(m[2].toUpperCase()));
  each(/\bMODIFY\s+([A-Z\/][\w\/]*)\s+FROM\b/gi, (m) => isTable(m[1]) && found.writes.add(m[1].toUpperCase()));
  each(/\bCALL\s+FUNCTION\s+('§\d+§'|\S+)/gi, (m) => {
    const name = lit(m[1]).toUpperCase().trim();
    if (name) found.fms.add(name);
  });
  each(/\bFUNCTION\s+([A-Z\/][\w\/]*)\s*\./gi, (m) => found.functions.add(m[1].toUpperCase()));
  each(/\b((?:Z|Y|CL_|\/)[\w\/]*)=>/gi, (m) => found.classes.add(m[1].toUpperCase()));
  each(/\bTYPE\s+REF\s+TO\s+((?:Z|Y|CL_|\/)[\w\/]*)/gi, (m) => found.classes.add(m[1].toUpperCase()));
  each(/\bNEW\s+((?:Z|Y|CL_)[\w\/]*)\s*\(/gi, (m) => found.classes.add(m[1].toUpperCase()));
  each(/\bCREATE\s+OBJECT\s+\S+\s+TYPE\s+((?:Z|Y|CL_)[\w\/]*)/gi, (m) => found.classes.add(m[1].toUpperCase()));
  each(/\bSUBMIT\s+('§\d+§'|[A-Z\/][\w\/]*)/gi, (m) => found.submits.add(lit(m[1]).toUpperCase()));
  each(/\b(?:CALL|LEAVE\s+TO)\s+TRANSACTION\s+('§\d+§'|\S+)/gi, (m) => found.tcodes.add(lit(m[1]).toUpperCase()));
  each(/\bCALL\s+SCREEN\s+(\d+)/gi, (m) => found.screens.add(m[1]));
  each(/\bAUTHORITY-CHECK\s+OBJECT\s+('§\d+§'|\S+)/gi, (m) => found.auth.add(lit(m[1]).toUpperCase()));
  for (const [re, name] of [
    [/\bCL_SALV_TABLE\b/i, "CL_SALV_TABLE"],
    [/\bCL_GUI_ALV_GRID\b/i, "CL_GUI_ALV_GRID"],
    [/\bREUSE_ALV_GRID_DISPLAY/i, "REUSE_ALV_GRID_DISPLAY"],
    [/\bREUSE_ALV_LIST_DISPLAY/i, "REUSE_ALV_LIST_DISPLAY"],
  ]) {
    if (re.test(flat)) found.alv.add(name);
  }
  const selection = {
    parameters: (flat.match(/\bPARAMETERS?\b/gi) ?? []).length,
    selectOptions: (flat.match(/\bSELECT-OPTIONS\b/gi) ?? []).length,
  };
  return { found, selection, details: detail ? details(flat, lit) : null };
}

/** Selection flags worth naming. */
const FLAGS = ["OBLIGATORY", "NO-DISPLAY", "NO INTERVALS", "NO-EXTENSION", "AS CHECKBOX", "RADIOBUTTON", "DEFAULT"];

/** Business-logic markers, by the statement that shows one. */
const LOGIC = [
  [/^COLLECT\b/i, "COLLECT"],
  [/^AT\s+(NEW|END\s+OF)\b/i, "AT NEW / END OF"],
  [/^SUM$/i, "SUM"],
  [/\bSELECT\b[\s\S]*\bSUM\s*\(/i, "SQL SUM()"],
  [/\bGROUP\s+BY\b/i, "GROUP BY"],
  [/^CONVERT\s+(TIME\s+STAMP|DATE)\b/i, "CONVERT TIME STAMP"],
  [/CURRENCY_CONVERSION|CONVERT_TO_LOCAL_CURRENCY|CONVERT_TO_FOREIGN_CURRENCY|READ_EXCHANGE_RATE/i, "currency conversion"],
  [/UNIT_CONVERSION|MD_CONVERT_MATERIAL_UNIT/i, "unit conversion"],
  [/^DELETE\s+ADJACENT\s+DUPLICATES\b/i, "DELETE ADJACENT DUPLICATES"],
  [/\bSELECT\s+SINGLE\b/i, "SELECT SINGLE"],
];

/** Compare Programs' facts — see `--detail` at the top. */
function details(flat, lit) {
  const out = { fields: [], checks: [], columns: [], logic: new Set(), forms: [] };
  const literal = /^'§\d+§'$/;
  let fcat = false;
  let column = null;
  for (const st of flat.split(".").map((part) => part.trim()).filter(Boolean)) {
    // PARAMETERS / SELECT-OPTIONS, chained or not: the name and what it is typed on.
    const sel = /^(PARAMETERS?|SELECT-OPTIONS)\s*:?\s*([\s\S]*)$/i.exec(st);
    if (sel) {
      for (const item of sel[2].split(",")) {
        const m = /^\s*(\w+)\s+(FOR|TYPE|LIKE)\s+([\w\-\/]+)([\s\S]*)$/i.exec(item);
        if (!m) continue;
        const flags = FLAGS.filter((flag) => new RegExp(`\\b${flag}\\b`, "i").test(m[4]));
        out.fields.push(`${m[1].toUpperCase()} ${m[2].toUpperCase()} ${m[3].toUpperCase()}${flags.length ? ` (${flags.join(", ").toLowerCase()})` : ""}`);
      }
      continue;
    }
    const auth = /^AUTHORITY-CHECK\s+OBJECT\s+('§\d+§'|\S+)([\s\S]*)$/i.exec(st);
    if (auth) {
      const ids = [...auth[2].matchAll(/\bID\s+('§\d+§'|\S+)\s+(FIELD\s+\S+|DUMMY)/gi)].map(
        (m) => `${lit(m[1]).toUpperCase()}${/DUMMY/i.test(m[2]) ? "=dummy" : ""}`,
      );
      out.checks.push(`${lit(auth[1]).toUpperCase()}(${ids.join(", ")})`);
      continue;
    }
    // The field catalog: `CASE <x>-fieldname` … `WHEN 'EBELN'`, or `<x>-fieldname = 'EBELN'`;
    // the heading and the subtotal flag that follow belong to that column.
    if (/^CASE\s+\S*FIELDNAME$/i.test(st)) {
      fcat = true;
      continue;
    }
    if (/^ENDCASE$/i.test(st)) {
      fcat = false;
      continue;
    }
    const when = fcat ? /^WHEN\s+('§\d+§'(?:\s+OR\s+'§\d+§')*)/i.exec(st) : null;
    const named = /(?:^|-)FIELDNAME\s*=\s*('§\d+§')/i.exec(st);
    if (when || named) {
      for (const token of (when ? when[1] : named[1]).split(/\s+OR\s+/i)) {
        column = { name: lit(token).toUpperCase(), heading: "", sum: false, hidden: false };
        out.columns.push(column);
      }
    }
    if (column) {
      const heading = /(?:^|-)(COLTEXT|SCRTEXT_[LMS]|REPTEXT)\s*=\s*('§\d+§'|TEXT-\w+)/i.exec(st);
      if (heading && !column.heading) column.heading = literal.test(heading[2]) ? `"${lit(heading[2])}"` : heading[2].toUpperCase();
      if (/(?:^|-)DO_SUM\s*=\s*(ABAP_TRUE|'§\d+§')/i.test(st)) column.sum = true;
      if (/(?:^|-)NO_OUT\s*=\s*(ABAP_TRUE|'§\d+§')/i.test(st)) column.hidden = true;
    }
    const structure = /\bI_STRUCTURE_NAME\s*=\s*('§\d+§')/i.exec(st);
    if (structure) out.columns.push({ name: `(structure ${lit(structure[1]).toUpperCase()})`, heading: "", sum: false, hidden: false });
    const form = /^FORM\s+([\w\/]+)/i.exec(st);
    if (form) out.forms.push(form[1].toLowerCase());
    for (const [re, name] of LOGIC) if (re.test(st)) out.logic.add(name);
  }
  return out;
}

const byMain = new Map();
for (const file of files) {
  const main = mainOf(file);
  const text = readFileSync(file, "utf8");
  const { code, literals } = clean(text);
  const { found, selection, details } = scan(code, literals);
  const entry = byMain.get(main) ?? { lines: 0, objects: 0, found: null, selection: { parameters: 0, selectOptions: 0 }, details: null };
  entry.lines += text.split(/\r?\n/).length;
  entry.objects += 1;
  if (!entry.found) entry.found = found;
  else for (const key of Object.keys(found)) for (const v of found[key]) entry.found[key].add(v);
  entry.selection.parameters += selection.parameters;
  entry.selection.selectOptions += selection.selectOptions;
  if (details && !entry.details) entry.details = details;
  else if (details) {
    for (const key of ["fields", "checks", "columns", "forms"]) entry.details[key].push(...details[key]);
    for (const marker of details.logic) entry.details.logic.add(marker);
  }
  byMain.set(main, entry);
}

const list = (set) => [...set].sort().join(", ");
const result = {};
for (const [main, e] of [...byMain.entries()].sort()) {
  const f = e.found;
  // A table a program writes is listed under writes only.
  for (const t of f.writes) f.reads.delete(t);
  result[main] = {
    lines: e.lines,
    objects: e.objects,
    reads: [...f.reads].sort(),
    writes: [...f.writes].sort(),
    functions_defined: [...f.functions].sort(),
    calls: [...f.fms].sort(),
    classes: [...f.classes].sort(),
    submits: [...f.submits].sort(),
    call_transaction: [...f.tcodes].sort(),
    screens: [...f.screens].sort(),
    alv: [...f.alv].sort(),
    authority: [...f.auth].sort(),
    selection: e.selection,
    ...(e.details
      ? {
          selection_fields: e.details.fields,
          authority_checks: e.details.checks,
          alv_columns: e.details.columns,
          logic: [...e.details.logic].sort(),
          forms: e.details.forms,
        }
      : {}),
  };
  const d = e.details;
  const column = (c) => `${c.name}${c.heading ? ` ${c.heading}` : ""}${c.sum ? " Σ" : ""}${c.hidden ? " (hidden)" : ""}`;
  const parts = [
    `${main} (${e.lines.toLocaleString("en")} lines in ${e.objects} object${e.objects === 1 ? "" : "s"})`,
    f.functions.size ? `  defines: ${list(f.functions)}` : null,
    `  reads: ${list(f.reads) || "-"}`,
    `  writes: ${list(f.writes) || "-"}`,
    f.fms.size ? `  calls: ${list(f.fms)}` : null,
    f.classes.size ? `  classes: ${list(f.classes)}` : null,
    f.submits.size ? `  submits: ${list(f.submits)}` : null,
    f.tcodes.size ? `  call transaction: ${list(f.tcodes)}` : null,
    f.screens.size ? `  screens: ${list(f.screens)}` : null,
    f.alv.size ? `  ALV: ${list(f.alv)}` : null,
    f.auth.size ? `  authority-check: ${list(f.auth)}` : null,
    e.selection.parameters + e.selection.selectOptions ? `  selection screen: ${e.selection.parameters} parameters, ${e.selection.selectOptions} select-options` : null,
    d?.fields.length ? `  selection fields: ${d.fields.join("; ")}` : null,
    d ? `  authority-check fields: ${d.checks.join("; ") || "none in the source"}` : null,
    d?.columns.length ? `  ALV columns: ${d.columns.map(column).join("; ")}` : null,
    d?.logic.size ? `  logic markers: ${[...d.logic].sort().join(", ")}` : null,
    d?.forms.length ? `  routines: ${d.forms.join(", ")}` : null,
  ];
  console.log(parts.filter(Boolean).join("\n"));
}

mkdirSync(join(runDir, "_work"), { recursive: true });
writeFileSync(join(runDir, "_work", "scan.json"), `${JSON.stringify(result, null, 1)}\n`, "utf8");
