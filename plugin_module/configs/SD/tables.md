# SD - Key Tables Reference
# SD - 주요 테이블 참조

## Master Data Tables
| Table | System | Description |
|-------|--------|-------------|
| KNA1 | ECC | Customer Master General — S/4HANA: BUT000 |
| KNB1 | ECC | Customer Company Code — S/4HANA: merged BP |
| KNVV | ECC/S4 | Customer Sales Data |
| KNVP | ECC/S4 | Customer Partner Functions |
| BUT000 | S4 | Business Partner |
| MVKE | ECC/S4 | Material Sales Data |

## Transaction Data Tables
| Table | System | Description |
|-------|--------|-------------|
| VBAK | ECC/S4 | Sales Document Header |
| VBAP | ECC/S4 | Sales Document Item |
| VBEP | ECC/S4 | Schedule Line |
| VBKD | ECC/S4 | Business Data |
| VBPA | ECC/S4 | Partners |
| VBFA | ECC/S4 | Document Flow |
| VBUK | ECC/S4 | Header Status |
| VBUP | ECC/S4 | Item Status |
| LIKP | ECC/S4 | Delivery Header |
| LIPS | ECC/S4 | Delivery Item |
| VBRK | ECC/S4 | Billing Header |
| VBRP | ECC/S4 | Billing Item |
| VBRL | ECC/S4 | Billing SD Link |
| KONV | ECC | Conditions (document) — S/4HANA: PRCD_ELEMENTS |
| PRCD_ELEMENTS | S4 | Pricing conditions (replaces KONV) |
| KONH | ECC/S4 | Conditions Header |
| KONP | ECC/S4 | Conditions Item |
| Axxx | ECC/S4 | Condition Tables (A005, A304...) |

## Configuration / Customizing Tables
| Table | System | Description |
|-------|--------|-------------|
| TVKO | ECC/S4 | Sales Organizations |
| TVTW | ECC/S4 | Distribution Channels |
| TVBUR | ECC/S4 | Sales Offices |
| TVAK | ECC/S4 | Sales Document Types |
| TVAP | ECC/S4 | Item Categories |
| TVEP | ECC/S4 | Schedule Line Categories |
| T683 | ECC/S4 | Pricing Procedures |
| T685 | ECC/S4 | Condition Types |
| TVAG | ECC/S4 | Rejection Reasons |

## S/4HANA Specific Tables
| Table | System | Description |
|-------|--------|-------------|
| PRCD_ELEMENTS | S4 | Pricing doc conditions |
| BUT000 | S4 | BP for customers |

## Related / Cross-Module Tables
| Table | System | Description |
|-------|--------|-------------|
| T001 | ECC/S4 | Company Code |
| MARA | ECC/S4 | Material Master |
