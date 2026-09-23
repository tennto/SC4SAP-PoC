import { isAbsolute, relative, resolve } from "node:path";

/**
 * Phase 2-5 — read-only tool policy.
 *
 * The execution plan words this as "`allowedTools` permits only Get and Search
 * tools", but that field does the opposite of what it implies: the SDK
 * documents it as *"tool names that are auto-allowed without prompting"* — a
 * convenience list, not a restriction. The field that actually restricts is
 * `disallowedTools`, documented as *"removed from the model's context and
 * cannot be used, even if they would otherwise be allowed"*. Verified against
 * the running system: with a write tool disallowed the model reports
 * NOT_AVAILABLE and `canUseTool` is never reached. Wildcards work.
 *
 * So the intent (read-only) is implemented as two complementary halves:
 *
 *   disallowedTools — STATIC. Write-class SAP tools, gone from context.
 *                     Never derived from discovery: a lookup failure must not
 *                     be able to widen what is reachable.
 *   allowedTools    — DISCOVERED. Read-class tools, auto-approved so a
 *                     consultant answer does not fire twenty approval prompts.
 *                     If discovery fails this is empty, and everything falls
 *                     back to a human prompt — the safe direction.
 *
 * Anything in neither list still goes through the 2-4 approval queue.
 */

/** MCP tool prefix for the sc4sap plugin's ABAP ADT server. */
export const SAP_TOOL_PREFIX = "mcp__plugin_sc4sap_sap__";

/**
 * Write-class SAP tools, removed from context outright.
 *
 * The plugin's own `tier-readonly-guard.mjs` hook is installed behind the
 * matcher `(Create|Update|Delete|RunUnitTest|RuntimeRunProgramWithProfiling|RuntimeRunClassWithProfiling)`
 * (see provision-workspace.ts). That regex misses `PatchGuiStatus`,
 * `WriteTextElementsBulk`, `ActivateObjects` and
 * `RuntimeCreateProfilerTraceParameters`, all of which mutate the SAP
 * system — the hook itself has classified them as writes since plugin
 * 0.6.18, but it is never reached for them — so this list deliberately
 * covers more than the installed hook does rather than mirroring it.
 */
export const WRITE_CLASS_PATTERNS: readonly string[] = [
  `${SAP_TOOL_PREFIX}Create*`,
  `${SAP_TOOL_PREFIX}Update*`,
  `${SAP_TOOL_PREFIX}Delete*`,
  `${SAP_TOOL_PREFIX}Patch*`,
  `${SAP_TOOL_PREFIX}Write*`,
  `${SAP_TOOL_PREFIX}Activate*`,
  `${SAP_TOOL_PREFIX}RunUnitTest`,
  `${SAP_TOOL_PREFIX}RuntimeRun*`,
  `${SAP_TOOL_PREFIX}RuntimeCreate*`,
  // Switches which SAP system the session talks to — server-state mutation.
  `${SAP_TOOL_PREFIX}ReloadProfile`,
];

/** Bare tool names matching a write-class pattern, for classification. */
const WRITE_CLASS_RE =
  /^(Create|Update|Delete|Patch|Write|Activate|RuntimeRun|RuntimeCreate)|^RunUnitTest$|^ReloadProfile$/;

/**
 * Row extraction. Never auto-allowed even though the names start with `Get`:
 * these are the two tools the L1 blocklist hook gates per-table, and a web
 * client must not be able to pull rows without a human in the loop.
 */
export const NEVER_AUTO_ALLOW: ReadonlySet<string> = new Set([
  "GetTableContents",
  "GetSqlQuery",
]);

const READ_PREFIXES = ["Get", "Read", "Search", "List", "Describe"] as const;

/**
 * Runtime diagnostics that only read the system's own records — short dumps,
 * profiler traces, gateway and system logs.
 *
 * Read-class in every sense except the name: `Runtime…` starts with none of
 * READ_PREFIXES, so these fell through to `other` and prompted once per call.
 * A skill that walks a dump list raised a dialog every time, which is the
 * pattern that teaches people to wave dialogs through.
 *
 * Narrow on purpose, and safe because of the order it is tested in:
 * `RuntimeRun*` executes a program and `RuntimeCreate*` writes trace
 * parameters, and both are caught by WRITE_CLASS_RE above — which runs first,
 * so neither can reach this line.
 *
 * Keyed off the name because there is nothing better to key off: the ADT MCP
 * server returns an `annotations` object on all 174 tools and leaves
 * `readOnly` unset on every one of them. If it ever populates them, that is
 * the signal this should be replaced with.
 */
