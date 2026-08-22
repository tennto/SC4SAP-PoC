# MM - Key Tables Reference
# MM - 주요 테이블 참조

## Master Data Tables
| Table | System | Description |
|-------|--------|-------------|
| MARA | ECC/S4 | Material Master General |
| MARC | ECC/S4 | Material Plant Data |
| MARD | ECC/S4 | Material Storage Location |
| MBEW | ECC/S4 | Material Valuation |
| MAKT | ECC/S4 | Material Descriptions |
| MVKE | ECC/S4 | Material Sales Data |
| MLGN | ECC/S4 | Material WM Warehouse |
| LFA1 | ECC | Vendor Master General — S/4HANA: BUT000 |
| LFB1 | ECC | Vendor Company Code Data — S/4HANA: merged with BP |
| LFM1 | ECC | Vendor Purchasing Data — S/4HANA: merged with BP |
| BUT000 | S4 | Business Partner General |
| BUT020 | S4 | BP Address Assignment |
| EINA | ECC/S4 | Purchasing Info Record General |
| EINE | ECC/S4 | Purchasing Info Record Org Data |
| EORD | ECC/S4 | Source List |

## Transaction Data Tables
| Table | System | Description |
|-------|--------|-------------|
| EKKO | ECC/S4 | Purchasing Document Header |
| EKPO | ECC/S4 | Purchasing Document Item |
| EKET | ECC/S4 | Schedule Lines |
| EKBE | ECC/S4 | PO History |
| EKKN | ECC/S4 | PO Account Assignment |
| EBAN | ECC/S4 | Purchase Requisition |
| EBKN | ECC/S4 | PR Account Assignment |
| MKPF | ECC/S4 | Material Document Header (S4: MATDOC merges MKPF+MSEG) |
| MSEG | ECC/S4 | Material Document Item |
| MATDOC | S4 | Material Documents (unified, merges MKPF/MSEG) |
| RBKP | ECC/S4 | Invoice Document Header |
| RSEG | ECC/S4 | Invoice Document Item |
| RESB | ECC/S4 | Reservation/Dependent Requirements |

## Configuration / Customizing Tables
| Table | System | Description |
|-------|--------|-------------|
| T001W | ECC/S4 | Plants |
| T001L | ECC/S4 | Storage Locations |
| T001K | ECC/S4 | Valuation Areas |
| T024 | ECC/S4 | Purchasing Groups |
| T024E | ECC/S4 | Purchasing Organizations |
| T134 | ECC/S4 | Material Types |
| T156 | ECC/S4 | Movement Types |
| T161 | ECC/S4 | PO Document Types |
| T163 | ECC/S4 | PO Item Categories |
| T023 | ECC/S4 | Material Groups |
| T077K | ECC | Vendor Account Groups |

## S/4HANA Specific Tables
| Table | System | Description |
|-------|--------|-------------|
| MATDOC | S4 | Unified material document |
| BUT000 | S4 | Business Partner |
| BUT020 | S4 | BP Address Assignment |
| VBFA | ECC/S4 | Document flow |

## Related / Cross-Module Tables
| Table | System | Description |
|-------|--------|-------------|
| T001 | ECC/S4 | Company Code |
| T005 | ECC/S4 | Countries |
