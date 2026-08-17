# SC4SAP Web PoC

Runs the [sc4sap](../Poc%20Web) Claude Code plugin headlessly via the **Claude Agent SDK**, as the backend for a browser UI. Execution plan lives in the plugin repo's `README.md`.

Current state: **Phase 2 complete, Phase 3 started.** All six Phase 2 items (2-1 Fastify
surface, 2-2 session registry, 2-3 token-level streaming relay, 2-4 approval queue, 2-5
read-only tool policy, 2-6 scripted E2E) are done, with `npm run e2e` asserting the lot
against a live server and a real SAP system. Items 3-1 … 3-4 add the Next.js frontend
shell, the streaming transcript, the approval modal and markdown rendering.

## Setup

```bash
npm install
npm run web:install       # frontend deps (separate package under web/)
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
| `npm run e2e` | 2-6 | **yes** | Drives a running server over HTTP+SSE and asserts 8 scenarios |
| `npm run web` | 3-1 | — | Next.js dev server on `127.0.0.1:3000`, proxying to the backend |
| `npm run web:install` | 3-1 | no | Installs `web/`'s own dependency tree |
| `npm run web:build` | 3-1 | no | Production build of the frontend (`next build`) |
| `npm run typecheck` | — | no | `tsc --noEmit` over the server **and** `web/` |

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
| `GET` | `/sessions/:id/permissions` | Approvals currently blocking the turn |
| `POST` | `/sessions/:id/permissions/:reqId` | Settle one (`409` if already settled) |

### SSE event vocabulary (2-3)

`includePartialMessages: true` produces raw Anthropic `stream_event`s; the manager
translates them into a small vocabulary rather than forwarding them verbatim. Each SSE
frame carries `id: <seq>`, `event: <type>` and the event as JSON.

| Event | In replay buffer | Purpose |
|---|---|---|
| `message` | yes | A complete SDK message. **Authoritative** — a client can render from these alone |
| `status` | yes | `starting` / `idle` / `busy` / `closed` / `error` |
| `tool_start` / `tool_end` | yes | Carries `toolUseId` + `name`; drives the "Running GetProgram…" chip |
| `text_delta` / `thinking_delta` | **no** | Token-level typing effect |
| `turn_start` / `turn_end` | **no** | Turn boundaries |

**Deltas are ephemeral on purpose.** Live subscribers get them, but they never enter the
replay buffer: a reconnecting client rebuilds finished turns from the complete `message`
events, and buffering every token would evict those within seconds. Ephemeral events still
consume a sequence number, so `Last-Event-ID` stays monotonic — replay simply skips them.
`input_json_delta` is dropped outright; partial tool arguments are not renderable and the
complete input arrives on the assistant message.

**The prompt is echoed onto the stream as a synthetic `user` message** when a turn is
queued (added for 3-2). The SDK does not emit one, so without it the replay buffer holds
answers with no questions and a reconnecting client rebuilds half a conversation. Tool
results also arrive as `user` messages — a client tells them apart by their `tool_result`
content blocks.

**One live `query()` per session, in streaming input mode** — the prompt is an
AsyncIterable the manager pushes into, not a fresh `query()` per message. Control requests
(`interrupt`, `setPermissionMode`, `mcpServerStatus`) are streaming-input-only, and the
plugin plus its MCP servers stay warm between turns. `resume` is wired for reattachment
(server restart, reconnect) rather than as the per-turn mechanism.

### Approval queue (2-4)

Every tool call parks in `canUseTool` until a human answers. The request goes out as a
`permission_request` SSE event carrying `reqId`, `toolName`, `toolUseId`, the input, and
the bridge-rendered `title` / `displayName` / `description`; the client settles it with
`POST /sessions/:id/permissions/:reqId`. A `permission_resolved` event then tells every
other subscriber what happened. Unanswered requests are **denied after 5 minutes**
(`SC4SAP_PERMISSION_TIMEOUT_MS` overrides, mainly so the timeout path is testable) — a
closed browser tab must not wedge the session forever. Timeout, abort and an explicit
response all race through one idempotent settle, so a request resolves exactly once, and
closing a session releases anything still pending.

**`AskUserQuestion` rides the same channel** as `kind: "question"`, forwarding
`questions[]` as-is. Answering is not merely "allow": `AskUserQuestionInput.answers` is
declared as *"User answers collected by the permission component"*, so the manager merges
`{answers, annotations}` into `updatedInput` and the tool echoes them back to the model.

**The blocklist hook fires before `canUseTool`, and the approval UI cannot override it.**
Verified: a `GetTableContents(BNKA)` attempt under an allow-everything client produced
**no `permission_request` at all** — the L1 hook denied it at PreToolUse and the human was
never asked. Guardrail first, approval second.

Note `ToolSearch` runs without consulting `canUseTool`, so it is not a complete chokepoint
— which is why the read-only guard below is enforced by a different mechanism.

### Read-only tool policy (2-5)

**The plan's wording for this item is based on a wrong premise.** It says `allowedTools`
should "permit only Get/Search tools", but the SDK documents that field as *"tool names
that are auto-allowed without prompting"* — a convenience list, not a restriction. Using
it that way would auto-approve reads and block nothing. The field that restricts is
`disallowedTools`: *"removed from the model's context and cannot be used"*. Verified —
with a write tool disallowed the model answers `NOT_AVAILABLE` and `canUseTool` is never
reached. Wildcards work.

So the intent is implemented as two halves that fail in opposite directions:

| Half | Source | On failure |
|---|---|---|
| `disallowedTools` — write-class SAP tools | **static** patterns | unchanged; a lookup failure cannot widen it |
| `allowedTools` — read-class, auto-approved | **discovered** at startup | empty → everything prompts |

Discovery runs one throwaway session at boot and reads the live tool list from
`mcpServerStatus()` (174 tools on the current system → 81 write, 81 read, 2 row-extraction,
10 other). Read tools are auto-allowed **by exact name, not by a `Get*` wildcard**, because
`GetTableContents` and `GetSqlQuery` share that prefix and must never be auto-approved.
`/health` reports the resulting policy.

Verified: `CreateClass` → `NOT_AVAILABLE` with no approval request; `GetProgram` → ran and
returned source with **no prompt at all** even under a deny-everything client;
`GetTableContents(T100)` → still raised an approval request, and denying it pulled nothing.

> **Found while writing this — open issue in the plugin repo, not here.** The plugin's
> `tier-readonly-guard.mjs` matches
> `(Create|Update|Delete|RunUnitTest|RuntimeRunProgramWithProfiling|RuntimeRunClassWithProfiling)`,
> missing `ActivateObjects`, `PatchGuiStatus`, `WriteTextElementsBulk` and
> `RuntimeCreateProfilerTraceParameters` — all SAP mutations, enumerated against the live
> server's 174 tools. Closing it needs **two** changes there: the hook's own classification
> *and* the matcher in `install-hooks.mjs`, since a tool outside the matcher never invokes
> the hook at all.
>
> This PoC does not patch the plugin. The four are covered by `WRITE_CLASS_PATTERNS` above,
> which is strictly stronger here: removed from context on **every** tier, where the hook
> would only have blocked them on QA/PRD.

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

## Backend E2E (2-6)

`npm run e2e` (server must already be running) drives the HTTP + SSE contract with no SDK
import, so a pass means the *interface* works rather than some in-process shortcut. Every
scenario is read-only or denied — write tools are absent from context under the 2-5 policy,
and the one row-extraction case is answered "deny" deliberately.

1. plain turn streams an answer · 2. multi-turn keeps context · 3. read tool auto-allowed
with no prompt · 4. write tool absent from context · 5. row extraction prompts and deny
blocks it · 6. blocklist hook outranks a human allow · 7. `AskUserQuestion` round-trips an
answer · 8. delete evicts the session

The driver keeps a per-session replay cursor and sends it as `Last-Event-ID`. Without it a
second turn re-reads the first turn's history and stops at *its* `result` — the turn looks
finished before it starts, and the previous answer gets mistaken for the new one. That bug
bit during development and is the reason the cursor exists.

## Frontend shell (3-1)

`web/` is a **Next.js 16 App Router** app and its own npm package (separate
`package.json`, `tsconfig.json`, `node_modules`), so React never enters the server's
dependency tree and the Agent SDK never enters the browser's. Run the backend and
`npm run web` side by side, then open `http://127.0.0.1:3000`.