const RUNTIME_READ_RE = /^Runtime(List|Get|Analyze)/;

/**
 * Read-class tools that match no prefix rule at all.
 *
 * Exact names, never a prefix: a later `Validate…` that changes something
 * must not be swept in by a pattern that was written for this one.
 */
const NAMED_READ: ReadonlySet<string> = new Set(["ValidateServiceBinding"]);

/**
 * The agent's own tools that are auto-approved.
 *
 * Not SAP tools at all — these are the SDK's, and they are the reason a single
 * skill run was raising dozens of prompts. `analyze-code` reads nine rule
 * files, keeps a todo list and dispatches a reviewer sub-agent before it has
 * touched the SAP system once, and every one of those was landing in the
 * approval queue as an unclassified `other`. A prompt that fires that often
 * stops being read, which makes the prompts that matter — a write, a table
 * dump — cost nothing to wave through.
 *
 * What is on this list can look at things: the local filesystem the server
 * already gave the session as its `cwd` and plugin path, the model's own
 * bookkeeping, and dispatching work to a sub-agent — whose tool calls come
 * back through this same policy rather than around it.
 *
 * What is deliberately NOT on it, and prompts every time:
 *
 *   Bash, Write, Edit, NotebookEdit — change the machine the server runs on.
 *   WebFetch, WebSearch           — leave the machine entirely.
 *   Every SAP write tool          — not reachable at all; see
 *                                   `disallowedTools` above.
 *
 * Leaving them off this list is necessary and was not sufficient. Built-in
 * tools never reached `canUseTool` at all, so for a while these ran without
 * being asked about — measured, not inferred. What actually stops them is the
 * PreToolUse hook in `session-manager.ts`; see `needsHookApproval` below.
 */
export const LOCAL_AUTO_ALLOW: readonly string[] = [
  "Read",
  "Glob",
  "Grep",
  "TodoWrite",
  // Dispatching a sub-agent. `Agent`, not `Task` — the SDK names it that
  // ("invoked via the Agent tool", `sdk.d.ts` under `agents`), and a name that
  // matches nothing is not a permissive entry, it is an absent one. Its own
  // calls are policed by this same callback, so allowing the dispatch is not
  // allowing what it goes on to do.
  "Agent",
  "SlashCommand",
  // Loads a skill's instructions into the turn — the plugin's own skills
  // call each other this way (`analyze-symptom` starts by invoking
  // `trust-session`). It reads markdown and nothing else, and a dialog on
  // it was the first thing every symptom run put in front of the reader.
  "Skill",
  "BashOutput",
  "ExitPlanMode",
  // Reads the schemas of tools the session has not loaded yet. It reaches
  // nothing but the tool list, and the model calls it before almost anything
  // else — gating it would put a dialog in front of every first SAP lookup
  // that asked about nothing the reader could judge.
  //
  // Worth noting where it came from: it is not in the SDK's own
  // `ToolInputSchemas` union, and it turned up only by being called. That is
  // the argument for `needsHookApproval` denying by default rather than
  // matching a list of known-dangerous names.
  "ToolSearch",
  // The other half of ExitPlanMode. Changes nothing outside the turn.
  "EnterPlanMode",
];

/**
 * What a session is allowed to reach for, as one word.
 *
 * Three shapes, because measurement said two was not enough. A chat asks
 * questions. A read-only skill investigates — it dispatches a specialist,
 * looks things up on the web, and reads the local customization cache, but
 * changes nothing. A build skill does work: it writes its artifacts down and
 * runs commands.
 *
 * The distinction is not decoration. `analyze-symptom` is read-only by its own
 * rules — "No filesystem search: paths are resolved once in Step 1" — and in a
 * logged run on 2026-09-12 it spent its first four minutes and nineteen `Bash`
 * calls on `find`, `grep`, `mkdir` and `cp`, then went on to grep the
 * developer's own Claude Code transcripts under `~/.claude/projects`. A rule
 * written in a prompt is a request; a tool that is absent is an answer.
 */
