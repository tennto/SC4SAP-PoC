"use client";

/**
 * Plan item 3-4 — assistant text as markdown.
 *
 * Consultant answers are full of tables (config keys, tables and their fields)
 * and ABAP code blocks, which are unreadable as preformatted plain text.
 *
 * Raw HTML is **not** enabled: `react-markdown` ignores it unless `rehype-raw`
 * is added, and model output is untrusted text that ends up in the DOM. GFM is
 * on for tables, strikethrough and task lists.
 *
 * Rendered while the text is still streaming, which a markdown table does not
 * survive on its own. GFM only recognises one once the `|---|---|` line under
 * the header has arrived, so everything before that renders as a paragraph of
 * raw pipes — `|BUKRS|BUTXT|ORT01|` sitting in the answer — and then snaps
 * into a grid. On a T001 read that is a second or two of what looks like the
 * renderer having failed.
 *
 * So `streaming` withholds the tail of the text while it cannot be drawn: see
 * `trimStreamingTail` below. The table appears when it can appear as a table,
 * and grows a row at a time after that.
 */
import { Children, useEffect, useMemo, useRef, useState } from "react";
import type { ReactElement, ReactNode } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { HighlighterCore } from "shiki/core";
import type { Element } from "hast";
import { highlight, highlighter, langFor, loadedHighlighter } from "@/lib/highlight";
import { DragScrollBar } from "@/components/DragScrollBar";
import { Icon } from "@/components/Icon";
import { useLocale } from "@/lib/i18n/client";

/** The text inside a fence, which react-markdown hands over as nested nodes. */
function textOf(node: ReactNode): string {
  if (typeof node === "string") return node;
  if (typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(textOf).join("");
  return "";
}

/**
 * One fenced block.
 *
 * ABAP and CDS get the TextMate treatment; every other fence — JSON, a shell
 * transcript, an unlabelled block — renders as it always did. Highlighting
 * only the two languages this app is about is the point: a half-right guess
 * at someone's YAML is worse than plain text.
 */
function CodeBlock({ code, tag }: { code: string; tag?: string }) {
  const lang = langFor(tag);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  /*
   * Seeded from the module, not from null.
   *
   * This component gets remounted mid-answer — the transcript swaps a streamed
   * bubble for the finished one — and starting at null meant every remount
   * dropped to plain text and climbed back a tick later. Once the highlighter
   * exists it is the same object for the whole page, so a fresh mount can have
   * it on its very first render and never show the fallback at all.
   */
  const [hl, setHl] = useState<HighlighterCore | null>(() => loadedHighlighter());

  // Loaded on demand, and only for a block that will use it: a conversation
  // with no ABAP in it never pulls the grammars down.
  useEffect(() => {
    if (!lang || hl) return;
    let alive = true;
    void highlighter().then((ready) => {
      if (alive) setHl(ready);
    });
    return () => {
      alive = false;
    };
  }, [lang, hl]);

  // Streaming re-renders this on every token, and the block grows as it goes.
  // Memoised so the tokeniser runs when the text actually changed rather than
  // once per keystroke of the model's.
  const html = useMemo(
    () => (lang ? highlight(hl, code, lang) : null),
    [hl, code, lang],
  );

  /*
   * One wrapper for both states, always the same element in the same place.
   *
   * It used to return a `<div>` when highlighted and a bare `<pre>` otherwise.
   * React cannot reconcile one into the other, so every flip between them tore
   * the box out and built a new one — the block's height went to zero and the
   * page jumped. Now only the contents change, and the box keeps its size.
   *
   * `dangerouslySetInnerHTML`, having refused `rehype-raw` above, is not a
   * contradiction: that would render HTML *the model wrote*, this is HTML
   * Shiki generated from the model's text with every character escaped on the
   * way in — the markup is ours, only the words are theirs.
   */
  /*
   * The scrolling is one element in from the box.
   *
   * ABAP runs wide — a `SELECT` with a long field list does not wrap — so the
   * block scrolls sideways, and on a phone nothing says so: the platform's bar
   * is an overlay that only appears once you are already scrolling. The bar
   * has to live outside the scroller or it slides away with the code, hence
   * the inner element rather than putting `overflow` on the box itself.
   */
  return (
    <div className="markdown-code">
      <div className="markdown-code-scroll" ref={scrollRef}>
        {html ? (
          <div className="markdown-code-inner" dangerouslySetInnerHTML={{ __html: html }} />
        ) : (
          // Before the highlighter has loaded, so a block appears immediately
          // as plain text rather than being withheld until it can be coloured.
          <pre className="markdown-code-plain">
            <code className={tag ? `language-${tag}` : undefined}>{code}</code>
          </pre>
        )}
      </div>
      <DragScrollBar targetRef={scrollRef} className="markdown-code-bar" />
    </div>
  );
}

/** How many `<tr>` and header `<th>` a table's hast tree holds. */
function tableShape(node: Element | undefined): { rows: number; fields: number } {
  let rows = 0;
  let fields = 0;
  const walk = (el: Element): void => {
    for (const child of el.children) {
      if (child.type !== "element") continue;
      if (child.tagName === "tr") {
        const isHeader = child.children.some(
          (cell) => cell.type === "element" && cell.tagName === "th",
        );
        if (isHeader) {
          fields = Math.max(
            fields,
            child.children.filter((cell) => cell.type === "element").length,
          );
        } else {
          rows += 1;
        }
      }
      walk(child);
    }
  };
  if (node) walk(node);
  return { rows, fields };
}

/**
 * A markdown table drawn the way SE16 draws one.
 *
 * The consultant's answers are tables of SAP data — a table's fields, a
 * config key's rows — and the people reading them spend their day in the
 * GUI, where a table has a toolbar over it, a selection gutter down the
 * left, ruled columns, and a count of entries. Giving the same shape here
 * means the answer reads as a screen they know rather than as prose with
 * lines through it.
 *
 * The gutter is a real cell on every row, added at `tr` from the hast node,
 * because a column cannot be drawn in from CSS alone. The scroller caps its
 * height so a long result scrolls under a header that stays put.
 */
/**
 * The table as a spreadsheet would paste it.
 *
 * Tab-separated, one line per row, read off the rendered table rather than
 * rebuilt from the markdown — what is on screen is what gets copied, including
 * the blank cells the MCP server omits from its rows. The selection gutter is
 * skipped: it is a column this app draws, not one the data has.
 *
 * Tabs and newlines inside a cell would break the row apart on paste, so they
 * collapse to a space. Nothing is quoted: TSV has no escape that Excel and
 * Sheets agree on, and a mangled cell is better than a mangled sheet.
 */
function cellsOf(table: HTMLTableElement): string[][] {
  return [...table.rows].map((row) =>
    [...row.cells]
      .filter((cell) => !cell.classList.contains("markdown-table-gutter"))
      .map((cell) => (cell.innerText ?? "").replace(/\s+/g, " ").trim()),
  );
}

function toTsv(grid: string[][]): string {
  return grid.map((row) => row.join("\t")).join("\n");
}

const ESCAPES: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
};

