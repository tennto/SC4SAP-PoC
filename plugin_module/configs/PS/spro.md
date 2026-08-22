# PS - Project System SPRO Configuration
# PS - 프로젝트 시스템 SPRO 설정

## Enterprise Structure
| Config Name | Table/View | Description |
|------------|-----------|-------------|
| Define Controlling Area | V_TKA01 | Controlling Area for project costing / 프로젝트 원가용 원가관리영역 |
| Define Company Code | V_T001 | Company Code assignment / 회사 코드 배정 |
| Assign Controlling Area to Company Code | V_TKA02 | CO Area to CoCd assignment / 원가관리영역과 회사코드 배정 |
| Define Business Area | V_TGSB | Business Area (optional for WBS) / 사업 영역 |
| Define Plant for PS | V_T001W | Plant (shared with MM/PP) / 플랜트 (MM/PP 공유) |

## Project Definition & Profiles
| Config Name | Table/View | Description |
|------------|-----------|-------------|
| Create Project Profile (OPSA) | V_TCJ41 | Project Profile — defaults for project def / 프로젝트 프로파일 기본값 |
| Define Status Profile (OK02) | V_TJ30A | User Status Profile / 사용자 상태 프로파일 |
| Define Project Types | V_TCJ1 | Project Type classification / 프로젝트 유형 |
| Define Priorities | V_TCJ2 | Project priority / 프로젝트 우선순위 |
| Number Range for Project Definition (CJ81) | NRIV (obj PS_PSPID) | Project Def number range / 프로젝트 정의 번호 범위 |
| Number Range for WBS Element | NRIV (obj PS_POSNR) | WBS internal number / WBS 내부 번호 |

## Network & Activities
| Config Name | Table/View | Description |
|------------|-----------|-------------|
| Define Network Types (OPSC) | V_T003O_NET | Network order type (e.g., PS01, PS02) / 네트워크 주문 유형 |
| Define Network Profile (OPUU) | V_TCNT | Network Profile — default parameters / 네트워크 프로파일 |
| Define Control Keys for Networks (OPSU) | V_TCA01 | Operation Control Key (PS01, PS02, PS04) / 공정 관리 키 |
| Define Parameters for Network Type | V_T399X_NET | Plant parameters for network type / 네트워크 유형 플랜트 매개변수 |
| Number Range for Network | NRIV (obj AUFTRAG) | Network order number range / 네트워크 번호 범위 |
| Activity Types for Networks | V_TKA03 | Activity Type linkage (CO) / 활동 유형 연결 |

## Planning & Budgeting
| Config Name | Table/View | Description |
|------------|-----------|-------------|
| Create Planning Profile (OPSB) | V_TCJ45 | Cost Planning Profile / 원가 계획 프로파일 |
| Planner Profile for Cost Planning (KP34) | V_TKA0F | Planner profile / 플래너 프로파일 |
| Create Budget Profile (OPS9) | V_TCJBU | Budget Profile — time frame, tolerances / 예산 프로파일 |
| Define Tolerance Limits (OPS8) | V_TKKB1 | Budget availability control tolerances / 가용성 관리 허용 한도 |
| Activate Project Cash Management (OT14) | V_T001F | Cash management in PS / 프로젝트 자금 관리 활성화 |
| Define Investment Profile (OITA) | V_TAIPR | Investment Profile (AuC) / 투자 프로파일 (건설 중 자산) |

## Milestones & Dates
| Config Name | Table/View | Description |
|------------|-----------|-------------|
| Define Milestone Usage (OPT6) | V_TCN21 | Milestone Usage (e.g., billing, percent-complete) / 마일스톤 사용 유형 |
| Standard Milestones | T812 | Standard milestone templates / 표준 마일스톤 템플릿 |
| Define Date Rules | V_TCN10 | Date rules for activities / 일정 규칙 |

## Settlement
| Config Name | Table/View | Description |
|------------|-----------|-------------|
| Define Settlement Profile (OKO7) | V_T8J5 | Settlement Profile (default: SDI, 20, etc.) / 정산 프로파일 |
| Define Allocation Structure (OKO6) | V_TKB1A | Allocation Structure for settlement / 배부 구조 |
| Define PA Transfer Structure (KEI1) | V_TKB9P | PA Transfer (CO-PA) / PA 전송 구조 |
| Define Source Structure (OKEU) | V_TKB1C | Source Structure for settlement / 원천 구조 |
| Default Settlement Rules | V_TCN60 | Strategies for rule derivation / 정산 규칙 전략 |

## Billing (Resource-Related / Milestone)
| Config Name | Table/View | Description |
|------------|-----------|-------------|
| DIP Profile (ODP1) | V_AD01C | Dynamic Item Processor profile (DP81/DP91) / DIP 프로파일 |
| Sales Pricing Source (ODP2) | V_AD01PR | Source assignments for billing / 대금청구 원천 배정 |
| Milestone Billing Plan Type (OVBO) | V_TVFK | Billing plan type / 대금청구 계획 유형 |
| Assign Billing Plan to Sales Doc | V_TFPLA_SD | Plan assignment / 계획 배정 |

## Progress & Reporting
| Config Name | Table/View | Description |
|------------|-----------|-------------|
| Progress Version (OPTV) | V_TCJ4T | Progress Version / 진행률 버전 |
| Define Measurement Methods (OPS6) | V_T7PEPE | POC measurement method / 완료도 측정 방식 |
| Info System Profile (CNS41) | V_TCNPR | Structure report profile / 구조 보고서 프로파일 |

## S/4HANA Specifics / S/4HANA 특이사항
- Project Control Fiori apps (F2730, F3368) replace CJ20N for many scenarios.
- Hierarchical Projects (S/4HANA 1909+) — simplified structure without networks for EPPM/PPM.
- ACDOCA replaces COEP/COSP/COSS for line items; customizing remains; reports use CDS views `I_Project*`.
