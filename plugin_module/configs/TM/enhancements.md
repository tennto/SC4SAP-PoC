# TM Module Enhancements / TM 모듈 개선사항

## Overview / 개요

Transportation Management enhancements cover **LE-TRA** (classic shipment, ECC) and **SAP TM** (embedded or standalone, S/4HANA). TM is BOPF-based and heavily uses BRF+ and PPF.

| Type / 유형 | Description / 설명 |
|------|-------------|
| Customer Exits (CMOD) | Classic LE-TRA exits (V55*/V54*) |
| BAdIs | Both LE-TRA and SAP TM BAdIs |
| Enhancement Spots | `/SCMTMS/ES_*` for TM |
| BRF+ | Business Rule Framework — heavily used in TM |
| Condition Technique | Charge determination |
| PPF | Post Processing Framework (output) |
| VSR | Planning strategies with custom algorithms |
| BOPF | Business Object Processing Framework extensions |

---

## Classic Customer Exits (CMOD/SMOD)

| Name | System | Description | Usage |
|------|--------|-------------|-------|
| V55K0001 | ECC | Shipment cost | Shipment cost processing |
| V55K0002 | ECC | Shipment cost | Additional shipment cost logic |
| V55K0003 | ECC | Shipment cost | Shipment cost validation |
| V55S0001 | ECC | Shipment | Shipment processing (VT01N) |
| V54B0001 | ECC | Shipment cost calculation | Custom calculation logic |
| V54U0001 | ECC | Shipment cost document | Document header enhancements |
| V54U0002 | ECC | Shipment cost document | Document item enhancements |
| V54U0003 | ECC | Shipment cost document | Pricing enhancements |
| V54U0004 | ECC | Shipment cost document | Settlement enhancements |
| V54U0005 | ECC | Shipment cost document | Account assignment |
| V54U0006 | ECC | Shipment cost document | Additional document logic |

---

## BAdIs

### LE-TRA BAdIs (Classic) / LE-TRA BAdIs (클래식)

| Name | System | Description | Usage |
|------|--------|-------------|-------|
| LE_SHIPMENT | ECC | Shipment processing VT01N | Custom shipment logic |
| BADI_LE_SHP_01 | ECC | Shipment 1 | Additional shipment enhancements |
| BADI_LE_SHP_CHRG_CUSTOM | ECC | Shipment charges | Custom charge calculation |

### S/4HANA TM BAdIs / S/4HANA TM BAdIs

| Name | System | Description | Usage |
|------|--------|-------------|-------|
| /SCMTMS/BADI_FO_PROCESS | S4 | Freight order | Freight order processing |
| /SCMTMS/BADI_FO_CHARGE | S4 | Freight order charges | Charge logic on freight orders |
| /SCMTMS/BADI_CHRG_CALC | S4 | Charge calculation | Custom charge calculation |
| /SCMTMS/BADI_CARRIER_SEL | S4 | Carrier selection | Carrier selection logic |
| /SCMTMS/BADI_PLANNING | S4 | Planning | Planning process extensions |
| /SCMTMS/BADI_SETTLE | S4 | Settlement | Freight settlement logic |
| /SCMTMS/BADI_EVENT | S4 | Event processing | Event management enhancements |
| /SCMTMS/BADI_EWM_INT | S4 | EWM integration | TM-EWM integration |
| /SCMTMS/BADI_TOR_UI | S4 | UI customization | Transportation order UI |
| /SCMTMS/BADI_ITIN | S4 | Itinerary | Itinerary generation |
| /SCMTMS/BADI_ROUTING | S4 | Routing | Routing logic |
| /SCMTMS/BADI_SCHED | S4 | Scheduling | Scheduling logic |
| /SCMTMS/BADI_TENDER | S4 | Tendering | Freight tendering |
| /SCMTMS/BADI_CUST_DIST | S4 | Customer distance | Customer distance calculation |

---

## Enhancement Spots / 향상 스팟

| Name | System | Description | Usage |
|------|--------|-------------|-------|
| /SCMTMS/ES_COMMON | S4 | Common TM enhancement spot | Container for common BAdIs |
| /SCMTMS/ES_PLANNING | S4 | Planning enhancement spot | Container for planning BAdIs |

---

## Module-Specific Special Enhancements / 모듈별 특수 개선

- **BRF+ (Business Rule Framework plus)**: Heavily used in TM for charge determination, carrier selection, routing, and condition rules. Allows business rule changes without ABAP code.
- **Condition Technique**: For charge determination (similar to SD pricing).
- **PPF (Post Processing Framework)**: Output management — labels, print forms, emails.
- **Planning strategies (VSR)**: Vehicle Scheduling and Routing — custom algorithms can be plugged in via BAdI `/SCMTMS/BADI_PLANNING`.
- **Costs distribution profiles**: Customize how charges are distributed to stages/items.

---

## Custom Fields / Append Structures / 커스텀 필드

SAP TM's data model is **BOPF-based** — extend via key fields in `/BOPF/` framework:
- Use **BOPF Enhancement** to add nodes/attributes to business objects
- Extend freight order (`/SCMTMS/TOR`), freight agreement, forwarding order
- Custom fields via Fiori "Custom Fields and Logic" app (S/4HANA)

---

## S/4HANA Extensions (CDS/RAP) / S/4HANA 확장

- **S/4HANA embedded TM**: `/SCMTMS/*` BAdIs still apply.
- **CDS views**: `/SCMTMS/I_*` for TM analytical consumption.
- **Extension via BOPF**: Use BOPF enhancements for deep data model changes.
- **Key User Extensibility**: Custom fields and logic via Fiori.

---

## Recommended Approach / 권장 접근법

- **Prefer BAdIs** over classic customer exits. `/SCMTMS/*` BAdIs cover almost all scenarios.
- **Use BRF+** for business rule changes — no ABAP required, maintainable by functional consultants.
- **PPF** for all output requirements.
- **BOPF enhancement** for data model extensions.
- **Avoid modifications** to standard TM code.
