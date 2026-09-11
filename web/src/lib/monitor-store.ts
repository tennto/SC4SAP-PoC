import "server-only";
import { toolCalls, type ToolCallDoc } from "@/lib/mongo";
import type { ToolCall } from "@/lib/types";

/**
 * Reading the tool-call log the backend writes.
 *
 * Read-only from this side, and deliberately: the backend is the one process
 * that sees every tool run and it writes the rows; this app only ever pages
 * through them. Both sides agree on the shape through `ToolCallDoc`, which
 * mirrors `src/server/tool-log.ts`. A field added there is added here, or the
 * page will not see it.
 */

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

/** The wire shape: dates as ISO strings, `_id` back to `id`. */
function toCall(doc: ToolCallDoc): ToolCall {
  const { _id, startedAt, endedAt, ...rest } = doc;
  return {
    id: _id,
    ...rest,
    startedAt: startedAt.toISOString(),
    endedAt: endedAt ? endedAt.toISOString() : null,
  };
}

/**
 * A page of this account's calls, newest first, from before `before`.
 *
 * Cursor by time rather than by offset: rows arrive continuously while the
 * page is open, and an offset would skip or repeat across the join. A call
 * that shares a millisecond with the cursor is dropped rather than repeated,
 * which at this rate is never.
 */
export async function listToolCalls(
  userId: string,
  options: { before?: Date; limit?: number; mcpOnly?: boolean } = {},
): Promise<ToolCall[]> {
  const limit = Math.min(Math.max(options.limit ?? 50, 1), 200);
  const filter: Record<string, unknown> = { userId };
  if (options.before) filter.startedAt = { $lt: options.before };
  if (options.mcpOnly) filter.kind = "mcp";
  const docs = await (await toolCalls())
    .find(filter)
    .sort({ startedAt: -1 })
    .limit(limit)
    .toArray();
  return docs.map(toCall);
}

export type ToolCallSummary = {
  /** Calls in the last 24 hours and the last 7 days. */
  today: number;
  week: number;
  /** Of the week's calls, how many came back as errors or were refused. */
  failedWeek: number;
  /** Median duration over the week's finished calls, in ms. `null` if none. */
  medianMs: number | null;
  /** The week's most-called MCP tools, most first. */
  topTools: { tool: string; calls: number }[];
};

/** The tiles across the top of the monitor. One aggregate pass. */
export async function summarizeToolCalls(userId: string): Promise<ToolCallSummary> {
  const now = Date.now();
  const weekAgo = new Date(now - WEEK_MS);
  const dayAgo = new Date(now - DAY_MS);

  const [row] = await (await toolCalls())
    .aggregate<{
      week: number;
      today: number;
      failedWeek: number;
      durations: number[];
      tools: { tool: string; calls: number }[];
    }>([
      { $match: { userId, startedAt: { $gte: weekAgo } } },
      {
        $facet: {
          counts: [
            {
              $group: {
                _id: null,
                week: { $sum: 1 },
                today: { $sum: { $cond: [{ $gte: ["$startedAt", dayAgo] }, 1, 0] } },
                failedWeek: {
                  $sum: {
                    $cond: [
                      {
                        $or: [
                          { $eq: ["$ok", false] },
                          { $in: ["$decision", ["denied", "expired"]] },
                        ],
                      },
                      1,
                      0,
                    ],
                  },
                },
              },
            },
          ],
          // Durations come back as a list and the median is taken here:
          // `$median` needs a Mongo 7 server, and this app should not fail
          // its monitor page on a 6.
          durations: [
            { $match: { durationMs: { $ne: null } } },
            { $group: { _id: null, values: { $push: "$durationMs" } } },
          ],
          tools: [
            { $match: { kind: "mcp" } },
            { $group: { _id: "$tool", calls: { $sum: 1 } } },
            { $sort: { calls: -1, _id: 1 } },
            { $limit: 5 },
            { $project: { _id: 0, tool: "$_id", calls: 1 } },
          ],
        },
      },
      {
        $project: {
          week: { $ifNull: [{ $first: "$counts.week" }, 0] },
          today: { $ifNull: [{ $first: "$counts.today" }, 0] },
          failedWeek: { $ifNull: [{ $first: "$counts.failedWeek" }, 0] },
          durations: { $ifNull: [{ $first: "$durations.values" }, []] },
          tools: 1,
        },
      },
    ])
    .toArray();

  const durations = (row?.durations ?? []).slice().sort((a, b) => a - b);
  const medianMs =
    durations.length === 0
      ? null
      : durations.length % 2 === 1
        ? durations[(durations.length - 1) / 2]
        : Math.round(
            (durations[durations.length / 2 - 1] + durations[durations.length / 2]) / 2,
          );

  return {
    today: row?.today ?? 0,
    week: row?.week ?? 0,
    failedWeek: row?.failedWeek ?? 0,
    medianMs,
    topTools: row?.tools ?? [],
  };
}
