/**
 * Phase 2 backend entry point. `npm run server`
 *
 * Requires `npm run workspace` to have provisioned the session cwd first —
 * without it the session has no active SAP profile and no L1 blocklist guards.
 */
import { SessionManager } from "./session-manager.ts";
import { buildApp } from "./app.ts";

const PORT = Number(process.env.PORT ?? 3001);
const HOST = process.env.HOST ?? "127.0.0.1";

async function main(): Promise<void> {
  const manager = new SessionManager();
  const app = buildApp(manager);

  // Learn the SAP tool list before serving, so the first session already has
  // the read-class auto-allow list rather than prompting for everything.
  const policy = await manager.discoverToolPolicy();
  app.log.info(
    `tool policy: ${policy.allowedTools.length} auto-allowed, ` +
      `${policy.disallowedTools.length} deny patterns, ` +
      `classes ${JSON.stringify(policy.summary)}`,
  );

  const shutdown = async (signal: string): Promise<void> => {
    app.log.info(`${signal} received, closing sessions`);
    await manager.closeAll();
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
