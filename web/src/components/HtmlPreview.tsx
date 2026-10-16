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
/** The app's theme, sent to the document — see `THEME_HEAD`. */
const THEME_MESSAGE = "sc4sap-preview-theme";

/** The app's theme as `<html data-theme>` holds it: `light`, `dark`, or null for the machine's. */
const appTheme = (): string | null =>
  typeof document === "undefined" ? null : document.documentElement.getAttribute("data-theme");

/**
 * The document's theme follows the app's, not only the machine's.
 *
 * The documents carry light and dark both, keyed on `data-theme` as the app
 * is, and without it the frame went by the machine: the app switched to
 * light on a dark machine showed a dark document in it. The theme is set
 * before the document draws (no flash of the other one) and changed by
 * message after, so switching the theme never reloads the document. A
 * document saved from its edit mode leaves the attribute behind
 * (`EDIT_HEAD`), so the file still follows whoever opens it.
 */
const themeHead = (theme: string | null): string => `<script>
${theme === "light" || theme === "dark" ? `document.documentElement.setAttribute("data-theme", "${theme}");` : ""}
addEventListener("message", function (event) {
  if (event.source !== parent || !event.data || event.data.type !== "${THEME_MESSAGE}") return;
  var theme = event.data.theme;
  if (theme === "light" || theme === "dark") document.documentElement.setAttribute("data-theme", theme);
  else document.documentElement.removeAttribute("data-theme");
});
document.currentScript && document.currentScript.remove();
</script>`;

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
 * - Spelling: off, as in the app (`layout.tsx`). The documents are full of
 *   program, table and field names, which a spell checker underlines in an
 *   edit mode as it would typos. It inherits, so the root's covers them all.
 */
const PREVIEW_HEAD = `<script>
document.documentElement.spellcheck = false;
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
// Gone from the document once it has run, so a page that saves itself — the
// manual's edit mode — does not carry the preview's wiring into the file.
document.currentScript && document.currentScript.remove();
</script>`;

/** Marks a document's "save a copy" among anything else posted to this page. */
const SAVE_MESSAGE = "sc4sap-preview-save";
/** A spec's process flow as the page drew it, on load and after each edit (`spec-flow-page.ts`). */
const FLOW_MESSAGE = "sc4sap-flow";

/** One process flow, as the spec's page reports it. */
export type PageFlow = {
  /** `processFlow`, or `buttonFlow:<CODE>`. */
  key: string;
  graph: unknown;
  opts: Record<string, unknown>;
  /** The page's drawing of it, in the plugin's colours, marked for this app's (`themedFlowSvg`). */
  svg: string;
  /** Changed in the page since it was made. */
  edited: boolean;
};

/**
 * Added as well to a document with an edit mode of its own — the plugin's
 * manual, whose Save hands the edited page to the browser as a download.
 *
 * In this frame that cannot work as written: a sandbox without
 * `allow-downloads` drops the download, and the file would be named after
 * `about:srcdoc` anyway. So the blob the editor makes is remembered, and the
 * click that would download it posts its text up to this page instead, which
 * saves it under the document's own name. `showSaveFilePicker`, which a
 * cross-origin frame may not use, is hidden so the editor takes that path.
 */
const EDIT_HEAD = `<script>
(function () {
  if (window.parent === window) return;
  try { window.showSaveFilePicker = undefined; } catch (e) {}
  var blobs = {};
  var create = URL.createObjectURL;
  URL.createObjectURL = function (object) {
    var url = create.call(URL, object);
    if (object instanceof Blob) blobs[url] = object;
    return url;
  };
  var click = HTMLAnchorElement.prototype.click;
  HTMLAnchorElement.prototype.click = function () {
    var blob = this.hasAttribute("download") ? blobs[this.href] : null;
    if (!blob) return click.call(this);
    blob.text().then(function (html) {
      // The preview's theme and spelling are this frame's, not the file's.
      html = html.replace(/(<html\\b[^>]*?)\\s+data-theme="[^"]*"/i, "$1");
      html = html.replace(/(<html\\b[^>]*?)\\s+spellcheck="false"/i, "$1");
      parent.postMessage({ type: "${SAVE_MESSAGE}", html: html }, "*");
    });
  };
})();
document.currentScript && document.currentScript.remove();
</script>`;

