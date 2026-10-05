// Package → Process: the package's object list, made small.
//
//   node walk.mjs <GetPackageContents result file> <run folder>
//
// The same reasoning as the CBO inventory's objects.mjs: GetPackageContents
// answers with every object of the package and its description, the Agent
// SDK saves an answer that size to a file, and reading it back would carry
// tens of thousands of tokens through every later turn. A process run needs
// less of it than an inventory does — what can start a process (programs,
// transactions), what holds its logic (function groups, classes) and what it
// stores (custom tables) — so this prints exactly those, one line each with
// the description, and the counts of the rest.
//
// The file is the tool's JSON array as the SDK saved it; a result the SDK
// wrapped as MCP content ([{ type: "text", text: "[…]" }]) is unwrapped.
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const [source, runDir] = process.argv.slice(2);
if (!source || !runDir) {
  console.error("Usage: node walk.mjs <GetPackageContents result file> <run folder>");
  process.exit(2);
}

function parse(text) {
  let data = JSON.parse(text);
  if (Array.isArray(data) && data[0] && data[0].type === "text" && typeof data[0].text === "string") {
    data = JSON.parse(data.map((part) => part.text).join(""));
  }
  if (!Array.isArray(data)) {
    const list = data.objects ?? data.contents ?? data.items;
    if (Array.isArray(list)) return list;
    throw new Error("not an object list");
  }
  return data;
}

let items;
try {
  items = parse(readFileSync(source, "utf8"));
} catch (error) {
  console.error(`walk: ${source}: ${error.message}`);
  process.exit(1);
}

const objects = items
  .filter((item) => item && item.name && !item.isPackage)
  .map((item) => [String(item.adtType || item.type || ""), String(item.name), String(item.description || "")]);

mkdirSync(join(runDir, "_work"), { recursive: true });
writeFileSync(join(runDir, "_work", "objects.json"), `${JSON.stringify(objects)}\n`, "utf8");

/** `PROG/P` → `PROG`; a structure is listed as `TABL/DS`, an include as `PROG/I`. */
const kindOf = (type) => {
  const [head, sub = ""] = type.toUpperCase().split("/");
  if (head === "TABL" && sub === "DS") return "STRU";
  if (head === "PROG" && sub === "I") return "INCL";
  return head;
};

const counts = {};
const shown = { PROG: [], TRAN: [], FUGR: [], CLAS: [], TABL: [], VIEW: [] };
for (const [type, name, description] of objects) {
  const kind = kindOf(type);
  counts[kind] = (counts[kind] ?? 0) + 1;
  const into = kind === "DDLS" ? shown.VIEW : shown[kind];
  if (into) into.push(description ? `${name} — ${description}` : name);
}

const LABEL = {
  PROG: "programs (entry candidates; includes left out)",
  TRAN: "transactions (GetTransaction each, in one message, for the program it starts)",
  FUGR: "function groups",
  CLAS: "classes",
  TABL: "custom tables",
  VIEW: "views",
};

console.log(`objects: ${objects.length} — ${Object.entries(counts).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${v}`).join(", ")}`);
for (const [kind, lines] of Object.entries(shown)) {
  if (lines.length === 0) continue;
  console.log(`${LABEL[kind]} (${lines.length}):`);
  for (const line of lines.sort()) console.log(`  ${line}`);
}
