# FI - Key Tables Reference
# FI - 주요 테이블 참조

## Master Data Tables
| Table | System | Description |
|-------|--------|-------------|
| SKA1 | ECC/S4 | G/L Account Chart of Accounts |
| SKB1 | ECC/S4 | G/L Account Company Code (S/4HANA: includes cost element) |
| SKAT | ECC/S4 | G/L Account Descriptions |
| KNA1 | ECC | Customer — S/4HANA: BP |
| KNB1 | ECC | Customer Company Code — S/4HANA: BP |
| LFA1 | ECC | Vendor — S/4HANA: BP |
| LFB1 | ECC | Vendor Company Code — S/4HANA: BP |
| BUT000 | S4 | Business Partner |
| ANLA | ECC/S4 | Asset Master |
| ANLB | ECC/S4 | Asset Depreciation Areas |
| ANLC | ECC/S4 | Asset Values |
| ANKA | ECC/S4 | Asset Classes |

## Transaction Data Tables
| Table | System | Description |
|-------|--------|-------------|
| BKPF | ECC/S4 | Accounting Document Header |
| BSEG | ECC/S4 | Accounting Document Segment (S4: data mostly in ACDOCA) |
| ACDOCA | S4 | Universal Journal (single source of truth) |
| ACDOCP | S4 | Universal Plan Data |
| BSID | ECC/S4 | Customer Open Items |
| BSAD | ECC/S4 | Customer Cleared Items |
| BSIK | ECC/S4 | Vendor Open Items |
| BSAK | ECC/S4 | Vendor Cleared Items |
| BSIS | ECC/S4 | G/L Open Items — S/4HANA: generated views from ACDOCA |
| BSAS | ECC/S4 | G/L Cleared Items — S/4HANA: generated views from ACDOCA |
| REGUH | ECC/S4 | Payment Data Settlement |
| REGUP | ECC/S4 | Payment Data Processed |
| ANEK | ECC/S4 | Asset Document Header |
| ANEP | ECC/S4 | Asset Document Items |

## Configuration / Customizing Tables
| Table | System | Description |
|-------|--------|-------------|
| T001 | ECC/S4 | Company Codes |
| T003 | ECC/S4 | Document Types |
| T004 | ECC/S4 | Chart of Accounts |
| T009 | ECC/S4 | Fiscal Year Variants |
| T007A | ECC/S4 | Tax Keys (Output) |
| T007S | ECC/S4 | Tax Keys (Descriptions) |
| T012 | ECC/S4 | House Banks |
| T012K | ECC/S4 | House Bank Accounts |
| T030 | ECC/S4 | GL Account Determination |
| T077D | ECC | Customer Account Groups |
| T077K | ECC | Vendor Account Groups |

## S/4HANA Specific Tables
| Table | System | Description |
|-------|--------|-------------|
| ACDOCA | S4 | Universal Journal |
| ACDOCP | S4 | Planning data |
| BKPF | ECC/S4 | Header remains, but line items in ACDOCA |
| FAGLFLEXA | ECC | New GL (pre-S/4HANA) — replaced by ACDOCA |
| FAGLFLEXT | ECC | New GL Totals (pre-S/4HANA) — replaced by ACDOCA |

## Related / Cross-Module Tables
| Table | System | Description |
|-------|--------|-------------|
| CSKS | ECC/S4 | Cost Center Master (CO) |
| CEPC | ECC/S4 | Profit Center Master (CO) |
