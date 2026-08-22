# CO Module Enhancements / CO 모듈 확장

## Overview / 개요

The CO (Controlling) module offers enhancements for cost center accounting, internal orders, product costing, and profitability analysis (CO-PA). In S/4HANA, many CO functions converge with FI via the Universal Journal (ACDOCA).
CO(관리 회계) 모듈은 원가 센터 회계, 내부 주문, 제품 원가 계산, 수익성 분석(CO-PA)을 위한 확장을 제공합니다. S/4HANA에서는 많은 CO 기능이 Universal Journal(ACDOCA)을 통해 FI와 통합됩니다.

- Classic Customer Exits (CMOD/SMOD) / 전통적 고객 출구
- BAdIs / 비즈니스 애드인
- Validations / Substitutions (OKC7, 3KEH, 1KE4) / 검증 및 대체
- Product Costing Enhancements / 제품 원가 계산 확장
- CO-PA Derivations (KEDR/KEDRU) / CO-PA 도출
- S/4HANA ACDOCA-based extensions / S/4HANA 확장

---

## 1. Classic Customer Exits (CMOD/SMOD) / 전통적 고객 출구

| Name | System | Description / 설명 | Usage / 용도 |
|------|--------|--------------------|--------------|
| COOMKS01 | ECC/S4 | Cost center master: field checks / 원가 센터 마스터 필드 검사 | KS01/KS02 validations |
| COOMKS02 | ECC/S4 | Cost center master: default values / 기본값 | Set defaults |
| COOMKS03 | ECC/S4 | Cost center master: custom fields / 커스텀 필드 | Additional fields |
| COOMKA01 | ECC | Cost element: field checks / 원가 요소 검사 | KA01/KA02 — ECC only; in S/4HANA cost elements = G/L accounts |
| COOMKA02 | ECC | Cost element: custom fields / 원가 요소 커스텀 필드 | ECC only |
| COOPA_01 | ECC/S4 | CO-PA: derivation / CO-PA 도출 | Custom derivations |
| COOPA_02 | ECC/S4 | CO-PA: valuation / CO-PA 평가 | Valuation strategies |
| COOPA_03 | ECC/S4 | CO-PA: actual posting / CO-PA 실적 전기 | Actual posting logic |
| COOPA_04 | ECC/S4 | CO-PA: planning / CO-PA 계획 | Planning logic |
| COOPA_05 | ECC/S4 | CO-PA: reporting / CO-PA 리포팅 | Report enhancement |
| COOPA_06 | ECC/S4 | CO-PA: top-down distribution / Top-down 분배 | KE28 enhancement |
| COOPA_07 | ECC/S4 | CO-PA: misc / 기타 | Miscellaneous |
| COPA0001 | ECC/S4 | CO-PA: derivation rule extension / 도출 규칙 확장 | Custom derivation |
| COPA0002 | ECC/S4 | CO-PA: valuation extension / 평가 확장 | Custom valuation |
| COPA0003 | ECC/S4 | CO-PA: actual data / 실적 데이터 | Actual data processing |
| COPA0004 | ECC/S4 | CO-PA: planning data / 계획 데이터 | Planning data processing |
| COPA0005 | ECC/S4 | CO-PA: currency / 통화 | Currency translation |
| COPA0006 | ECC/S4 | CO-PA: characteristics / 특성 | Custom characteristics |
| COPA0007 | ECC/S4 | CO-PA: billing transfer / 청구 전송 | SD→CO-PA transfer |
| KAZB0001 | ECC/S4 | Period-end closing / 기간 마감 | Period-end logic |
| KAZB0002 | ECC/S4 | Period-end: additional / 기간 마감 추가 | Additional closing |
| COZFREMT | ECC/S4 | Transfer price / 이전 가격 | TP derivation |
| SAPLKAFB | ECC/S4 | Actual data transfer / 실적 데이터 전송 | Transfer logic |
| COPEP001 | ECC/S4 | Report Painter / 리포트 페인터 | Report enhancements |
| COPCP001 | ECC/S4 | Product costing / 제품 원가 계산 | Cost estimate custom fields |

---

## 2. BAdIs / 비즈니스 애드인

| Name | System | Description / 설명 | Usage / 용도 |
|------|--------|--------------------|--------------|
| COPA_DERIVATION | ECC/S4 | CO-PA characteristic derivation / CO-PA 특성 도출 | Custom derivation |
| CO_DERIVATION | ECC/S4 | CO derivation / CO 도출 | General CO derivation |
| CO_SETTLEMENT | ECC/S4 | Settlement logic / 정산 로직 | Custom settlement |
| ACC_CO_ALLOC | ECC/S4 | Allocation logic / 배분 로직 | Custom allocation |
| COST_ESTIMATE | ECC/S4 | Product costing / 제품 원가 계산 | CK11N/CK40N logic |
| COPA_PLANNING | ECC/S4 | CO-PA planning / CO-PA 계획 | KEPM logic |
| ORDER_INFOSYSTEM | ECC/S4 | Internal order reporting / 내부 주문 리포팅 | KOB1 enhancements |
| BADI_KO01 | ECC/S4 | Internal order / 내부 주문 | KO01/KO02 logic |
| BADI_ORDER_ALLOC | ECC/S4 | Order allocation / 주문 배분 | Allocation logic |
| COPA_ACT_UPD_DOC_CURR | ECC/S4 | CO-PA actual posting currency / CO-PA 실적 통화 | Actual posting currency |
| BADI_ACC_COPA | ECC/S4 | CO-PA from accounting / 회계에서 CO-PA | Accounting→CO-PA |

