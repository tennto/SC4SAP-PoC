# MM Module Enhancements / MM 모듈 확장

## Overview / 개요

The MM (Materials Management) module supports multiple enhancement techniques across ECC and S/4HANA:
MM(자재 관리) 모듈은 ECC 및 S/4HANA 전반에 걸쳐 다양한 확장 기법을 지원합니다.

- Classic Customer Exits (CMOD/SMOD) / 전통적 고객 출구
- BAdIs (Business Add-Ins) / 비즈니스 애드인
- Enhancement Spots (modern framework) / 확장 스팟 (최신 프레임워크)
- Custom Fields via Append Structures / 어펜드 구조를 통한 커스텀 필드
- S/4HANA CDS/RAP Extensions / S/4HANA CDS/RAP 확장

---

## 1. Classic Customer Exits (CMOD/SMOD) / 전통적 고객 출구

| Name | System | Description / 설명 | Usage / 용도 |
|------|--------|--------------------|--------------|
| MM06E005 | ECC/S4 | Customer fields in purchasing document / 구매 문서의 고객 필드 | Add custom fields to PO/PR header & item |
| MM06E001 | ECC/S4 | Import data in purchasing document / 구매 문서 Import 데이터 | Enhance import/foreign trade data |
| MM06E003 | ECC/S4 | Fields at transfer to purchase document / 구매 문서 전송 시 필드 | Transfer custom fields during document generation |
| MM06E007 | ECC/S4 | Change document for customer fields / 고객 필드 변경 문서 | Log changes on custom fields |
| MBCF0002 | ECC/S4 | Goods movement customer fields / 자재 이동 고객 필드 | Custom fields on MIGO/MB01 |
| MBCF0005 | ECC/S4 | Material document number assignment / 자재 문서 번호 지정 | Influence material document numbering |
| MRMH0001 | ECC/S4 | MM-Invoice verification / 송장 검증 | MIRO custom logic |
| MRMN0001 | ECC/S4 | LIV Message determination / LIV 메시지 결정 | Invoice message output |
| MGV00001 | ECC/S4 | Material master: Custom fields / 자재 마스터 커스텀 필드 | Add fields to MM01/MM02 |
| MGA00001 | ECC/S4 | Material master ALE distribution / 자재 마스터 ALE | IDoc extension for material |
| M06B0001 | ECC/S4 | Purchase requisition: role determination / 구매 요청 역할 결정 | Release strategy approver |
| M06B0002 | ECC/S4 | Purchase requisition: change release data / 구매 요청 해제 데이터 변경 | Modify release indicator |
| M06B0003 | ECC/S4 | Purchase requisition: number range / 구매 요청 번호 범위 | Custom PR numbering |
| M06B0004 | ECC/S4 | Purchase requisition: check release strategy / 해제 전략 체크 | Validate release conditions |
| M06B0005 | ECC/S4 | Purchase requisition: field selection / 필드 선택 | Dynamic field screen control |
| M06E0004 | ECC/S4 | PO release strategy: field selection / PO 해제 전략 필드 | Release approver determination |
| M06E0005 | ECC/S4 | PO release strategy: check / PO 해제 전략 검사 | Validate PO release strategy |

---

## 2. BAdIs / 비즈니스 애드인

| Name | System | Description / 설명 | Usage / 용도 |
|------|--------|--------------------|--------------|
| ME_PROCESS_PO_CUST | ECC/S4 | Customer processing of PO / PO 고객 처리 | PO create/change logic, validations |
| ME_PROCESS_REQ_CUST | ECC/S4 | Customer processing of PR / PR 고객 처리 | PR create/change logic |
| ME_PROCESS_OUT_CUST | ECC/S4 | Customer processing of outline agreement / 계약서 처리 | Contract/scheduling agreement logic |
| ME_GUI_PO_CUST | ECC/S4 | PO GUI customer subscreen / PO GUI 커스텀 서브스크린 | Add custom tabs to ME21N |
| ME_REQ_POSTED | ECC/S4 | After PR posting / PR 전기 후 | Post-processing after PR save |
| ME_REL_CHECK | ECC/S4 | Release strategy check / 해제 전략 검사 | Validate release conditions |
| MB_MIGO_BADI | ECC/S4 | MIGO customer subscreen / MIGO 커스텀 서브스크린 | Add tabs to MIGO |
| MB_DOCUMENT_BADI | ECC/S4 | Material document update / 자재 문서 업데이트 | Update logic for material doc |
| MB_MIGO_ITEM_BADI | ECC/S4 | MIGO item-level processing / MIGO 품목 레벨 처리 | Item-level logic in MIGO |
| INVOICE_UPDATE | ECC/S4 | Invoice verification update / 송장 검증 업데이트 | MIRO update tasks |
| MRM_BLOCKREASONS | ECC/S4 | Invoice block reasons / 송장 블록 사유 | Custom payment block logic |
| MATERIAL_MAINTAIN_BADI | ECC/S4 | Material master maintenance / 자재 마스터 유지 | MM01/MM02 processing |
| BADI_MATN1 | ECC/S4 | Material number conversion / 자재 번호 변환 | Customer-specific material ID |
| MM_EDI_DESADV_IN | ECC/S4 | Inbound delivery IDoc / 입고 전달 IDoc | ASN inbound processing |
| ARC_MM_EKKO_CHECK | ECC/S4 | Archiving check for EKKO / EKKO 아카이빙 검사 | PO archive checks |
| ARC_MM_EKKO_WRITE | ECC/S4 | Archiving write for EKKO / EKKO 아카이빙 쓰기 | PO archive write |
| BADI_MB_CIN_MM07MFB7_QTY | ECC/S4 | GR/IR quantity tolerance / 입고 수량 허용차 | Tolerance check override |
| BADI_SMOD_V50B0001 | ECC/S4 | Delivery enhancement / 배송 확장 | Inbound delivery custom logic |

