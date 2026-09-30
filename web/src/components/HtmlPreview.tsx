"use client";

/**
 * A run's HTML document, drawn as it will be seen, with a zoom from 60% to
 * 150%.
 *
 * The frame is sandboxed without same-origin, so nothing on this page can
 * reach into the document. What the preview needs from inside it comes in
 * with the document instead (`framed`): a listener that sets the zoom it is
 * sent, and in-page links kept in the page. The zoom is
 * CSS `zoom` on the document, so text is laid out again at the new size
 * rather than scaled as a bitmap, and the document is never reloaded, so a
 * zoom neither flickers nor loses the reader's place in it. The last zoom
 * used is kept for the next document.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { Icon } from "@/components/Icon";
import { useLocale } from "@/lib/i18n/client";

const MIN = 60;
const MAX = 150;
const STEP = 10;
const REMEMBERED = "sc4sap.htmlZoom";

/** Marks this preview's messages among anything else posted to the frame. */
const ZOOM_MESSAGE = "sc4sap-preview-zoom";

/**
 * Added to the head of the previewed document only; its look (`styledSpec`)
 * is already in what this is given, as it is in the download.
 *
 * - Zoom: sets the zoom this page posts to it.
 * - Links: a srcdoc document resolves `#id` against this page's URL, so an
 *   in-page link loaded the app itself into the frame — without its session
 *   cookie, which an opaque origin does not send, so it landed on sign-in.
 *   `#id` links scroll inside the document instead; any other link opens in
 *   a new tab rather than replacing the document.
 */
const PREVIEW_HEAD = `<script>
addEventListener("message", function (event) {
  if (event.source !== parent || !event.data || event.data.type !== "${ZOOM_MESSAGE}") return;
  document.documentElement.style.zoom = String(event.data.zoom);
});
document.addEventListener("click", function (event) {
  var link = event.target instanceof Element ? event.target.closest("a[href]") : null;
  if (!link) return;
  var href = link.getAttribute("href");
  event.preventDefault();
  if (href.charAt(0) !== "#") {
    if (/^https?:/i.test(link.href)) window.open(link.href, "_blank", "noopener");
    return;
  }
  var id = decodeURIComponent(href.slice(1));
  var target = id ? document.getElementById(id) : document.documentElement;
  if (!target) return;
  for (var open = target.closest("details"); open; open = open.parentElement && open.parentElement.closest("details")) open.open = true;
  // After the document's own click handlers, which may fold the contents
  // away and move the target up.
  setTimeout(function () { target.scrollIntoView({ block: "start" }); });
});
</script>`;

/** The document with `PREVIEW_HEAD` at the start of its head. */
function framed(html: string): string {
  const head = /<head[^>]*>/i.exec(html);
  if (head) {
    const at = head.index + head[0].length;
    return html.slice(0, at) + PREVIEW_HEAD + html.slice(at);
  }
  return PREVIEW_HEAD + html;
}

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

  const frame = useRef<HTMLIFrameElement>(null);
  const srcDoc = useMemo(() => framed(html), [html]);

  /** Tells the document its zoom; the frame's own origin is opaque, hence "*". */
  const sendZoom = (): void => {
    frame.current?.contentWindow?.postMessage({ type: ZOOM_MESSAGE, zoom: zoom / 100 }, "*");
  };
  useEffect(sendZoom);

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
          Mermaid flowchart, the preview's own listeners) but can reach
          nothing of this app. Popups only so an outside link opens in a new
          tab, which leaves the sandbox rather than inheriting it. */}
      <div className="html-preview-viewport">
        <iframe
          ref={frame}
          className="html-preview-frame"
          title={name}
          sandbox="allow-scripts allow-popups allow-popups-to-escape-sandbox"
          srcDoc={srcDoc}
          onLoad={sendZoom}
        />
      </div>
    </div>
  );
}
