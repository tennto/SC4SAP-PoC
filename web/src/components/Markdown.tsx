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
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

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