**The Fastify backend stays where it is.** Moving the session registry into Next was
considered and rejected: one live `query()` per session is long-lived process state, and a
dev-server hot reload would kill every SDK session and every warm MCP connection — plus
`npm run e2e` would lose the HTTP contract it asserts. Next is the frontend and the public
edge; Fastify remains the agent host.

**Server-rendered, and the browser never learns the backend's address.** `src/app/page.tsx`
is a Server Component that fetches `/sessions` and `/health` from the backend directly, so
the first paint already carries real session state instead of an empty shell that fills in
after hydration. Everything interactive lives under `<Chat>`, a client component hydrated
from those props.

**Same-origin proxy, no CORS layer.** The backend binds to `127.0.0.1` and serves no CORS
headers; the browser only ever calls `/api/*`, which `src/app/api/[...path]/route.ts`
forwards. That is a Route Handler rather than a `next.config` rewrite because one of the
proxied routes is the SSE stream: the handler pipes the upstream body through untouched,
drops `content-length` / `content-encoding`, sets `no-transform` and `x-accel-buffering:
no`, forwards `Last-Event-ID` for replay, and passes `request.signal` upstream so a closed
tab tears the subscription down instead of leaving the backend writing into a dead socket.

Verified rather than assumed — a 12-line answer requested through the proxy arrived as
`text_delta` events **0.6 s apart**, so nothing between the model and the browser buffers
the turn.