export type ToolProfile = "ask" | "analyse" | "build";

/** Every profile, for validating one off the wire. */
export const TOOL_PROFILES: readonly ToolProfile[] = ["ask", "analyse", "build"];

/**
 * Tools that change the machine this server runs on, or run commands on it.
 *
 * Out of reach for everything but a build skill. Nothing else in this app has
 * a reason to write a file or open a shell: a chat renders an answer, and a
 * read-only skill returns a report.
 */
const LOCAL_WRITES: readonly string[] = [
  "Write",
  "Edit",
  "NotebookEdit",
  "Bash",
  "BashOutput",
  "KillShell",
];

/**
 * Tools that leave the machine, plus the model's own bookkeeping.
 *
 * A read-only skill keeps these: `analyze-symptom` looks up SAP Notes as its
 * known-issue step, and a multi-round investigation has a list to keep. A chat
 * has neither, and carrying them costs it tokens on every turn.
 */
const LOCAL_LOOKUP: readonly string[] = ["WebFetch", "WebSearch", "TodoWrite"];

/** The sub-agent dispatch. Its description is every agent the plugin declares. */
const AGENT = "Agent";

/**
 * What a profile may not touch, on top of the SAP write patterns every session
 * is denied.
 *
 * Measured per turn on this machine: `Agent` is 17,665 tokens, and the local
 * tools together are 8,766. A chat that carried all of it was paying 61% of
 * its context for machinery it never reached for.
 */
export function disallowedForProfile(profile: ToolProfile): readonly string[] {
  if (profile === "build") return [];
  if (profile === "analyse") return LOCAL_WRITES;
  return [AGENT, ...LOCAL_WRITES, ...LOCAL_LOOKUP];
}

/**
 * Local read tools, and the input field each one takes a path in.
 *
 * Read, Grep and Glob are kept for every profile: a read-only skill needs them
 * for the customization cache the workflow hands it a path to. What they are
 * not for is the rest of the disk, which is the next function's job.
 */
const PATH_ARG: Record<string, string> = {
  Read: "file_path",
  Grep: "path",
  Glob: "path",
  Write: "file_path",
  Edit: "file_path",
  NotebookEdit: "notebook_path",
};

/**
 * The path a tool call is reaching for, when that is outside the workspace.
 *
 * Returns the offending path, or null when the call stays inside.
 *
 * This exists because of one line in a logged run. `analyze-symptom`, a
 * read-only SAP skill, ran `Grep` against the developer's own Claude Code
 * transcripts under `~/.claude/projects` three times, and five `Bash`
 * commands into the same directory. Nothing about a SAP short dump lives
 * there. The session's `cwd` is the workspace and everything it legitimately
 * reads is under it, so anything above it is a mistake at best.
 *
 * Relative paths resolve against the workspace and are therefore inside by
 * construction; only an absolute path that climbs out is refused.
 */
export function outsideWorkspace(
  toolName: string,
  input: Record<string, unknown>,
  workspace: string,
): string | null {
  const field = PATH_ARG[toolName];
  if (!field) return null;
  const raw = input[field];
  if (typeof raw !== "string" || raw === "") return null;

  const target = resolve(workspace, raw);
  const root = resolve(workspace);
  // Case-insensitive because Windows is, and a case-flipped prefix would
  // otherwise read as an escape. `relative` handles the separators.
  const rel = relative(root.toLowerCase(), target.toLowerCase());
  const inside = rel === "" || (!rel.startsWith("..") && !isAbsolute(rel));
  return inside ? null : target;
}

export type ToolClass = "write" | "row-extraction" | "read" | "other";

export function classifySapTool(bareName: string): ToolClass {
  // Order is load-bearing. Write is tested first so that `RuntimeRun*` and
  // `RuntimeCreate*` are settled as write before the Runtime read rule can
  // look at them; row extraction is tested next so that the two tools whose
  // names begin with `Get` cannot be read by the prefix rule below.
  if (WRITE_CLASS_RE.test(bareName)) return "write";
  if (NEVER_AUTO_ALLOW.has(bareName)) return "row-extraction";
  if (RUNTIME_READ_RE.test(bareName)) return "read";
  if (NAMED_READ.has(bareName)) return "read";
  if (READ_PREFIXES.some((p) => bareName.startsWith(p))) return "read";
  return "other";
}

