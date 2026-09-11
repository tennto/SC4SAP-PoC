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
import { Children, useEffect, useMemo, useState } from "react";
import type { ReactElement, ReactNode } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { HighlighterCore } from "shiki/core";
import { highlight, highlighter, langFor, loadedHighlighter } from "@/lib/highlight";

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
  return (
    <div className="markdown-code">
      {html ? (
        <div className="markdown-code-inner" dangerouslySetInnerHTML={{ __html: html }} />
      ) : (
        // Before the highlighter has loaded, so a block appears immediately as
        // plain text rather than being withheld until it can be coloured.
        <pre className="markdown-code-plain">
          <code className={tag ? `language-${tag}` : undefined}>{code}</code>
        </pre>
      )}
    </div>
  );
}

export function Markdown({ children }: { children: string }) {
  return (
    <div className="markdown">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          // Wide tables scroll inside the bubble instead of stretching it.
          table: ({ children: cells }) => (
            <div className="markdown-table">
              <table>{cells}</table>
            </div>
          ),
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
