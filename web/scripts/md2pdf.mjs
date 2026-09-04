// Renders a Markdown file to PDF.
//
// Uses this project's own Markdown pipeline — react-markdown + remark-gfm, the
// same pair `components/Markdown.tsx` renders agent answers with — so tables,
// fenced code and the rest come out looking the way the app draws them. The
// HTML is then printed by headless Chrome, which is already on this machine.
//
// Usage: node md2pdf.mjs <input.md> <output.pdf> ["Title"]
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { spawn } from "node:child_process";
import { readFileSync, writeFileSync, unlinkSync } from "node:fs";
import { resolve } from "node:path";

const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";

const [input, output, title] = process.argv.slice(2);
if (!input || !output) {
  console.error('usage: node md2pdf.mjs <input.md> <output.pdf> ["Title"]');
  process.exit(1);
}

const source = readFileSync(input, "utf8");
const body = renderToStaticMarkup(
  createElement(Markdown, { remarkPlugins: [remarkGfm] }, source),
);

// Pretendard first for Hangul, Malgun Gothic behind it so the print still sets
// Korean if the CDN is unreachable. `print-color-adjust` keeps the code and
// table backgrounds — Chrome drops them by default when printing.
const html = `<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8">
<title>${title ?? input}</title>
<link rel="stylesheet"
  href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.css">
<style>
  @page { size: A4; margin: 18mm 16mm 20mm; }

  :root {
    --ink: #1f1f1f;
    --ink-60: rgba(31,31,31,.62);
    --ink-40: rgba(31,31,31,.42);
    --line: rgba(31,31,31,.16);
    --line-soft: rgba(31,31,31,.08);
    --panel: #f6f6f6;
  }

  * { box-sizing: border-box; }

  body {
    margin: 0;
    color: var(--ink);
    font-family: "Pretendard Variable", Pretendard, "Malgun Gothic",
                 -apple-system, "Segoe UI", sans-serif;
    font-size: 10.5pt;
    line-height: 1.75;
    letter-spacing: -0.01em;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }

  h1, h2, h3, h4 { line-height: 1.35; letter-spacing: -0.02em; }

  h1 {
    font-size: 21pt;
    margin: 0 0 4pt;
    padding-bottom: 8pt;
    border-bottom: 2px solid var(--ink);
  }

  /* Each top-level section starts a page. The document is a reference, and a
     section that begins two lines above a page break is one nobody finds. */
  h2 {
    font-size: 15pt;
    margin: 0 0 10pt;
    padding-bottom: 5pt;
    border-bottom: 1px solid var(--line);
    break-before: page;
    break-after: avoid;
  }
  h2:first-of-type { break-before: auto; }

  h3 { font-size: 12pt; margin: 20pt 0 6pt; break-after: avoid; }
  h4 { font-size: 10.5pt; margin: 14pt 0 4pt; color: var(--ink-60); break-after: avoid; }

  p { margin: 0 0 9pt; orphans: 3; widows: 3; }

  ul, ol { margin: 0 0 9pt; padding-left: 18pt; }
  li { margin-bottom: 3pt; }
  li > p { margin-bottom: 4pt; }

  a { color: inherit; text-decoration: underline; text-underline-offset: 2px; }

  strong { font-weight: 700; }

  code {
    font-family: "IBM Plex Mono", Consolas, "Cascadia Mono", monospace;
    font-size: 9pt;
    letter-spacing: 0;
    background: var(--panel);
    border: 1px solid var(--line-soft);
    border-radius: 3px;
    padding: 0.5pt 3pt;
  }

  pre {
    background: var(--panel);
    border: 1px solid var(--line);
    border-radius: 5px;
    padding: 9pt 11pt;
    overflow: visible;
    white-space: pre-wrap;
    word-break: break-word;
    break-inside: avoid;
    margin: 0 0 10pt;
  }
  pre code { background: none; border: 0; padding: 0; font-size: 8.5pt; line-height: 1.6; }

  table {
    width: 100%;
    border-collapse: collapse;
    margin: 0 0 12pt;
    font-size: 9.5pt;
    break-inside: avoid;
  }
  th, td {
    border: 1px solid var(--line);
    padding: 5pt 7pt;
    text-align: left;
    vertical-align: top;
  }
  th { background: var(--panel); font-weight: 700; }
  td code, th code { font-size: 8.5pt; }

  blockquote {
    margin: 0 0 10pt;
    padding: 7pt 12pt;
    border-left: 3px solid var(--ink-40);
    background: var(--panel);
    break-inside: avoid;
  }
  blockquote p:last-child { margin-bottom: 0; }

  hr { border: 0; border-top: 1px solid var(--line); margin: 16pt 0; }
</style>
</head>
<body>
${body}
</body>
</html>
`;

const tempHtml = resolve(output.replace(/\.pdf$/i, "") + ".tmp.html");
writeFileSync(tempHtml, html, "utf8");

// `--virtual-time-budget` gives the webfont time to land before the snapshot;
// without it the first print can go out in the fallback face.
const chrome = spawn(
  CHROME,
  [
    "--headless=new",
    "--disable-gpu",
    "--no-first-run",
    "--no-pdf-header-footer",
    "--virtual-time-budget=8000",
    `--print-to-pdf=${resolve(output)}`,
    "file:///" + tempHtml.replaceAll("\\", "/"),
  ],
  { stdio: "inherit" },
);

chrome.on("exit", (code) => {
  unlinkSync(tempHtml);
  console.log(code === 0 ? `wrote ${output}` : `chrome exited ${code}`);
  process.exit(code ?? 1);
});