/** The tool through which the model asks the user a multiple-choice question. */
export const QUESTION_TOOL = "AskUserQuestion";

/**
 * Whether this call has to be gated by the PreToolUse hook rather than by
 * `canUseTool`.
 *
 * `canUseTool` is not the chokepoint the approval queue was written against.
 * Measured against this SDK: a `Bash` call runs to completion without the
 * callback ever being consulted, and it does so with `allowedTools` empty —
 * so it is not the auto-allow list shadowing it, it is that built-in tools do
 * not route through the callback at all. The SDK says as much in its own
 * warning: "To gate every tool call, use a PreToolUse hook".
 *
 * MCP tools are left alone because they demonstrably do reach the callback —
 * that is what raised the SAP prompts this backend has been answering all
 * along — and routing them twice would ask twice.
 *
 * The list is a denial by default: anything that is not a known-safe local
 * tool, not an MCP tool and not the question tool has to be asked about, so a
 * built-in added by a future SDK arrives gated rather than silently allowed.
 */
export function needsHookApproval(toolName: string): boolean {
  if (toolName.startsWith("mcp__")) return false;
  if (LOCAL_AUTO_ALLOW.includes(toolName)) return false;
  // Not a permission at all — the model asking the operator to choose. It has
  // its own dialog, and turning it into an allow/deny would lose the answer.
  if (toolName === QUESTION_TOOL) return false;
  return true;
}

/**
 * Whether a session's "allow all SAP reads" switch may wave this call through.
 *
 * Runs the same classifier the auto-allow list is built from, so the switch
 * can never grant more than a healthy discovery would have granted anyway:
 * SAP tools only, read class only — which excludes every write pattern and
 * both row-extraction tools by construction rather than by a second list that
 * could drift away from this one.
 *
 * The agent's own tools are deliberately not covered. `Bash`, `Write`, `Edit`
 * and `WebFetch` change or leave the machine the server runs on, and a switch
 * flipped to stop being asked about reading ABAP source is not consent to
 * those.
 */
export function isSapReadTool(toolName: string): boolean {
  if (!toolName.startsWith(SAP_TOOL_PREFIX)) return false;
  return classifySapTool(toolName.slice(SAP_TOOL_PREFIX.length)) === "read";
}

/**
 * How much a session asks before it acts. An account setting, sent with
 * every session the web app opens.
 *
 *   all    — every gated call is put to the reader. The original behaviour.
 *   writes — reads go through, writes ask: SAP reads of every class but row
 *            extraction, the agent's own read tools, and a shell command
 *            that only looks. Anything that changes a file or the SAP system,
 *            or leaves the machine, still asks.
 *   never  — nothing asks. For a PoC on the operator's own machine; SAP
 *            write tools are still out of the model's reach altogether.
 *
 * The question tool is outside all three — it is the model asking, not the
 * model wanting — and so is a row-extraction read under `writes`, because
 * pulling table rows is the one read the blocklist was built around.
 */
export type ApprovalLevel = "all" | "writes" | "never";

export const APPROVAL_LEVELS: readonly ApprovalLevel[] = ["all", "writes", "never"];

/**
 * The agent's own tools that only look at the machine. Under `writes` they
 * are waved through; `LOCAL_AUTO_ALLOW` above already covers most of them
 * before this is consulted, and this is the list for the ones it does not.
 */
const LOCAL_READ_TOOLS: ReadonlySet<string> = new Set([
  "Read",
  "Grep",
  "Glob",
  "LS",
  "ToolSearch",
  "Skill",
  "Agent",
  "SlashCommand",
  "BashOutput",
  "TodoWrite",
]);

/** First words of shell commands that only read. */
const READ_COMMANDS: ReadonlySet<string> = new Set([
  "cat", "ls", "dir", "grep", "rg", "find", "head", "tail", "wc", "echo",
  "printf", "pwd", "dirname", "basename", "sort", "uniq", "cut", "awk", "tr",
  "jq", "stat", "file", "which", "where", "type", "test", "[", "date", "true",
  "less", "more", "diff", "md5sum", "sha256sum", "env", "printenv", "realpath",
  "readlink", "du", "df", "nl", "tac", "column", "xargs",
]);

