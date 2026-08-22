# FI - Financial Accounting BAPIs & Function Modules
# FI - 재무 회계 BAPI 및 기능 모듈

## Core BAPIs
| BAPI/FM | System | Description | Usage |
|---------|--------|-------------|-------|
| BAPI_ACC_DOCUMENT_POST | ECC/S4 | Post Accounting Document / 회계 문서 전기 | Universal FI document posting: G/L, AR, AP entries via ACCOUNTGL, ACCOUNTRECEIVABLE, ACCOUNTPAYABLE, CURRENCYAMOUNT tables |
| BAPI_ACC_DOCUMENT_CHECK | ECC/S4 | Check Accounting Document / 회계 문서 검사 | Validate document before posting (same structure as POST) |
| BAPI_ACC_DOCUMENT_REV_POST | ECC/S4 | Reverse Accounting Document / 회계 문서 역전 | Reverse a posted accounting document |
| BAPI_COMPANYCODE_GETLIST | ECC/S4 | Get Company Code List / 회사코드 목록 조회 | Retrieve list of all company codes |
| BAPI_COMPANYCODE_GETDETAIL | ECC/S4 | Get Company Code Detail / 회사코드 상세 조회 | Read company code master data (T001) |
| BAPI_GL_GETGLACCBALANCE | ECC/S4 | Get G/L Account Balance / G/L 계정 잔액 조회 | Read G/L account balance for period/fiscal year |
| BAPI_GL_GETGLACCCURRENTBALANCE | ECC/S4 | Get Current G/L Balance / 현재 G/L 잔액 조회 | Read current balance including open items |
| BAPI_GL_GETLINEITEMS | ECC | Get G/L Line Items / G/L 항목 조회 | Retrieve G/L account line items (BSEG-based). S/4HANA: Use CDS views on ACDOCA |
| BAPI_CUSTOMER_GETDETAIL2 | ECC | Get Customer FI Detail / 고객 FI 상세 조회 | Read customer master (KNA1, KNB1). S/4HANA: Use BP APIs (BUT000-based) |
| BAPI_VENDOR_GETDETAIL | ECC | Get Vendor FI Detail / 공급업체 FI 상세 조회 | Read vendor master (LFA1, LFB1). S/4HANA: Use BP APIs (BUT000-based) |

## AP/AR BAPIs
| BAPI/FM | System | Description | Usage |
|---------|--------|-------------|-------|
| BAPI_AR_ACC_GETOPENITEMS | ECC/S4 | Get AR Open Items / AR 미결 항목 조회 | Read open receivable items for customer |
| BAPI_AP_ACC_GETOPENITEMS | ECC/S4 | Get AP Open Items / AP 미결 항목 조회 | Read open payable items for vendor |
| BAPI_INCOMING_PAYMENT_POST | ECC/S4 | Post Incoming Payment / 수신 지급 전기 | Post customer payment with clearing |
| BAPI_OUTGOING_PAYMENT_POST | ECC/S4 | Post Outgoing Payment / 송신 지급 전기 | Post vendor payment with clearing |

## Asset Accounting BAPIs
| BAPI/FM | System | Description | Usage |
|---------|--------|-------------|-------|
| BAPI_FIXEDASSET_OVRTAKE_CREATE | ECC/S4 | Create Asset (Take Over) / 자산 생성 (인수) | Create fixed asset master with initial values |
| BAPI_FIXEDASSET_CHANGE | ECC/S4 | Change Asset Master / 자산 마스터 변경 | Modify fixed asset master data |
| BAPI_FIXEDASSET_GETDETAIL | ECC/S4 | Get Asset Detail / 자산 상세 조회 | Read asset master data (ANLA, ANLB) |
| BAPI_ACC_GL_POSTING_POST | ECC/S4 | Post GL Posting for Asset / 자산 G/L 전기 | Post acquisition, retirement, transfer for assets |

## S/4HANA Finance APIs
| BAPI/FM | System | Description | Usage |
|---------|--------|-------------|-------|
| FINS_ACDOCA_READ | S4 | Read Universal Journal / 유니버설 저널 조회 | Read from ACDOCA (replaces BSEG/BSAS/BSIS line item tables) |
| BAPI_BUPA_CREATE_FROM_DATA | S4 | Create Business Partner / 비즈니스 파트너 생성 | Create customer/vendor as BP with CVI roles |
| BAPI_BUPA_CHANGE_FROM_DATA | S4 | Change Business Partner / 비즈니스 파트너 변경 | Modify BP master data |

## Utility FMs
| BAPI/FM | System | Description | Usage |
|---------|--------|-------------|-------|
| FI_DOCUMENT_CHANGE | ECC/S4 | Change FI Document / FI 문서 변경 | Change permitted fields on posted FI document |
| AC_DOCUMENT_CREATE | ECC/S4 | Create Accounting Document / 회계 문서 생성 | Internal low-level document creation (used by BAPIs) |
| CALCULATE_TAX_FROM_NET_AMOUNT | ECC/S4 | Calculate Tax from Net / 순액 기준 세금 계산 | Calculate tax amount from net amount and tax code |
| CALCULATE_TAX_FROM_GROSSAMOUNT | ECC/S4 | Calculate Tax from Gross / 총액 기준 세금 계산 | Calculate tax from gross amount and tax code |
| FI_PERIOD_DETERMINE | ECC/S4 | Determine Posting Period / 전기 기간 결정 | Determine fiscal year and posting period from date |
| BAPI_EXCHANGERATE_GETDETAIL | ECC/S4 | Get Exchange Rate / 환율 조회 | Read exchange rate for currency pair and date |
