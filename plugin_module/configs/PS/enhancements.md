# PS Module Enhancements / PS 모듈 확장

Project System (PS) enhancement catalog covering classic customer exits (CMOD/SMOD), BAdIs, enhancement spots, custom fields, and S/4HANA extensibility.

프로젝트 시스템(PS) 모듈의 클래식 사용자 출구(CMOD/SMOD), BAdI, 확장 스폿, 사용자 정의 필드 및 S/4HANA 확장성 카탈로그.

---

## 1. Overview / 개요

SAP PS offers several enhancement mechanisms depending on release and use case:

SAP PS는 릴리스 및 사용 사례에 따라 다양한 확장 메커니즘을 제공합니다:

- **Classic Customer Exits (CMOD/SMOD)** — CNEX0001 – CNEX0027 function exits, valid in ECC and S/4HANA.
- **BAdIs (Business Add-Ins)** — Object-oriented, preferred for new development.
- **Enhancement Spots (Implicit/Explicit)** — Modern framework (NetWeaver 7.0+).
- **Custom Fields / Append Structures** — Extend PROJ, PRPS, AUFK, AFVC via CI_* includes.
- **S/4HANA Extensions (CDS / RAP / Key User Extensibility)** — Cloud-ready extensibility.

신규 개발은 BAdI/확장 스폿을 권장하며, S/4HANA에서는 CDS 확장 및 키 사용자 확장성을 우선 고려합니다.

---

## 2. Classic Customer Exits (CMOD/SMOD) / 클래식 사용자 출구

| Name | System | Description | Usage |
|---|---|---|---|
| CNEX0001 | ECC/S4 | Project Definition save / 프로젝트 정의 저장 | Validations on CJ06/CJ20N save |
| CNEX0002 | ECC/S4 | Project Definition field defaults / 필드 기본값 | Default fields on creation |
| CNEX0003 | ECC/S4 | WBS field values check / WBS 필드 검증 | Validate PRPS fields |
| CNEX0004 | ECC/S4 | WBS authorization / WBS 권한 | Custom auth checks |
| CNEX0005 | ECC/S4 | WBS validation / WBS 검증 | Cross-field validation |
| CNEX0007 | ECC/S4 | WBS update / WBS 업데이트 | Logic at PRPS update |
| CNEX0008 | ECC/S4 | Network header save / 네트워크 헤더 저장 | AUFK/AFKO checks |
| CNEX0009 | ECC/S4 | Network activity save / 네트워크 활동 저장 | AFVC validation |
| CNEX0010 | ECC/S4 | Network relationships / 네트워크 관계 | AFAB logic |
| CNEX0014 | ECC/S4 | Activity update (network) / 활동 업데이트 | Modify AFVC/AFVV on save |
| CNEX0017 | ECC/S4 | Milestone update / 마일스톤 업데이트 | MLST logic |
| CNEX0018 | ECC/S4 | Milestone dates / 마일스톤 일자 | Milestone trigger dates |
| CNEX0023 | ECC/S4 | Cost planning / 원가 계획 | Planning form validations |
| CNEX0024 | ECC/S4 | Project Builder integration / 프로젝트 빌더 통합 | CJ20N enhancements |
| CNEX0026 | ECC/S4 | Project Definition — additional data / 프로젝트 정의 추가 데이터 | Custom tab logic |
| CNEX0027 | ECC/S4 | WBS — additional data tab / WBS 추가 데이터 탭 | Custom subscreen logic |
| CJPNFUNC | ECC/S4 | Project number check / 프로젝트 번호 검증 | PSPID validation |
| CONFPS01 – CONFPS05 | ECC/S4 | Confirmation of network activity / 활동 확인 | Validation and update at confirmation |
| COBL0001 – COBL0002 | ECC/S4 | Account assignment (CO block) / 계정 배정 | Customize CO fields on PS postings |

---

## 3. BAdIs / BAdI

| Name | System | Description | Usage |
|---|---|---|---|
| WORKORDER_UPDATE | ECC/S4 | Order/network update / 오더·네트워크 업데이트 | Intercept network save |
| WORKORDER_STATUS | ECC/S4 | Status changes / 상태 변경 | Status-driven logic on networks |
| WORKORDER_GOODSMVT | ECC/S4 | Goods movement on network / 네트워크 자재 이동 | Customize GR/GI for network components |
| PS_MILESTONE_BILL | ECC/S4 | Milestone billing release / 마일스톤 대금청구 | Control billing release logic |
| PS_CASH_MGMT | ECC/S4 | Project Cash Management / 프로젝트 자금 관리 | Cash management postings |
| BADI_SCOL_PROJ_COST | ECC/S4 | Project cost collection / 프로젝트 원가 수집 | Customize cost rollup to WBS |
| BADI_PS_EVAL | ECC/S4 | PS evaluation / PS 평가 | Info system evaluation |
| CNIF_PS_TABLES | ECC/S4 | PS BAPI table enhancement / PS BAPI 테이블 확장 | Add custom fields to BAPI structures |
| BADI_PROJ_PROF | ECC/S4 | Project profile derivation / 프로젝트 프로파일 결정 | Derive default profile |
| BADI_PS_NETPLAN | ECC/S4 | Network planning / 네트워크 계획 | Customize scheduling |
| BADI_PS_CLAIM | ECC/S4 | Claim Management / 클레임 관리 | Claim processing |
| PROGRESS_CUST | ECC/S4 | Progress analysis / 진행률 분석 | POC calculation |
| DIP_INPUT | ECC/S4 | DIP input / DIP 입력 | DP91 input customization |
| AD01_EXPERT | ECC/S4 | Resource-Related Billing / 자원 기반 대금청구 | DP91 expert mode logic |
| SMOD_V50B0001 | ECC/S4 | Billing plan (milestone) / 대금청구 계획 | Milestone billing plan |
| BADI_CJWBS | ECC/S4 | CJ20N WBS screen enhancement / CJ20N 화면 확장 | Additional WBS subscreen |

