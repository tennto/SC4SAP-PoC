# TR - Treasury BAPIs & Function Modules
# TR - 재무부(자금) BAPI 및 기능 모듈

## Core BAPIs
| BAPI/FM | System | Description | Usage |
|---------|--------|-------------|-------|
| BAPI_BANKACCOUNT_GETLIST | ECC/S4 | Get Bank Account List / 은행 계좌 목록 조회 | List bank accounts for company code from T012K |
| BAPI_BANKDETAIL_GETLIST | ECC/S4 | Get Bank Detail List / 은행 상세 목록 조회 | Read bank master data from BNKA |
| BAPI_PAYMENT_GETLIST | ECC/S4 | Get Payment List / 지급 목록 조회 | Retrieve payment items from PAYR |
| BAPI_ACC_GL_POSTING_POST | ECC/S4 | Post Bank Statement G/L Entries / 은행 명세서 G/L 전기 | Post manual bank statement entries |
| BAPI_FINTRANS_CREATE | ECC/S4 | Create Financial Transaction / 금융 거래 생성 | Create TRM financial transaction (money market, FX, derivatives) |
| BAPI_FINTRANS_CHANGE | ECC/S4 | Change Financial Transaction / 금융 거래 변경 | Modify existing TRM transaction |
| BAPI_FINTRANS_GETDETAIL | ECC/S4 | Get Financial Transaction Detail / 금융 거래 상세 조회 | Read TRM transaction from VDBI/VDBJHD |

## Cash Management FMs
| BAPI/FM | System | Description | Usage |
|---------|--------|-------------|-------|
| CASHMANAGEMENT_UPDATE | ECC/S4 | Update Cash Management / 현금 관리 갱신 | Update cash management position after FI postings |
| TR_CM_PLANNING_LEVEL_GET | ECC/S4 | Get Planning Level / 계획 수준 조회 | Read cash planning level assignments |
| FIEB_CHANGE_BSTATEMENT | ECC/S4 | Change Bank Statement / 은행 명세서 변경 | Process/change electronic bank statement items |
| BAPI_CAMT_STATEMENT_CREATE | ECC/S4 | Create Bank Statement (CAMT) / 은행 명세서 생성 (CAMT) | Import CAMT.053 format bank statements |

## Electronic Bank Statement FMs
| BAPI/FM | System | Description | Usage |
|---------|--------|-------------|-------|
| FEBC_IMPORT_BANK_STATEMENT | ECC/S4 | Import Bank Statement / 은행 명세서 가져오기 | Import external bank statement file |
| OFX_IMPORT_STATEMENT | ECC/S4 | Import OFX Statement / OFX 명세서 가져오기 | Import OFX format bank statement |
| FEBC_POST_BANK_STATEMENT | ECC/S4 | Post Bank Statement / 은행 명세서 전기 | Process and post imported bank statement |

## Utility FMs
| BAPI/FM | System | Description | Usage |
|---------|--------|-------------|-------|
| BAPI_EXCHANGERATE_GETDETAIL | ECC/S4 | Get Exchange Rate / 환율 조회 | Read exchange rate from TCURR for TR calculations |
| BAPI_EXCHANGERATE_SAVEREPLICA | ECC/S4 | Save Exchange Rate / 환율 저장 | Update exchange rate table TCURR |
| FTR_POSITION_GET | ECC/S4 | Get TR Position / TR 포지션 조회 | Read open position for treasury instrument |
| BAPI_LOAN_GETDETAIL | ECC/S4 | Get Loan Detail / 대출 상세 조회 | Read loan master and conditions from VDARL |
| TR_COUNTERPARTY_LIMIT_CHECK | ECC/S4 | Check Counterparty Limit / 거래 상대방 한도 검사 | Validate transaction against counterparty credit limit |
