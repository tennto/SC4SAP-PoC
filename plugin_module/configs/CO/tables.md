# CO - Key Tables Reference
# CO - 주요 테이블 참조

## Master Data Tables
| Table | System | Description |
|-------|--------|-------------|
| CSKS | ECC/S4 | Cost Center Master |
| CSKA | ECC | Cost Element (COA) — S/4HANA: G/L account (SKA1/SKB1) |
| CSKB | ECC | Cost Element (CC) — S/4HANA: SKB1 with cost element category |
| AUFK | ECC/S4 | Internal Order Master |
| TKA01 | ECC/S4 | Controlling Areas |
| CEPC | ECC/S4 | Profit Center Master |
| KNA1+KNVV | ECC | Customer — CO-PA derivation source |

## Transaction Data Tables
| Table | System | Description |
|-------|--------|-------------|
| COBK | ECC | CO Document Header — S/4HANA: merged to ACDOCA |
| COEP | ECC | CO Line Items — S/4HANA: data in ACDOCA |
| COSP | ECC | CO Totals External — S/4HANA: derived from ACDOCA |
| COSS | ECC | CO Totals Internal — S/4HANA: derived from ACDOCA |
| ACDOCA | S4 | Universal Journal (CO postings here in S4) |
| CE1xxxx | ECC/S4 | CO-PA Actual Line Items (operating concern) |
| CE2xxxx | ECC/S4 | CO-PA Plan Line Items |
| CE3xxxx | ECC/S4 | CO-PA Segment Level |
| CE4xxxx | ECC/S4 | CO-PA Segment Table |
| KEKO | ECC/S4 | Product Cost Estimate Header |
| KEPH | ECC/S4 | Product Cost Estimate Items |
| CKMLPP | ECC/S4 | Material Ledger Period Totals |
| CKMLCR | ECC/S4 | Material Ledger Data |

## Configuration / Customizing Tables
| Table | System | Description |
|-------|--------|-------------|
| TKA02 | ECC/S4 | Controlling Area Assignment |
| TKEB | ECC/S4 | Operating Concerns |
| T022 | ECC/S4 | Order Types |
| T003O | ECC/S4 | Order Categories |

## S/4HANA Specific Tables
| Table | System | Description |
|-------|--------|-------------|
| ACDOCA | S4 | Replaces COBK/COEP/COSP/COSS/GLPCA |
| SKA1 | S4 | Cost elements merged with G/L accounts |
| SKB1 | S4 | Cost elements merged with G/L accounts (cost element category) |
| GLPCA | ECC | Profit Center Actuals — replaced by ACDOCA |

## Related / Cross-Module Tables
| Table | System | Description |
|-------|--------|-------------|
| BKPF | ECC/S4 | Accounting Document Header (FI) |
| ANLA | ECC/S4 | Asset Master (FI-AA) |
| MARA | ECC/S4 | Material Master (for product costing) |
