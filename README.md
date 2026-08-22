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
npm run web:install               # frontend deps (separate package under web/)
cp .env.example .env              # then fill in ANTHROPIC_API_KEY
cp web/.env.example web/.env.local  # then fill in MONGODB_URI
npm run workspace                 # provision the session cwd (no API key needed)
```

`ANTHROPIC_API_KEY` is required. The Agent SDK **cannot** reuse a Claude Code / claude.ai
login — Anthropic does not permit that for third-party SDK apps, so the PoC bills against
an API key issued from the Console. Set a spend cap on it.

`MONGODB_URI` is required by the frontend, and only by the frontend — the backend does not
know that users exist. Any MongoDB will do; an Atlas free tier needs no local install. The
`users` and `sessions` collections and their indexes are created on first use.

## Scripts

| Command | Plan item | Needs API key | What it does |
|---|---|---|---|
| `npm run workspace` | 1-4 | no | Provisions the session `cwd`: active-profile pointer + L1 PreToolUse hooks |
| `npm run smoke:plugin` | 1-2 / 1-3 | no* | Reports what actually loaded (skills, agents, MCP servers) from the `init` message |
| `npm run smoke:hook` | 1-5 | **yes** | Induces a blocklisted row extraction and checks the guardrail fires |
| `npm run server` | 2-1 / 2-2 | **yes** | Backend API on `127.0.0.1:3001` (`PORT` / `HOST` override) |
| `npm run e2e` | 2-6 | **yes** | Drives a running server over HTTP+SSE and asserts 8 scenarios |
| `npm run web` | 3-1 / 5-5 | — | Next.js dev server on `127.0.0.1:3000`, proxying to the backend. Needs `MONGODB_URI` for anything behind sign-in |
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

## Authentication (5-5)

Accounts live entirely in the Next.js layer. The Fastify backend was not touched: it has no
user model, and reaching it from a browser means going through `/api/*`, which is guarded.

**Store.** MongoDB, two collections. `users` carries the name, the address twice
(lower-cased for lookup, as-typed for display) and a password hash; a unique index on the
lower-cased address is what actually prevents two sign-ups racing on the same email, since
the "already registered" check above it is a read before a write. `sessions` carries the
SHA-256 of a token and an `expiresAt` with a TTL index, so expiry is enforced by the
database rather than trusted to every reader.

**Passwords** are hashed with Node's own `scrypt` — bcrypt and argon2 are native modules,
which means a compile step on every install and the usual place a Windows checkout falls
over. The stored string carries its own cost parameters, so raising them later does not
invalidate existing rows.

**Sessions** are a random 256-bit token in an httpOnly, `SameSite=Lax` cookie, resolved
against a row. Database-backed rather than a signed JWT, because sign-out has to actually
end the session — a stateless token stays valid until it expires no matter what the server
thinks. Only the hash is stored, so a database dump hands over no usable cookies.

**Endpoints.** `POST /api/auth/signup` (201, signs the new account in), `POST
/api/auth/signin`, `POST /api/auth/signout` (204 either way), `GET /api/auth/me`, plus the
two reset endpoints below. These sit above `app/api/[...path]/route.ts` in the routing
table — a concrete segment beats a catch-all — so they are served by Next and never reach
the backend.

Sign-in answers with one sentence for every failure and no field attribution, and spends a
scrypt derivation even on an unknown address, so the form cannot be used to enumerate who
has an account. Sign-up is the one place that cannot hide it, and says so plainly.

**The guard is in two halves.** `web/src/proxy.ts` (Next 16's rename of `middleware.ts`)
runs before every request and checks only whether a session cookie is *present* — no
database round trip, on a file Next documents as something that may run outside the app's
own runtime. `requireAccount()` then does the authoritative lookup inside each protected
Server Component, before it renders anything. Anonymous traffic never reaches a page; a
stale or forged cookie gets past the first half and is stopped by the second.

Public routes are `/signin`, `/signup`, `/terms`, `/privacy` and `/api/auth/*`. Everything
else, including the backend forwarder at `/api/*`, needs a session — an unauthenticated API
call gets a 401 rather than a redirect to HTML that would surface at the call site as a
JSON parse error.

One consequence worth knowing: the root layout reads the session so the rail can show who
is signed in, which makes every route in the app dynamic. `generateStaticParams` came out
of the skill page for that reason.

### Google sign-in

OAuth 2.0 Authorization Code with PKCE, written out in `lib/auth/google.ts` rather than
delegated to Auth.js. That is not NIH: the app already has sessions, a route guard, a
password reset and per-user state built on its own session layer, and Auth.js would replace
that layer and take all four with it. What is actually wanted from Google is a verified
email address, and the flow that produces one ends by calling the same `startSession` the
password form does.

`GET /api/auth/google` plants three one-shot httpOnly cookies and redirects;
`GET /api/auth/google/callback` spends them. Each answers a different attack:

- **`state`** — the callback is a GET that somebody else can point a browser at. Without it
  an attacker hands you *their* authorization code and your browser signs in as them.
- **`code_verifier`** (PKCE) — an intercepted authorization code is useless without it.
- **`nonce`** — binds the returned ID token to the request that started the flow, so a token
  minted elsewhere cannot be replayed into this one.

All three are `SameSite=Lax`, not `Strict`: the callback arrives as a top-level navigation
from `accounts.google.com`, and `Strict` would withhold the cookies from exactly the request
that needs them. They are deleted on the way in whatever the outcome, so a failed attempt
cannot be retried with the same secrets.

The ID token's signature is deliberately not verified. It arrives on the response to a
request this server made directly to Google over TLS, authenticated with the client secret —
there is no intermediary who could have substituted it, which is the case Google's own
documentation exempts. `iss`, `aud`, `exp` and `nonce` **are** checked, because those say
what the token is for.

**Account resolution** runs in three steps: a row already carrying this Google `sub`; then a
row with this address, which gets linked; then a new account. Matching on `sub` before
address is deliberate — an address can be changed or reassigned on Google's side and `sub`
cannot. Linking on address is safe only because `email_verified` is required: that is the
same proof of mailbox control the password reset relies on, and an unverified address is
refused outright. `users.google.sub` carries a sparse unique index, so one Google account
cannot come to own two rows.

A Google-created account has no `passwordHash` at all — absent, not a placeholder. Password
sign-in for it fails with the same sentence every other failed sign-in gets, and spends the
same scrypt derivation doing it, so the form does not become a way to ask which accounts
sign in which way. Such an account gains a password by going through the reset flow, after
which both routes work.

The reserved-account rule applies here too, or Google would simply be the way around it.

Everything that can fail redirects to `/signin?error=<code>`, which the form turns back into
a sentence via `lib/auth/google-errors.ts` — the callback is reached by a browser navigation,
so what it returns has to be a page. **With no `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`
the button explains it is not configured** and the rest of the app is unaffected.

Google exempts `http://localhost` from its HTTPS rule for redirect URIs, so this needs no
deployment to develop against. The registered URI must match what the callback builds from
the request origin character for character — reaching the app over `127.0.0.1` produces a
different string and would need its own entry.

### Favourite skills

Starred skills are per-user and persistent: `favorites`, an array of slugs on the user's
row. An array rather than a collection of its own — it is a short list, only ever read
whole, and only ever alongside the user it belongs to. Rows written before the field existed
have no field at all, and every reader treats that as an empty list, so there is no
migration.

The root layout has already read the session, so it hands the list straight to
`FavoritesProvider`. The first paint is therefore already correct — no fetch on mount, and
no moment where every star is hollow before the real answer lands.

`POST /api/favorites` takes one slug and a boolean, not the whole array, and applies it with
`$addToSet` / `$pull`. Two tabs starring different skills at the same moment both land, where
writing the array back whole would let the slower request undo the faster one. `$addToSet`
appends, so the list stays in the order things were starred. The slug is checked against the
catalog rather than merely for being a string — it is going into the user's row, and an
unbounded value would make that row somewhere to park arbitrary text.

The response carries the list as the database now holds it and the client adopts it, so an
optimistic guess that was wrong is corrected by the same round trip. A request that fails
puts the star back: one that stays lit while nothing was saved is a worse lie than one that
visibly pops back.

### Reserved accounts

`lib/reserved-accounts.ts` refuses sign-ups that would read as official — `admin@…`,
`superuser@…`, a display name of "Administrator". This is not a security control: a real
operations account would be created by an operator, not through the form. It is that the
rail shows the account's name beside every session, and a name that looks official is
something a person can lean on in a conversation with a colleague.

Two lists, because one match rule cannot serve both halves:

- **Anywhere in the local part** — long, specific terms where an accidental collision is
  very unlikely: `admin`, `superuser`, `postmaster`, `webmaster`, `moderator`, `noreply`,
  `helpdesk`, and the product's own `sc4sap` / `superclaude`. `admin` alone therefore also
  catches `sysadmin`, `admin-prod` and `kim.admin.ops`.
- **The whole local part only**, optionally with trailing digits — ordinary words where a
  substring match would reject real people: `root`, `dev`, `ops`, `support`, `master`. So
  `root`, `root2` and `r_o_o_t` are refused while `rootes` and `grootveld` are not.

The address is normalized first — lower-cased, `+tag` dropped, every non-alphanumeric
character removed — so padding a reserved word with dots, dashes or underscores does not
walk past the list.

Names are held to the exact rule only, never the substring one. Telling somebody their
surname is reserved is a worse outcome than the display-name impersonation it would prevent.

The rule runs in the form and in the endpoint, from the same module, so the two cannot
drift. The endpoint is the one that decides; the form's copy only saves a round trip.

### Password reset

`POST /api/auth/forgot` issues a six-digit code and mails it; `POST /api/auth/reset` spends
it. Both live behind one screen, `/forgot`, because a code has no link to click and the
person is still in front of the form when they go and read it.

A code rather than a link, because a link needs a host to point at and this app is
localhost. Six digits is a million-wide space, which is small enough that the guessing
defences are the substance of `lib/auth/reset.ts` rather than a footnote:

- the code comes from `crypto.randomInt` — CSPRNG-backed and unbiased, not `Math.random()`
  scaled into range;
- only a scrypt hash of it is stored, so ~100ms is imposed per guess, online and offline;
- five wrong guesses burn it, and the burnt row is **kept until it expires** rather than
  deleted — the reissue cooldown works by finding a live row for that address, so deleting
  it would hand out a fresh code immediately and make the five-guess ceiling meaningless;
- a new code cannot be issued more than once a minute per address;
- the code lives ten minutes, and the reset demands the address alongside it, so the odds
  stay at five-in-10^6 rather than five against every account at once.

`/api/auth/forgot` answers 200 for any well-formed address — registered or not, throttled
or not, delivered or not. It is the one endpoint where enumerating accounts would be
trivially scriptable, and none of those outcomes gives the caller anything to do
differently.

A completed reset revokes **every** session that user had, this browser included, and hands
back no new one. Someone resetting a password often believes another party has it, and a
reset that leaves that party signed in does not answer the problem; signing in with the new
password is also the proof they know it.

**Mail** goes through Resend's REST API (`lib/mail.ts`), via plain `fetch` rather than the
SDK — the whole surface needed here is one POST with a bearer token. **With no
`RESEND_API_KEY` the message is written to the `next dev` log instead of being sent**, which
is what makes the flow work on a fresh checkout with no mail account. That is a development
affordance and the log says so in as many words.

`lib/mail.ts` is transport; what the message says and looks like is `lib/mail-templates.ts`.
Both a plain-text and an HTML part are sent — some clients show only the former, and an
HTML-only message also scores worse with spam filters.

Email HTML is not web HTML and none of `globals.css` reaches it: no external stylesheet is
fetched, `<style>` blocks are stripped by some clients, flexbox and grid are unreliable, and
Outlook renders through Word. So the template is tables, every style inline, `bgcolor`
attributes alongside the CSS, a system font stack, and the app's translucent ink tokens
flattened to the opaque values they resolve to on white.

Two decisions in there are worth keeping:

- **The mark sits on a dark band**, and is the white cut of the logo. Clients that force
  dark mode recolour CSS but never the pixels of an image, so a black transparent logo on a
  white panel disappears the moment that panel is darkened for the reader. A band that is
  already dark is left alone.
- **The logo travels with the message** as an inline CID attachment (Resend's `content_id`),
  not as a hosted URL. There is nowhere to host it — the app is on localhost, and nothing in
  an inbox can reach that. The code itself is selectable text and never an image: an image
  cannot be copied, and images are blocked by default in much of the world.

If the logo file cannot be read the message still goes out, with a wordmark in its place.

Resend's shared sender (`onboarding@resend.dev`, the default) needs no domain verification
but **only delivers to the address that owns the Resend account**, and rejects reserved test
domains such as `example.com` outright. Reaching anyone else means verifying a domain and
pointing `RESEND_FROM` at it.

**Not done here.** Google sign-in is still a dead button; there is no email verification, no
rate limit on sign-in attempts (only on reset codes), and no way to change a password from
inside the app while signed in.

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

Known PoC limitations — no multi-user isolation, single shared SAP profile, no `team`
skill (the SDK has no agent teams) — are tracked in the plan's Phase 5. Authentication is
now in (see below); what it does **not** yet do is separate one user's sessions, workspace
or SAP profile from another's. Every signed-in account still drives the same backend and
the same shared profile.
