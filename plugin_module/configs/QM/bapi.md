# QM - Quality Management BAPIs & Function Modules
# QM - 품질 관리 BAPI 및 기능 모듈

## Core BAPIs
| BAPI/FM | System | Description | Usage |
|---------|--------|-------------|-------|
| BAPI_INSPLOT_CREATE | ECC/S4 | Create Inspection Lot / 검사 로트 생성 | Create manual inspection lot for material/plant |
| BAPI_INSPLOT_GETDETAIL | ECC/S4 | Get Inspection Lot Detail / 검사 로트 상세 조회 | Read inspection lot header and characteristics (QALS, QAVE) |
| BAPI_INSPLOT_GETLIST | ECC/S4 | Get Inspection Lot List / 검사 로트 목록 조회 | List inspection lots by material, plant, date, status |
| BAPI_QUALNOT_CREATE | ECC/S4 | Create Quality Notification / 품질 알림 생성 | Create QM notification (Q1/Q2/Q3 types) with items, causes, tasks |
| BAPI_QUALNOT_SAVE | ECC/S4 | Save Quality Notification / 품질 알림 저장 | Persist changes to quality notification |
| BAPI_QUALNOT_GETDETAIL | ECC/S4 | Get Notification Detail / 알림 상세 조회 | Read quality notification header, items, causes (QMEL, QMFE, QMUR) |
| BAPI_QUALNOT_CHANGE | ECC/S4 | Change Quality Notification / 품질 알림 변경 | Modify notification fields, add/change items |
| BAPI_INSPOPER_RECRESULTS | ECC/S4 | Record Inspection Results / 검사 결과 기록 | Post characteristic results for inspection operation |
| BAPI_INSPLOT_USAGE_DECISION | ECC/S4 | Record Usage Decision / 사용 결정 기록 | Post usage decision for inspection lot with stock posting |

## Inspection Plan BAPIs
| BAPI/FM | System | Description | Usage |
|---------|--------|-------------|-------|
| BAPI_INSPPLAN_CREATE | ECC/S4 | Create Inspection Plan / 검사 계획 생성 | Create inspection plan with header and characteristics |
| BAPI_INSPPLAN_CHANGE | ECC/S4 | Change Inspection Plan / 검사 계획 변경 | Modify existing inspection plan |
| BAPI_INSPPLAN_GETDETAIL | ECC/S4 | Get Inspection Plan Detail / 검사 계획 상세 조회 | Read inspection plan from PLKO/PLPO with QM characteristics |

## Sampling BAPIs
| BAPI/FM | System | Description | Usage |
|---------|--------|-------------|-------|
| BAPI_SAMPLE_CREATE | ECC/S4 | Create Sample / 샘플 생성 | Create physical sample for inspection lot |
| BAPI_SAMPLE_GETLIST | ECC/S4 | Get Sample List / 샘플 목록 조회 | List samples for inspection lot |

## Utility FMs
| BAPI/FM | System | Description | Usage |
|---------|--------|-------------|-------|
| QA_SET_INSPECTIONLOT_STATUS | ECC/S4 | Set Inspection Lot Status / 검사 로트 상태 설정 | Internally set status on inspection lot (release, restrict, etc.) |
| QM_MOVE_STOCK_TO_UNRESTRICTED | ECC/S4 | Move QM Stock to Unrestricted / QM 재고를 비제한으로 이동 | Transfer inspection lot stock to unrestricted after UD |
| BAPI_QINFORECORD_CREATE | ECC/S4 | Create Q-Info Record / 품질 정보 레코드 생성 | Create QM procurement info record for vendor-material |
| BAPI_QINFORECORD_CHANGE | ECC/S4 | Change Q-Info Record / 품질 정보 레코드 변경 | Modify Q-Info record inspection settings |
| QI_QMEL_HEADER_READ | ECC/S4 | Read Notification Header / 알림 헤더 조회 | Internal FM: read QMEL (notification header) |
| BAPI_VENDOREVALUATION_GETOVERAL | ECC/S4 | Get Vendor Evaluation / 공급업체 평가 조회 | Read vendor QM evaluation scores |