---

## 4. Enhancement Spots (Modern) / 확장 스폿 (현대식)

| Name | System | Description | Usage |
|---|---|---|---|
| ES_SAPLCOZF | ECC/S4 | Order/network processing framework / 오더·네트워크 처리 | Implicit & explicit enhancements |
| ES_SAPLCJWB | ECC/S4 | Project Builder framework / 프로젝트 빌더 프레임워크 | CJ20N subscreen hooks |
| ES_SAPLIHEX | ECC/S4 | Confirmation framework / 확인 프레임워크 | Activity confirmation |
| ES_BUPA_PS | S4 | BP assignment to project (S/4) / BP 프로젝트 배정 | Business Partner integration |

---

## 5. Module-Specific Special Enhancements / 모듈 특수 확장

- **Project Builder (CJ20N)**: Custom tabs via CNEX0026/CNEX0027 + BADI_CJWBS.
- **Availability Control**: BAdI `EXIT_SAPLKBPU_001` — tolerance warning/error override / 가용성 관리 초과 처리.
- **Settlement**: BAdI `CO_RESTRICT_KOKRS`, `K_SETTLEMENT_RULE` — settlement rule derivation / 정산 규칙 도출.
- **DIP (DP81/DP91)**: BAdI `AD01_EXPERT`, `DIP_INPUT` — dynamic item enrichment / 동적 항목 강화.
- **Progress Analysis**: BAdI `PROGRESS_CUST` — custom POC formulas / 사용자 정의 POC.
- **Cash Management integration**: BAdI `PS_CASH_MGMT` — drive FI-CA postings / 자금 관리 연동.

---

## 6. Custom Fields / Append Structures / 사용자 정의 필드

| Include | Table | Description |
|---|---|---|
| CI_PROJ | PROJ | Project definition custom fields / 프로젝트 정의 |
| CI_PRPS | PRPS | WBS element custom fields / WBS 사용자 필드 |
| CI_AUFK | AUFK | Network order header / 네트워크 오더 헤더 |
| CI_AFKO | AFKO | Network header / 네트워크 헤더 |
| CI_AFVC | AFVC | Network activity / 네트워크 활동 |
| CI_MLST | MLST | Milestone / 마일스톤 |
| CI_RPSCO | RPSCO | Project info DB / 프로젝트 정보 DB |

---

## 7. S/4HANA Extensions (CDS / RAP) / S/4HANA 확장

- **CDS Views**:
  - `I_ProjectDefinition`, `I_WBSElement`, `I_WBSElementBasic` — released APIs
  - `I_NetworkActivity`, `I_ProjectHierarchyNode`
- **Key User Extensibility** (Fiori) — Custom fields on Project Control and WBS apps via Custom Fields & Logic app.
- **RAP** — Extend WBS via Behavior Definitions (S/4HANA 2021+).
- **Commercial Project Management (CPM) / Hierarchical Project** — separate CDS stack (`CPD_*`).
- **Event-based Revenue Recognition (EBRR)** — BAdIs `EVENT_BASED_REV_REC` for custom revenue rules.

---

## 8. Recommended Approach / 권장 접근 방식

1. **BAdIs > CMOD customer exits** — prefer object-oriented BAdIs.
2. **Project save/validate** — use `WORKORDER_UPDATE` and `BADI_CJWBS` instead of CNEX0007.
3. **Milestone billing** — use `PS_MILESTONE_BILL` BAdI rather than V50B0001.
4. **Resource-Related Billing (DP91)** — implement `AD01_EXPERT` and `DIP_INPUT`.
5. **S/4HANA** — leverage CDS extensions + Key User Extensibility before classic exits.
6. **Custom fields** — use CI_* append structures; for S/4 prefer Custom Fields app and released CDS.

BAdI 우선 사용 원칙, 마일스톤 대금청구는 `PS_MILESTONE_BILL`를 권장합니다. S/4HANA에서는 CDS 확장 및 키 사용자 확장성을 먼저 고려하세요.