What 3-1 covers: session lifecycle (create / list / select / close), status–turns–cost per
session, the `/health` policy summary in the header, and sending a turn. Selection is kept
in `localStorage`, read after mount so it cannot cause a hydration mismatch.

Wire types are **re-declared** in `web/src/lib/types.ts` rather than imported from
`src/server/session-manager.ts`, because that module pulls in the Agent SDK. Only the JSON
that actually crosses the wire is modelled; keep the two in step by hand.

The visual style is claymorphism on ivory, with `#383838` as the single accent — soft
raised surfaces on a warm ground, where selected and pressed states invert the shadow
insets instead of introducing a second colour. `next/font/google` is deliberately unused so
the build needs no network.

Verified through the proxy against a live backend: `POST /sessions` → `201`, the new
session appears in the **server-rendered HTML** (curl, no JS), `POST /messages` → `202`
with the status flipping to `busy`, the stream delivering token deltas, `DELETE` → `204`.

## Streaming render (3-2)

`useSessionStream` subscribes to `/api/sessions/:id/stream` and folds the events into a
transcript. The transcript is **not** component state: a reload, a second tab and a
reconnect all rebuild the same conversation from the backend's replay buffer instead of
from anything the client remembered.

`EventSource` rather than a hand-rolled fetch reader, because the browser sends
`Last-Event-ID` by itself on reconnect — which is exactly the replay contract the backend
implements. A fresh subscription replays the session from the start; a reconnect resumes
where it stopped, so nothing is rendered twice.

**Deltas and complete messages overlap on purpose.** `text_delta` opens a bubble and
appends to it for the typing effect; when the complete assistant `message` lands it
**replaces** that bubble's text rather than appending, so a viewer who watched the tokens
and a viewer who arrived mid-turn end up with byte-identical transcripts. Since deltas are
never in the replay buffer, a reconnecting client simply builds the same bubbles from the
messages alone.

`tool_start` opens a "Running GetProgram…" chip keyed by `toolUseId`; `tool_end` carries
only a content-block index, so the hook keeps an index → id map to close the right one.
Tool names are shown unqualified — `mcp__plugin_sc4sap_sap__GetProgram` reads as
`GetProgram`. `thinking_delta` renders as a sunken, muted bubble.

