# SC4SAP Web PoC

Runs the [sc4sap](../Poc%20Web) Claude Code plugin headlessly via the **Claude Agent SDK**, as the backend for a browser UI. Execution plan lives in the plugin repo's `README.md`.

Current state: **Phase 1 (SDK smoke test)** — scaffolding and both smoke scripts are in place.

## Setup

```bash
npm install
cp .env.example .env      # then fill in ANTHROPIC_API_KEY
npm run workspace         # provision the session cwd (no API key needed)
```

`ANTHROPIC_API_KEY` is required. The Agent SDK **cannot** reuse a Claude Code / claude.ai
login — Anthropic does not permit that for third-party SDK apps, so the PoC bills against
an API key issued from the Console. Set a spend cap on it.

## Scripts

| Command | Plan item | Needs API key | What it does |
|---|---|---|---|
| `npm run workspace` | 1-4 | no | Provisions the session `cwd`: active-profile pointer + L1 PreToolUse hooks |
| `npm run smoke:plugin` | 1-2 / 1-3 | no* | Reports what actually loaded (skills, agents, MCP servers) from the `init` message |
| `npm run smoke:hook` | 1-5 | **yes** | Induces a blocklisted row extraction and checks the guardrail fires |
| `npm run typecheck` | — | no | `tsc --noEmit` against the real SDK types |

\* `smoke:plugin` exits at the `init` message, before any model call, so it costs
approximately nothing — but the CLI may still require a key to start.

## Two findings that shape the design

**1. The blocklist guardrail does not travel with the plugin.**

`block-forbidden-tables.mjs` and `tier-readonly-guard.mjs` are **not** declared in the
plugin's `hooks/hooks.json`. They are installed per-project into `.claude/settings.json`
by `scripts/install-hooks.mjs`. So loading the plugin via `plugins: [{type:"local"}]`
alone yields a session with **no row-extraction guardrail** — exactly Risk #2 in the plan.

`provision-workspace.ts` therefore writes those two hooks into the session cwd's
`.claude/settings.json`, and every `query()` passes `settingSources: ["project"]` so they
load. `smoke:hook` verifies this end to end, reporting REGISTERED and DENIED separately
because they fail independently.

**2. `canUseTool` must allow everything in the hook test.**

If the permission layer denied the probe, the test would pass even with the hook missing.
So `smoke:hook` allows every tool, which makes any block provably hook-sourced.

## Verified against SDK 0.3.223

Field names below were checked against `node_modules/@anthropic-ai/claude-agent-sdk/sdk.d.ts`,
not assumed:

- `plugins: [{ type: "local", path }]` — also accepts `skipMcpDiscovery`
- `cwd`, `model`, `maxTurns`, `resume`, `forkSession`, `includePartialMessages`
- `settingSources: ('user'|'project'|'local')[]` — defaults to **all** when omitted
- `canUseTool(toolName, input, { signal, suggestions })` → `{behavior:"allow", updatedInput}` \| `{behavior:"deny", message}`
- `system`/`init` carries `skills: string[]`, `plugins[]`, `mcp_servers[]`, `agents?`, `apiKeySource`
- `system`/`hook_response` carries `hook_name`, `hook_event`, `stdout`, `outcome` — the signal used to prove a hook ran

## Not yet done

Phase 2 (Fastify + SSE backend), Phase 3 (React frontend), Phase 4 (scenario E2E).
Known PoC limitations — no auth, no multi-user isolation, single shared SAP profile,
no `team` skill (the SDK has no agent teams) — are tracked in the plan's Phase 5.
