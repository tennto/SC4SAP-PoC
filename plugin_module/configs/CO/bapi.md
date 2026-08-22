# CO - Controlling BAPIs & Function Modules
# CO - 관리 회계 BAPI 및 기능 모듈

## Core BAPIs
| BAPI/FM | System | Description | Usage |
|---------|--------|-------------|-------|
| BAPI_COSTCENTER_GETLIST | ECC/S4 | Get Cost Center List / 원가 센터 목록 조회 | Retrieve cost centers for controlling area and period |
| BAPI_COSTCENTER_GETDETAIL1 | ECC/S4 | Get Cost Center Detail / 원가 센터 상세 조회 | Read cost center master data (CSKS) |
| BAPI_COSTCENTER_CREATEMULTIPLE | ECC/S4 | Create Cost Centers / 원가 센터 생성 | Batch create cost centers |
| BAPI_COSTELEMENT_GETLIST | ECC | Get Cost Element List / 원가 요소 목록 조회 | Retrieve cost elements (CSKA/CSKB). S/4HANA: Cost elements managed as G/L accounts (SKA1/SKB1) |
| BAPI_COSTELEMENT_GETDETAIL | ECC | Get Cost Element Detail / 원가 요소 상세 조회 | Read cost element master (CSKA/CSKB). S/4HANA: Cost elements managed as G/L accounts (SKA1/SKB1) |
| BAPI_INTERNALORDER_GETLIST | ECC/S4 | Get Internal Order List / 내부 주문 목록 조회 | Retrieve internal orders by various criteria |
| BAPI_INTERNALORDER_GETDETAIL | ECC/S4 | Get Internal Order Detail / 내부 주문 상세 조회 | Read internal order master data (AUFK) |
| BAPI_INTERNALORDER_CREATE | ECC/S4 | Create Internal Order / 내부 주문 생성 | Create new internal order with header data |
| BAPI_INTERNALORDER_CHANGE | ECC/S4 | Change Internal Order / 내부 주문 변경 | Modify internal order fields, update status |
| BAPI_ACC_ACTIVITY_ALLOC_POST | ECC/S4 | Post Activity Allocation / 활동 배분 전기 | Post sender/receiver activity allocation |

## Cost Planning BAPIs
| BAPI/FM | System | Description | Usage |
|---------|--------|-------------|-------|
| BAPI_COSTCENTER_ACTTYPE_PLAN_GET | ECC/S4 | Get Activity Price Plan / 활동 가격 계획 조회 | Read planned activity prices for cost centers |
| BAPI_COSTCENTER_ACTTYPPRICE_ADD | ECC/S4 | Add Activity Price / 활동 가격 추가 | Post planned activity type prices |
| BAPIACCO_COSTCENTER_PLAN_POST | ECC/S4 | Post Cost Center Plan / 원가 센터 계획 전기 | Post planning values for cost centers |

## Product Costing BAPIs
| BAPI/FM | System | Description | Usage |
|---------|--------|-------------|-------|
| BAPI_PRODORDCONF_CREATE_HDR | ECC/S4 | Create Production Order Confirmation / 제조 오더 확인 생성 | Confirm production order with actual quantities/activities |
| BAPI_PRODORD_GET_DETAIL | ECC/S4 | Get Production Order Detail / 제조 오더 상세 조회 | Read production order with cost information |
| BAPI_COSTESTIMATE_GETLIST | ECC/S4 | Get Cost Estimate List / 원가 견적 목록 조회 | Read cost estimates for material/plant |

## CO-PA BAPIs
| BAPI/FM | System | Description | Usage |
|---------|--------|-------------|-------|
| BAPI_COPAACTUALS_POSTCOSTDATA | ECC/S4 | Post CO-PA Actual Data / CO-PA 실적 데이터 전기 | Post actual cost data to profitability analysis |
| BAPI_COPAPLANNINGDATA_POST | ECC/S4 | Post CO-PA Planning Data / CO-PA 계획 데이터 전기 | Post planning data to operating concern |

## Utility FMs
| BAPI/FM | System | Description | Usage |
|---------|--------|-------------|-------|
| CO_OM_COSTING_SHEET_SELECT | ECC/S4 | Select Costing Sheet / 원가 계산 시트 선택 | Determine applicable costing sheet for overhead |
| K_CCA_DOCUMENT_READ | ECC/S4 | Read CO Document / CO 문서 조회 | Read CO line items from COBK/COEP |
| CKML_GET_ACTUAL_PRICE | ECC/S4 | Get Actual Price (ML) / 실제 가격 조회 (ML) | Read actual price from material ledger CKMLPP |
| CO_GET_COST_CENTER | ECC/S4 | Get Cost Center / 원가 센터 조회 | Read cost center attributes by cost center number |
| RKC_VALIDATE_COST_CENTER | ECC/S4 | Validate Cost Center / 원가 센터 검증 | Check if cost center is valid for given date |
| BAPI_ACTIVITY_TYPE_GETLIST | ECC/S4 | Get Activity Type List / 활동 유형 목록 조회 | Retrieve activity types for controlling area |
