# TM - Transportation Management BAPIs & Function Modules
# TM - 운송 관리 BAPI 및 기능 모듈

## Core BAPIs / APIs (S/4HANA TM)
| BAPI/FM | System | Description | Usage |
|---------|--------|-------------|-------|
| /SCMTMS/CL_FO_BAPI=>CREATE | S4 | Create Freight Order / 화물 오더 생성 | OO-style BAPI: create freight order with header, items, stages |
| /SCMTMS/CL_FO_BAPI=>CHANGE | S4 | Change Freight Order / 화물 오더 변경 | Modify freight order fields, assign carrier, update dates |
| /SCMTMS/CL_FO_BAPI=>GET_LIST | S4 | Get Freight Order List / 화물 오더 목록 조회 | Retrieve list of freight orders by selection criteria |
| /SCMTMS/CL_FO_BAPI=>GET_DETAIL | S4 | Get Freight Order Detail / 화물 오더 상세 조회 | Read complete freight order data |
| /SCMTMS/CL_FU_BAPI=>CREATE | S4 | Create Freight Unit / 화물 단위 생성 | Create freight unit from delivery or manually |
| /SCMTMS/CL_FU_BAPI=>GET_LIST | S4 | Get Freight Unit List / 화물 단위 목록 조회 | List freight units by various criteria |

## Shipment BAPIs (ECC LE-TRA)
| BAPI/FM | System | Description | Usage |
|---------|--------|-------------|-------|
| BAPI_SHIPMENT_CREATE | ECC | Create Shipment (LE-TRA) / 출하 생성 (LE-TRA) | Create LE-Transportation shipment document (VTTK). S/4HANA: Use /SCMTMS/ Freight Order APIs |
| BAPI_SHIPMENT_CHANGE | ECC | Change Shipment / 출하 변경 | Modify shipment header, stages, legs. S/4HANA: Use /SCMTMS/ APIs |
| BAPI_SHIPMENT_GETDETAIL | ECC | Get Shipment Detail / 출하 상세 조회 | Read shipment data from VTTK, VTTS, VTSP. S/4HANA: Use /SCMTMS/ APIs |

## Location / Route BAPIs (S/4HANA TM)
| BAPI/FM | System | Description | Usage |
|---------|--------|-------------|-------|
| /SCMTMS/CL_LOC_BAPI=>CREATE | S4 | Create Location / 위치 생성 | Create TM location master record |
| /SCMTMS/CL_LOC_BAPI=>GET_DETAIL | S4 | Get Location Detail / 위치 상세 조회 | Read TM location attributes |
| /SCMTMS/CL_LANE_BAPI=>GET_LIST | S4 | Get Lane List / 레인 목록 조회 | List transportation lanes between locations |

## Charge Calculation FMs (S/4HANA TM)
| BAPI/FM | System | Description | Usage |
|---------|--------|-------------|-------|
| /SCMTMS/CL_FCC_BAPI=>CALCULATE | S4 | Calculate Freight Charges / 운임 계산 | Calculate freight charges for freight order or booking |
| /SCMTMS/CL_FCC_BAPI=>GET_RESULT | S4 | Get Calculation Result / 계산 결과 조회 | Read calculated freight charge amounts |

## Event / Tracking FMs (S/4HANA TM)
| BAPI/FM | System | Description | Usage |
|---------|--------|-------------|-------|
| /SCMTMS/CL_TTE_BAPI=>POST_EVENT | S4 | Post Tracking Event / 추적 이벤트 전기 | Post location/status event for freight order (GPS update) |
| /SCMTMS/CL_TTE_BAPI=>GET_EVENTS | S4 | Get Tracking Events / 추적 이벤트 조회 | Read event history for shipment/freight order |

## Utility FMs
| BAPI/FM | System | Description | Usage |
|---------|--------|-------------|-------|
| /SCMTMS/CL_TEND_BAPI=>EXECUTE | S4 | Execute Tendering / 입찰 실행 | Start carrier tendering process for freight order |
| /SCMTMS/CL_TEND_BAPI=>ACCEPT | S4 | Accept Tender / 입찰 수락 | Accept carrier tender response |
| BAPI_TRANSACTION_COMMIT | ECC/S4 | Commit TM Transaction / TM 트랜잭션 커밋 | Commit all TM BAPI changes |
