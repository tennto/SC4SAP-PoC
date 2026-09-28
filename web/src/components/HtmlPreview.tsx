"use client";

/**
 * A run's HTML document, drawn as it will be seen, with a zoom from 60% to
 * 150%.
 *
 * The frame is sandboxed without same-origin, so nothing on this page can
 * reach into the document to set its zoom. The frame itself is scaled
 * instead: laid out at 1/zoom of the box and transformed back up to fill it.
 * The document is never reloaded, so a zoom neither flickers nor loses the
 * reader's place in it. The last zoom used is kept for the next document.
 */
import { useEffect, useState } from "react";
import { Icon } from "@/components/Icon";
import { useLocale } from "@/lib/i18n/client";

const MIN = 60;
const MAX = 150;
const STEP = 10;
const REMEMBERED = "sc4sap.htmlZoom";

export function HtmlPreview({
  name,
  html,
  onDownload,
}: {
  name: string;
  html: string;
  onDownload: () => void;
}) {
  const { t: messages } = useLocale();
  const t = messages.skillForm;
  const [zoom, setZoom] = useState(100);

  useEffect(() => {
    try {
      const stored = Number(localStorage.getItem(REMEMBERED));
      if (stored >= MIN && stored <= MAX) setZoom(stored);
    } catch {
      // Storage refused: every document opens at 100%.
    }
  }, []);

  /** From the zoom as it is, so quick repeated presses each count. */
  const set = (next: number | ((current: number) => number)): void =>
    setZoom((current) => {
      const target = typeof next === "function" ? next(current) : next;
      const value = Math.min(MAX, Math.max(MIN, Math.round(target / STEP) * STEP));
      try {
        localStorage.setItem(REMEMBERED, String(value));
      } catch {
        // Not remembered; the zoom still applies to this one.
      }
      return value;
    });

  const scale = zoom / 100;

  return (
    <div className="skill-doc-box html-preview">
      <div className="skill-doc-bar">
        <span className="skill-doc-kind">
          <Icon name="file-html" /> {t.htmlPreview}
        </span>
        <div className="html-preview-tools">
          <div className="zoom" role="group" aria-label={t.zoom}>
            <button
              type="button"
              className="zoom-step"
              onClick={() => set((current) => current - STEP)}
              disabled={zoom <= MIN}
              aria-label={t.zoomOut}
              title={t.zoomOut}
            >
              <Icon name="minus" />
            </button>
            <input
              type="range"
              className="zoom-range"
              min={MIN}
              max={MAX}
              step={STEP}
              value={zoom}
              onChange={(event) => set(Number(event.target.value))}
              aria-label={t.zoom}
              style={{ "--fill": `${((zoom - MIN) / (MAX - MIN)) * 100}%` } as React.CSSProperties}
            />
            <button
              type="button"
              className="zoom-step"
              onClick={() => set((current) => current + STEP)}
              disabled={zoom >= MAX}
              aria-label={t.zoomIn}
              title={t.zoomIn}
            >
              <Icon name="plus" />
            </button>
            <button
              type="button"
              className="zoom-value"
              onClick={() => set(100)}
              title={t.zoomReset}
            >
              {zoom}%
            </button>
          </div>
          <button className="ghost skill-doc-save" onClick={onDownload} title={t.saveReport}>
            <Icon name="download-simple" /> {t.downloadHtml}
          </button>
        </div>
      </div>
      {/* Sandboxed without same-origin: the page's scripts may run (its
          Mermaid flowchart) but can reach nothing of this app. */}
      <div className="html-preview-viewport">
        <iframe
          className="html-preview-frame"
          title={name}
          sandbox="allow-scripts"
          srcDoc={html}
          style={{
            width: `${100 / scale}%`,
            height: `${100 / scale}%`,
            transform: `scale(${scale})`,
          }}
        />
      </div>
    </div>
  );
}
