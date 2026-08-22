# Wizard Step 4 — Profile Creation & SAP Connection

Referenced by [`wizard-steps.md`](wizard-steps.md). This file replaces the pre-0.6.0 single-file `.sc4sap/sap.env` flow with multi-profile-aware logic. The actual file writes are delegated to `scripts/sap-profile-cli.mjs`; this wizard only collects inputs and routes.

## 4.0 — Legacy detection (runs FIRST, before any question)

Call the CLI and branch on the output:

```bash
node "$CLAUDE_PLUGIN_ROOT/scripts/sap-profile-cli.mjs" detect-legacy
# → { needsMigration, legacyFiles, profileCount, hasActivePointer, activeAlias }
```

| Condition | Action |
|---|---|
| `needsMigration=true` | Route to **[`../sap-option/migration.md`](../sap-option/migration.md)** (alias + tier prompt → `sap-profile-cli.mjs migrate`). Per decision §4.3, migration also DELETES `<project>/.sc4sap/config.json` after moving engagement state (`activeTransport`, `namingConvention`) into the new profile's `config.json`. On success, return to Step 5. Do NOT run 4.1–4.9. |
| `needsMigration=false` AND `profileCount=0` | Fresh install. Run 4.1–4.9. |
| `needsMigration=false` AND `profileCount≥1` AND `hasActivePointer=true` | Ask via `AskUserQuestion`: "Profile `{activeAlias}` is already active. Create another profile, or keep using this one?" → create another ⇒ 4.1 (with 4.3 meta-copy offer) / keep ⇒ skip to Step 5. |
| `needsMigration=false` AND `profileCount≥1` AND `hasActivePointer=false` | List profiles via `sap-profile-cli.mjs list`. Offer `switch <alias>` or `create another`. |

## 4.1 — alias

Free text. Validate `^[A-Z0-9_-]+$`. Reject `default` (see design §6). Must not exist in `~/.sc4sap/profiles/`. Suggest convention `{ISO-COUNTRY}-{TIER}` (`KR-DEV`, `US-PRD`) — ISO alpha-2 country per feedback memory, never company initials.

## 4.2 — tier

Enum via `AskUserQuestion`: `DEV` | `QA` | `PRD`. Remind the user:

- `DEV` → write-enabled, Step 9 (ABAP utilities) WILL install.
- `QA` → read + unit tests only; Step 9 will REFUSE install and print CTS import guidance.
- `PRD` → strict read-only; Step 9 refuses; mutations blocked by both L1 hook and L2 MCP guard.

Tier is immutable once set (changing tier = remove + add).

## 4.3 — Same-company meta-copy (conditional acceleration, NOT default)

If the chosen alias shares a `-`-segmented prefix with any existing profile (e.g., adding `KR-QA` while `KR-DEV` exists), offer to copy these fields from the sibling:

```
SAP_INDUSTRY, SAP_ACTIVE_MODULES, SAP_LANGUAGE, SAP_VERSION,
ABAP_RELEASE, SAP_SYSTEM_TYPE, MCP_BLOCKLIST_PROFILE, namingConvention (config.json)
```

Connection fields (host/client/user/password) are ALWAYS entered fresh. Default: **ask explicitly** (`yes, copy` / `no, enter fresh`). Do NOT auto-apply. Rationale: sharing a prefix is a naming convention, not a guarantee of system identity — the KR-DEV system may be S/4HANA while KR-PRD is still ECC during a migration window. When the user declines the copy, fall through to §4.4b which re-collects the three identity fields (SAP_VERSION / ABAP_RELEASE / SAP_INDUSTRY) fresh.

## 4.4 — Connection fields (ask one at a time, per SKILL.md interaction rule)

| Field | Validation | Notes |
|---|---|---|
| `SAP_URL` | `^https?://[^ ]+$`, no trailing `/` | Same host for the tier |
| `SAP_CLIENT` | Exactly 3 digits | |
| `SAP_AUTH_TYPE` | `basic` \| `xsuaa` | If `xsuaa` → also collect `XSUAA_URL / XSUAA_CLIENT_ID / XSUAA_CLIENT_SECRET / XSUAA_TOKEN_URL` |
| `SAP_USERNAME` | Non-empty | |
| `SAP_PASSWORD` | Non-empty; NEVER echo | Captured in memory only; piped into CLI via stdin JSON |
| `SAP_LANGUAGE` | 2-letter uppercase, default `EN` | |
| `SAP_SYSTEM_TYPE` | `onprem` \| `cloud` \| `legacy` | |

