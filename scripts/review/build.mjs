// Analyze Code: the review's code changes, checked against the source they change.
//
//   node build.mjs <run folder>
//
// The review agent writes `<run folder>/_work/review.json` — the findings,
// and per proposed change the source file it read (a path GetProgFullCode,
// GetClass … wrote with `output: "file"`), the line range, the lines as they
// stand and the lines it proposes. This reads those source files and, per
// change:
//   - checks that the lines at that range are the ones the agent quoted, and
//     when they are not, looks for the quoted lines elsewhere in the same file
//     and moves the range there if they occur exactly once;
//   - takes the lines around the range, so the page can show the change in
//     place with the editor's own line numbers.
// A change whose lines cannot be found is kept, marked `verified: false`, and
// shown without the side-by-side view: a line number on screen has to be the
// one in the SAP editor, not one the model guessed.
//
// Writes `<run folder>/review-data.json`, which the page builds the HTML and
// the Markdown from, and prints one line per change.
import { existsSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { basename, join, resolve } from "node:path";

const [runDir] = process.argv.slice(2);
if (!runDir) {
  console.error("Usage: node build.mjs <run folder>");
  process.exit(2);
}
const reviewPath = join(runDir, "_work", "review.json");
if (!existsSync(reviewPath)) {
  console.error(`review: not found: ${reviewPath}`);
  process.exit(1);
}

let review;
try {
  review = JSON.parse(readFileSync(reviewPath, "utf8"));
} catch (error) {
  console.error(`review: ${reviewPath} is not valid JSON: ${error.message}`);
  process.exit(1);
}

/** Lines shown above and below a change. */
const CONTEXT = 12;

/** Only sources the MCP server wrote: a review file never names anything else. */
const isSource = (path) => {
  const full = resolve(path).replace(/\\/g, "/").toLowerCase();
  return full.endsWith(".abap") && full.includes("/mcp-output/");
};

/** A source path as the agent gave it — `/c/…` from Git Bash too. */
const local = (path) =>
  process.platform === "win32" ? path.replace(/^\/([a-zA-Z])(?=\/)/, "$1:") : path;

/** `…/zmmr00020f01.prog.abap` → ZMMR00020F01; `…/zcl_x.clas.abap` → ZCL_X. */
const objectOf = (path) =>
  basename(path)
    .replace(/(\.inactive)?\.abap$/i, "")
    .replace(/\.(prog|incl|clas|intf|func|fugr)$/i, "")
    .replace(/#/g, "/")
    .toUpperCase();

const cache = new Map();
function linesOf(path) {
  if (!cache.has(path)) {
    cache.set(path, readFileSync(path, "utf8").replace(/\r\n?/g, "\n").replace(/\n$/, "").split("\n"));
  }
  return cache.get(path);
}

/** One line as compared: trailing blanks and runs of blanks don't count, case does not either (ABAP). */
const norm = (line) => line.replace(/\s+/g, " ").trim().toLowerCase();

/** Lines of a quoted block, without a leading or trailing empty line. */
const block = (text) => {
  const lines = String(text ?? "").replace(/\r\n?/g, "\n").split("\n");
  while (lines.length && lines[0].trim() === "") lines.shift();
  while (lines.length && lines[lines.length - 1].trim() === "") lines.pop();
  return lines;
};

/** Where `quoted` sits in `lines` (1-based start), or every place it does. */
function find(lines, quoted) {
  const want = quoted.map(norm);
  const found = [];
  for (let at = 0; at + want.length <= lines.length; at += 1) {
    let same = true;
    for (let k = 0; k < want.length && same; k += 1) same = norm(lines[at + k]) === want[k];
    if (same) found.push(at + 1);
  }
  return found;
}

const changes = Array.isArray(review.changes) ? review.changes : [];
const out = [];
for (const [index, change] of changes.entries()) {
  const original = block(change.original);
  const proposed = block(change.proposed);
  const file = typeof change.file === "string" ? local(change.file) : "";
  const entry = {
    ...change,
    original: original.join("\n"),
    proposed: proposed.join("\n"),
    object: change.object || (file ? objectOf(file) : ""),
    verified: false,
  };
  delete entry.file;
  const label = `#${index + 1} ${entry.object || "?"} ${change.start ?? "?"}-${change.end ?? "?"}`;
  if (!file || !isSource(file) || !existsSync(file) || !statSync(file).isFile()) {
    console.log(`${label}: source file not found — shown without the comparison`);
    out.push(entry);
    continue;
  }
  if (original.length === 0) {
    console.log(`${label}: no original lines quoted — shown without the comparison`);
    out.push(entry);
    continue;
  }
  const lines = linesOf(file);
  let start = Number(change.start);
  const fits =
    Number.isInteger(start) &&
    start >= 1 &&
    start + original.length - 1 <= lines.length &&
    original.every((line, k) => norm(line) === norm(lines[start - 1 + k]));
  let note = "as given";
  if (!fits) {
    const places = find(lines, original);
    if (places.length === 1) {
      note = `moved from ${change.start} to ${places[0]}`;
      start = places[0];
    } else {
      console.log(
        `${label}: the quoted lines ${places.length ? `occur ${places.length} times` : "are not in the source"} — shown without the comparison`,
      );
      out.push(entry);
      continue;
    }
  }
  const end = start + original.length - 1;
  const from = Math.max(1, start - CONTEXT);
  const to = Math.min(lines.length, end + CONTEXT);
  out.push({
    ...entry,
    // The lines as they are in the file, not as quoted: the page shows the source.
    original: lines.slice(start - 1, end).join("\n"),
    start,
    end,
    verified: true,
    context: { from, lines: lines.slice(from - 1, to) },
    fileLines: lines.length,
  });
  console.log(`${label}: verified (${note})`);
}

const data = { ...review, changes: out, generated: new Date().toISOString() };
writeFileSync(join(runDir, "review-data.json"), JSON.stringify(data, null, 1));
const verified = out.filter((change) => change.verified).length;
console.log(`review: ${out.length} change(s), ${verified} verified → ${join(runDir, "review-data.json")}`);
