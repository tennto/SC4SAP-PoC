# Ariba Module Enhancements / Ariba 모듈 개선사항

> **Note / 참고**: Ariba is **cloud-based SaaS**. Customizations follow SAP Ariba's extensibility model on the cloud side, while the SAP backend (ECC / S/4HANA) integration uses IDoc / BAPI exits and BAdIs.
> Ariba는 클라우드 기반 SaaS이며, 클라우드 측 커스터마이징은 Ariba 확장 모델을 따르고, SAP 백엔드(ECC / S/4HANA) 통합은 IDoc / BAPI Exit과 BAdI를 사용합니다.

## Overview / 개요

Ariba enhancements split between two sides:
1. **SAP Side (ECC / S4)**: IDoc processing, BAPI exits, procurement BAdIs
2. **Ariba Side (Cloud)**: Data Dictionary, approval rules, cXML, CIG, BTP Integration Suite

| Type / 유형 | Description / 설명 |
|------|-------------|
| IDoc Customer Exits | ORDERS05, INVOIC02, DESADV01 processing |
| IDoc BAdIs | Generic and process-specific mappers |
| Procurement BAdIs | ME_PROCESS_PO_CUST, MB_MIGO_BADI, etc. |
| Ariba Cloud Customization | Data Dictionary, approvals, reports, cXML |
| CIG | Cloud Integration Gateway |
| BTP Integration Suite | Groovy scripts, XSLT, custom adapters |

---

## SAP Side (ECC/S4) Integration Exits

### IDoc Processing Customer Exits / IDoc 처리 Customer Exit

| Name | System | Description | Usage |
|------|--------|-------------|-------|
| EXIT_SAPLVED1_002 | ECC/S4 | ORDERS05 inbound (process code ORDE) | Inbound PO IDoc header |
| EXIT_SAPLVED1_004 | ECC/S4 | ORDERS05 inbound (process code ORDE) | Inbound PO IDoc item |
| EXIT_SAPLMRMH_001 | ECC/S4 | INVOIC02 inbound — invoice verification | Invoice header processing |
| EXIT_SAPLMRMH_002 | ECC/S4 | INVOIC02 inbound — invoice verification | Invoice item processing |
| EXIT_SAPLV55K_001 | ECC/S4 | DESADV01 outbound — shipment cost | Outbound delivery notification |

### IDoc BAdIs / IDoc BAdIs

| Name | System | Description | Usage |
|------|--------|-------------|-------|
| IDOC_DATA_MAPPER | ECC/S4 | Generic IDoc data mapper | Generic mapping logic |
| INBOUND_IDOC_ORDERS | ECC/S4 | Inbound PO IDoc | Ariba-sourced PO IDoc |
| MRM_HEADER_CHECK | ECC/S4 | Invoice receipt — for Ariba e-invoice | Header validation |
| MRM_ITEM_CUST | ECC/S4 | Invoice item — for Ariba e-invoice | Item processing |
| MRM_CUSTOM_FIELDS | ECC/S4 | Custom fields in invoice | Ariba field mapping |
| CCIH_MAPPER | ECC/S4 | CIG message mapper | CIG-SAP mapping |

### Procurement BAdIs (Ariba Flow) / 구매 BAdIs

| Name | System | Description | Usage |
|------|--------|-------------|-------|
| ME_PROCESS_PO_CUST | ECC/S4 | PO created from Ariba requisition | Ariba-sourced PO processing |
| ME_PROCESS_REQ_CUST | ECC/S4 | Ariba-imported PR | Purchase requisition from Ariba |
| MB_MIGO_BADI | ECC/S4 | GR posted, transferred to Ariba | GR-to-Ariba flow |
| INVOICE_UPDATE | ECC/S4 | Invoice from Ariba e-invoice | Invoice posting from Ariba |

---

## Ariba Side Customizations (Cloud)

### Ariba Customization Types / Ariba 커스터마이징 유형

| Type | System | Description | Usage |
|------|--------|-------------|-------|
| Data Dictionary Extensions | Cloud | Custom fields on Ariba forms | Add buyer-specific fields |
| Approval Rules | Cloud | Condition-based approval chains | Workflow customization |
| Custom Reports | Cloud | Operational reporting customization | Buyer-specific analytics |
| cXML Customization | Cloud | cXML extensions for transactions | Transaction-level data |
| Guided Buying Tiles | Cloud | Custom tiles for procurement categories | User-friendly procurement UI |
| Supplier Forms | Cloud | Qualification / registration questionnaires | Supplier onboarding |
| Sourcing Templates | Cloud | Custom RFx templates with scoring | Strategic sourcing |
| CIG Integration Flows | BTP | SAP Cloud Integration Gateway mappings | Ariba-SAP integration |
| BTP Integration Suite | BTP | Custom integration flows | Advanced integration scenarios |

---

## Module-Specific Special Enhancements / 모듈별 특수 개선

### CIG (Cloud Integration Gateway) Extensions / CIG 확장

- **Message mapping customization** for Ariba ↔ SAP messages
- **cXML to IDoc field mapping** (PO, Invoice, GR, ASN)
- **Pre-processing / post-processing handlers** for custom logic
- **Error handling customization** and monitoring

### BTP Integration Suite / BTP 통합 스위트

- **Groovy scripts** in iFlows for complex transformations
- **XSLT transformations** for XML-based messages
- **Custom adapters** for Ariba Network connectivity
- **Event mesh** for asynchronous integration patterns

---

## Custom Fields / Append Structures / 커스텀 필드

| Append | System | Target Table | Purpose |
|--------|--------|--------------|---------|
| CI_EKPO | ECC/S4 | EKPO | PO item (from Ariba) |
| CI_EKKO | ECC/S4 | EKKO | PO header (from Ariba) |
| CI_RBKP | ECC/S4 | RBKP | Invoice header (Ariba e-invoice) |
| CI_RSEG | ECC/S4 | RSEG | Invoice item (Ariba e-invoice) |

---

## S/4HANA Extensions (CDS/RAP) / S/4HANA 확장

- **Key User Extensibility**: Custom Fields and Logic app for field-level extensions
- **Extend PO, Supplier, Contract** via Fiori-based extension
- **CDS views**: `I_PurchaseOrder`, `I_SupplierInvoice` — consume from custom apps
- **Restricted CDS extensions** in S/4HANA Cloud edition (public cloud model)

---

## Recommended Approach / 권장 접근법

- **Ariba-side changes / Ariba 측 변경**: Use the **Ariba admin UI** — no coding needed for most configurations (Data Dictionary, approval rules, templates).
- **SAP-side changes / SAP 측 변경**: Use **BAdIs**, not CMOD customer exits. Prefer `ME_PROCESS_*` and `MRM_*` BAdIs.
- **Integration mapping**: Use **CIG message mappings** for complex data transformations; fall back to BTP Integration Suite for non-standard flows.
- **S/4HANA Cloud**: Use **Key User Extensibility** only — no classic enhancements available.
- **Governance**: Document all Ariba customizations — cloud upgrades may affect custom configurations.
