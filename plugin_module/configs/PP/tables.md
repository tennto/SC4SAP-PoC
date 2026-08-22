# PP - Key Tables Reference
# PP - 주요 테이블 참조

## Master Data Tables

| Table | System | Description |
|-------|--------|-------------|
| MARA | ECC/S4 | Material Master (General Data) |
| MARC | ECC/S4 | Material Master (Plant Data) |
| STKO | ECC/S4 | BOM Header |
| STPO | ECC/S4 | BOM Items |
| MAST | ECC/S4 | Material-BOM Link |
| PLKO | ECC/S4 | Routing Header |
| PLPO | ECC/S4 | Routing Operations |
| MAPL | ECC/S4 | Material-Routing Link |
| CRHD | ECC/S4 | Work Center Header |
| CRCA | ECC/S4 | Work Center Capacity |
| CRTX | ECC/S4 | Work Center Text |

## Transaction Data Tables

| Table | System | Description |
|-------|--------|-------------|
| AUFK | ECC/S4 | Order Master |
| AFKO | ECC/S4 | Production Order Header |
| AFPO | ECC/S4 | Production Order Item |
| AFVC | ECC/S4 | Order Operations |
| AFVV | ECC/S4 | Order Operation Quantities |
| AFRU | ECC/S4 | Order Confirmations |
| RESB | ECC/S4 | Reservation / Dependent Requirements |
| MDKP | ECC/S4 | MRP Header |
| MDTB | ECC/S4 | MRP Table |
| PBIM | ECC/S4 | Planned Independent Requirements |
| PLAF | ECC/S4 | Planned Orders |

## Configuration Tables

| Table | System | Description |
|-------|--------|-------------|
| T399D | ECC/S4 | MRP Controller |
| T460A | ECC/S4 | Checking Group / Rule |
| T024D | ECC/S4 | MRP Controllers |
| T399A | ECC/S4 | Plant Settings |

## S/4HANA Specific

- Material master simplification: MATDOC replaces aggregate tables for inventory (cross-module impact on PP goods movements).
- MRP Live (PPH_MRP_*): MRP runs use HANA-optimized logic; classic MD01/MD02 still available but MD01N (MRP Live) is preferred in S/4HANA.
- Advanced Planning (aATP, pMRP) leverages embedded PP/DS tables (e.g., /SAPAPO/*) when activated.

## Related Tables

- MKPF / MSEG (ECC) — Material Documents; in S/4HANA superseded by MATDOC (compatibility views remain).
- EBAN / EBKN — Purchase Requisitions generated from MRP.
- COEP / COSP — Cost postings for production orders (CO integration).
- JEST / JCDS — Object status for production orders.