---

## 3. Enhancement Spots / 확장 스팟

Modern CO BAdIs are delivered under enhancement spots such as `ES_COPA_DERIVATION` and product-costing spots; check system via SE84 → Enhancement Spots → CO.
최신 CO BAdI는 `ES_COPA_DERIVATION` 등의 확장 스팟 하에 제공됩니다. SE84에서 확인.

---

## 4. Module-Specific Special Enhancements / 모듈 특화 확장

### 4.1 Validations / Substitutions (CO-specific) / CO 고유 검증 및 대체

| Transaction | System | Description / 설명 |
|-------------|--------|--------------------|
| **OKC7** | ECC/S4 | CO validation/substitution maintenance / CO 검증·대체 유지 |
| **3KEH** | ECC/S4 | Default account assignment (profit center) / 기본 계정 할당 (수익 센터) |
| **1KE4** | ECC/S4 | Profit center substitution / 수익 센터 대체 |
| **GGB0 / GGB1** | ECC/S4 | With CO callup points / CO 콜업 포인트 |

### 4.2 Product Costing Enhancements / 제품 원가 계산 확장

| Object | System | Description / 설명 |
|--------|--------|--------------------|
| User exit **COPCP001** | ECC/S4 | Cost estimate custom fields / 원가 견적 커스텀 필드 |
| BAdI **COST_ESTIMATE** | ECC/S4 | Costing logic / 원가 계산 로직 |
| Costing variant configuration | ECC/S4 | MP-variant / 평가 변형 | Costing variant customizing (OKKN) |

### 4.3 CO-PA Specific Enhancements / CO-PA 고유 확장

| Transaction / Object | System | Description / 설명 |
|---------------------|--------|--------------------|
| **KEDR** | ECC/S4 | Derivation rule table maintenance / 도출 규칙 테이블 유지 |
| **KEDRU** | ECC/S4 | User exit for CO-PA derivation / CO-PA 도출 사용자 출구 |
| **KEA0** | ECC/S4 | Operating concern — custom characteristics & value fields / 운영 관심 영역 — 커스텀 특성·값 필드 |
| COEP/ACDOCA linking | S4 | CO line items joined to ACDOCA / CO 라인 품목과 ACDOCA 연결 |

---

## 5. Validations / Substitutions Summary / 검증·대체 요약

Use OKC7 and GGB0/GGB1 for rule-based CO validations before custom code.
커스텀 코드 이전에 OKC7 및 GGB0/GGB1 규칙 기반 검증 사용.

---

## 6. Custom Fields / Append Structures / 커스텀 필드

| Append | Table | System | Description / 설명 |
|--------|-------|--------|--------------------|
| CI_CSKSZ | CSKS | ECC/S4 | Cost center master / 원가 센터 마스터 |
| CI_CSKBZ | CSKB | ECC | Cost element (ECC only) / 원가 요소 (ECC 전용) |
| CI_AUFK | AUFK | ECC/S4 | Internal order / 내부 주문 |
| CE1xxxx / CE4xxxx | (CO-PA) | ECC/S4 | CO-PA line items / CO-PA 라인 품목 — custom value fields via **KEA0** |

---

## 7. S/4HANA Extensions / S/4HANA 확장

| Artifact | System | Description / 설명 |
|----------|--------|--------------------|
| ACDOCA replaces COEP | S4 | Universal Journal is CO line-item source / Universal Journal이 CO 라인 품목 소스 |
| ACDOCA extensions via INCL_EEW_ACDOC | S4 | Custom fields span FI & CO / FI·CO 통합 커스텀 필드 |
| I_CostCenter | S4 | Cost center CDS (extensible) / 원가 센터 CDS |
| I_InternalOrder | S4 | Internal order CDS / 내부 주문 CDS |
| I_ProfitCenter | S4 | Profit center CDS / 수익 센터 CDS |
| Account-based CO-PA (preferred in S/4HANA) | S4 | Uses ACDOCA directly / ACDOCA 직접 사용 |

**Note**: In S/4HANA, cost elements are managed as **G/L accounts** (not CSKA/CSKB). Tables CSKA/CSKB remain as compatibility views but maintenance is via FS00.
참고: S/4HANA에서 원가 요소는 **G/L 계정**으로 관리됩니다 (CSKA/CSKB 아님). CSKA/CSKB는 호환성 뷰로 남아있지만 유지는 FS00에서 수행.

---

## 8. Recommended Approach / 권장 접근 방식

1. **BAdIs > CMOD exits** — prefer modern BAdIs for new CO logic.
   BAdI를 CMOD보다 우선 — 신규 CO 로직은 현대적 BAdI 사용.
2. **In S/4HANA, prefer account-based CO-PA** over costing-based CO-PA.
   S/4HANA에서는 costing-based CO-PA보다 account-based CO-PA 우선.
3. **Cost elements are G/L accounts in S/4HANA** — do not build custom logic around CSKA/CSKB.
   S/4HANA에서 원가 요소는 G/L 계정 — CSKA/CSKB 기반 커스텀 로직 지양.
4. **Use KEDR (derivation rules) before KEDRU (user exit)** for CO-PA derivation — configuration-first.
   CO-PA 도출은 KEDRU보다 KEDR 우선 — 구성 우선 접근.
5. **Extend ACDOCA** for any custom fields that must flow through FI and CO together.
   FI·CO 통합 커스텀 필드는 ACDOCA 확장.
6. **Operating concern (KEA0)** changes require regeneration — plan transports carefully.
   운영 관심 영역(KEA0) 변경은 재생성 필요 — 트랜스포트 신중 계획.
