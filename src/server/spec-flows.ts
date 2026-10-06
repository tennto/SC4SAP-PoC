/**
 * Program → Spec's workbook after its process flow was redrawn in the page.
 *
 * The HTML spec's edit mode lets a reader redraw a flow; the page draws it
 * (`web/src/lib/spec-flow-page.ts`) and hands its Markdown the same drawing.
 * The workbook holds the flow as a PNG, though, and the run's folder is gone
 * by then (`run-files.ts`). So the page sends the workbook it is holding and
 * the flow's SVG; this makes the PNG the way the run made its pictures
 * (`rasterizeSvgToPng`, a headless browser) and swaps it in with the plugin's
 * `swapImages`.
 *
 * Nothing is kept: the workbook goes through a temporary folder that is
 * removed before the answer leaves.
 */
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

export type SpecFlowsRequest = {
  /** Base64 of the run's workbook. */
  xlsx: string;
  /** The process flow as the page drew it, a standalone SVG. */
  svg: string;
};

/** A flow drawing is tens of KB; this is a runaway guard. */
const MAX_SVG = 2 * 1024 * 1024;
/** The picture at twice its size, as the run renders its own (`RENDER_SCALE`). */
const SCALE = 2;

/** What is wrong with a request, or null when it can be done. */
export function specFlowsError(body: unknown): string | null {
  if (!body || typeof body !== "object") return "body must be an object";
  const { xlsx, svg } = body as Partial<SpecFlowsRequest>;
  if (typeof xlsx !== "string" || xlsx === "") return "xlsx must be the workbook, base64";
  if (typeof svg !== "string" || !/^<svg[\s>]/.test(svg.trim()) || svg.length > MAX_SVG) return "svg must be one SVG document";
  return null;
}

/** The drawing at `SCALE`, with the size it then has. */
function scaled(svg: string): { svg: string; width: number; height: number } {
  const open = /^<svg[^>]*>/.exec(svg.trim())?.[0] ?? "";
  const view = /viewBox="[-\d.]+ [-\d.]+ ([\d.]+) ([\d.]+)"/.exec(open);
  const width = Math.round(Number(view?.[1] ?? /\swidth="([\d.]+)"/.exec(open)?.[1] ?? 800) * SCALE);
  const height = Math.round(Number(view?.[2] ?? /\sheight="([\d.]+)"/.exec(open)?.[1] ?? 600) * SCALE);
  const sized = open
    .replace(/\swidth="[^"]*"/, "")
    .replace(/\sheight="[^"]*"/, "")
    .replace(/\sstyle="[^"]*"/, "")
    .replace(/^<svg/, `<svg width="${width}" height="${height}"`);
  return { svg: svg.trim().replace(open, sized), width, height };
}

export async function specFlowWorkbook(pluginPath: string, request: SpecFlowsRequest): Promise<{ xlsx: string }> {
  const plugin = (path: string) => import(pathToFileURL(join(pluginPath, "scripts", "spec", path)).href);
  const { rasterizeSvgToPng } = await plugin("screen-image-renderer.mjs");
  const { swapImages } = await plugin("image-swap.mjs");

  const picture = scaled(request.svg);
  const png = (await rasterizeSvgToPng(picture.svg, { width: picture.width, height: picture.height })) as Buffer | null;
  if (!png) throw new Error("the process flow could not be rendered (no headless browser?)");

  const dir = mkdtempSync(join(tmpdir(), "sc4sap-spec-flows-"));
  try {
    const xlsxPath = join(dir, "spec.xlsx");
    writeFileSync(xlsxPath, Buffer.from(request.xlsx, "base64"));
    swapImages({ xlsxPath, processFlowPng: png, verbose: false });
    return { xlsx: readFileSync(xlsxPath).toString("base64") };
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}
