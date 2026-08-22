# Customer-Specific PII Patterns
<!-- tier: minimal -->
<!-- action: warn -->

Customer (`Z*`/`Y*`) extension tables typically holding PII or sensitive business data. Must be evaluated per project; add concrete Z-table names to `.sc4sap/blocklist-extend.txt` or to this file.

| Pattern | Description | Why |
|---------|-------------|-----|
| `Z*` / `Y*` with PII content | Customer/partner Z-tables storing PII | Must be added to this list case-by-case |
| `ZHR_*`, `ZPA_*` | Typical customer HR extensions | Employee PII |
| `ZCUST_*`, `ZKNA_*` | Customer-master extensions | Customer PII |
| `ZLFA_*`, `ZVEND_*` | Vendor-master extensions | Vendor PII |

> When a new Z-table is introduced, the developer/consultant MUST evaluate whether it belongs in this blocklist and append it before any extraction.
