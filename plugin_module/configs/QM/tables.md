# QM - Key Tables Reference
# QM - 주요 테이블 참조

## Master Data Tables

| Table | System | Description |
|-------|--------|-------------|
| MARA + Q Views | ECC/S4 | Material QM Data (Quality Management view) |
| QMAT | ECC/S4 | Material-Inspection Type |
| QPMK | ECC/S4 | Master Inspection Characteristic |
| QPGR | ECC/S4 | Code Groups |
| QPGT | ECC/S4 | Code Group Texts |
| QPCD | ECC/S4 | Codes |
| QDPR | ECC/S4 | Sampling Procedure |
| QDPS | ECC/S4 | Dynamic Modification Rule |
| PLKO | ECC/S4 | Inspection Plan Header |
| PLPO | ECC/S4 | Inspection Plan Operations |
| PLMK | ECC/S4 | Inspection Plan Characteristics |
| QINF | ECC/S4 | Q-Info Record |
| QCPR | ECC/S4 | Certificate Profile |

## Transaction Data Tables

| Table | System | Description |
|-------|--------|-------------|
| QALS | ECC/S4 | Inspection Lot |
| QASR | ECC/S4 | Inspection Lot Sample |
| QAVE | ECC/S4 | Usage Decision |
| QASE | ECC/S4 | Sample Records |
| QAMR | ECC/S4 | Results Recording Header |
| QAMV | ECC/S4 | Results Recording Values |
| QMEL | ECC/S4 | Quality Notification Header |
| QMFE | ECC/S4 | Notification Items |
| QMMA | ECC/S4 | Notification Activities |
| QMUR | ECC/S4 | Notification Causes |
| QMIH | ECC/S4 | Notification Maintenance |

## Configuration Tables

| Table | System | Description |
|-------|--------|-------------|
| TQ70 | ECC/S4 | Inspection Types |
| TQ32 | ECC/S4 | Inspection Point Types |
| TQ15 | ECC/S4 | Procurement QM Settings |

## S/4HANA Specific

- QM integration with MATDOC: Inspection lots for goods receipts reference MATDOC entries (no MKPF/MSEG direct reads).
- Fiori-based apps for defect recording and usage decision rely on CDS views over QALS/QMEL (e.g., I_InspectionLot).
- QM in Procurement: QINF record behavior unchanged but linked to S/4HANA sourcing/BP model.

## Related Tables

- PLPO / PLMK — Shared with PP routing (inspection characteristics embedded in task list).
- MCHA / MCH1 — Batch data relevant for batch-based inspections.
- EKPO / EKKO — Purchase orders triggering GR-based inspection lots (origin 01).
- AUFK / AFKO — Production orders triggering in-process inspections (origin 03).
