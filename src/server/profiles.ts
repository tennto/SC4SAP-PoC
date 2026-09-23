/**
 * The SAP systems this backend can talk to, and which one it is on.
 *
 * A profile is a directory under `~/.sc4sap/profiles/<alias>/` holding a
 * `sap.env` and a `config.json`. Which one is live is not a setting this
 * server owns: it is the single line in `<workspace>/.sc4sap/active-profile.txt`,
 * read by the plugin's MCP bridge when it starts
 * (`plugin_module/bridge/mcp-server.cjs`). So this module does not parse
 * `sap.env` itself — it drives the plugin's own CLI, which is the thing that
 * defines the format and is already the supported way to change it.
 *
 * Read `sap.env` here and there would be two readers of one format, drifting.
 * Shelling out costs a process per call, on a screen nobody opens in a loop.
 *
 * WHAT A SWITCH ACTUALLY DOES. The bridge reads the pointer once, at process
 * start. Rewriting the pointer therefore changes nothing that is already
 * running: every live session keeps the system it booted against, and so does
 * every warm one. The switch is only real for sessions opened afterwards,
 * which is why `switchProfile` closes them all rather than leaving a server
 * whose answer to "which system am I on" depends on which session you ask.
 *
 * And it is process-wide. The workspace is one directory shared by every
 * account (`SessionManager` hands the same `cwd` to every session), so this
 * is not a per-user setting and must not be drawn as one — see the note the
 * Settings screen already carries about scope.
 */
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { join } from "node:path";

const run = promisify(execFile);

/** Long enough for a cold Node start on Windows, short enough to fail a hung CLI. */
const CLI_TIMEOUT_MS = 20_000;

/**
 * One SAP system as the web app sees it.
 *
 * Deliberately not the CLI's whole record. `passwordRef` is dropped and
 * reduced to `passwordInKeychain`: the reference itself
 * (`keychain:sc4sap/<alias>/<user>`) is not a secret, but it is also not
 * something a browser has any use for, and "is the password in the keychain
 * or sitting in plaintext in sap.env" is the only part of it worth showing.
 */
export type SapProfile = {
  alias: string;
  tier: string;
  host: string;
  client: string;
  username: string;
  language: string;
  version: string;
  abapRelease: string;
  description: string;
  passwordInKeychain: boolean;
};

export type ProfileList = {
  /** Alias of the live system, or null if the pointer is missing. */
  active: string | null;
  profiles: SapProfile[];
};

type CliProfile = Partial<Record<keyof SapProfile | "passwordRef", string>>;

function toProfile(raw: CliProfile): SapProfile {
  const passwordRef = String(raw.passwordRef ?? "");
  return {
    alias: String(raw.alias ?? ""),
    tier: String(raw.tier ?? ""),
    host: String(raw.host ?? ""),
    client: String(raw.client ?? ""),
    username: String(raw.username ?? ""),
    language: String(raw.language ?? ""),
    version: String(raw.version ?? ""),
    abapRelease: String(raw.abapRelease ?? ""),
    description: String(raw.description ?? ""),
    passwordInKeychain: passwordRef.startsWith("keychain:"),
  };
}

/**
 * Runs one profile-CLI verb and parses its JSON.
 *
 * `cwd` is the workspace, not this process's directory: `switch` writes the
 * pointer relative to its own cwd, and `list` reports which alias is active by
 * reading that same file. Run from anywhere else, the CLI would cheerfully
 * describe and edit a different workspace's pointer.
 */
async function cli<T>(
  pluginPath: string,
  workspace: string,
  args: string[],
): Promise<T> {
  const script = join(pluginPath, "scripts", "sap-profile-cli.mjs");
  const { stdout } = await run(process.execPath, [script, ...args], {
    cwd: workspace,
    timeout: CLI_TIMEOUT_MS,
    windowsHide: true,
  });
  return JSON.parse(stdout) as T;
}

export async function listProfiles(
  pluginPath: string,
  workspace: string,
): Promise<ProfileList> {
  const raw = await cli<{ active?: string; profiles?: CliProfile[] }>(
    pluginPath,
    workspace,
    ["list"],
  );
  return {
    active: raw.active ? String(raw.active) : null,
    profiles: (raw.profiles ?? []).map(toProfile),
  };
}

export type SwitchOutcome =
  | { ok: true; list: ProfileList; closedSessions: number }
  | { ok: false; error: string };

/**
 * Points the workspace at another SAP system.
 *
 * The alias is checked against the list rather than passed through: it reaches
 * a child process argument, and "it exists" is the same check the caller would
 * have to make anyway to give a useful error. The CLI would also refuse an
 * unknown alias — this refuses it without spawning anything.
 *
 * Closing every session is the point, not cleanup. See the note at the top:
 * a session that is already running holds an MCP process that read the old
 * pointer, and leaving it open would mean two sessions on two different SAP
 * systems answering as if they were one server.
 */
export async function switchProfile(
  manager: {
    config: { pluginPath: string; workspace: string };
    list(): unknown[];
    closeAll(): Promise<void>;
    discoverToolPolicy(): Promise<unknown>;
  },
  alias: string,
): Promise<SwitchOutcome> {
  const { pluginPath, workspace } = manager.config;

  if (typeof alias !== "string" || !/^[A-Za-z0-9_-]{1,64}$/.test(alias)) {
    return { ok: false, error: "alias must match [A-Za-z0-9_-]" };
  }

  const before = await listProfiles(pluginPath, workspace);
  if (!before.profiles.some((p) => p.alias === alias)) {
    return { ok: false, error: `unknown profile: ${alias}` };
  }

  const closedSessions = manager.list().length;

  await cli<{ ok: boolean; active: string }>(pluginPath, workspace, [
    "switch",
    alias,
  ]);

  // Order matters. Close first so no session outlives the pointer it was
  // started against, then re-discover: the new system publishes its own tool
  // list, and on a different release that list is not necessarily the same
  // one. Discovery is best-effort and never throws — a failed one leaves the
  // policy prompting for everything, which is the safe direction.
  await manager.closeAll();
  await manager.discoverToolPolicy();

  return {
    ok: true,
    list: await listProfiles(pluginPath, workspace),
    closedSessions,
  };
}
