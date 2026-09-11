/**
 * Re-fetch the two TextMate grammars the transcript highlights ABAP and CDS
 * with, and write them into `src/lib/grammars/`.
 *
 *   npm run grammars:refresh
 *
 * Two upstreams, two formats:
 *
 *   larshp/vscode-abap     MIT          syntaxes/abap.tmLanguage       plist XML
 *   FreHu/vscode-abap-cds  Apache-2.0   syntaxes/cds.tmLanguage.json   JSON
 *
 * Shiki only reads JSON, so the ABAP one is converted here. The converter is
 * the reason this file exists rather than two `curl` lines in a README: it has
 * to be re-run every time larshp changes the grammar, and a step that lives
 * only in someone's shell history is a step that stops happening.
 *
 * Both licences permit redistribution and require attribution. The licence
 * texts sit next to the grammars and are refreshed here too — if you add a
 * third grammar, add its licence to that list or do not ship it.
 */
import { writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const OUT = join(dirname(fileURLToPath(import.meta.url)), "..", "src", "lib", "grammars");

const SOURCES = [
  {
    label: "ABAP",
    url: "https://raw.githubusercontent.com/larshp/vscode-abap/main/syntaxes/abap.tmLanguage",
    licenceUrl: "https://raw.githubusercontent.com/larshp/vscode-abap/main/LICENSE",
    grammarFile: "abap.tmLanguage.json",
    licenceFile: "LICENSE.vscode-abap.txt",
    plist: true,
  },
  {
    label: "CDS",
    url: "https://raw.githubusercontent.com/FreHu/vscode-abap-cds/main/syntaxes/cds.tmLanguage.json",
    licenceUrl:
      "https://raw.githubusercontent.com/FreHu/vscode-abap-cds/main/LICENSES/Apache-2.0.txt",
    grammarFile: "cds.tmLanguage.json",
    licenceFile: "LICENSE.vscode-abap-cds.txt",
    plist: false,
  },
];

/**
 * plist XML to a plain object, for the subset TextMate grammars use:
 * dict, array, string, integer, real, true, false.
 *
 * Hand-rolled rather than pulled from npm. The whole job is one file read at
 * development time, and the `plist` package does not resolve cleanly under
 * this project's module setup — a dependency that only one script uses and
 * that has to be argued with is worse than sixty lines here.
 */
function parsePlist(xml) {
  let i = xml.indexOf("<plist");
  if (i === -1) throw new Error("not a plist document");
  i = xml.indexOf(">", i) + 1;

  const ENTITIES = { lt: "<", gt: ">", amp: "&", quot: '"', apos: "'" };
  const unescape = (s) =>
    s.replace(/&(#x?[0-9a-fA-F]+|lt|gt|amp|quot|apos);/g, (_, e) =>
      e[0] === "#"
        ? String.fromCodePoint(
            parseInt(e[1] === "x" ? e.slice(2) : e.slice(1), e[1] === "x" ? 16 : 10),
          )
        : ENTITIES[e],
    );

  const skipSpace = () => {
    while (i < xml.length && /\s/.test(xml[i])) i += 1;
  };

  /** Read the next tag and return its name, `/name` for a close, `name/` for self-closing. */
  const readTag = () => {
    skipSpace();
    if (xml[i] !== "<") {
      throw new Error(`expected a tag at ${i}: ${xml.slice(i, i + 40)}`);
    }
    const end = xml.indexOf(">", i);
    const raw = xml.slice(i + 1, end).trim();
    i = end + 1;
    return raw;
  };

  const readTextUntilClose = (name) => {
    const close = `</${name}>`;
    const end = xml.indexOf(close, i);
    if (end === -1) throw new Error(`unclosed <${name}>`);
    const text = xml.slice(i, end);
    i = end + close.length;
    return unescape(text);
  };

  const readValue = () => {
    const tag = readTag();

    if (tag === "dict") {
      const object = {};
      for (;;) {
        const next = readTag();
        if (next === "/dict") return object;
        if (next !== "key") throw new Error(`expected <key>, got <${next}>`);
        object[readTextUntilClose("key")] = readValue();
      }
    }

    if (tag === "array") {
      const list = [];
      for (;;) {
        skipSpace();
        const mark = i;
        if (readTag() === "/array") return list;
        i = mark; // put the tag back — readValue reads it again
        list.push(readValue());
      }
    }

    if (tag === "string") return readTextUntilClose("string");
    if (tag === "integer") return Number(readTextUntilClose("integer"));
    if (tag === "real") return Number(readTextUntilClose("real"));
    if (tag === "true" || tag === "true/") return true;
    if (tag === "false" || tag === "false/") return false;

    throw new Error(`unhandled <${tag}>`);
  };

  return readValue();
}

async function fetchText(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${response.status} ${response.statusText} — ${url}`);
  return response.text();
}

for (const source of SOURCES) {
  const raw = await fetchText(source.url);
  const grammar = source.plist ? parsePlist(raw) : JSON.parse(raw);

  if (!grammar.scopeName) throw new Error(`${source.label}: no scopeName — refusing to write`);

  await writeFile(join(OUT, source.grammarFile), `${JSON.stringify(grammar, null, 2)}\n`, "utf8");
  await writeFile(join(OUT, source.licenceFile), await fetchText(source.licenceUrl), "utf8");

  const patterns = (grammar.patterns ?? []).length;
  const repository = Object.keys(grammar.repository ?? {}).length;
  console.log(
    `${source.label.padEnd(5)} ${grammar.scopeName.padEnd(16)} ` +
      `${patterns} patterns, ${repository} repository keys -> ${source.grammarFile}`,
  );
}
