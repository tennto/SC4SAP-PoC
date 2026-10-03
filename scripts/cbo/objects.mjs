// Inventory a CBO Package: the package's object list, made small.
//
//   node objects.mjs <GetPackageContents result file> <run folder>
//
// GetPackageContents answers with every object of the package and its
// description — 66k characters for ZMMPAEK's 362 objects — and the Agent SDK
// saves an answer that size to a file. Measured on 2026-10-04 the run then
// read the file back (26k tokens), and carried it through every later turn,
// to learn which objects to ask where-used for. This reads the file instead:
//
//   - writes `<run folder>/_work/objects.json` — [type, name, description]
//     for every object, which build-index.mjs turns into the "Everything in
//     the package" table, so the agent never writes those rows out either;
//   - prints a few lines for the agent: the counts by type, the package-size
//     threshold for "frequently used", and the names to ask where-used for,
//     by the object_type GetWhereUsed takes.
//
// The file is the tool's JSON array as the SDK saved it; a result the SDK
// wrapped as MCP content ([{ type: "text", text: "[…]" }]) is unwrapped.
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const [source, runDir] = process.argv.slice(2);
if (!source || !runDir) {
  console.error("Usage: node objects.mjs <GetPackageContents result file> <run folder>");
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
  console.error(`objects: ${source}: ${error.message}`);
  process.exit(1);
}

const objects = items
  .filter((item) => item && item.name && !item.isPackage)
  .map((item) => [String(item.adtType || item.type || ""), String(item.name), String(item.description || "")]);

mkdirSync(join(runDir, "_work"), { recursive: true });
writeFileSync(join(runDir, "_work", "objects.json"), `${JSON.stringify(objects)}\n`, "utf8");

/** The ADT type's head (`TABL/DT` → `TABL`). */
const head = (type) => type.split("/")[0].toUpperCase();

/** The kind an object is counted and asked about as: a structure is listed as TABL/DS. */
const kindOf = (type) => (head(type) === "TABL" && /\/DS$/i.test(type) ? "STRU" : head(type));

const counts = {};
for (const [type] of objects) counts[kindOf(type)] = (counts[kindOf(type)] ?? 0) + 1;

const total = objects.length;
const threshold = total < 30 ? 2 : total <= 150 ? 3 : 5;

// What GetWhereUsed is asked for, by the object_type it takes. Data elements
// only in a package under 150 objects; programs, includes, domains and table
// types never.
const WHERE_USED = { TABL: "tabl/dt", STRU: "stru/dt", VIEW: "view", DDLS: "view", CLAS: "clas/oc", INTF: "intf/if", FUGR: "fugr" };
if (total < 150) WHERE_USED.DTEL = "dtel";
const targets = {};
for (const [type, name, description] of objects) {
  const as = WHERE_USED[kindOf(type)];
  if (as) (targets[as] ??= []).push(description ? `${name} — ${description}` : name);
}

console.log(`objects: ${total} — ${Object.entries(counts).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${v}`).join(", ")}`);
console.log(`frequently used: ${threshold} or more in-package references (package of ${total})`);
console.log(`written: ${join(runDir, "_work", "objects.json")} (for build-index.mjs; do not read it)`);
// One line per target, with its description: enough to judge a purpose or a
// sensitive name without reading the list.
console.log("where-used targets, by object_type (name — description):");
for (const [as, names] of Object.entries(targets)) {
  console.log(`${as} (${names.length}):`);
  for (const line of names) console.log(`  ${line}`);
}
