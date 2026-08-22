# TM - Transportation Management Transaction Codes
# TM - 운송 관리 트랜잭션 코드

## Master Data
| TCode | System | Description |
|-------|--------|-------------|
| /SCMTMS/MD_LOC | S4 | Maintain Locations / 위치 유지 |
| /SCMTMS/MD_RES | S4 | Maintain Resources / 자원 유지 |
| /SCMTMS/MD_CAR | S4 | Maintain Carrier / 운송 업체 유지 |
| /SCMTMS/MD_LANE | S4 | Maintain Transportation Lane / 운송 레인 유지 |
| /SCMTMS/MD_ZONE | S4 | Maintain Transportation Zone / 운송 구역 유지 |
| VT01N | ECC | Create Shipment (LE-TRA) / 출하 생성 (LE-TRA) — S/4HANA: /SCMTMS/FO_MAINT |
| VT02N | ECC | Change Shipment / 출하 변경 — S/4HANA: /SCMTMS/FO_MAINT |
| VT03N | ECC | Display Shipment / 출하 조회 — S/4HANA: /SCMTMS/FO_DISP |

## Freight Order Processing (S/4HANA TM)
| TCode | System | Description |
|-------|--------|-------------|
| /SCMTMS/FO_MAINT | S4 | Maintain Freight Order / 화물 오더 유지 |
| /SCMTMS/FO_DISP | S4 | Display Freight Order / 화물 오더 조회 |
| /SCMTMS/FU_MAINT | S4 | Maintain Freight Unit / 화물 단위 유지 |
| /SCMTMS/FB_MAINT | S4 | Maintain Freight Booking / 화물 예약 유지 |
| /SCMTMS/PLN_WKBK | S4 | Transportation Planning Workbench / 운송 계획 워크벤치 |

## Tendering (S/4HANA TM)
| TCode | System | Description |
|-------|--------|-------------|
| /SCMTMS/TEND | S4 | Carrier Selection / Tendering / 운송 업체 선택/입찰 |
| /SCMTMS/TEND_MON | S4 | Tendering Monitor / 입찰 모니터 |

## Charge Calculation (S/4HANA TM)
| TCode | System | Description |
|-------|--------|-------------|
| /SCMTMS/FRG_AGR | S4 | Maintain Freight Agreement / 운임 합의 유지 |
| /SCMTMS/FRG_CALC | S4 | Freight Cost Calculation / 운임 계산 |
| /SCMTMS/FRG_SETL | S4 | Freight Settlement / 운임 정산 |

## Configuration
| TCode | System | Description |
|-------|--------|-------------|
| SPRO | ECC/S4 | TM Customizing / TM 커스터마이징 |
| /SCMTMS/CUST | S4 | TM Customizing Cockpit / TM 커스터마이징 조종석 |
| OVR1 | ECC | Define Routes (LE) / 경로 정의 (LE) |
| OVR2 | ECC | Assign Routes / 경로 배정 |
| OVST | ECC | Define Shipping Types / 출하 유형 정의 |

## Reporting
| TCode | System | Description |
|-------|--------|-------------|
| VT11 | ECC | Shipment List / 출하 목록 |
| /SCMTMS/FO_LIST | S4 | Freight Order List / 화물 오더 목록 |
| /SCMTMS/COCKPIT | S4 | TM Cockpit / TM 조종석 |
| VT70 | ECC | Output from Shipments / 출하 출력 |

## Monitoring
| TCode | System | Description |
|-------|--------|-------------|
| /SCMTMS/MON_FO | S4 | Freight Order Monitor / 화물 오더 모니터 |
| /SCMTMS/MON_TTE | S4 | Tracking and Tracing Monitor / 추적 모니터 |
| /SCMTMS/MON_EVT | S4 | Event Monitor / 이벤트 모니터 |
| VT22 | ECC | Shipment Stages / 출하 단계 |
