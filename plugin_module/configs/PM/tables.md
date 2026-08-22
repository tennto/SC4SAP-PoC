# PM - Key Tables Reference
# PM - 주요 테이블 참조

## Master Data Tables

| Table | System | Description |
|-------|--------|-------------|
| IFLO | ECC/S4 | Functional Location |
| IFLOT | ECC/S4 | Functional Location Text |
| IFLOTX | ECC/S4 | Functional Location Text Description |
| EQUI | ECC/S4 | Equipment Master |
| EQKT | ECC/S4 | Equipment Short Text |
| EQUZ | ECC/S4 | Equipment Time Segment |
| ITOB | ECC/S4 | Technical Object Master |
| ILOA | ECC/S4 | PM Object Location / Account Assignment |
| MPLA | ECC/S4 | Maintenance Plan Header |
| MPOS | ECC/S4 | Maintenance Plan Items |
| MHIS | ECC/S4 | Maintenance Plan Call History |
| MMPT | ECC/S4 | Maintenance Strategies |

## Transaction Data Tables

| Table | System | Description |
|-------|--------|-------------|
| AUFK | ECC/S4 | Order Master |
| AFIH | ECC/S4 | Maintenance Order Header |
| AFKO | ECC/S4 | Order Header |
| AFVC | ECC/S4 | Operations |
| RESB | ECC/S4 | Reservations |
| QMEL | ECC/S4 | Notification Header |
| QMIH | ECC/S4 | Notification Maintenance |
| QMFE | ECC/S4 | Notification Items |
| QMMA | ECC/S4 | Notification Activities |
| IMRG | ECC/S4 | Measurement Documents |
| IMPT | ECC/S4 | Measuring Points |
| JEST | ECC/S4 | Object Status |
| JCDS | ECC/S4 | Status Change History |

## Configuration Tables

| Table | System | Description |
|-------|--------|-------------|
| T352T | ECC/S4 | Maintenance Task List Types |
| T370K | ECC/S4 | Maintenance Order Types |

## S/4HANA Specific

- Asset Central Foundation (ACF) integration via S/4HANA Asset Management for Operations (formerly EAM) — equipment/functional location synchronize with ACF master data.
- Fiori apps (e.g., Maintenance Scheduling Board, Manage Technical Objects) use CDS views over IFLO/EQUI.
- Mobile Asset Management integrates via OData services built on PM tables.

## Related Tables

- MARA / MARC — Material master for spare parts used in maintenance orders.
- COEP / COSP — Cost postings for maintenance orders.
- BGMK / BGMT — Permit and warranty data linked to technical objects.
- VIQMEL / VIQMFE — Views commonly used for notification reporting.
