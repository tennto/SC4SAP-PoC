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
export function describeTool(toolName: string): { label: string; detail?: string } {
  if (toolName.startsWith(SAP_PREFIX)) {
    const bare = toolName.slice(SAP_PREFIX.length);
    if (bare === "GetTableContents" || bare === "GetSqlQuery") {
      return { label: "Reading table rows", detail: bare };
    }
    if (bare.startsWith("Runtime")) return { label: "Reading runtime logs", detail: bare };
    return { label: "Looking up SAP", detail: bare };
  }

  switch (toolName) {
    case "Agent":
      return { label: "Handing work to a sub-agent" };
    case "SlashCommand":
      return { label: "Running a skill" };
    case "Bash":
      return { label: "Running a command" };
    case "BashOutput":
      return { label: "Checking a command" };
    case "Read":
    case "Glob":
    case "Grep":
      return { label: "Reading files" };
    case "Write":
    case "Edit":
    case "NotebookEdit":
      return { label: "Writing a file" };
    case "WebFetch":
    case "WebSearch":
      return { label: "Searching the web" };
    case "TodoWrite":
      return { label: "Planning the steps" };
    case "ToolSearch":
      return { label: "Loading tools" };
    case "AskUserQuestion":
      return { label: "Asking you something" };
    default:
      return { label: "Running a tool", detail: toolName };
  }
}

/** The whole line, as words. `elapsedMs` is time in the current state. */
export function describeActivity(
  activity: Activity,
  elapsedMs: number,
): { label: string; detail?: string; meta: string } {
  const seconds = Math.floor(elapsedMs / 1000);
  const clock = seconds >= 60 ? `${Math.floor(seconds / 60)}m ${seconds % 60}s` : `${seconds}s`;
  const stalled = elapsedMs >= STALL_AFTER_MS;

  if (activity.kind === "tool") {
    const { label, detail } = describeTool(activity.detail ?? "");
    // A tool is the one state where a long wait is ordinary — a package walk
    // takes as long as it takes — so it says "still running" rather than
    // anything that reads like a warning.
    return { label, detail, meta: stalled ? `${clock} · still running` : clock };
  }

  if (activity.kind === "retrying") {
    // The honest "it is in trouble but not dead". Never says "still", because
    // a retry is not a long version of working — it is a failure being
    // absorbed, and the count is the thing worth reading.
    return { label: "Retrying after an API error", detail: activity.detail, meta: clock };
  }

  if (activity.kind === "waiting") {
    return { label: "Waiting for your answer", meta: clock };
  }

  const label =
    activity.kind === "thinking"
      ? "Thinking"
      : activity.kind === "writing"
        ? "Writing"
        : "Working";

  return { label, meta: stalled ? `${clock} · still ${label.toLowerCase()}` : clock };
}