/**
 * The same grid as an HTML table whose every cell is marked as text.
 *
 * This is what stops a spreadsheet helpfully destroying SAP keys. Pasted as
 * plain TSV, a material number like `100000000000` arrives as `1E+11` and a
 * company code of `0001` arrives as `1` — the identifier is gone, and it looks
 * like the data was wrong rather than the paste. Excel reads `text/html` in
 * preference to `text/plain` and honours `mso-number-format:'\@'`, its code
 * for the Text format, so every cell lands exactly as it reads on screen.
 *
 * Both flavours go on the clipboard. Anything that is not a spreadsheet — a
 * text editor, a chat box, a terminal — takes the plain one and gets the
 * tab-separated rows it expects.
 */
function toHtml(grid: string[][]): string {
  const escape = (value: string): string =>
    value.replace(/[&<>]/g, (ch) => ESCAPES[ch] ?? ch);
  const body = grid
    .map(
      (row) =>
        `<tr>${row
          .map((cell) => `<td style="mso-number-format:'\\@'">${escape(cell)}</td>`)
          .join("")}</tr>`,
    )
    .join("");
  return `<table>${body}</table>`;
}

function DataTable({ node, children: cells }: { node?: Element; children?: ReactNode }) {
  const { t: messages } = useLocale();
  const t = messages.transcript;
  const { rows, fields } = tableShape(node);
  const table = useRef<HTMLTableElement>(null);
  /** Briefly, after a copy — the button is its own confirmation. */
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 1600);
    return () => clearTimeout(timer);
  }, [copied]);

  async function copy(): Promise<void> {
    if (!table.current) return;
    const grid = cellsOf(table.current);
    const tsv = toTsv(grid);
    try {
      // Both flavours, so the spreadsheet gets the one that keeps its cells as
      // text and everything else gets the tab-separated rows. `ClipboardItem`
      // is the only way to put two types down at once; where it is missing,
      // plain text alone still pastes into the right cells.
      if (typeof ClipboardItem === "function" && navigator.clipboard?.write) {
        await navigator.clipboard.write([
          new ClipboardItem({
            "text/plain": new Blob([tsv], { type: "text/plain" }),
            "text/html": new Blob([toHtml(grid)], { type: "text/html" }),
          }),
        ]);
      } else {
        await navigator.clipboard.writeText(tsv);
      }
      setCopied(true);
    } catch {
      // Denied clipboard permission, or an insecure origin. Nothing useful to
      // say that the absent confirmation does not already say.
    }
  }

  return (
    <div className="markdown-table">
      <div className="markdown-table-bar">
        <span className="markdown-table-title">
          <Icon name="table" /> {t.tableTitle}
        </span>
        <span className="markdown-table-shape">
          {t.tableEntries(rows)} · {t.tableFields(fields)}
        </span>
        {/* Tab-separated, because the place this is going is a spreadsheet.
            Pasting a Markdown table into Excel puts the whole thing in one
            cell; TSV lands in the grid. */}
        <button
          type="button"
          className="markdown-table-copy"
          onClick={() => void copy()}
          aria-label={t.tableCopy}
          title={t.tableCopy}
        >
          <Icon name={copied ? "check" : "copy"} />
          {copied ? t.tableCopied : t.tableCopy}
        </button>
      </div>
      <div className="markdown-table-scroll">
        <table ref={table}>{cells}</table>
      </div>
    </div>
  );
}

