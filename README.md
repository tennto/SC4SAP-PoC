# SC4SAP Web PoC

Runs the [sc4sap](../Poc%20Web) Claude Code plugin headlessly via the **Claude Agent SDK**, as the backend for a browser UI. Execution plan lives in the plugin repo's `README.md`.

Current state: **Phase 2 (backend)** — Phase 1 gate passed; plan items 2-1 (Fastify HTTP
surface) and 2-2 (session registry) are done and verified end to end.

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
| `npm run server` | 2-1 / 2-2 | **yes** | Backend API on `127.0.0.1:3001` (`PORT` / `HOST` override) |
| `npm run typecheck` | — | no | `tsc --noEmit` against the real SDK types |

\* `smoke:plugin` exits at the `init` message, before any model call, so it costs
approximately nothing — but the CLI may still require a key to start.

## Backend API (Phase 2-1 / 2-2)

| Method | Path | Behaviour |
|---|---|---|
| `GET` | `/health` | Config snapshot + live session count |
| `POST` | `/sessions` | Create. Optional `{"resume": "<sdk session id>"}` reattaches a prior conversation |
| `GET` | `/sessions` | List |
| `GET` | `/sessions/:id` | One (404 after delete) |
| `DELETE` | `/sessions/:id` | Close and evict |
| `POST` | `/sessions/:id/messages` | `{"text": "…"}` → `202`; the answer arrives on the stream |
| `GET` | `/sessions/:id/stream` | SSE. Honours `Last-Event-ID` for replay |

**One live `query()` per session, in streaming input mode** — the prompt is an
AsyncIterable the manager pushes into, not a fresh `query()` per message. Control requests
(`interrupt`, `setPermissionMode`, `mcpServerStatus`) are streaming-input-only, and the
plugin plus its MCP servers stay warm between turns. `resume` is wired for reattachment
(server restart, reconnect) rather than as the per-turn mechanism.

**Tool calls are currently refused.** `canUseTool` denies everything with an explicit
"approval queue not implemented (2-4)" message. A PoC backend that silently auto-approves
SAP tool calls is the failure mode worth avoiding, so the placeholder fails closed. Plan
2-4 replaces it with an approval queue over SSE; 2-5 adds the `allowedTools` read-only
guard. Note `ToolSearch` was observed running without a `canUseTool` consult, so 2-5 must
not rely on `canUseTool` alone.

Verified end to end with curl: create → message → SSE, multi-turn continuity (turn 2 recalls
turn 1), `Last-Event-ID` replay, `resume` into a new session, tool refusal, turn/cost
accumulation, and 404 after delete.

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
- `system`/`hook_response` carries `hook_name`, `hook_event`, `stdout`, `outcome` — but **only when `includeHookEvents: true`** is passed; it defaults to `false`, and without it a hook that ran and denied is indistinguishable from a hook that never existed
- `hook_name` is `"<event>:<matcher>"`, **not** the script filename — attribution to a specific hook script has to come from its stdout
- `mcpServerStatus()` on the `Query` handle — MCP is often still `pending` in the `init` snapshot, so poll this instead of trusting init
- `num_turns` on `result` is **per-turn** in streaming-input mode, not cumulative

## Not yet done

Rest of Phase 2 — 2-3 (token-level `includePartialMessages` relay), 2-4 (approval queue +
`AskUserQuestion` over SSE), 2-5 (`allowedTools` read-only guard), 2-6 (scripted E2E).
Then Phase 3 (React frontend) and Phase 4 (scenario E2E).
Known PoC limitations — no auth, no multi-user isolation, single shared SAP profile,
no `team` skill (the SDK has no agent teams) — are tracked in the plan's Phase 5.
