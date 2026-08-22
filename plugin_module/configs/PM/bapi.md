# PM - Plant Maintenance BAPIs & Function Modules
# PM - 설비 관리 BAPI 및 기능 모듈

## Core BAPIs
| BAPI/FM | System | Description | Usage |
|---------|--------|-------------|-------|
| BAPI_ALM_ORDER_MAINTAIN | ECC/S4 | Create/Change PM Order / PM 오더 생성/변경 | Universal PM order maintenance: create, change, add operations/components |
| BAPI_ALM_ORDER_GET_DETAIL | ECC/S4 | Get PM Order Detail / PM 오더 상세 조회 | Read PM order header, operations, components, costs (AUFK, AFKO, AFVC, RESB) |
| BAPI_ALM_ORDER_CONFIRM_ADD | ECC/S4 | Add Order Confirmation / 오더 확인 추가 | Post time confirmation for PM order operations |
| BAPI_ALM_NOTIF_CREATE | ECC/S4 | Create PM Notification / PM 알림 생성 | Create maintenance notification (M1/M2/S1 types) with items and causes |
| BAPI_ALM_NOTIF_SAVE | ECC/S4 | Save PM Notification / PM 알림 저장 | Save changes to notification (must call after BAPI_ALM_NOTIF_MODIFY) |
| BAPI_ALM_NOTIF_GET_DETAIL | ECC/S4 | Get Notification Detail / 알림 상세 조회 | Read notification header, items, causes, activities (QMEL, QMFE, QMUR) |
| BAPI_EQUI_CREATE | ECC/S4 | Create Equipment / 설비 생성 | Create equipment master record (EQUI, ITOB) |
| BAPI_EQUI_CHANGE | ECC/S4 | Change Equipment / 설비 변경 | Modify equipment master data |
| BAPI_EQUI_GETDETAIL | ECC/S4 | Get Equipment Detail / 설비 상세 조회 | Read equipment master including classification |
| BAPI_FUNCLOC_CREATE | ECC/S4 | Create Functional Location / 기능 위치 생성 | Create FL master record (IFLOT, IFLOTX) |
| BAPI_FUNCLOC_CHANGE | ECC/S4 | Change Functional Location / 기능 위치 변경 | Modify FL master data |
| BAPI_FUNCLOC_GETDETAIL | ECC/S4 | Get Functional Location Detail / 기능 위치 상세 조회 | Read FL master data and structure |

## Measurement BAPIs
| BAPI/FM | System | Description | Usage |
|---------|--------|-------------|-------|
| BAPI_MEASUREPOINT_CREATE | ECC/S4 | Create Measuring Point / 측정점 생성 | Create measuring point on equipment or FL |
| BAPI_MEASUREDOCUMENT_CREATE | ECC/S4 | Create Measurement Document / 측정 문서 생성 | Post measurement reading for counter/gauge |
| BAPI_MEASUREDOCUMENT_GETLIST | ECC/S4 | Get Measurement Document List / 측정 문서 목록 조회 | Retrieve measurement history for measuring point |

## Maintenance Plan BAPIs
| BAPI/FM | System | Description | Usage |
|---------|--------|-------------|-------|
| BAPI_MAINTPLAN_CREATE | ECC/S4 | Create Maintenance Plan / 유지보수 계획 생성 | Create time-based or performance-based maintenance plan |
| BAPI_MAINTPLAN_GETDETAIL | ECC/S4 | Get Maintenance Plan Detail / 유지보수 계획 상세 조회 | Read maintenance plan (MPLAN, MPLA, MPOS) |

## Utility FMs
| BAPI/FM | System | Description | Usage |
|---------|--------|-------------|-------|
| RIIFLO20 | ECC/S4 | Functional Location: Mass Change / 기능 위치 대량 변경 | Batch update functional locations |
| PM_ORDER_READ | ECC/S4 | Read PM Order (Internal) / PM 오더 조회 (내부) | Low-level internal read of PM order data |
| BAPI_GOODSMVT_CREATE | ECC/S4 | Post Goods for PM Order / PM 오더 재고 이동 | Goods issue (mvt 261) to PM order, GR (mvt 101) |
| CS_BOM_EXPL_MAT_V2 | ECC/S4 | BOM Explosion for PM Object / PM 개체 BOM 전개 | Explode equipment BOM for spare parts |
| BAPI_TRANSACTION_COMMIT | ECC/S4 | Commit PM Transaction / PM 트랜잭션 커밋 | Required after all PM BAPIs to persist changes |