/** The document with `PREVIEW_HEAD`, the theme (and `EDIT_HEAD`) at the start of its head. */
function framed(html: string, editable: boolean, theme: string | null): string {
  const added = PREVIEW_HEAD + themeHead(theme) + (editable ? EDIT_HEAD : "");
  const head = /<head[^>]*>/i.exec(html);
  if (head) {
    const at = head.index + head[0].length;
    return html.slice(0, at) + added + html.slice(at);
  }
  return added + html;
}

export function HtmlPreview({
  name,
  html,
  onDownload,
  onSaveEdited,
  onFlow,
  doc = "manual",
}: {
  name: string;
  html: string;
  onDownload: () => void;
  /**
   * The document has an edit mode, and this takes what its Save produced.
   * With it the frame may also open dialogs — the editor confirms a deleted
   * step, and the manual prints itself — and the bar says how editing works.
   */
  onSaveEdited?: (html: string) => void;
  /** A spec's process flow as its page drew it: on load, and after each change in its edit mode. */
  onFlow?: (flow: PageFlow) => void;
  /** Whose edit mode it is: the manual's, or the spec's (`spec-editor.ts`). */
  doc?: "manual" | "spec" | "doc";
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
  const editable = onSaveEdited !== undefined;
  // The theme at the time the document is framed; later changes go by message.
  const srcDoc = useMemo(() => framed(html, editable, appTheme()), [html, editable]);

  // The editor's Save, from this frame only.
  const saveEdited = useRef(onSaveEdited);
  const flowReported = useRef(onFlow);
  useEffect(() => {
    saveEdited.current = onSaveEdited;
    flowReported.current = onFlow;
  }, [onSaveEdited, onFlow]);
  useEffect(() => {
    if (!editable) return;
    const onMessage = (event: MessageEvent): void => {
      if (event.source !== frame.current?.contentWindow) return;
      const data = event.data as ({ type?: unknown; html?: unknown } & Partial<PageFlow>) | null;
      if (data?.type === FLOW_MESSAGE) {
        if (typeof data.key === "string" && typeof data.svg === "string") {
          flowReported.current?.({
            key: data.key,
            graph: data.graph,
            opts: data.opts ?? {},
            svg: data.svg,
            edited: data.edited === true,
          });
        }
        return;
      }
      if (data?.type !== SAVE_MESSAGE || typeof data.html !== "string") return;
      saveEdited.current?.(data.html);
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [editable]);

  /** Tells the document its zoom; the frame's own origin is opaque, hence "*". */
  const sendZoom = (): void => {
    frame.current?.contentWindow?.postMessage({ type: ZOOM_MESSAGE, zoom: zoom / 100 }, "*");
  };
  useEffect(sendZoom);

  const sendTheme = (): void => {
    frame.current?.contentWindow?.postMessage({ type: THEME_MESSAGE, theme: appTheme() }, "*");
  };
  useEffect(() => {
    const watch = new MutationObserver(sendTheme);
    watch.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => watch.disconnect();
  }, []);

  return (
    <div className="skill-doc-box html-preview">
      <div className="skill-doc-bar">
        <span className="skill-doc-kind">
          {editable && doc === "manual" ? (
            <>
              <Icon name="book-open-text" /> {t.manualPreview}
            </>
          ) : (
            <>
              <Icon name="file-html" /> {t.htmlPreview}
            </>
          )}
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
          {/* A document with an edit mode has its own "Save file", which
              saves the page as it stands; a second button here only said the
              same thing. */}
          {!editable && (
            <button className="ghost skill-doc-save" onClick={onDownload} title={t.saveReport}>
              <Icon name="download-simple" /> {t.downloadHtml}
            </button>
          )}
        </div>
      </div>
      {/* Sandboxed without same-origin: the page's scripts may run (its
          Mermaid flowchart, the preview's own listeners) but can reach
          nothing of this app. Popups only so an outside link opens in a new
          tab, which leaves the sandbox rather than inheriting it. */}
      {editable && (
        <p className="html-preview-note">{doc === "spec" ? t.specEditHint : doc === "doc" ? t.docEditHint : t.manualEditHint}</p>
      )}
      <div className="html-preview-viewport">
        <iframe
          ref={frame}
          className="html-preview-frame"
          title={name}
          sandbox={`allow-scripts allow-popups allow-popups-to-escape-sandbox${editable ? " allow-modals" : ""}`}
          // The review's "copy the proposed source" button.
          allow="clipboard-write"
          srcDoc={srcDoc}
          onLoad={() => {
            sendZoom();
            sendTheme();
          }}
        />
      </div>
    </div>
  );
}