/** `git` sub-commands that only read. */
const GIT_READ: ReadonlySet<string> = new Set([
  "log", "status", "diff", "show", "branch", "rev-parse", "ls-files", "blame", "remote",
]);

/**
 * Whether a shell command only looks.
 *
 * A heuristic, and a conservative one: it says yes only when every part of
 * the command starts with a word known to read, there is no redirection
 * anywhere, and nothing is evaluated (`node -e`, `python -c`, `eval`). A
 * `cd` in front is fine. Anything it is unsure about is a no, which means a
 * dialog — the failure mode is one more question, not one fewer.
 */
export function isReadOnlyCommand(command: string): boolean {
  // Sending stderr to nowhere, or folding it into stdout, writes nothing.
  // Taken out before the redirection test so `cat x 2>/dev/null | tail` —
  // the shape of half the plugin's own reads — is still a read.
  const text = command.replace(/2>\s*\/dev\/null|2>&1/g, "");
  if (/[<>]|\btee\b|\beval\b|\bsudo\b/.test(text)) return false;
  if (/\b(node|python3?|ruby|perl|bash|sh|pwsh|powershell)\b\s+(-e|-c|-Command)/i.test(text)) {
    return false;
  }
  const parts = text
    .split(/\n|&&|\|\||;|\|/)
    .map((part) => part.trim())
    .filter((part) => part !== "");
  if (parts.length === 0) return false;
  for (const part of parts) {
    const words = part.split(/\s+/);
    const head = (words[0] ?? "").replace(/^["']|["']$/g, "");
    if (head === "cd") continue;
    if (head === "git") {
      if (!GIT_READ.has(words[1] ?? "")) return false;
      continue;
    }
    if (head === "sed") {
      // `sed -i` edits in place; every other sed is a filter.
      if (words.some((word) => /^-[a-zA-Z]*i/.test(word))) return false;
      continue;
    }
    if (!READ_COMMANDS.has(head)) return false;
  }
  return true;
}

/**
 * Whether the session's approval level lets this call through unasked.
 *
 * `all` lets nothing through — that is what it means. `never` lets everything
 * but a question through. `writes` is the judgement call, and it is made
 * from the tool's class, not its name, so it cannot drift from the policy
 * that decides what reaches the model at all.
 */
export function allowedByLevel(
  level: ApprovalLevel,
  toolName: string,
  input: Record<string, unknown>,
): boolean {
  if (toolName === QUESTION_TOOL) return false;
  if (level === "all") return false;
  if (level === "never") return true;
  if (toolName.startsWith(SAP_TOOL_PREFIX)) {
    const cls = classifySapTool(toolName.slice(SAP_TOOL_PREFIX.length));
    return cls === "read" || cls === "other";
  }
  if (LOCAL_READ_TOOLS.has(toolName)) return true;
  if (toolName === "Bash") {
    return typeof input.command === "string" && isReadOnlyCommand(input.command);
  }
  return false;
}

export type ToolPolicy = {
  /** Auto-approved, no prompt. */
  allowedTools: string[];
  /** Removed from the model's context. */
  disallowedTools: string[];
  /** Counts per class, for /health and logs. */
  summary: Record<ToolClass, number>;
};

/**
 * Builds the policy from the server's live tool list (bare names, as returned
 * by `mcpServerStatus()`). Pass an empty list when discovery failed: the deny
 * half still applies and everything else prompts.
 */
export function buildToolPolicy(bareToolNames: readonly string[]): ToolPolicy {
  const summary: Record<ToolClass, number> = {
    write: 0,
    "row-extraction": 0,
    read: 0,
    other: 0,
  };
  const allowedTools: string[] = [];

  for (const name of bareToolNames) {
    const cls = classifySapTool(name);
    summary[cls] += 1;
    if (cls === "read") allowedTools.push(`${SAP_TOOL_PREFIX}${name}`);
  }

  return {
    // The agent's own safe tools are added unconditionally: unlike the SAP
    // list they are not discovered, so a discovery failure must not be able to
    // take them away and bury the operator in prompts.
    allowedTools: [...allowedTools, ...LOCAL_AUTO_ALLOW],
    disallowedTools: [...WRITE_CLASS_PATTERNS],
    summary,
  };
}
