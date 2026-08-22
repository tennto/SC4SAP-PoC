# MM - Materials Management SPRO Configuration
# MM - 자재 관리 SPRO 설정

## Enterprise Structure
| Config Name | System | Table/View | Description |
|------------|--------|-----------|-------------|
| Define Plant | ECC/S4 | V_T001W | Plant definition / 플랜트 정의 |
| Define Storage Location | ECC/S4 | V_T001L | Storage Location definition / 저장 위치 정의 |
| Define Purchasing Organization | ECC/S4 | V_T024E | Purchasing Organization definition / 구매 조직 정의 |
| Assign Purchasing Organization to Company Code | ECC/S4 | V_T024E_KO | Assign Purchasing Organization to Company Code / 구매 조직을 회사코드에 배정 |
| Assign Purchasing Organization to Plant | ECC/S4 | V_T024E_WE | Assign Purchasing Organization to Plant / 구매 조직을 플랜트에 배정 |
| Define Purchasing Group | ECC/S4 | V_T024 | Purchasing Group definition / 구매 그룹 정의 |
| Assign Plant to Company Code | ECC/S4 | V_T001K | Assign Plant to Company Code / 플랜트를 회사코드에 배정 |

## Master Data
| Config Name | System | Table/View | Description |
|------------|--------|-----------|-------------|
| Define Material Types | ECC/S4 | V_T134 | Material Type definition (ROH, HALB, FERT, HAWA...) / 자재 유형 정의 (ROH, HALB, FERT, HAWA...) |
| Define Number Ranges for Material Types | ECC/S4 | T134 | Number Ranges for Material Types / 자재 유형별 번호 범위 |
| Define Industry Sectors | ECC/S4 | V_T137 | Industry Sectors definition / 산업 분야 정의 |
| Define Material Groups | ECC/S4 | V_T023 | Material Groups definition / 자재 그룹 정의 |
| Define Units of Measure | ECC/S4 | T006 | Units of Measure definition / 측정 단위 정의 |
| Define Vendor Account Groups | ECC | V_T077K | Vendor Account Groups definition / 공급업체 계정 그룹 정의 — S/4HANA: BP Groups via BUCF |
| Define Number Ranges for Vendors | ECC | T077K | Number Ranges for Vendors / 공급업체 번호 범위 — S/4HANA: BP Number Ranges via BUCF |
| Define Info Record Types | ECC/S4 | V_EINE | Info Record Types definition / 정보 레코드 유형 정의 |
| Define Source List | ECC/S4 | V_EORD | Source List definition / 소스 목록 정의 |

## Basic Functions / Valuation
| Config Name | System | Table/View | Description |
|------------|--------|-----------|-------------|
| Define Valuation Areas | ECC/S4 | V_T001K | Valuation Areas definition / 평가 영역 정의 |
| Define Valuation Classes | ECC/S4 | V_T025 | Valuation Classes definition / 평가 클래스 정의 |
| Define Account Category Reference | ECC/S4 | V_T025B | Account Category Reference definition / 계정 범주 참조 정의 |
| Configure Account Determination | ECC/S4 | V_OBYC | Automatic Account Determination (GBB, BSX...) / 자동 계정 결정 설정 (GBB, BSX...) |
| Define Price Control | ECC/S4 | V_T001W_PC | Price Control definition (S=Standard, V=Moving Average) / 가격 통제 정의 (S=Standard, V=Moving Average) |
| Split Valuation Configuration | ECC/S4 | V_T149D | Split Valuation Configuration / 분할 평가 설정 |

## Purchasing Configuration
| Config Name | System | Table/View | Description |
|------------|--------|-----------|-------------|
| Define Document Types for PO | ECC/S4 | V_T161 | PO Document Types definition (NB, FO, UB...) / 구매 오더 문서 유형 정의 (NB, FO, UB...) |
| Define Number Ranges for PO | ECC/S4 | T161 | Number Ranges for PO / 구매 오더 번호 범위 |
| Define Item Categories for PO | ECC/S4 | V_T163 | PO Item Categories definition (K, L, D, B...) / 구매 오더 항목 범주 정의 (K, L, D, B...) |
| Define Account Assignment Categories | ECC/S4 | V_T163K | Account Assignment Categories definition (K=Cost Center, P=Project...) / 계정 배정 범주 정의 (K=Cost Center, P=Project...) |
| Set Tolerance Limits for PO | ECC/S4 | V_T169G | Tolerance Limits for PO / 구매 오더 허용 오차 한도 설정 |
| Define Release Procedures (PO) | ECC/S4 | V_T16FK | PO Release Procedures definition / 구매 오더 릴리즈 절차 정의 |
| Configure Conditions for Purchasing | ECC/S4 | V_T685_MM | Conditions for Purchasing / 구매 조건 설정 |
| Define Price Determination Schema | ECC/S4 | V_T683_MM | Price Determination Schema definition / 가격 결정 스키마 정의 |

## Inventory Management
| Config Name | System | Table/View | Description |
|------------|--------|-----------|-------------|
| Define Movement Types | ECC/S4 | V_156 | Movement Types definition (101, 201, 261, 301...) / 이동 유형 정의 (101, 201, 261, 301...) |
| Define Special Stock Types | ECC/S4 | V_T148 | Special Stock Types definition / 특수 재고 유형 정의 |
| Configure Goods Receipt Tolerances | ECC/S4 | V_WEPOS | Goods Receipt Tolerances / 입고 허용 오차 설정 |
| Define Reasons for Goods Movements | ECC/S4 | V_T157H | Reasons for Goods Movements definition / 재고 이동 이유 정의 |
| Set Missing Parts Checking | ECC/S4 | V_MDMT | Missing Parts Checking / 누락 부품 검사 설정 |

## Invoice Verification (LIV)
| Config Name | System | Table/View | Description |
|------------|--------|-----------|-------------|
| Configure Tolerance Limits (LIV) | ECC/S4 | V_T169G | Invoice Verification Tolerance Limits / 송장 검증 허용 오차 한도 |
| Define Blocking Reasons (LIV) | ECC/S4 | V_T169L | Invoice Blocking Reasons definition / 송장 블록 이유 정의 |
| Configure Automatic Settlement | ECC/S4 | V_RBKP | Automatic Settlement configuration / 자동 정산 설정 |
| Define Tax Codes for Purchasing | ECC/S4 | V_T059Z | Tax Codes for Purchasing definition / 구매용 세금 코드 정의 |
