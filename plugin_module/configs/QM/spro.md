# QM - Quality Management SPRO Configuration
# QM - 품질 관리 SPRO 설정

## Enterprise Structure
| Config Name | Table/View | Description |
|------------|-----------|-------------|
| Define Plant for QM | V_T001W | Plant definition for QM / QM용 플랜트 정의 |
| Activate QM for Materials | V_MARC_QM | Activate QM per material / 자재별 QM 활성화 |
| Define QM Control in Plant | V_T001W_QM | QM Control in Plant definition / 플랜트 QM 통제 정의 |

## Master Data
| Config Name | Table/View | Description |
|------------|-----------|-------------|
| Define Inspection Types | V_T161_QM | Inspection Type definition (01=GR from PO, 04=GR from production, 06=Delivery...) / 검사 유형 정의 (01=GR from PO, 04=GR from production, 06=Delivery...) |
| Define Sampling Procedures | V_T708 | Sampling Procedure definition / 샘플링 절차 정의 |
| Define Sampling Schemes | V_T710 | Sampling Scheme definition (AQL levels) / 샘플링 계획 정의 (AQL levels) |
| Define Dynamic Modification Rules | V_T713 | Dynamic Modification Rule definition / 동적 수정 규칙 정의 |
| Define Sampling Instructions | V_T712 | Sampling Instruction definition / 샘플링 지시 정의 |
| Define Inspection Methods | V_T706 | Inspection Method definition / 검사 방법 정의 |
| Define Inspection Catalogs | V_T705 | Inspection Catalog definition / 검사 카탈로그 정의 |
| Define Defect Classes | V_T705A | Defect Class definition / 결함 클래스 정의 |
| Define Code Groups for Defects | V_T705B | Code Group definition for defects / 결함 코드 그룹 정의 |

## Inspection Planning
| Config Name | Table/View | Description |
|------------|-----------|-------------|
| Define Control Keys for Characteristics | V_T706K | Characteristic Control Key definition / 특성 관리 키 정의 |
| Define Master Inspection Characteristics | V_QPAM | Master Inspection Characteristic definition / 마스터 검사 특성 정의 |
| Configure Inspection Plan Usage | V_T704 | Inspection Plan Usage configuration / 검사 계획 사용 유형 설정 |
| Define Inspection Plan Status | V_T704S | Inspection Plan Status definition / 검사 계획 상태 정의 |
| Configure Characteristic Attributes | V_CABN_QM | Characteristic Attribute configuration / 특성 속성 설정 |
| Define Tolerances / Specifications | V_QPMA | Tolerance / Specification definition / 허용 오차/규격 정의 |

## Quality Inspection (Results Recording)
| Config Name | Table/View | Description |
|------------|-----------|-------------|
| Define Usage Decision Catalog | V_T1006 | Usage Decision Catalog definition / 사용 결정 카탈로그 정의 |
| Define Follow-Up Actions | V_T1006F | Follow-Up Action definition / 후속 조치 정의 |
| Configure Stock Posting Rules | V_T1006P | Stock Posting Rule configuration / 재고 전기 규칙 설정 |
| Define QM Order Types | V_T003O_QM | QM Order Type definition / QM 주문 유형 정의 |
| Configure Defect Recording | V_T705C | Defect Recording configuration / 결함 기록 설정 |
| Define Sample Drawing Procedure | V_T711 | Sample Drawing Procedure definition / 샘플 추출 절차 정의 |

## Quality Notifications
| Config Name | Table/View | Description |
|------------|-----------|-------------|
| Define QM Notification Types | V_T351_QM | QM Notification Type definition (Q1=Customer complaint, Q2=Supplier complaint, Q3=Internal) / QM 알림 유형 정의 (Q1=Customer complaint, Q2=Supplier complaint, Q3=Internal) |
| Configure Catalog Profile for QM | V_T352B_QM | Catalog Profile configuration for QM / QM 카탈로그 프로파일 설정 |
| Define 8D Report Settings | V_T351_8D | 8D Report Settings definition / 8D 보고서 설정 정의 |
| Configure Partner Functions for QM | V_TPAR_QM | Partner Function configuration for QM / QM 파트너 기능 설정 |

## Certificates / Q-Info Records
| Config Name | Table/View | Description |
|------------|-----------|-------------|
| Define Certificate Types | V_T705E | Certificate Type definition / 인증서 유형 정의 |
| Configure Q-Info Record | V_QINF | Q-Info Record configuration / 품질 정보 레코드 설정 |
| Define Vendor Evaluation Criteria | V_T147 | Vendor Evaluation Criteria definition / 공급업체 평가 기준 정의 |
| Configure QM Procurement Key | V_T147K | QM Procurement Key configuration / QM 조달 키 설정 |

## Stability Studies
| Config Name | Table/View | Description |
|------------|-----------|-------------|
| Define Storage Conditions | V_QSTC | Storage Condition definition / 보관 조건 정의 |
| Define Study Types | V_QSTS | Stability Study Type definition / 안정성 연구 유형 정의 |
