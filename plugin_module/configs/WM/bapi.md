# WM - Warehouse Management BAPIs & Function Modules
# WM - 창고 관리 BAPI 및 기능 모듈

> **⚠ LE-WM은 S/4HANA에서 지원되지 않습니다. S/4HANA에서는 EWM (Extended Warehouse Management)을 사용하십시오.**
> **⚠ LE-WM is deprecated in S/4HANA. Use EWM (Extended Warehouse Management) instead.**

## Core BAPIs (ECC LE-WM)
| BAPI/FM | System | Description | Usage |
|---------|--------|-------------|-------|
| BAPI_WHSE_TO_CREATE_STOCK | ECC | Create Transfer Order for Stock / 재고 TO 생성 | Create TO for ad-hoc warehouse movement |
| BAPI_WHSE_TO_CREATE_TOREQ | ECC | Create TO from Transfer Requirement / TR로부터 TO 생성 | Convert TR to TO for outbound or inbound processing |
| BAPI_WHSE_TO_CONFIRM | ECC | Confirm Transfer Order / TO 확인 | Confirm picked/putaway TO to update stock in warehouse |
| BAPI_WHSE_TO_CANCEL | ECC | Cancel Transfer Order / TO 취소 | Cancel an open/unconfirmed transfer order |
| BAPI_WHSE_TO_GETDETAIL | ECC | Get Transfer Order Detail / TO 상세 조회 | Read TO header and items from LTBK/LTBP |
| BAPI_WHSE_TO_GETLIST | ECC | Get Transfer Order List / TO 목록 조회 | List transfer orders by warehouse, date, status |
| BAPI_WHSE_TR_CREATE | ECC | Create Transfer Requirement / TR 생성 | Create transfer requirement LTAK/LTAP |
| BAPI_WHSE_TR_GETDETAIL | ECC | Get Transfer Requirement Detail / TR 상세 조회 | Read TR from LTAK/LTAP |
| BAPI_WHSE_STORAGEBIN_GETLIST | ECC | Get Storage Bin List / 저장 빈 목록 조회 | List storage bins by warehouse/storage type |
| BAPI_WHSE_STORAGEBIN_GETDETAIL | ECC | Get Storage Bin Detail / 저장 빈 상세 조회 | Read bin data from LGPLA |

## Inventory BAPIs (ECC LE-WM)
| BAPI/FM | System | Description | Usage |
|---------|--------|-------------|-------|
| BAPI_WMINVDOC_CREATE | ECC | Create WM Inventory Document / WM 재고 실사 문서 생성 | Create inventory document for physical count |
| BAPI_WMINVDOC_POSTCOUNT | ECC | Post Inventory Count / 재고 실사 전기 | Post counted quantities against inventory document |
| BAPI_WMINVDOC_POSTDIFFERENCES | ECC | Post Inventory Differences / 재고 차이 전기 | Post inventory differences after count |

## Quant / Stock BAPIs (ECC LE-WM)
| BAPI/FM | System | Description | Usage |
|---------|--------|-------------|-------|
| BAPI_WHSE_QUANT_GETLIST | ECC | Get Quant List / 재고 목록 조회 | Read warehouse stock quants from LGPLA/LQUA |
| BAPI_WHSE_QUANT_GETDETAIL | ECC | Get Quant Detail / 재고 상세 조회 | Read detailed quant information (LQUA) |

## Utility FMs (ECC LE-WM)
| BAPI/FM | System | Description | Usage |
|---------|--------|-------------|-------|
| L_TO_CREATE_TR | ECC | Create TO from TR (Internal) / TR로부터 TO 생성 (내부) | Internal FM for TR-to-TO conversion |
| L_TO_CONFIRM_ONE_TE | ECC | Confirm Single TO Item / 단일 TO 항목 확인 | Confirm individual TO item (LT12 equivalent) |
| WAREHOUSE_NUMBER_GET | ECC | Get Warehouse Number / 창고 번호 조회 | Determine warehouse number for plant/storage location |
| L_STOCK_OVERVIEW_READ | ECC | Read WM Stock Overview / WM 재고 개요 조회 | Read WM-level stock by material/warehouse |
| L_BIN_LOCATE | ECC | Locate Storage Bin / 저장 빈 위치 확인 | Find optimal bin based on putaway strategy |
| WM_MOVE_STOCK | ECC | Move WM Stock / WM 재고 이동 | Low-level internal stock movement in warehouse |

## EWM BAPIs (S/4HANA)
| BAPI/FM | System | Description | Usage |
|---------|--------|-------------|-------|
| /SCWM/API_WAREHOUSE_ORDER_CR | S4 | Create Warehouse Order / 창고 오더 생성 | Create EWM warehouse order |
| /SCWM/API_WAREHOUSE_TASK_CR | S4 | Create Warehouse Task / 창고 태스크 생성 | Create EWM warehouse task (replaces TO) |
| /SCWM/API_STOCK_GETLIST | S4 | Get EWM Stock List / EWM 재고 목록 조회 | Read stock from EWM storage bins |
| /SCWM/TO_READ_SINGLE | S4 | Read Warehouse Task / 창고 태스크 조회 | Read individual EWM warehouse task |
