# Procedural FORM Naming

When paradigm = Procedural and the FORM touches ALV / Screen, the FORM name **must end with `_{screen_no}`**.

## Examples

- ✅ `MODIFY_FCAT_DATA_GRID1_0100`
- ✅ `BUILD_LAYOUT_0100`
- ✅ `HANDLE_DOUBLE_CLICK_0200`
- ❌ `MODIFY_FCAT_DATA_GRID1` (missing screen suffix)

## Exception

Screen-independent utility FORMs (e.g. `CONVERT_FCAT_DATA_GRID`) do **not** require the suffix.

## Enforcement

`sap-code-reviewer` enforces this convention during Phase 6 review.
