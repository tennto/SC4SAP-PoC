/**
 * What a run cost at Anthropic's list price, rather than at the Agent SDK's.
 *
 * The SDK reports `total_cost_usd` from a price table of its own, and in
 * 0.3.223 that table puts `claude-sonnet-5` on its $3/$15 tier. The list
 * price is $2/$10 per MTok. Every other model this app runs is priced the
 * same in both, so a Sonnet run read up to 1.5x dearer than an Opus one
 * really was — enough, on 2026-09-28, to make a Sonnet reviewer look more
 * expensive than the Opus one it replaced.
 *
 * The correction is a factor per model rather than a price table: the SDK
 * splits cache writes into 5-minute and 1-hour tokens and does not hand the
 * split back, but every one of its rates for a tier scales with the input
 * price, so scaling the model's cost keeps that split right without knowing
 * it.
 */

/** List price over the SDK's price, for the models where they differ. */
const LIST_OVER_SDK: Readonly<Record<string, number>> = {
  // SDK tier_3_15; list $2 input / $10 output.
  "claude-sonnet-5": 2 / 3,
};

/** One model's line of the SDK's `modelUsage`. Only the cost is read. */
type ModelCost = { costUSD?: number };

/**
 * The run's cost at list price, or `fallback` when the SDK sent no breakdown.
 *
 * `modelUsage` keys are model ids, sometimes with a suffix such as `[1m]`;
 * the lookup matches on the id before it.
 */
export function listPriceCost(
  modelUsage: Readonly<Record<string, ModelCost>> | undefined,
  fallback: number,
): number {
  if (!modelUsage) return fallback;
  const lines = Object.entries(modelUsage);
  if (lines.length === 0) return fallback;
  let total = 0;
  for (const [model, usage] of lines) {
    const id = model.replace(/\[.*\]$/, "");
    total += (usage.costUSD ?? 0) * (LIST_OVER_SDK[id] ?? 1);
  }
  return total;
}