Go to §4.4b for the identity fields (`SAP_VERSION`, `ABAP_RELEASE`, `SAP_INDUSTRY`). Do NOT silently inherit from Step 2.

## 4.4b — Identity fields (per-profile, NEVER silently inherited)

`SAP_VERSION`, `ABAP_RELEASE`, `SAP_INDUSTRY` are **identity fields** — they drive version-specific table selection, ABAP syntax availability, and industry-aware consultant behavior. **Silent inheritance from Step 2 is a bug class**: a common failure mode is "wizard session refreshes profile A (S/4HANA) at Step 2, then creates profile B (ECC) at Step 4 with A's S4/816/tire values baked into B's config.json — persistent cross-profile corruption".

Rules:

1. **Meta-copy accepted at §4.3** → inherit from sibling profile's `sap.env`. Done.
2. **Meta-copy declined at §4.3, OR no sibling exists** → ask the user fresh for this profile, using the same three sub-questions as Step 2 (`wizard-step-02-system-identification.md` §2a/2b/2c). Do NOT reuse values already collected at Step 2 for the active/first profile — those do not apply.
3. **Refreshing an existing profile** (not creating a new one) → Step 2 values apply to that profile; no per-profile re-ask is needed here.

The CLI enforces a deterministic guardrail: `sap-profile-cli.mjs add` **rejects** payloads where `version`, `abapRelease`, or `industry` are missing AND no `copyFrom` is given (exit 2). This catches any wizard misroute at write-time, regardless of which LLM executes the skill.

## 4.5 — Optional `SAP_DESCRIPTION`

Free-form short label, stored in `sap.env`. Used by HUD + `sap-option list`. Example: `"Korea Development — tire"`.

## 4.6 — Write profile via CLI

Compose the JSON payload and pipe it on stdin:

```bash
echo '{"alias":"KR-DEV","tier":"DEV","host":"http://crown.sapvista.com:50000","client":"100","username":"SV5_000030","password":"<captured>","language":"EN","systemType":"onprem","version":"S4","abapRelease":"816","industry":"other","activeModules":"MM,SD,FI,CO,PP","description":"...","copyFrom":"KR-DEV"}' \
  | node "$CLAUDE_PLUGIN_ROOT/scripts/sap-profile-cli.mjs" add
```

Expected JSON: `{ ok, alias, tier, profileDir, passwordStored: "keychain"|"plaintext-fallback"|"none" }`.

- `passwordStored: "plaintext-fallback"` → warn user explicitly (OS keychain unavailable; password sits plaintext in profile env; re-run once `@napi-rs/keyring` is installable).

## 4.7 — Write active-profile pointer

```bash
printf '%s' "$alias" > "$PWD/.sc4sap/active-profile.txt"
```

No config.json is written in the project folder (decision §4.3 — legacy files are deleted by migration, fresh installs never create one).

## 4.8 — Blocklist env (L4, MCP-server side)

Already embedded by the CLI when `add` composes `sap.env`. These keys live in the profile env — they are **not** the L3 PreToolUse hook (Step 12):

```
MCP_BLOCKLIST_PROFILE=standard   # default
# MCP_BLOCKLIST_EXTEND=
# MCP_ALLOW_TABLE=
```

Do not prompt for these at first-time setup unless the user is explicitly tightening/loosening — `standard` is the safe default.

## 4.9 — Optional env flags

| Key | Purpose | Default |
|---|---|---|
| `SC4SAP_MCP_AUTOBUILD` | Auto-rebuild vendor MCP server after plugin version bump | `1` |
| `TLS_REJECT_UNAUTHORIZED` | Set to `0` for self-signed dev certs | unset |

Both are optional; include as commented examples in the generated profile env only when the user explicitly asks.

## Summary artifact

After 4.6–4.9 complete:

```
~/.sc4sap/profiles/<alias>/sap.env         ← profile env (secrets via keychain)
~/.sc4sap/profiles/<alias>/config.json     ← sapVersion, abapRelease, industry, activeModules, namingConvention
<project>/.sc4sap/active-profile.txt       ← alias
<project>/.sc4sap/config.json              ← DOES NOT EXIST (deleted by migration; never created on fresh install)
```

Continue to **Step 4bis — RFC backend selection** (`rfc-backend-selection.md`). All `SAP_RFC_*` keys that 4bis collects are written to `~/.sc4sap/profiles/<alias>/sap.env`, not the project folder.
