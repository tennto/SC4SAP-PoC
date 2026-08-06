import { existsSync } from "node:fs";
import { resolve } from "node:path";

/**
 * Loads .env into process.env. Node's built-in loader (20.12+) — no dotenv dep.
 * The Agent SDK itself does not read .env, so this must run before query().
 */
export function loadEnv(): void {
  if (existsSync(".env")) process.loadEnvFile(".env");
}

function required(name: string): string {
  const v = process.env[name];
  if (!v) {
    throw new Error(
      `${name} is not set. Copy .env.example to .env and fill it in.`,
    );
  }
  return v;
}

export type PocConfig = {
  pluginPath: string;
  workspace: string;
  model: string;
};

/**
 * Resolves PoC config. Does NOT require ANTHROPIC_API_KEY — scripts that only
 * inspect session init (no model call) can run without it.
 */
export function loadConfig(): PocConfig {
  loadEnv();
  const pluginPath = resolve(required("SC4SAP_PLUGIN_PATH"));
  if (!existsSync(pluginPath)) {
    throw new Error(`SC4SAP_PLUGIN_PATH does not exist: ${pluginPath}`);
  }
  return {
    pluginPath,
    workspace: resolve(process.env.SC4SAP_WORKSPACE ?? "./workspace"),
    model: process.env.SC4SAP_MODEL ?? "claude-sonnet-5",
  };
}

export function requireApiKey(): void {
  required("ANTHROPIC_API_KEY");
}
