# MM - Materials Management BAPIs & Function Modules
# MM - 자재 관리 BAPI 및 기능 모듈

## Core BAPIs
| BAPI/FM | System | Description | Usage |
|---------|--------|-------------|-------|
| BAPI_PO_CREATE1 | ECC/S4 | Create Purchase Order / 구매 오더 생성 | Create PO with header (POHEADER), items (POITEM), account assignment (POACCOUNT), schedule lines (POSCHEDULE) |
| BAPI_PO_CHANGE | ECC/S4 | Change Purchase Order / 구매 오더 변경 | Modify existing PO fields, update quantities/dates |
| BAPI_PO_GETDETAIL1 | ECC/S4 | Get PO Detail / 구매 오더 상세 조회 | Read PO header, items, schedule lines, account assignment |
| BAPI_PR_CREATE | ECC/S4 | Create Purchase Requisition / 구매 요청 생성 | Create PR with PRHEADER and PRITEM structures |
| BAPI_PR_CHANGE | ECC/S4 | Change Purchase Requisition / 구매 요청 변경 | Modify existing PR |
| BAPI_GOODSMVT_CREATE | ECC/S4 | Create Goods Movement / 재고 이동 생성 | Post goods receipt (mvt 101), goods issue (mvt 201), transfer posting (mvt 301) |
| BAPI_GOODSMVT_CANCEL | ECC/S4 | Cancel Goods Movement / 재고 이동 취소 | Reverse/cancel a goods movement document |
| BAPI_MATERIAL_SAVEDATA | ECC/S4 | Create/Change Material Master / 자재 마스터 생성/변경 | Create or extend material master with various org-level views |
| BAPI_MATERIAL_GET_DETAIL | ECC/S4 | Get Material Detail / 자재 상세 조회 | Read material master data for specified views |
| BAPI_MATERIAL_GETLIST | ECC/S4 | Get Material List / 자재 목록 조회 | Retrieve list of materials by search criteria |

## Vendor BAPIs (ECC Only)
> **S/4HANA에서는 Business Partner API를 사용하십시오 (아래 참조)**

| BAPI/FM | System | Description | Usage |
|---------|--------|-------------|-------|
| BAPI_VENDOR_CREATE | ECC | Create Vendor / 공급업체 생성 | Create vendor master record (general + company code + purchasing). S/4HANA: Use BP APIs |
| BAPI_VENDOR_CHANGE | ECC | Change Vendor / 공급업체 변경 | Modify vendor master data. S/4HANA: Use BP APIs |
| BAPI_VENDOR_GETDETAIL | ECC | Get Vendor Detail / 공급업체 상세 조회 | Read vendor master including purchasing data. S/4HANA: Use BP APIs |

## Business Partner BAPIs (S/4HANA)
| BAPI/FM | System | Description | Usage |
|---------|--------|-------------|-------|
| VMD_EI_API=>MAINTAIN_BAPI | S4 | Maintain Vendor via BP / BP를 통한 공급업체 유지 | Create/change vendor as Business Partner with CVI (Customer-Vendor Integration) |
| CVI_EI_INBOUND_MAIN | S4 | CVI Inbound Processing / CVI 인바운드 처리 | Mass create/update Business Partners with vendor/customer roles |
| BAPI_BUPA_CREATE_FROM_DATA | S4 | Create Business Partner / 비즈니스 파트너 생성 | Create BP master record (general data + roles) |
| BAPI_BUPA_CHANGE_FROM_DATA | S4 | Change Business Partner / 비즈니스 파트너 변경 | Modify BP master data |

## Invoice BAPIs
| BAPI/FM | System | Description | Usage |
|---------|--------|-------------|-------|
| BAPI_INCOMINGINVOICE_CREATE | ECC/S4 | Create Incoming Invoice / 수신 송장 생성 | Post vendor invoice (MIRO equivalent) |
| BAPI_INCOMINGINVOICE_CANCEL | ECC/S4 | Cancel Incoming Invoice / 수신 송장 취소 | Cancel/reverse posted invoice |
| BAPI_INCOMINGINVOICE_GETDETAIL | ECC/S4 | Get Invoice Detail / 송장 상세 조회 | Read invoice header and item details |

## Utility FMs
| BAPI/FM | System | Description | Usage |
|---------|--------|-------------|-------|
| MB_CREATE_GOODS_MOVEMENT | ECC/S4 | Create Goods Movement (Internal) / 재고 이동 생성 (내부) | Low-level goods movement posting used by MIGO |
| MATERIAL_READ | ECC/S4 | Read Material (Internal) / 자재 조회 (내부) | Fast internal read of material master tables (MARA, MARC, MARD) |
| ME_CHECK_PO_INTERFACE | ECC/S4 | Check PO Interface / PO 인터페이스 검사 | Validate PO data before creation |
| BAPI_REQUISITION_GETINFO | ECC/S4 | Get Requisition Info / 구매 요청 정보 조회 | Read PR details including release status |
| BAPI_STOCKACCOUNTVALUATION | ECC/S4 | Stock Account Valuation / 재고 계정 평가 | Calculate stock value for accounting |
| MD_REORDER_POINT_PLANNING | ECC/S4 | Reorder Point Planning / 재주문점 계획 | Trigger MRP reorder point logic for material |
