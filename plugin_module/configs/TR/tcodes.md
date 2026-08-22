# TR - Treasury Transaction Codes
# TR - 재무부(자금) 트랜잭션 코드

## Master Data
| TCode | System | Description |
|-------|--------|-------------|
| FI12 | ECC/S4 | Change Bank Accounts / 은행 계좌 변경 |
| FI13 | ECC/S4 | Display House Banks / 주거래 은행 조회 |
| BP | ECC/S4 | Maintain Business Partners / 비즈니스 파트너 유지 |
| TM01 | ECC/S4 | Create Financial Transaction / 금융 거래 생성 |
| TM02 | ECC/S4 | Change Financial Transaction / 금융 거래 변경 |

## Cash Management
| TCode | System | Description |
|-------|--------|-------------|
| FF7A | ECC/S4 | Cash Position / 현금 포지션 (S/4HANA: Fiori Cash Management preferred) |
| FF7B | ECC/S4 | Liquidity Forecast / 유동성 예측 (S/4HANA: Fiori Cash Management preferred) |
| FF.5 | ECC/S4 | Cash Concentration / 현금 집중 |
| FEBAN | ECC/S4 | Electronic Bank Statement / 전자 은행 명세서 |
| FF67 | ECC/S4 | Manual Bank Statement / 수동 은행 명세서 |
| FF68 | ECC/S4 | Manual Check Deposit / 수동 수표 예치 |
| FEB_BSPROC | ECC/S4 | Process Electronic Bank Statements / 전자 은행 명세서 처리 |

## Treasury Instruments
| TCode | System | Description |
|-------|--------|-------------|
| TBB1 | ECC/S4 | Post Financial Transaction / 금융 거래 전기 |
| TBB5 | ECC/S4 | Rollover Financial Transaction / 금융 거래 롤오버 |
| TBBA | ECC/S4 | Reverse Financial Transaction / 금융 거래 역전 |
| TBC0 | ECC/S4 | Display Transaction / 거래 조회 |
| TBRZ | ECC/S4 | Interest Accrual/Deferral / 이자 발생/이연 |
| TBLB | ECC/S4 | Post Correspondence for TR / TR 서신 전기 |

## Loans Management
| TCode | System | Description |
|-------|--------|-------------|
| FN01 | ECC/S4 | Create Loan / 대출 생성 |
| FN02 | ECC/S4 | Change Loan / 대출 변경 |
| FN03 | ECC/S4 | Display Loan / 대출 조회 |
| FN50 | ECC/S4 | Post Disbursement / 지급 전기 |
| FNS1 | ECC/S4 | Loan Repayment / 대출 상환 |

## Configuration
| TCode | System | Description |
|-------|--------|-------------|
| SPRO | ECC/S4 | Treasury Customizing / 재무부 커스터마이징 |
| OT55 | ECC/S4 | Define Planning Levels / 계획 수준 정의 |
| OT51 | ECC/S4 | Assign G/L to Planning Levels / G/L을 계획 수준에 배정 |
| OT29 | ECC/S4 | Define Transaction Types (TRM) / 거래 유형 정의 |

## Reporting
| TCode | System | Description |
|-------|--------|-------------|
| FF.6 | ECC/S4 | Payment Advice Notes / 지급 통지서 |
| FDES | ECC/S4 | Cash Flow / 현금 흐름 |
| TXB3 | ECC/S4 | Exposure Analysis / 익스포저 분석 |
| FF70 | ECC/S4 | Bank Account Balance / 은행 계좌 잔액 |
| S_PLN_06000113 | ECC/S4 | Cash Management Summary / 현금 관리 요약 |

## Monitoring
| TCode | System | Description |
|-------|--------|-------------|
| FDFD | ECC/S4 | Cash and Liquidity Management / 현금 및 유동성 관리 |
| TM60 | ECC/S4 | Position Management / 포지션 관리 |
| TMAP | ECC/S4 | Market Risk Analyzer / 시장 위험 분석기 |
| FWVP | ECC/S4 | Forward Exchange Contracts Monitor / 선물환 계약 모니터 |
