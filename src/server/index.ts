/**
 * Phase 2 backend entry point. `npm run server`
 *
 * Requires `npm run workspace` to have provisioned the session cwd first —
 * without it the session has no active SAP profile and no L1 blocklist guards.
 */
import { SessionManager } from "./session-manager.ts";
import { ToolLog } from "./tool-log.ts";
import { buildApp } from "./app.ts";
import { loadEnv } from "../config.ts";

const PORT = Number(process.env.PORT ?? 3001);
const HOST = process.env.HOST ?? "127.0.0.1";

async function main(): Promise<void> {
  // Before the tool log reads MONGODB_URI. `SessionManager` loads it too,
  // but the log is built first so the manager can be handed it.
  loadEnv();
  const pending: string[] = [];
  const toolLog = new ToolLog({
    mongoUri: process.env.MONGODB_URI,
    mongoDb: process.env.MONGODB_DB,
    // The app's logger does not exist yet; anything said now is said once
    // it does.
    log: (message) => pending.push(message),
  });
  const manager = new SessionManager(undefined, { toolLog });
  const app = buildApp(manager);
  for (const message of pending) app.log.warn(message);

  // Learn the SAP tool list before serving, so the first session already has
  // the read-class auto-allow list rather than prompting for everything.
  let policy = await manager.discoverToolPolicy();
  // One retry, because the fault this guards against is a race rather than a
  // verdict: the status read can throw while the transport is still coming up,
  // and a second attempt a moment later has always found the tools. Telling
  // the operator to restart the server was the old answer; doing it ourselves
  // is the same work without the outage.
  if (policy.summary.read === 0) {
    app.log.warn(
      `first tool discovery found nothing (${manager.discoveryNote ?? "unknown"}) — retrying once`,
    );
    await new Promise((r) => setTimeout(r, 2_000));
    policy = await manager.discoverToolPolicy();
  }
  app.log.info(
    `tool policy: ${policy.allowedTools.length} auto-allowed, ` +
      `${policy.disallowedTools.length} deny patterns, ` +
      `classes ${JSON.stringify(policy.summary)}`,
  );
  // Discovery is best-effort by design, and a failed one is survivable: every
  // SAP read simply prompts. It is also easy to mistake for a credentials or
  // permission-hook bug, because what the operator sees is a dialog on a
  // plain source read. Say so once, at the only moment it can be acted on.
  if (policy.summary.read === 0) {
    app.log.warn(
      "tool discovery found no read-class SAP tools — every SAP read will " +
        "raise an approval, and a skill that reads SAP will stall on " +
        "dialogs. Reason: " +
        (manager.discoveryNote ?? "unknown") +
        ". The retry did not help either; restart the server.",
    );
  }

  const shutdown = async (signal: string): Promise<void> => {
    app.log.info(`${signal} received, closing sessions`);
    await manager.closeAll();
    await toolLog.close();
    await app.close();
    process.exit(0);
  };
  process.on("SIGINT", () => void shutdown("SIGINT"));
  process.on("SIGTERM", () => void shutdown("SIGTERM"));

  await app.listen({ port: PORT, host: HOST });
}

main().catch((err) => {
  console.error(`FAILED: ${(err as Error).message}`);
  process.exitCode = 1;
});
