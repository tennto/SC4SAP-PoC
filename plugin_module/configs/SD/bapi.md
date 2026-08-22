# SD - Sales and Distribution BAPIs & Function Modules
# SD - 영업 및 유통 BAPI 및 기능 모듈

## Core BAPIs
| BAPI/FM | System | Description | Usage |
|---------|--------|-------------|-------|
| BAPI_SALESORDER_CREATEFROMDAT2 | ECC/S4 | Create Sales Order / 판매 주문 생성 | Standard sales order creation with header, items, schedule lines, partners |
| BAPI_SALESORDER_CHANGE | ECC/S4 | Change Sales Order / 판매 주문 변경 | Modify existing sales order fields, add/delete items |
| BAPI_SALESORDER_GETLIST | ECC/S4 | Get Sales Order List / 판매 주문 목록 조회 | Retrieve list of sales orders by customer, material, date |
| BAPI_SALESORDER_GETSTATUS | ECC/S4 | Get Sales Order Status / 판매 주문 상태 조회 | Retrieve overall and item-level delivery/billing status |
| BAPI_DELIVERYPROCESSING_EXEC | ECC/S4 | Process Outbound Delivery / 출고 납품 처리 | Create and process outbound deliveries from sales orders |
| BAPI_OUTB_DELIVERY_CHANGE | ECC/S4 | Change Outbound Delivery / 출고 납품 변경 | Modify outbound delivery header and items |
| BAPI_OUTB_DELIVERY_CONFIRM_DEC | ECC/S4 | Confirm Transfer Order / 이전 지시 확인 | Confirm goods issue for outbound delivery |
| BAPI_BILLINGDOC_CREATEMULTIPLE | ECC/S4 | Create Billing Documents / 청구 문서 생성 | Create billing documents from delivery or order |
| BAPI_BILLINGDOC_GETDETAIL | ECC/S4 | Get Billing Document Detail / 청구 문서 상세 조회 | Read billing document header and item details |
| BAPI_CUSTOMER_GETLIST | ECC | Get Customer List / 고객 목록 조회 | Retrieve customer list (KNA1). S/4HANA: Use BP APIs |
| BAPI_CUSTOMER_GETDETAIL2 | ECC | Get Customer Detail / 고객 상세 조회 | Read customer master (KNA1/KNVV). S/4HANA: Use BP APIs |
| BAPI_CUSTOMER_CREATEFROMDATA1 | ECC | Create Customer / 고객 생성 | Create customer master (KNA1). S/4HANA: Use BAPI_BUPA_CREATE_FROM_DATA |

## Quotation & Contract BAPIs
| BAPI/FM | System | Description | Usage |
|---------|--------|-------------|-------|
| BAPI_QUOTATION_CREATEFROMDATA2 | ECC/S4 | Create Quotation / 견적 생성 | Create sales quotation from data |
| BAPI_CONTRACT_CREATEFROMDATA | ECC/S4 | Create Contract / 계약 생성 | Create outline agreement (contract) |
| BAPI_INQUIRY_CREATEFROMDATA2 | ECC/S4 | Create Inquiry / 문의 생성 | Create customer inquiry document |

## Pricing BAPIs
| BAPI/FM | System | Description | Usage |
|---------|--------|-------------|-------|
| BAPI_PRICES_CONDITIONS | ECC/S4 | Read Pricing Conditions / 가격 조건 조회 | Read condition records for pricing analysis |
| SD_SALESDOCUMENT_PRICING_GET | ECC/S4 | Get Pricing Data / 가격 데이터 조회 | Internal FM: read pricing procedure results |
| RV_PRICE_PRINT_HEAD | ECC/S4 | Print Price List Header / 가격표 헤더 출력 | Used in pricing reports |

## Utility FMs
| BAPI/FM | System | Description | Usage |
|---------|--------|-------------|-------|
| SD_VBAK_READ_WITH_VBELN | ECC/S4 | Read Sales Order Header / 판매 주문 헤더 조회 | Internal FM: direct VBAK read with key |
| RV_DELIVERY_PRINT_VIEW | ECC/S4 | Delivery Print / 납품 인쇄 | Generate delivery output |
| BILLING_DOCUMENT_READ | ECC/S4 | Read Billing Document / 청구 문서 조회 | Internal FM: read VBRK/VBRP data |
| SD_DOCUMENT_CHANGE_IN_PLACE | ECC/S4 | Change SD Document In-Place / SD 문서 즉석 변경 | Low-level SD document change handler |
| CREDIT_EXPOSURE_CALCULATE | ECC/S4 | Calculate Credit Exposure / 신용 노출 계산 | Compute customer credit exposure |
| AVAILABILITY_CHECK | ECC/S4 | Availability Check / 가용성 검사 | Perform ATP availability check for material |
| BAPI_MATERIAL_GET_DETAIL | ECC/S4 | Get Material Detail / 자재 상세 조회 | Read material master for SD-relevant fields |
| BAPI_SALESORDER_SIMULATE | ECC/S4 | Simulate Sales Order / 판매 주문 시뮬레이션 | Simulate order creation for pricing/ATP without saving |
