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
 * Rendered while the text is still streaming, so a half-written table spends a
 * moment as plain paragraphs before it snaps into a grid. That is the honest
 * trade for not making the user wait for the turn to end.
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
function DataTable({ node, children: cells }: { node?: Element; children?: ReactNode }) {
  const { t: messages } = useLocale();
  const t = messages.transcript;
  const { rows, fields } = tableShape(node);
  return (
    <div className="markdown-table">
      <div className="markdown-table-bar">
        <span className="markdown-table-title">
          <Icon name="table" /> {t.tableTitle}
        </span>
        <span className="markdown-table-shape">
          {t.tableEntries(rows)} · {t.tableFields(fields)}
        </span>
      </div>
      <div className="markdown-table-scroll">
        <table>{cells}</table>
      </div>
    </div>
  );
}

export function Markdown({ children }: { children: string }) {
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
        {children}
      </ReactMarkdown>
    </div>
  );
}
