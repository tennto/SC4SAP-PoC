/**
 * What the agent is doing right now, for the line under the answer.
 *
 * The question this exists to answer is not "what is it doing" but "is it
 * still alive". A turn can sit silent for a minute while a skill reads nine
 * rule files and a sub-agent walks a package, and silence looks exactly like
 * a crash. So every state here is derived from a signal that actually arrived
 * on the stream — never from a timer alone — and the elapsed clock beside it
 * is what separates "working" from "stopped".
 *
 * Nothing is invented: an error ends the turn and is reported as an error, and
 * this line goes away. If it is on screen, something got here.
 */

import type { Messages } from "@/lib/i18n/messages";

/** The words for every state below, in the reader's language. */
export type ActivityText = Messages["activity"];

export type ActivityKind =
  /** Mid-turn with no more specific signal yet. */
  | "working"
  /** Extended thinking is streaming. */
  | "thinking"
  /** Answer tokens are streaming. */
  | "writing"
  /** A tool is open — `detail` is its name. */
  | "tool"
  /** The API refused and the SDK is retrying — `detail` is "attempt N of M". */
  | "retrying"
  /** Parked on an approval dialog. Not stuck: waiting on a person. */
  | "waiting";

export type Activity = {
  kind: ActivityKind;
  detail?: string;
  /**
   * When this state began, in epoch ms.
   *
   * Per state rather than per turn, deliberately. "Reading SAP (2s)" after
   * ninety seconds of other work says the thing a whole-turn clock cannot:
   * that the last ninety seconds were progress, not a hang.
   */
  since: number;
};

/** Past this long in one state, the line says so rather than just counting. */
export const STALL_AFTER_MS = 25_000;

const SAP_PREFIX = "mcp__plugin_sc4sap_sap__";

/**
 * A tool call in words.
 *
 * Grouped by what the reader would worry about, not by tool family: "is it
 * touching my SAP system", "is it running something on the server", "is it
 * off talking to the internet". The bare tool name rides along in `detail`
 * for the SAP ones, because the people using this can read `GetProgram` and
 * it tells them roughly how long to expect.
 */
export function describeTool(
  toolName: string,
  t: ActivityText,
): { label: string; detail?: string } {
  if (toolName.startsWith(SAP_PREFIX)) {
    const bare = toolName.slice(SAP_PREFIX.length);
    if (bare === "GetTableContents" || bare === "GetSqlQuery") {
      return { label: t.readingRows, detail: bare };
    }
    if (bare.startsWith("Runtime")) return { label: t.readingRuntime, detail: bare };
    return { label: t.lookingUpSap, detail: bare };
  }

  switch (toolName) {
    case "Agent":
      return { label: t.subAgent };
    case "SlashCommand":
      return { label: t.runningSkill };
    case "Bash":
      return { label: t.runningCommand };
    case "BashOutput":
      return { label: t.checkingCommand };
    case "Read":
    case "Glob":
    case "Grep":
      return { label: t.readingFiles };
    case "Write":
    case "Edit":
    case "NotebookEdit":
      return { label: t.writingFile };
    case "WebFetch":
    case "WebSearch":
      return { label: t.searchingWeb };
    case "TodoWrite":
      return { label: t.planning };
    case "ToolSearch":
      return { label: t.loadingTools };
    case "AskUserQuestion":
      return { label: t.asking };
    default:
      return { label: t.runningTool, detail: toolName };
  }
}

/** The whole line, as words. `elapsedMs` is time in the current state. */
export function describeActivity(
  activity: Activity,
  elapsedMs: number,
  t: ActivityText,
): { label: string; detail?: string; meta: string } {
  const seconds = Math.floor(elapsedMs / 1000);
  const clock = seconds >= 60 ? `${Math.floor(seconds / 60)}m ${seconds % 60}s` : `${seconds}s`;
  const stalled = elapsedMs >= STALL_AFTER_MS;

  if (activity.kind === "tool") {
    const { label, detail } = describeTool(activity.detail ?? "", t);
    // A tool is the one state where a long wait is ordinary — a package walk
    // takes as long as it takes — so it says "still running" rather than
    // anything that reads like a warning.
    return { label, detail, meta: stalled ? t.stillRunning(clock) : clock };
  }

  if (activity.kind === "retrying") {
    // The honest "it is in trouble but not dead". Never says "still", because
    // a retry is not a long version of working — it is a failure being
    // absorbed, and the count is the thing worth reading.
    return { label: t.retrying, detail: activity.detail, meta: clock };
  }

  if (activity.kind === "waiting") {
    return { label: t.waiting, meta: clock };
  }

  const label =
    activity.kind === "thinking"
      ? t.thinking
      : activity.kind === "writing"
        ? t.writing
        : t.working;

  return { label, meta: stalled ? t.still(clock, label) : clock };
}