---

## 3. Enhancement Spots (Modern Framework) / 확장 스팟

| Name | System | Description / 설명 | Usage / 용도 |
|------|--------|--------------------|--------------|
| ES_BADI_ME_PROCESS_PO_CUST | ECC/S4 | Enhancement Spot for PO processing / PO 처리 확장 스팟 | Container for PO BAdIs |

---

## 4. Module-Specific Special Enhancements / 모듈 특화 확장

### Configuration-driven Enhancements / 구성 기반 확장

| Transaction | System | Description / 설명 |
|------|--------|--------------------|
| OBYC | ECC/S4 | Automatic account determination / 자동 계정 결정 |
| OMJJ | ECC/S4 | Movement type configuration / 이동 유형 구성 |
| OMR6 | ECC/S4 | Tolerance limits (invoice verification) / 허용차 한도 (송장 검증) |

---

## 5. Validations / Substitutions / 검증 및 대체

MM relies primarily on BAdIs (e.g., `ME_PROCESS_PO_CUST`) and release strategies for validations.
MM에서는 주로 BAdI와 해제 전략을 통해 검증을 구현합니다.

---

## 6. Custom Fields / Append Structures / 커스텀 필드

| Append | Table | System | Description / 설명 |
|--------|-------|--------|--------------------|
| CI_EKKODB | EKKO | ECC/S4 | PO header custom fields / PO 헤더 커스텀 필드 |
| CI_EKPODB | EKPO | ECC/S4 | PO item custom fields / PO 품목 커스텀 필드 |
| CI_EBANDB | EBAN | ECC/S4 | Purchase requisition custom fields / 구매 요청 커스텀 필드 |
| CI_COBL | COBL | ECC/S4 | Account assignment custom fields / 계정 할당 커스텀 필드 |
| CI_MARA | MARA | ECC/S4 | Material master custom fields / 자재 마스터 커스텀 필드 |

---

## 7. S/4HANA Extensions (CDS/RAP) / S/4HANA 확장

| Artifact | System | Description / 설명 |
|----------|--------|--------------------|
| I_PurchaseOrder | S4 | Extensible CDS view for PO / 확장 가능 PO CDS 뷰 |
| I_PurchaseOrderItem | S4 | Extensible CDS view for PO item / PO 품목 CDS 뷰 |
| I_PurchaseRequisition | S4 | Extensible CDS view for PR / PR CDS 뷰 |
| I_Material | S4 | Extensible CDS view for material / 자재 CDS 뷰 |

Extension via `@AbapCatalog.extensibility.extensible: true` and Key User Extensibility (Custom Fields and Logic Fiori app).
`@AbapCatalog.extensibility.extensible: true` 및 Fiori Key User Extensibility를 통한 확장.

---

## 8. Recommended Approach / 권장 접근 방식

1. **Prefer BAdIs over CMOD exits** — better encapsulation, multi-implementation support.
   BAdI를 CMOD보다 우선 사용 — 더 나은 캡슐화 및 다중 구현 지원.
2. **In S/4HANA, prefer Key User Extensibility** for custom fields before deep ABAP work.
   S/4HANA에서는 먼저 Key User Extensibility 사용을 고려.
3. **Use Enhancement Spots** where available for modern, upgrade-safe enhancements.
   확장 스팟은 업그레이드 안전성을 위해 사용.
4. **Release strategy configuration** for PR/PO approval should precede code-level changes.
   PR/PO 승인은 해제 전략 구성이 우선.
