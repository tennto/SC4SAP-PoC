# WM Module Enhancements / WM 모듈 개선사항

> **Deprecation Note / 사용 중단 안내**: LE-WM (Warehouse Management) is **deprecated in S/4HANA**. EWM (Extended Warehouse Management) replaces it as the strategic solution — embedded or decentralized.
> LE-WM은 S/4HANA에서 사용 중단되었으며, EWM(내장형 또는 분산형)이 이를 대체합니다.

## Overview / 개요

Warehouse Management enhancements span two architectures: **LE-WM** (classic, ECC) and **EWM** (modern, S/4HANA). Enhancement techniques include:

| Type / 유형 | Description / 설명 |
|------|-------------|
| Customer Exits (CMOD/SMOD) | Classic SAP-delivered exits for LE-WM |
| BAdIs | Business Add-Ins for both LE-WM and EWM |
| Enhancement Spots | Modern implicit/explicit enhancement points |
| PPF | Post Processing Framework (EWM output/printing) |
| Condition Technique | Determinations in EWM |
| MFS | Material Flow System for automation |
| RF Framework | Radio Frequency UI customization |
| Custom Fields | Append structures (CI_*, /SCWM/INCL_EEW_*) |

---

## Classic Customer Exits (CMOD/SMOD) — LE-WM

| Name | System | Description | Usage |
|------|--------|-------------|-------|
| MWMIDO06 | ECC | Transfer Order (TO) creation | Custom logic at TO creation time |
| MWM2S001 | ECC | Warehouse monitor | Enhance warehouse monitoring displays |
| MWMTO001 | ECC | TO processing | Modify TO during processing |
| MWMRF001-999 | ECC | RF framework | Radio Frequency screen and flow exits |
| LMIW0001 | ECC | Inventory | Physical inventory enhancements |
| LEMEC001 | ECC | Movement type | Movement type determination |
| LELC0001 | ECC | Lean WM | Lean warehouse management exits |
| LVS10001 | ECC | Storage unit | Storage unit management logic |
| MWMBI001 | ECC | Batch input for TO | Batch input processing for transfer orders |
| MWMD0001 | ECC | Warehouse doors | Door/staging area logic |

---

## BAdIs

### LE-WM BAdIs (Classic) / LE-WM BAdIs (클래식)

| Name | System | Description | Usage |
|------|--------|-------------|-------|
| LE_WM_TO_CONFIRMATION | ECC | TO confirmation | Custom logic at transfer order confirmation |
| WM_PUTAWAY_STRATEGY | ECC | Putaway | Custom putaway strategy logic |
| WM_PICKING_STRATEGY | ECC | Picking | Custom picking strategy logic |
| MB_MIGO_BADI | ECC | Goods movement WM integration | MIGO/WM integration |
| LE_WM_TR_CREATE | ECC | TR creation | Transfer Requirement creation logic |
| LE_SHP_DELIVERY_PROC | ECC | Delivery-WM integration | Delivery processing in WM |
| BADI_WM_STOCK_TRANSFER | ECC | Stock transfer | Stock transfer logic |

### EWM BAdIs (S/4HANA) / EWM BAdIs (S/4HANA)

| Name | System | Description | Usage |
|------|--------|-------------|-------|
| /SCWM/EX_CORE_CO | S4 | Core | Core EWM process enhancements |
| /SCWM/EX_CORE_CO_PRE_UP | S4 | Pre-update | Before database update |
| /SCWM/EX_CORE_CO_POST_UP | S4 | Post-update | After database update |
| /SCWM/EX_RF_BL_CUST | S4 | RF UI customization | Customize RF business logic |
| /SCWM/EX_RF_FLOW_CUSTOMIZE | S4 | RF flow | Customize RF screen flow |
| /SCWM/EX_DLV_DET_AUTO | S4 | Determination | Automatic delivery determinations |
| /SCWM/EX_WAVE | S4 | Wave management | Wave processing logic |
| /SCWM/EX_WAVE_CREATE_AUTO | S4 | Auto wave creation | Automatic wave creation rules |
| /SCWM/EX_MFS_MP_PICK_STRAT | S4 | MFS picking | Material Flow System picking strategy |
| /SCWM/EX_SLOT_OPT | S4 | Slotting | Slotting optimization |
| /SCWM/EX_BATCH_DET | S4 | Batch determination | Batch determination in EWM |
| /SCWM/EX_PUT_ALT | S4 | Putaway alternative | Alternative putaway logic |
| /SCWM/EX_PICK_ALT | S4 | Picking alternative | Alternative picking logic |
| /SCWM/EX_COUNT_RECOUNT | S4 | Recount physical inventory | Physical inventory recount logic |

---

## Enhancement Spots (Modern) / 향상 스팟 (최신)

| Name | System | Description | Usage |
|------|--------|-------------|-------|
| /SCWM/ES_CORE | S4 | EWM core enhancement spot | Container for core EWM BAdIs |
| /SCWM/ES_RF | S4 | EWM RF enhancement spot | Container for RF framework BAdIs |

---

## Module-Specific Special Enhancements / 모듈별 특수 개선

### LE-WM Specific
- **Storage unit management**: User exit `MWMRCU01` for SU logic
- **RF (Radio Frequency)**: Custom RF transactions via `/SPE/FRAMEWORK`
- **Batch management in WM**: Include `MCB1` for batch-specific logic
- **Hazardous goods**: BAdI `LE_WM_HAZMAT` for dangerous goods handling

### EWM Specific
- **PPF (Post Processing Framework)**: Output management, printing, label printing
- **Condition Technique**: Used for determinations (warehouse process type, packaging, etc.)
- **MFS (Material Flow System)**: Conveyor / AS-RS / crane automation integration
- **RF framework**: Custom RF screens via `/SCWM/RFUI` or ITS mobile

---

## Custom Fields / Append Structures / 커스텀 필드

| Append / Include | System | Target Table |
|------------------|--------|--------------|
| CI_LTAK | ECC | Transfer Order header (LTAK) |
| CI_LTAP | ECC | Transfer Order item (LTAP) |
| CI_LQUA | ECC | Quant (LQUA) |
| /SCWM/INCL_EEW_* | S4 | EWM extensibility includes |

---

## S/4HANA Extensions (CDS/RAP) / S/4HANA 확장

- Use **EWM** instead of LE-WM in S/4HANA (embedded or decentralized).
- **CDS views**: `/SCWM/I_*` for EWM analytical and transactional consumption.
- **RAP (Restful ABAP Programming)**: Used for modern Fiori apps on EWM data.
- **Key User Extensibility**: Custom fields via Fiori "Custom Fields and Logic" app.

---

## Recommended Approach / 권장 접근법

- **New S/4HANA projects / 신규 S/4HANA 프로젝트**: Implement **EWM** (embedded or decentralized). LE-WM is only for legacy migration scenarios.
- **EWM enhancements**: Prefer `/SCWM/EX_*` BAdIs under `/SCWM/ES_CORE` / `/SCWM/ES_RF` enhancement spots. Use PPF for output, condition technique for determinations.
- **Legacy LE-WM**: Use classic BAdIs (`LE_WM_*`, `WM_*`) before falling back to CMOD customer exits.
- **Avoid modifications**: Never modify standard SAP code; always use documented enhancement points.
