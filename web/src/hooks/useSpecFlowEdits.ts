"use client";

/**
 * Program → Spec's process flows, carried from the HTML spec into the run's
 * other files.
 *
 * The HTML spec draws every flow itself as it loads, and again after each
 * change in its edit mode, and reports each drawing (`HtmlPreview`'s
 * `onFlow`, `spec-flow-page.ts`). The Markdown takes those drawings in place
 * of its pictures, in the page's light colours, so both show the same flow
 * in the same style. The workbook is redone only when it is downloaded, and
 * only when the process flow was changed: its picture is a PNG, which takes
 * the backend a headless browser to make (`spec-flows.ts`).
 *
 * Everything is reset when the run's files change — a new run, or none.
 */
import { useCallback, useEffect, useState } from "react";
import type { PageFlow } from "@/components/HtmlPreview";
import { api } from "@/lib/client";
import { themedFlowSvg } from "@/lib/spec-flow";
import type { RunFile } from "@/lib/types";

/** Base64 of a string's UTF-8 bytes — `btoa` alone refuses Hangul. */
function base64Utf8(text: string): string {
  let binary = "";
  for (const byte of new TextEncoder().encode(text)) binary += String.fromCharCode(byte);
  return btoa(binary);
}

export function useSpecFlowEdits({
  docs,
  flowPng,
}: {
  docs: readonly RunFile[] | null;
  /** The run's `flow.png`, the process flow's picture. */
  flowPng: RunFile | null;
}) {
  const [flows, setFlows] = useState<Record<string, PageFlow>>({});
  const [error, setError] = useState<string | null>(null);
  const [workbookBusy, setWorkbookBusy] = useState(false);

  useEffect(() => {
    setFlows({});
    setError(null);
  }, [docs]);

  const onFlow = useCallback((flow: PageFlow) => {
    setFlows((current) => ({ ...current, [flow.key]: flow }));
  }, []);

  /** A flow's picture among the run's files: `flow.png`, or `flow-<n>-<CODE>.png` for a button's. */
  const isPictureOf = useCallback(
    (key: string, file: RunFile): boolean => {
      if (key === "processFlow") return file === flowPng;
      const code = /^buttonFlow:(.+)$/.exec(key)?.[1];
      return (
        code !== undefined &&
        file.mediaType === "image/png" &&
        /^flow-\d+-/.test(file.name) &&
        file.name.endsWith(`-${code.replace(/[^A-Za-z0-9_-]+/g, "_")}.png`)
      );
    },
    [flowPng],
  );

  /**
   * A run file as the Markdown should show it: a flow's picture as the HTML
   * spec drew it, in the page's light colours; null for any other file, or
   * before the page has drawn it.
   */
  const redrawn = useCallback(
    (file: RunFile): RunFile | null => {
      const found = Object.values(flows).find((flow) => isPictureOf(flow.key, file));
      return found
        ? { ...file, mediaType: "image/svg+xml", data: base64Utf8(themedFlowSvg(found.svg)) }
        : null;
    },
    [flows, isPictureOf],
  );

  /**
   * The workbook's base64, with the process flow as the reader redrew it
   * when they did; null when that failed (`error` says why).
   */
  const workbook = useCallback(
    async (file: RunFile): Promise<string | null> => {
      const flow = flows.processFlow;
      if (!flow?.edited) return file.data;
      setWorkbookBusy(true);
      try {
        const result = await api.specFlowWorkbook({ xlsx: file.data, svg: themedFlowSvg(flow.svg) });
        setError(null);
        return result.xlsx;
      } catch (reason) {
        setError(reason instanceof Error ? reason.message : String(reason));
        return null;
      } finally {
        setWorkbookBusy(false);
      }
    },
    [flows],
  );

  return { onFlow, redrawn, workbook, workbookBusy, error };
}
