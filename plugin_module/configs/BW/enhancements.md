# BW Module Enhancements / BW 모듈 개선사항

## Overview / 개요

SAP BW / BW/4HANA enhancements span reporting variables, extractors, transformations, planning, and authorizations. Modern BW/4HANA leverages **AMDP** for HANA-native transformations.

| Type / 유형 | Description / 설명 |
|------|-------------|
| Customer Exits (CMOD) | RSR00001 (variables), RSAP0001 (extractors) |
| BAdIs | Query, extractor, transformation, planning, authorization |
| Enhancement Spots | Modern enhancement containers |
| Transformation Routines | Start/End/Expert/Field routines (ABAP/AMDP) |
| AMDP | HANA-native procedures (BW/4HANA) |
| Custom DataSources | RSO2 generic, function module extractors |
| Process Chains | Custom process types |

---

## Classic Customer Exits (CMOD/SMOD)

| Name | System | Description | Usage |
|------|--------|-------------|-------|
| RSR00001 | ECC/S4 | BW Reporting — **CRITICAL** customer exit for variables in queries (include ZXRSRU01) | I_STEP=1 default values, I_STEP=2 derivation, I_STEP=3 validation |
| RSAP0001 | ECC/S4 | Extractor enhancement via CMOD | Parent enhancement for extractor exits |
| EXIT_SAPLRSAP_001 | ECC/S4 | Transaction data | Enhance transaction data extractor |
| EXIT_SAPLRSAP_002 | ECC/S4 | Master data | Enhance master data attribute extractor |
| EXIT_SAPLRSAP_003 | ECC/S4 | Texts | Enhance text extractor |
| EXIT_SAPLRSAP_004 | ECC/S4 | Hierarchies | Enhance hierarchy extractor |
| RSU5_SAPI_BADI | ECC/S4 | Source system extractor (alternative) | Modern alternative to RSAP0001 |
| RSCNV_RZ10 | ECC/S4 | Transformation | Transformation conversion routines |
| RSPLAN_CUS | ECC/S4 | Planning | Planning customizing exits |

### Variable Exit Example (ZXRSRU01) / 변수 Exit 예시

```abap
CASE I_VNAM.
  WHEN 'ZVAR_CUSTOM'.
    IF I_STEP = 1.
      " Default value logic (before popup) / 팝업 전 기본값 로직
    ELSEIF I_STEP = 2.
      " Derivation after entry / 입력 후 파생
    ELSEIF I_STEP = 3.
      " Validation / 검증
    ENDIF.
ENDCASE.
```

---

## BAdIs

| Name | System | Description | Usage |
|------|--------|-------------|-------|
| RSR_OLAP_BADI | ECC/S4 | Query runtime manipulation | Modify query results at runtime |
| RSAP_BIW_APPEND | ECC/S4 | Append fields to standard extractor | Field-level extractor enhancement |
| RSU5_SAPI_BADI | ECC/S4 | Source system API | Modern source system extractor |
| RSCNV_BADI | ECC/S4 | Transformation | Transformation-level logic |
| RSROUTINE_SUPPORT | ECC/S4 | Transformation routine support | Supports routine development |
| RSSB_AUTH_BIW_GENERATE | ECC/S4 | Analysis authorization | Custom auth generation |
| RSPLS_CR_BADI | ECC/S4 | Planning characteristic relationships | Custom characteristic relations |
| RSPLS_DS_BADI | ECC/S4 | Planning data slice | Custom data slice logic |
| RSPLS_BADI_DESIGN | ECC/S4 | Planning sequence design | Planning sequence customization |

---

## Module-Specific Special Enhancements / 모듈별 특수 개선

### Transformation Routines (BW/4HANA & BW 7.x) / 변환 루틴

- **Start routine**: Pre-processing before transformation
- **End routine**: Post-processing after transformation
- **Expert routine**: Full control over data flow
- **Field-level routines**: Per-field transformation
- Written in **ABAP** (classic) or **AMDP** (BW/4HANA for HANA-native execution)

### AMDP (ABAP Managed Database Procedures) — `S4`

- BW/4HANA transformations can use **AMDP** for HANA-native processing
- Class-based, inherits `IF_AMDP_MARKER_HDB`
- **HANA SQL Script** executed on the DB layer for maximum performance
- Preferred for large data volumes in BW/4HANA

### Custom DataSources / 커스텀 데이터소스

- **RSO2**: Generic extractor (table/view/function module based)
- Function Module extractor template: `ZBW_EXTRACT_*` (copy from `RSAX_BIW_GET_DATA_SIMPLE`)
- **Delta methods**:
  - `0` — Timestamp
  - `1` — Calendar day
  - `2` — Full upload
  - `3` — Generic delta

### Process Chain Custom Process Types / 프로세스 체인 커스텀 프로세스 유형

- **RSPC / RSPC1**: Define custom process types with start / check / finish programs
- Useful for integrating non-standard steps (external API, custom validations)

### Open Hub Destination (OHD) / Open Hub 대상

- **BAdI**: `RSB_API_OHD_BADI` for custom OHD handling

---

## Custom Fields / Append Structures / 커스텀 필드

- **DataSource append**: Transaction `RSA6` — append custom fields to extractor
- **InfoObject attribute structure**: Append to enhance master data attributes
- **CompositeProvider**: Add calculated fields in BW/4HANA modeling

---

## S/4HANA Extensions (CDS/RAP) / S/4HANA 확장 (BW/4HANA)

- **AMDP transformations**: HANA-native, highest performance
- **SAP HANA views** and **CDS views** as sources (replaces many traditional extractors)
- **CompositeProvider**: JOINs / UNIONs in modeling layer
- **SAP Analytics Cloud (SAC)**: Replaces BEx for reporting extensions
- **SAP Data Warehouse Cloud (DWC) / Datasphere**: Cloud data warehousing extensions

---

## Recommended Approach / 권장 접근법

- **Modern BW/4HANA / 최신 BW/4HANA**: AMDP transformations, CDS views, CompositeProvider, SAC reporting.
- **Legacy BW 7.x / 레거시 BW 7.x**: CMOD `RSR00001` for variables (most common), `RSAP0001` for extractors.
- **Variables**: Always use `RSR00001` exit (ZXRSRU01) — standard pattern.
- **Extractors**: Prefer `RSU5_SAPI_BADI` over classic `EXIT_SAPLRSAP_001`.
- **Performance**: Push logic down to HANA via AMDP wherever possible.