The 2-second status poll from 3-1 is **gone**: the active session's status comes off its
stream, and the session *list* refreshes on a slow 10-second timer plus once on every
return to `idle`, which is when turns and cost actually change.

`permission_request` / `permission_resolved` are already tracked into `stream.pending` —
3-3 only has to render it.

This is also where the backend gained the synthetic user echo described above: without it
the transcript rebuilt after a refresh was all answers and no questions.

Verified against a live backend: the prompt appears on the stream as a `user` message, the
answer arrives as `text_delta`s and then as a complete assistant `message`, and a **fresh
subscription replays both halves** with no deltas. `npm run e2e` still passes all 8
scenarios / 19 checks after the session-manager change.

## Approval modal (3-3)

`permission_request` raises a modal over the chat; `permission_resolved` is what closes it.
The dialog does not close itself on click — the backend deciding the request is settled is
what makes it settled, which also means a second tab watching the same session sees the
same dialog disappear.

Two shapes ride that one channel and they are **not** the same decision:

| `kind` | What the model is asking | UI |
|---|---|---|
| `tool` | permission to *act* | the exact input, pretty-printed, plus Allow / Deny |
| `question` | the user to *choose* (`AskUserQuestion`) | one option button per choice, plus an "Other…" free-text field; multi-select questions keep several |

There is nothing to deny on a question: the answer *is* the payload, sent as
`{behavior: "allow", answers}` and echoed back to the model through `updatedInput`.
Requests are answered oldest-first, one at a time, and the dialog is remounted per `reqId`
so a queued second approval never inherits the first one's selections.

**Allowing here cannot override the guardrail.** The L1 blocklist hook runs at PreToolUse,
before `canUseTool`, so a forbidden row extraction is denied without ever raising a request
— there is no dialog to click. This modal only ever grants what the guardrail already
permitted.

Verified through the proxy against a live backend: a `GetTableContents(T100, 3 rows)`
attempt raised a `tool` request carrying its input, `POST …/permissions/:reqId` with
`deny` returned `200`, a `permission_resolved: deny` followed, and the model's answer
reported the call as denied with nothing extracted.

## Markdown rendering (3-4)

Assistant text renders through `react-markdown` + `remark-gfm`. Consultant answers are
mostly tables (config keys, DDIC tables and their fields) and ABAP code blocks, which are
unreadable as preformatted plain text.

- **Raw HTML stays off.** `react-markdown` ignores embedded HTML unless `rehype-raw` is
  added, and model output is untrusted text landing in the DOM. Links are forced to
  `target="_blank" rel="noopener noreferrer"`.
- **Wide tables scroll inside the bubble** rather than stretching it, and code blocks scroll
  horizontally instead of wrapping ABAP mid-statement.
- **The user's own prompt is not rendered as markdown** — it is shown exactly as typed,
  because silently eating characters someone meant literally is worse than a plain bubble.
- Markdown is rendered *while streaming*, so a half-written table spends a moment as plain
  paragraphs before it snaps into a grid. That is the trade for not making the reader wait
  for the turn to end.

## Not yet done

Phase 3 item 3-5 (browser QA), Phase 4 (scenario E2E).

The 3-2 and 3-3 *rendering* has only been exercised through the event contract it consumes,
not in a browser driven by a test — browser QA is plan item 3-5. One bug of exactly that
kind has already been caught by hand: `next dev` blocks its own chunks for a `127.0.0.1`
browser, so the page server-rendered and never hydrated while curl saw everything working
(fixed with `allowedDevOrigins`).

Known gap in the read-only story: local write tools (`Write`, `Edit`, `Bash`) are **not**
restricted, because skills legitimately write artifacts under `.sc4sap/` and the plan
permits skill runs. `Bash` in particular could reach SAP outside the MCP layer. Worth
closing before this is exposed beyond localhost.

Known PoC limitations — no auth, no multi-user isolation, single shared SAP profile,
no `team` skill (the SDK has no agent teams) — are tracked in the plan's Phase 5.
