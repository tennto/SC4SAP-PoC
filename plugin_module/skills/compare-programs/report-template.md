# Report Markdown Template

This is the Markdown skeleton `sap-writer` fills in Step 5 of the workflow. All section headings and body prose are rendered **in the user's current conversation language** (see SKILL.md `Language_Policy`). The example below is English; the same structure applies verbatim when the runtime language is Korean / Japanese / German / etc. — translate the section titles and narrative, keep the structure identical.

---

## Front-matter (YAML)

```yaml
---
type: program-comparison
programs:
  - ZMMR_GR_LIST
  - ZCOR_GR_LIST
generated: 2026-04-19
language: en
dimensions_included: [1, 2, 3, 5, 6, 7, 10]
sap_version: S/4HANA On-Premise 816
client: "100"
---
```

## Template Body (English example — replace ▫ placeholders)

```markdown
# Program Comparison Report: ZMMR_GR_LIST vs ZCOR_GR_LIST

## 1. Executive Summary (3 sentences)

▫ [Sentence 1: the shared business scenario. e.g. "Both programs list Goods Receipt (GR) documents."]
▫ [Sentence 2: the biggest Divergent finding. e.g. "ZMMR is MSEG-based and quantity-centric; ZCOR is ACDOCA-based and cost-value-centric."]
▫ [Sentence 3: the recommendation. e.g. "Warehouse clerks should use ZMMR; cost controllers should use ZCOR. Personas must be separated so the same report is not run twice."]

## 2. Shared Baseline (what all programs do in common)

- Business scenario: ▫ [e.g. Goods Receipt document lookup]
- Shared selection-screen fields: ▫ [BUKRS, WERKS, date range]
- Shared output purpose: ▫ [GR transaction listing and filtering]

## 3. Per-Dimension Comparison Matrix

Legend: ✅ Same · 🔷 Variant · ⚠️ Divergent · ❓ Unclear

| # | Dimension | ZMMR_GR_LIST | ZCOR_GR_LIST | Verdict |
|---|-----------|--------------|--------------|---------|
| 1 | Module / Domain | MM (inventory movement) | CO (cost accounting) | ⚠️ |
| 2 | Org / Country scope | All company codes | All company codes | ✅ |
| 3 | Selection screen | MATNR, WERKS, movement type | KOSTL, KOKRS, cost element | ⚠️ |
| 5 | Business logic | Quantity aggregation (MENGE, MEINS) | Value aggregation (DMBTR, HWAER); no UOM conversion | ⚠️ |
| 6 | Output columns | Material · quantity · UoM · movement type | G/L · cost element · amount · currency | ⚠️ |
| 7 | Authorization | M_MSEG_WWA, M_MATE_WRK | F_BKPF_BUK, K_CCA | ⚠️ |
| 10 | Usage timing / Persona | Daily / warehouse clerk | Month-end / cost controller | ⚠️ |

(Opt-in dimensions add further rows when enabled.)

## 4. Per-Program Detail

### 4.1 ZMMR_GR_LIST

- **Package**: ▫ ZMMPAEK
- **Persona**: ▫ Warehouse clerk (daily)
- **Core data sources**: ▫ MSEG, MKPF, MARA
- **Business logic summary**: ▫ Simple sum of MENGE; UOM kept as stored on material master (no conversion)
- **Main authorizations**: ▫ M_MSEG_WWA, M_MATE_WRK
- **CBO / Enhancement**: ▫ MSEG append structure (Z-field: ZZ_LOT_NO)
- **Consultant view (1–2 sentences)**: ▫ [from sap-mm-consultant]

### 4.2 ZCOR_GR_LIST

(Same structure.)

## 5. Recommendation — "Which program for which situation?"

| Use-case | Recommended program | Reason |
|----------|---------------------|--------|
| Daily GR quantity check | ZMMR_GR_LIST | Quantity- and material-centric; live MSEG |
| Month-end cost review | ZCOR_GR_LIST | ACDOCA-based; accurate amounts and cost elements |
| Audit reconciliation (quantity vs value) | Both in parallel + persona separation | Both needed |
| New country rollout (e.g. EU) | ▫ [if neither program covers the target localization, flag as a new localization requirement] | — |

## 6. Consolidation Opportunities (optional)

- ▫ [e.g. Extract the shared selection-screen block into a common INCLUDE reused by both programs]
- ▫ [e.g. Append module marker ("(MM)" / "(CO)") to ALV titles to make the persona distinction visible at first glance]

## 7. Risk & Open Questions

- ▫ [Items a consultant should confirm with the business — e.g. "Do both programs use moving-average price?"]
- ▫ [Items that would need a data sample to verify but are out of scope under this plugin's data-extraction policy — record them here instead of extracting rows.]

## 8. Appendix

### 8.1 Authorization Objects (verbatim)

| Program | Object | Field | Example value |
|---------|--------|-------|---------------|
| ZMMR_GR_LIST | M_MSEG_WWA | WERKS, BWART | Various |
| ZCOR_GR_LIST | F_BKPF_BUK | BUKRS, ACTVT | 03 (Display) |

### 8.2 Main Tables / CDS Views

| Program | Table / CDS | Note |
|---------|-------------|------|
| ZMMR_GR_LIST | MSEG, MKPF | Standard MM inventory document |
| ZCOR_GR_LIST | ACDOCA | S/4 Universal Journal |

### 8.3 Related CBO / Enhancement (only if dimension 8 enabled)

| Program | CBO / Enh type | Object | Purpose |
|---------|---------------|--------|---------|
| ... | ... | ... | ... |

### 8.4 Referenced Documents

- `common/active-modules.md` — active module matrix
- `common/customization-lookup.md` — enhancement lookup procedure
- `country/<iso>.md` — country-specific rules (loaded when dimension 9 is enabled)
```

## Rendering Rules

1. **Omit unused sections** — if a dimension wasn't selected in Step 2, drop the corresponding matrix row AND any dedicated section (e.g. skip §8.3 if dim 8 is off).
2. **Minimum bar**: Executive Summary + Matrix + Per-program detail + Recommendation are **always** present, even if the user picked only 3 dimensions.
3. **Placeholder filling**: every ▫ placeholder must be replaced. If a value is genuinely unknown, write "❓ Not determined — confirmation needed" and also add it to §7 Risk & Open Questions.
4. **Verbatim extracts** in §8 — AUTHORITY-CHECK lines and table names are pulled directly from the source, not paraphrased.
5. **Length target** — 3–8 printed pages. Trim narrative if longer; split into two sessions if more than 5 programs.
6. **No code snippets** — this is a consultant-facing document. If an implementation detail is load-bearing, paraphrase it in business terms.
7. **Language localization** — when rendering for a non-English user, translate all section headers, table headers, narrative sentences, and the Legend (Same/Variant/Divergent/Unclear). Keep placeholders (▫) and technical identifiers (table names, object names, program names, authorization objects) verbatim.
