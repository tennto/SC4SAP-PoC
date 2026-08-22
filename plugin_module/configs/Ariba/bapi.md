# Ariba - SAP Ariba Integration BAPIs & Function Modules
# Ariba - SAP Ariba 통합 BAPI 및 기능 모듈

## Core Integration BAPIs / FMs
| BAPI/FM | System | Description | Usage |
|---------|--------|-------------|-------|
| BAPI_PO_CREATE1 | ECC/S4 | Create PO from Ariba Approved Requisition / Ariba 승인 요청에서 PO 생성 | Standard PO creation triggered by Ariba approved shopping cart via IDoc ORDERS05 |
| BAPI_PO_CHANGE | ECC/S4 | Change PO (sync back to Ariba) / PO 변경 (Ariba에 동기화) | Update PO fields; changes sent to Ariba via IDoc ORDCHG |
| BAPI_INCOMINGINVOICE_CREATE | ECC/S4 | Create Invoice from Ariba e-Invoice / Ariba 전자 송장에서 송장 생성 | Post vendor invoice received from Ariba Network (cXML invoice → IDoc → MIRO) |
| BAPI_GOODSMVT_CREATE | ECC/S4 | Post GR from Ariba-triggered Confirmation / Ariba 확인 기반 입고 전기 | Post goods receipt movement 101 after Ariba order confirmation |
| BAPI_VENDOR_CREATE | ECC | Create Vendor from Ariba SLP / Ariba SLP에서 공급업체 생성 | Create SAP vendor master. S/4HANA: Use BAPI_BUPA_CREATE_FROM_DATA |
| BAPI_VENDOR_CHANGE | ECC | Change Vendor Master from Ariba / Ariba에서 공급업체 마스터 변경 | Sync vendor data changes. S/4HANA: Use BAPI_BUPA_CHANGE_FROM_DATA |
| BAPI_CONTRACT_CREATEFROMDATA | ECC/S4 | Create Contract from Ariba Sourcing Award / Ariba 소싱 계약에서 계약 생성 | Create SAP outline agreement from Ariba sourcing award |

## IDoc-Based Integration FMs
| BAPI/FM | System | Description | Usage |
|---------|--------|-------------|-------|
| IDOC_INPUT_ORDERS | ECC/S4 | Process Inbound Order IDoc / 수신 주문 IDoc 처리 | Handle ORDERS05 IDoc from Ariba for PO creation |
| IDOC_OUTPUT_ORDCHG | ECC/S4 | Generate Outbound Order Change IDoc / 발신 주문 변경 IDoc 생성 | Send PO changes from SAP to Ariba Network |
| IDOC_INPUT_INVOIC | ECC/S4 | Process Inbound Invoice IDoc / 수신 송장 IDoc 처리 | Handle INVOIC02 IDoc from Ariba for invoice posting |
| IDOC_OUTPUT_DESADV | ECC/S4 | Generate Despatch Advice IDoc / 발송 통지 IDoc 생성 | Send ASN/delivery confirmation to Ariba Network |
| IDOC_INPUT_SHPMNT | ECC/S4 | Process Inbound Shipment IDoc / 수신 출하 IDoc 처리 | Handle shipment/tracking data from Ariba logistics |

## Catalog / Punch-Out FMs
| BAPI/FM | System | Description | Usage |
|---------|--------|-------------|-------|
| BBP_PD_PO_CREATE | ECC/S4 | Create SRM/Ariba Purchase Order / SRM/Ariba PO 생성 | Create PO in SRM/SAP from punch-out catalog order |
| BBP_CATALOG_TRANSFER | ECC/S4 | Transfer Catalog Items / 카탈로그 항목 전송 | Transfer punch-out catalog items to shopping cart |

## Utility FMs
| BAPI/FM | System | Description | Usage |
|---------|--------|-------------|-------|
| EDI_DOCUMENT_OPEN_FOR_PROCESS | ECC/S4 | Open IDoc for Processing / IDoc 처리 열기 | Used in Ariba IDoc reprocessing scenarios |
| IDOC_STATUS_WRITE_TO_DATABASE | ECC/S4 | Write IDoc Status / IDoc 상태 기록 | Update IDoc status during Ariba message processing |
| ARIBA_PO_OUTBOUND_SEND | ECC/S4 | Send PO to Ariba Network / Ariba Network에 PO 전송 | Custom FM (Z or SAP standard) to trigger cXML PO dispatch |
| BAPI_EXCHANGERATE_GETDETAIL | ECC/S4 | Get Exchange Rate for Ariba Invoice / Ariba 송장 환율 조회 | Get exchange rate for currency conversion in cross-currency invoices |
| BAPI_TRANSACTION_COMMIT | ECC/S4 | Commit Ariba Integration Transaction / Ariba 통합 트랜잭션 커밋 | Required after all BAPI-based Ariba integration processing |
