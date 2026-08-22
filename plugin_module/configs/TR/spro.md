# TR - Treasury SPRO Configuration
# TR - 재무부(자금) SPRO 설정

## Enterprise Structure
| Config Name | Table/View | Description |
|------------|-----------|-------------|
| Define Company Code for TR | V_T001 | Company Code definition for TR / TR용 회사코드 정의 |
| Define House Banks | V_T012 | House Bank definition / 주거래 은행 정의 |
| Define Bank Accounts | V_T012K | Bank Account definition / 은행 계좌 정의 |
| Assign Bank Accounts to G/L Accounts | V_T012B | Assign Bank Accounts to G/L Accounts / 은행 계좌를 G/L 계정에 배정 |
| Define Business Areas for TR | V_TGSB_TR | Business Area definition for TR / TR용 사업 영역 정의 |

## Cash Management
| Config Name | Table/View | Description |
|------------|-----------|-------------|
| Define Planning Levels | V_T036 | Planning Level definition / 계획 수준 정의 |
| Define Planning Groups | V_T036G | Planning Group definition / 계획 그룹 정의 |
| Assign G/L Accounts to Planning Levels | V_T036A | Assign G/L Accounts to Planning Levels / G/L 계정을 계획 수준에 배정 |
| Define Cash Concentration Groups | V_T036C | Cash Concentration Group definition / 현금 집중 그룹 정의 |
| Configure Electronic Bank Statement | V_T036E | Electronic Bank Statement configuration / 전자 은행 명세서 설정 |
| Define Account Symbols | V_T036I | Account Symbol definition / 계정 기호 정의 |
| Map Account Symbols to G/L Accounts | V_T036J | Map Account Symbols to G/L Accounts / 계정 기호를 G/L 계정에 매핑 |
| Define Transaction Types (EBS) | V_T036K | Electronic Bank Statement Transaction Type definition / 전자 은행 명세서 거래 유형 정의 |
| Configure Manual Bank Statement | V_T030 | Manual Bank Statement configuration / 수동 은행 명세서 설정 |

## Treasury and Risk Management (TRM)
| Config Name | Table/View | Description |
|------------|-----------|-------------|
| Define Transaction Types (TRM) | V_TZF0 | TRM Transaction Type definition / TRM 거래 유형 정의 |
| Define Product Types | V_TVTFT | Financial Product Type definition / 금융 상품 유형 정의 |
| Define Portfolio | V_TZPL | Portfolio definition / 포트폴리오 정의 |
| Define Risk Types | V_TZRT | Risk Type definition / 위험 유형 정의 |
| Configure Market Risk Analyzer | V_TRS1 | Market Risk Analyzer configuration / 시장 위험 분석기 설정 |
| Define Condition Types (TRM) | V_TZTK | TRM Condition Type definition / TRM 조건 유형 정의 |
| Define Business Partner for TR | V_TZP0 | Business Partner definition for TR / TR 비즈니스 파트너 정의 |
| Define Counterparty Limits | V_TZPG | Counterparty Limit definition / 거래 상대방 한도 정의 |

## Loans Management
| Config Name | Table/View | Description |
|------------|-----------|-------------|
| Define Loan Types | V_TDARLV | Loan Type definition / 대출 유형 정의 |
| Define Condition Types for Loans | V_TDARLB | Loan Condition Type definition / 대출 조건 유형 정의 |
| Define Interest Calculation Methods | V_TDARLI | Interest Calculation Method definition / 이자 계산 방법 정의 |
| Define Collateral Types | V_TDARLS | Collateral Type definition / 담보 유형 정의 |
| Configure Repayment Methods | V_TDARLR | Repayment Method configuration / 상환 방법 설정 |

## Payment Management
| Config Name | Table/View | Description |
|------------|-----------|-------------|
| Define Payment Methods for TR | V_T042_TR | Payment Method definition for TR / TR용 지급 방법 정의 |
| Configure SWIFT Message Types | V_T042S | SWIFT Message Type configuration / SWIFT 메시지 유형 설정 |
| Define Netting Procedures | V_T042N | Netting Procedure definition / 상계 절차 정의 |
| Configure Payment Medium Formats | V_T042M | Payment Medium Format configuration / 지급 매체 형식 설정 |
