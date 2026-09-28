/**
 * Files a skill run writes for the reader to take away — and nothing kept.
 *
 * A run that produces documents (Program → Spec's .md / .html / .xlsx) is
 * told to write them under its own folder, `.sc4sap/out/<session id>/` in
 * the workspace. The web app asks for them once the run has settled; they
 * are read, handed over, and the folder is deleted in the same breath. What
 * the reader holds from then on lives only in their browser tab.
 *
 * On disk only while the run is making them, because the plugin's scripts
 * that turn a spec into HTML or a workbook read and write files. Deleted as
 * well when the session closes, and swept on start-up in case the server
 * went down between the two.
 */
import { existsSync, readdirSync, readFileSync, rmSync, statSync } from "node:fs";
import { join, resolve } from "node:path";

/** Relative to the workspace, which is every session's cwd. */
export const OUTPUT_ROOT = ".sc4sap/out";

/** Only these leave the server. Working files (`_tr/`, `_img/`) do not. */
const HANDED_OVER: Readonly<Record<string, string>> = {
  ".md": "text/markdown",
  ".html": "text/html",
  ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
};

/**
 * The Markdown spec's pictures — the rendered selection screen, ALV and
 * process flow under `_assets/`. Handed over too, so the page can put them
 * inside the document it shows and saves; HTML has them inlined already.
 */
const ASSET_DIR = "_assets";

/** Ceiling per file. A spec workbook is ~100 KB; this is a runaway guard. */
const MAX_FILE_BYTES = 8 * 1024 * 1024;

export type RunFile = {
  name: string;
  mediaType: string;
  size: number;
  createdAt: string;
  /** Base64 of the bytes. */
  data: string;
  /**
   * Where it sat relative to the run's folder — how the Markdown refers to
   * an image (`_assets/…/flow.png`). Documents are named by `name` alone.
   */
  path: string;
};

/** The folder one session writes into, relative to the workspace. */
export function outputDir(sessionId: string): string {
  return `${OUTPUT_ROOT}/${sessionId}`;
}

function absolute(workspace: string, sessionId: string): string | null {
  // A session id is a uuid; anything else is not a folder this hands out.
  if (!/^[0-9a-f-]{36}$/i.test(sessionId)) return null;
  return resolve(workspace, outputDir(sessionId));
}

/** Every file under a folder, depth-first, as paths relative to it. */
function walk(root: string, prefix = ""): string[] {
  const found: string[] = [];
  for (const entry of readdirSync(join(root, prefix), { withFileTypes: true })) {
    const path = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.isDirectory()) found.push(...walk(root, path));
    else if (entry.isFile()) found.push(path);
  }
  return found;
}

/**
 * The run's documents, read and then deleted with everything else it wrote.
 *
 * Nested ones count too — a skill may keep its own `specs/` layout inside the
 * folder — but only the document types above, and working folders whose
 * name starts with `_` are skipped.
 */
export function takeRunFiles(workspace: string, sessionId: string): RunFile[] {
  const dir = absolute(workspace, sessionId);
  if (!dir || !existsSync(dir)) return [];
  const files: RunFile[] = [];
  try {
    for (const path of walk(dir)) {
      const parts = path.split("/");
      const ext = path.slice(path.lastIndexOf(".")).toLowerCase();
      const asset = ext === ".png" && parts.includes(ASSET_DIR);
      if (!asset && parts.some((part) => part.startsWith("_"))) continue;
      const mediaType = asset ? "image/png" : HANDED_OVER[ext];
      if (!mediaType) continue;
      const full = join(dir, path);
      const stat = statSync(full);
      if (stat.size > MAX_FILE_BYTES) continue;
      files.push({
        name: path.slice(path.lastIndexOf("/") + 1),
        mediaType,
        size: stat.size,
        createdAt: stat.mtime.toISOString(),
        data: readFileSync(full).toString("base64"),
        path,
      });
    }
  } finally {
    removeRunFiles(workspace, sessionId);
  }
  return files;
}

export function removeRunFiles(workspace: string, sessionId: string): void {
  const dir = absolute(workspace, sessionId);
  if (dir) rmSync(dir, { recursive: true, force: true });
}

/** Everything any run left behind — for start-up, when no run is live. */
export function sweepRunFiles(workspace: string): void {
  rmSync(resolve(workspace, OUTPUT_ROOT), { recursive: true, force: true });
}

/** The plugin scripts a documents run may run on its own files. */
const SPEC_SCRIPTS = new Set(["md-to-html.mjs", "render-md-images.mjs", "build-spec.mjs"]);

const norm = (path: string): string =>
  path.replace(/\\/g, "/").replace(/\/+$/, "").toLowerCase();

/** Arguments of a simple command line, honouring double and single quotes. */
function tokens(command: string): string[] | null {
  const found: string[] = [];
  const pattern = /"([^"]*)"|'([^']*)'|(\S+)/g;
  for (const match of command.matchAll(pattern)) {
    found.push(match[1] ?? match[2] ?? match[3] ?? "");
  }
  return found;
}

/**
 * A step of a documents run that needs no one's approval: writing a file
 * inside the run's own folder, or running one of the plugin's spec scripts
 * on files there.
 *
 * Measured 2026-09-28: an Economy Program → Spec run stopped four times for
 * a person to allow its own image spec, its own Markdown and the two
 * converters. None of them can touch anything but the folder that is handed
 * over and deleted. Anything else — a path outside it, a second command, a
 * pipe, a redirect other than stderr — still goes to the dialog.
 */
export function isOwnRunStep(
  workspace: string,
  pluginPath: string,
  sessionId: string,
  toolName: string,
  input: Record<string, unknown>,
): boolean {
  const dir = absolute(workspace, sessionId);
  if (!dir) return false;
  const inside = (path: string): boolean => {
    const full = norm(resolve(workspace, path));
    return full.startsWith(`${norm(dir)}/`);
  };

  if (toolName === "Write" || toolName === "Edit") {
    return typeof input.file_path === "string" && inside(input.file_path);
  }
  if (toolName !== "Bash" || typeof input.command !== "string") return false;

  // A trailing stderr merge is harmless; anything else that chains, pipes,
  // redirects or substitutes is not this.
  const command = input.command.trim().replace(/\s+2>&1$/, "");
  if (/[;&|<>`\n]|\$\(/.test(command)) return false;
  const args = tokens(command);
  if (!args || args.length < 2) return false;

  if (args[0] === "mkdir") {
    const paths = args.slice(1).filter((arg) => arg !== "-p");
    return paths.length > 0 && paths.every(inside);
  }

  if (args[0] !== "node") return false;
  const script = norm(args[1]!);
  const scripts = `${norm(pluginPath)}/scripts/spec/`;
  if (!script.startsWith(scripts) || !SPEC_SCRIPTS.has(script.slice(scripts.length))) {
    return false;
  }
  // Every file it is given is the run's own; `-` skips a build-spec input.
  return args.slice(2).every((arg) => arg === "-" || inside(arg));
}
