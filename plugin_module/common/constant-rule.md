# Constant Rule

**Non-fieldcatalog hardcoded values MUST be declared as CONSTANTS** — no magic literals in logic.

## Applies To

- Status / type codes (e.g. `'A'`, `'X'`, `'I'`, `'EQ'`, document categories, status indicators)
- Screen numbers referenced in code (e.g. `'0100'`, `'0200'`)
- GUI Status / GUI Title names (e.g. `'STATUS_0100'`)
- Table / view names in dynamic access
- Function module names in dynamic calls
- Default values, thresholds, limits
- Exit codes, return values compared in IF / CASE

## Placement

- **Program-wide constants** → `{PROG}t` (TOP include), `CONSTANTS` block
- **Class-scoped constants** → `CONSTANTS` in `PUBLIC` / `PRIVATE SECTION` of the relevant LCL
- **Grouping**: use `BEGIN OF gc_status, ... END OF gc_status` style constant structures when values belong together

## Exceptions (Literals Allowed)

- Field catalog modification (`<fs_fieldcat>-fieldname = 'MATNR'` — per ALV rules)
- Text Element references (`text-f01`) — already abstracted
- Initial values in type declarations
- `SY-*` system fields and ABAP language keywords

## Enforcement

`sap-code-reviewer` enforces this rule with a magic-literal scan and blocks review sign-off on violations.
