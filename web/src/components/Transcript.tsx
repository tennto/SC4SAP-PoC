"use client";

import { useEffect, useRef } from "react";
import type { TranscriptItem } from "@/lib/types";

type Props = {
  items: TranscriptItem[];
  /** No session selected yet — show the placeholder instead of an empty scroller. */
  idle: boolean;
};

export function Transcript({ items, idle }: Props) {
  const bottom = useRef<HTMLDivElement>(null);

  // Follow the tail. 3-2 appends token deltas to the last item, so this keeps
  // working as-is once streaming lands.
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
        if (item.kind === "notice") {
          return (
            <p key={item.id} className="notice">
              {item.text}
            </p>
          );
        }
        return (
          <article key={item.id} className={`bubble ${item.kind}`}>
            <span className="who">{item.kind === "user" ? "You" : "Agent"}</span>
            <div className="text">{item.text}</div>
            {item.kind === "user" && item.pending && (
              <span className="pending">sent</span>
            )}
          </article>
        );
      })}

      <div ref={bottom} />
    </div>
  );
}
