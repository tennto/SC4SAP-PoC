/**
 * Files a skill run writes for the reader to take away — and nothing kept.
 *
 * A run that produces documents (Program → Spec's .md / .html / .xlsx, Program → Manual's .html) is
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
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

/** Relative to the workspace, which is every session's cwd. */
export const OUTPUT_ROOT = ".sc4sap/out";

/** Only these leave the server. Working files (`_tr/`, `_img/`) do not, but for two exceptions below. */
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

/**
 * The pictures' data — `_img/image-spec.json` from an Economy run,
 * `_img/<PROGRAM>-<date>.image-spec.json` from the plugin's skill. A few
 * hundred bytes the page draws the process flow from itself, sharper than the
 * plugin's PNG of it. The rest of `_img/` stays behind.
 */
const IMAGE_SPEC = /(^|\/)_img\/[^/]*image-spec\.json$/;

/**
 * An Inventory a CBO Package run's machine-readable inventory, which the
 * plugin's other skills read — handed over beside its HTML for download.
 */
const INVENTORY = /^inventory\.json$/;

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
      const imageSpec = IMAGE_SPEC.test(path) || INVENTORY.test(path);
      if (!asset && !imageSpec && parts.some((part) => part.startsWith("_"))) continue;
      const mediaType = asset ? "image/png" : imageSpec ? "application/json" : HANDED_OVER[ext];
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

/**
 * The plugin scripts a documents run may run on its own files, by their path
 * under the plugin's `scripts/`. `build-manual.mjs` is Program → Manual's
 * builder; its `--import` form is not listed, since no run here is given an
 * edited manual to read back.
 */
const PLUGIN_SCRIPTS = new Set([
  "spec/md-to-html.mjs",
  "spec/render-md-images.mjs",
  "spec/build-spec.mjs",
  "manual/build-manual.mjs",
]);

/** Switches those scripts take that name no file. */
const SCRIPT_FLAGS = new Set(["--same-version", "--major", "--keep"]);

/**
 * This app's own scripts — see `scripts/`. A run names them relative to its
 * cwd, the workspace, as `../scripts/spec/...` or `../scripts/cbo/...`.
 */
const APP_SCRIPTS_DIR = resolve(dirname(fileURLToPath(import.meta.url)), "../../scripts");
const APP_SCRIPTS = new Set(["spec/build-xlsx.mjs", "cbo/objects.mjs", "cbo/build-index.mjs"]);

/**
 * Where the Agent SDK saves a tool result too large to hand the model —
 * `~/.claude/projects/<workspace, dashed>/` — and tells it to Read from there.
 * Read is allowed there (session-manager), and the CBO list script may take a
 * file from there as its input.
 */
export function toolResultsRoot(workspace: string): string {
  return join(homedir(), ".claude", "projects", workspace.replace(/[^A-Za-z0-9]/g, "-"));
}

const norm = (path: string): string =>
  path.replace(/\\/g, "/").replace(/\/+$/, "").toLowerCase();

/**
 * A Git Bash path (`/c/Users/...`) as Windows writes it (`C:/Users/...`).
 * Measured 2026-10-04: a Standard CBO run's `mkdir -p "/c/Users/.../out/<id>"`
 * resolved under the current drive's root and raised a dialog for its own
 * folder.
 */
const fromBash = (path: string): string =>
  process.platform === "win32" ? path.replace(/^\/([a-zA-Z])(?=\/)/, "$1:") : path;

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
 * inside the run's own folder, or running one of the plugin's spec or manual
 * scripts on files there.
 *
 * Measured 2026-09-28: an Economy Program → Spec run stopped four times for
 * a person to allow its own image spec, its own Markdown and the two
 * converters. None of them can touch anything but the folder that is handed
 * over and deleted. Anything else — a path outside it, a command not listed, a
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
    const full = norm(resolve(workspace, fromBash(path)));
    return full.startsWith(`${norm(dir)}/`);
  };
  const self = (path: string): boolean => norm(resolve(workspace, fromBash(path))) === norm(dir);
  const savedResult = (path: string): boolean => {
    const full = norm(resolve(workspace, fromBash(path)));
    return full.startsWith(`${norm(toolResultsRoot(workspace))}/`) && full.includes("/tool-results/");
  };

  if (toolName === "Write" || toolName === "Edit") {
    return typeof input.file_path === "string" && inside(input.file_path);
  }
  if (toolName !== "Bash" || typeof input.command !== "string") return false;

  // Steps joined by `&&` are each judged on their own, and every one must
  // pass; a trailing stderr merge is harmless. Anything else that chains,
  // pipes, redirects or substitutes still goes to the dialog. Measured
  // 2026-10-02: a Standard run raised nine dialogs, most of them for its own
  // folder — `cd <workspace> && node …`, `mkdir -p … && ls …`, `rm` of the
  // intermediate Markdown it was told to delete.
  const steps = input.command.trim().split(/\s+&&\s+/);
  return steps.length > 0 && steps.every((step) => ownStep(step));

  function ownStep(step: string): boolean {
    const command = step.trim().replace(/\s+2>&1$/, "");
    if (/[;&|<>`\n]|\$\(/.test(command)) return false;
    const args = tokens(command);
    if (!args || args.length < 2) return false;
    const [verb, ...rest] = args;
    const paths = rest.filter((arg) => !arg.startsWith("-"));

    // Into the workspace, which is where the command runs anyway.
    if (verb === "cd") {
      return rest.length === 1 && norm(resolve(workspace, rest[0]!)) === norm(resolve(workspace));
    }
    // The folder itself may be made or listed, never removed.
    if (verb === "mkdir" || verb === "ls") {
      return paths.length > 0 && paths.every((path) => inside(path) || self(path));
    }
    if (verb === "rm") return paths.length > 0 && paths.every(inside);
    if (verb !== "node") return false;
    const script = norm(resolve(workspace, rest[0]!));
    const plugin = `${norm(pluginPath)}/scripts/`;
    const app = `${norm(APP_SCRIPTS_DIR)}/`;
    const known =
      (script.startsWith(plugin) && PLUGIN_SCRIPTS.has(script.slice(plugin.length))) ||
      (script.startsWith(app) && APP_SCRIPTS.has(script.slice(app.length)));
    if (!known) return false;
    // Every file it is given is the run's own; `-` skips a build input. The
    // manual builder's `--out-dir` may name the folder itself.
    const given = rest.slice(1);
    // Without `--out-dir` the manual builder writes to the profile's own
    // manuals folder, outside the run's.
    if (
      script.endsWith("/manual/build-manual.mjs") &&
      !given.some((arg) => arg === "--out-dir" || arg.startsWith("--out-dir="))
    ) {
      return false;
    }
    for (let index = 0; index < given.length; index += 1) {
      const arg = given[index]!;
      if (arg === "-" || SCRIPT_FLAGS.has(arg)) continue;
      if (arg === "--out-dir" || arg.startsWith("--out-dir=")) {
        const dir = arg === "--out-dir" ? given[(index += 1)] : arg.slice("--out-dir=".length);
        if (!dir || !(inside(dir) || self(dir))) return false;
        continue;
      }
      // The CBO list script reads the SDK's saved GetPackageContents result.
      if (script.endsWith("/cbo/objects.mjs") && index === 0 && savedResult(arg)) continue;
      if (!inside(arg) && !self(arg)) return false;
    }
    return true;
  }
}
