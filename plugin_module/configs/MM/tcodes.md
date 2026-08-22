# MM - Materials Management Transaction Codes
# MM - 자재 관리 트랜잭션 코드

## Master Data
| TCode | System | Description |
|-------|--------|-------------|
| MM01 | ECC/S4 | Create Material / 자재 생성 |
| MM02 | ECC/S4 | Change Material / 자재 변경 |
| MM03 | ECC/S4 | Display Material / 자재 조회 |
| MM60 | ECC/S4 | Material Master List / 자재 마스터 목록 |
| XK01 | ECC | Create Vendor (Centrally) / 공급업체 생성 (중앙) — S/4HANA: Use BP |
| XK02 | ECC | Change Vendor (Centrally) / 공급업체 변경 (중앙) — S/4HANA: Use BP |
| XK03 | ECC | Display Vendor (Centrally) / 공급업체 조회 (중앙) — S/4HANA: Use BP |
| BP | S4 | Maintain Business Partner / 비즈니스 파트너 유지 |
| ME11 | ECC/S4 | Create Purchasing Info Record / 구매 정보 레코드 생성 |
| ME12 | ECC/S4 | Change Purchasing Info Record / 구매 정보 레코드 변경 |
| ME01 | ECC/S4 | Maintain Source List / 소스 목록 유지 |

## Purchasing
| TCode | System | Description |
|-------|--------|-------------|
| ME21N | ECC/S4 | Create Purchase Order / 구매 오더 생성 |
| ME22N | ECC/S4 | Change Purchase Order / 구매 오더 변경 |
| ME23N | ECC/S4 | Display Purchase Order / 구매 오더 조회 |
| ME51N | ECC/S4 | Create Purchase Requisition / 구매 요청 생성 |
| ME52N | ECC/S4 | Change Purchase Requisition / 구매 요청 변경 |
| ME41 | ECC/S4 | Create Request for Quotation / 견적 요청 생성 |
| ME47 | ECC/S4 | Maintain Quotation / 견적 유지 |
| ME31K | ECC/S4 | Create Contract / 계약 생성 |
| ME31L | ECC/S4 | Create Scheduling Agreement / 일정 합의 생성 |
| MIGO | ECC/S4 | Goods Movement / 재고 이동 (GR, GI, Transfer) |
| MB01 | ECC | Post Goods Receipt for PO / 구매 오더 입고 전기 — S/4HANA: Use MIGO |
| MB1A | ECC | Goods Withdrawal / 출고 — S/4HANA: Use MIGO |
| MB1B | ECC | Transfer Posting / 이전 전기 — S/4HANA: Use MIGO |

## Invoice Verification
| TCode | System | Description |
|-------|--------|-------------|
| MIRO | ECC/S4 | Enter Incoming Invoice / 수신 송장 입력 |
| MIR7 | ECC/S4 | Park Incoming Invoice / 수신 송장 파킹 |
| MIRA | ECC/S4 | Fast Invoice Entry / 빠른 송장 입력 |
| MR8M | ECC/S4 | Cancel Invoice Document / 송장 문서 취소 |
| MRBR | ECC/S4 | Release Blocked Invoices / 블록된 송장 해제 |

## Configuration
| TCode | System | Description |
|-------|--------|-------------|
| OMSY | ECC/S4 | Maintain Company Code/Plant Data / 회사코드/플랜트 데이터 유지 |
| OMS2 | ECC/S4 | Maintain Material Types / 자재 유형 유지 |
| OMR6 | ECC/S4 | Invoice Tolerance Limits / 송장 허용 오차 한도 |
| OMWB | ECC/S4 | Automatic Account Assignment / 자동 계정 배정 |
| OMJJ | ECC/S4 | Customize Movement Types / 이동 유형 커스터마이징 |

## Reporting
| TCode | System | Description |
|-------|--------|-------------|
| MB52 | ECC/S4 | Warehouse Stocks of Material / 창고 자재 재고 |
| MB51 | ECC/S4 | Material Document List / 자재 문서 목록 |
| ME2M | ECC/S4 | Purchase Orders by Material / 자재별 구매 오더 |
| ME2L | ECC/S4 | Purchase Orders by Vendor / 공급업체별 구매 오더 |
| ME2N | ECC/S4 | Purchase Orders by PO Number / PO 번호별 구매 오더 |
| MMBE | ECC/S4 | Stock Overview / 재고 개요 |

## Monitoring
| TCode | System | Description |
|-------|--------|-------------|
| ME2O | ECC/S4 | SC Stock Monitoring / 협력업체 재고 모니터링 |
| MB24 | ECC/S4 | Reservation Overview / 예약 개요 |
| ME57 | ECC/S4 | Assign and Process Requisitions / 요청 배정 및 처리 |
| MBGR | ECC/S4 | Display Material Document by Mvt Reason / 이동 이유별 자재 문서 조회 |