/** A `|---|:--:|---|` line, the thing that makes the lines around it a table. */
const SEPARATOR = /^\s*\|?(?:\s*:?-+:?\s*\|)+\s*:?-*:?\s*\|?\s*$/;

/** A line that is part of a table: GFM wants a pipe, and these always lead with one. */
const TABLE_LINE = /^\s*\|/;

/**
 * Drops the part of a streaming answer that cannot be rendered yet.
 *
 * Two cases, both about tables, because tables are the only construct whose
 * half-written form reads as a rendering bug rather than as text still
 * arriving:
 *
 *   1. A run of table lines at the end with no separator among them. GFM has
 *      no reason to call that a table yet, so it would draw the header as a
 *      paragraph of pipes. Withheld whole.
 *   2. A final line still being typed — the text does not end in a newline —
 *      inside a table that does have its separator. Rendering it would put a
 *      row on screen with half its cells, which then gains the rest. Withheld
 *      until the newline arrives, so rows appear whole.
 *
 * Fenced code is left alone: inside a fence a pipe is just a character, and an
 * unclosed fence is already handled by the code block renderer. An odd number
 * of fences means the tail is inside one.
 */
function trimStreamingTail(text: string): string {
  const fences = text.match(/^\s*```/gm);
  if (fences && fences.length % 2 === 1) return text;

  const lines = text.split("\n");
  // Walk back over the trailing run of table lines.
  let start = lines.length;
  while (start > 0 && TABLE_LINE.test(lines[start - 1] ?? "")) start -= 1;
  if (start === lines.length) return text;

  const run = lines.slice(start);
  const hasSeparator = run.some((line) => SEPARATOR.test(line));

  // Case 1: not a table yet as far as GFM is concerned.
  if (!hasSeparator) return lines.slice(0, start).join("\n");

  // Case 2: the last line is still being written.
  if (!text.endsWith("\n")) return lines.slice(0, lines.length - 1).join("\n");

  return text;
}

export function Markdown({
  children,
  streaming = false,
}: {
  children: string;
  /**
   * The text is still arriving. Only set on the message being written — a
   * finished answer renders whole, including a table someone pasted with no
   * trailing newline.
   */
  streaming?: boolean;
}) {
  const body = streaming ? trimStreamingTail(children) : children;
  return (
    <div className="markdown">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          table: ({ node, children: cells }) => (
            <DataTable node={node}>{cells}</DataTable>
          ),
          // The selection gutter: SAP's blank first column, on every row.
          tr: ({ node, children: cells }) => {
            const header = node?.children.some(
              (cell) => cell.type === "element" && cell.tagName === "th",
            );
            return (
              <tr>
                {header ? (
                  <th className="markdown-table-gutter" aria-hidden="true" />
                ) : (
                  <td className="markdown-table-gutter" aria-hidden="true" />
                )}
                {cells}
              </tr>
            );
          },
          /*
           * Taken at `pre` rather than at `code` because a highlighted block
           * arrives from Shiki as its own `<pre>`, and replacing the inner
           * `<code>` alone would nest one inside the other. Inline code still
           * goes through the default `code`, untouched.
           */
          pre: ({ children: fence }) => {
            const only = Children.toArray(fence)[0] as
              | ReactElement<{ className?: string; children?: ReactNode }>
              | undefined;
            const className = only?.props?.className ?? "";
            const tag = /language-([\w-]+)/.exec(className)?.[1];
            return (
              <CodeBlock code={textOf(only?.props?.children)} tag={tag} />
            );
          },
          // Model output is untrusted: never let it open a same-tab navigation
          // that carries a window handle back.
          a: ({ children: label, href }) => (
            <a href={href} target="_blank" rel="noopener noreferrer">
              {label}
            </a>
          ),
        }}
      >
        {body}
      </ReactMarkdown>
    </div>
  );
}
