"use client";

import { useEffect, useRef } from "react";
import type { TranscriptItem } from "@/lib/types";

/** `mcp__plugin_sc4sap_sap__GetProgram` reads as `GetProgram` in a chip. */
function toolLabel(name: string): string {
  const parts = name.split("__");
  return parts[parts.length - 1] ?? name;
}

type Props = {
  items: TranscriptItem[];
  /** No session selected yet — show the placeholder instead of an empty scroller. */
  idle: boolean;
};

export function Transcript({ items, idle }: Props) {
  const bottom = useRef<HTMLDivElement>(null);

  // Follow the tail as tokens arrive.
  useEffect(() => {
    bottom.current?.scrollIntoView({ block: "end" });
  }, [items]);

  if (idle) {
    return (
      <div className="transcript placeholder">
        <p>Create or select a session to start.</p>
      </div>
    );
  }

  return (
    <div className="transcript">
      {items.length === 0 && (
        <p className="empty">Ask the SC4SAP agent something.</p>
      )}

      {items.map((item) => {
        switch (item.kind) {
          case "notice":
            return (
              <p key={item.id} className="notice">
                {item.text}
              </p>
            );

          case "tool": {
            const running = item.active > 0;
            return (
              <div key={item.id} className={`chip${running ? " running" : ""}`}>
                <span className="dot" aria-hidden />
                {running
                  ? `Running ${toolLabel(item.name)}…`
                  : `Ran ${toolLabel(item.name)}`}
                {item.calls > 1 && (
                  <span className="chip-count">×{item.calls}</span>
                )}
              </div>
            );
          }

          case "thinking":
            return (
              <article key={item.id} className="bubble thinking">
                <span className="who">Thinking</span>
                <div className="text">
                  {item.text}
                  {item.streaming && <span className="caret" aria-hidden />}
                </div>
              </article>
            );

          default:
            return (
              <article key={item.id} className={`bubble ${item.kind}`}>
                <span className="who">
                  {item.kind === "user" ? "You" : "Agent"}
                </span>
                <div className="text">
                  {item.text}
                  {item.kind === "assistant" && item.streaming && (
                    <span className="caret" aria-hidden />
                  )}
                </div>
              </article>
            );
        }
      })}

      <div ref={bottom} />
    </div>
  );
}
