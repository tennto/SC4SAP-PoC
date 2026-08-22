# Standalone TUI

For users who want to edit `sap.env` **without blocking the Claude Code session**, a zero-dependency terminal editor is bundled:

```bash
# In a separate terminal window / tab:
node <PLUGIN_ROOT>/scripts/sap-option-tui.mjs            # defaults to ./.sc4sap/sap.env
node <PLUGIN_ROOT>/scripts/sap-option-tui.mjs --file /path/to/sap.env
```

- Menu-loop UI (no `/plugin`-style overlay; CC's TUI modal API isn't public).
- Preserves comments, ordering, and unmanaged keys on save.
- Atomic write with automatic `.bak` backup.
- Masks `SAP_PASSWORD` / `XSUAA_CLIENT_SECRET` both on display and on input.
- Validates per `<Validation>` in SKILL.md; `off` blocklist requires typing `I UNDERSTAND`.

Remind the user to reconnect MCP (`/mcp`) in the Claude Code session after saving — env changes are not hot-reloaded.
