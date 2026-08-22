# TR Module Enhancements / TR 모듈 개선사항

## Overview / 개요

Treasury and Risk Management enhancements cover financial transactions, cash management, electronic bank statement processing, in-house cash, and market risk. TR makes heavy use of **BTE (Business Transaction Events)** alongside classic BAdIs.

| Type / 유형 | Description / 설명 |
|------|-------------|
| Customer Exits (CMOD) | Bank statement, treasury, loans, funds mgmt |
| BTE | Business Transaction Events (critical for TR/CM) |
| BAdIs | Financial transactions, cash mgmt, IHC, risk |
| Enhancement Spots | FSCM enhancement containers |
| EBS processing | Posting rules, interpretation algorithms |
| IHC | In-House Cash payment processing |

---

## Classic Customer Exits (CMOD/SMOD)

| Name | System | Description | Usage |
|------|--------|-------------|-------|
| FEBOLD0001 | ECC | Bank statement old format | Legacy bank statement format exit |
| FEB00001 | ECC | Electronic bank statement | EBS processing exit 1 |
| FEB00002 | ECC | Electronic bank statement | EBS processing exit 2 |
| FEB00003 | ECC | Electronic bank statement | EBS processing exit 3 |
| TPMW_GENERIC | ECC | Treasury generic | Generic treasury workstation exit |
| TPMPROD01 | ECC | Treasury production | Treasury production data exit |
| JBDFIARL01 | ECC | Loans | Loans management exit 1 |
| JBDFIARL02 | ECC | Loans | Loans management exit 2 |
| FMFW00001 | ECC | Funds management | Funds management exit |
| FARC_TRA0001 | ECC | Archiving treasury | Treasury archiving exit |

---

## Business Transaction Events (BTE) for TR / Cash Management

| Event | System | Description | Usage |
|-------|--------|-------------|-------|
| 00001063 | ECC/S4 | Bank statement: posting rules | Custom posting logic on EBS |
| 00001820 | ECC/S4 | Treasury transaction posting | Treasury posting customization |
| 00001830 | ECC/S4 | Cash management update | CM update logic |
| 00001840 | ECC/S4 | Cash position refresh | Cash position logic |

---

## BAdIs

| Name | System | Description | Usage |
|------|--------|-------------|-------|
| FTR_BADI | ECC/S4 | Financial transactions | TR-TM transaction enhancements |
| FTR_TRANSACTION_CONTROL | ECC/S4 | Transaction control | Control transaction processing |
| FTR_VALUATION | ECC/S4 | Valuation logic | Custom valuation |
| FSCM_CMAN_MEMO | ECC/S4 | Cash management memo | Memo record logic |
| FDCB_SUBBST | ECC/S4 | Payment program substitution | Payment program field substitution |
| IHC_PAYMENT | ECC/S4 | In-house cash payment | IHC payment processing |
| IHC_PAYMENT_FORM | ECC/S4 | IHC payment format | IHC payment form customization |
| JBRX_ADDON | ECC/S4 | Market risk analyzer | Risk analyzer add-ons |
| JBR_BADI_PRODUCT_ENH | ECC/S4 | Product enhancement | Product definition enhancement |
| CNV_MDT_NUM_CHANGES | ECC/S4 | Number changes | Number range changes |
| BADI_FITR_RATE | ECC/S4 | Exchange rate | Custom FX rate logic |
| BAI2_BADI_LOCK | ECC/S4 | Bank statement lock | Lock logic for BAI2 statements |
| CNTR_CTPTY_LIMIT_CHECK | ECC/S4 | Counterparty limit | Counterparty limit check |

---

## Enhancement Spots / 향상 스팟

| Name | System | Description | Usage |
|------|--------|-------------|-------|
| ES_FSCM_CMAN | ECC/S4 | FSCM Cash Management enhancement spot | Container for CM BAdIs |

---

## Module-Specific Special Enhancements / 모듈별 특수 개선

### Electronic Bank Statement (EBS) Processing / 전자 은행 명세서 처리

- **Posting rules (OT83)**: Extensible via BTE `00001063`
- **External transaction types (OT51)**: Mapping external codes to posting rules
- **Interpretation algorithm (OT55)**: Controls how statement lines are interpreted
- **Search string configuration**: Intelligent matching against open items
- **Custom posting logic**: Implement via BTE `00001063`

### Cash Flow Forecast / 현금 흐름 예측

- **Planning levels / groups (OT55)**: Determine cash flow aggregation
- **BAdI `FSCM_CMAN_MEMO`**: Memo record logic for planned flows
- **User exits**: For custom cash flow sources

### In-House Cash (IHC) / 사내 은행

- **BAdI `IHC_PAYMENT`**: Payment processing in IHC
- **IHC accounts customization**: Transaction `FBICA1`
- **Payment formats**: `IHC_PAYMENT_FORM`

### Market Risk Analyzer / 시장 위험 분석기

- **BAdI `JBRX_ADDON`**: Custom risk calculations
- **Customer-specific risk metrics**: VaR, sensitivity, scenario analysis

---

## Custom Fields / Append Structures / 커스텀 필드

| Append | System | Target Table | Purpose |
|--------|--------|--------------|---------|
| CI_VTBFHA | ECC/S4 | VTBFHA | Financial transaction |
| CI_FDSR | ECC/S4 | FDSR | Cash management |
| CI_FPOS | ECC/S4 | FPOS | Planning items |
| CI_T012K | ECC/S4 | T012K | Bank accounts |

---

## S/4HANA Extensions (CDS/RAP) / S/4HANA 확장

- **SAP Cash Management (on S/4HANA)** replaces classic CM.
- **New tables**: `FCLM_BAM_AMD` (Bank Account Master), `FQM_FLOW` (Cash flow one-exposure model).
- **Bank Account Management (BAM)**: Fiori-based, extensible via Key User Extensibility.
- **CDS views**: `I_BankAccount`, `I_CashFlow`, etc.
- **Advanced Credit Management (FSCM-CR)**: Own BAdIs with prefix `BADI_FSCM_CR_*`.
- **BAdIs**: `FCLM_BAM_AMD_BADI` (Bank Account Master Data), `FCLM_BAM_SIG_PROC` (Signature process).

---

## Recommended Approach / 권장 접근법

- **S/4HANA / S/4HANA**: Use new **Cash Management (BAM)** and **Fiori Key User Extensibility** for field-level extensions.
- **Legacy ECC / 레거시 ECC**: Combine **BTE + BAdI** — BTEs for event-driven logic, BAdIs for object-level extensions.
- **EBS**: Always prefer BTE `00001063` over CMOD `FEB00001-00003`.
- **Avoid modifications**: Use documented enhancement points only — TR modifications are risky due to compliance and audit implications.
