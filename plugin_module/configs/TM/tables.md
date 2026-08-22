# TM - Key Tables Reference
# TM - 주요 테이블 참조

## Master Data Tables
## 마스터 데이터 테이블

| Table | System | Description | 설명 |
|-------|--------|-------------|------|
| /SCMTMS/D_LOC | S4 | Location Master | 위치 마스터 |
| /SCMTMS/D_LANE | S4 | Transportation Lane | 운송 레인 |
| /SCMTMS/D_ZONE | S4 | Transportation Zone | 운송 존 |
| /SCMTMS/D_CARRR | S4 | Carrier Master | 운송업체 마스터 |
| /SCMTMS/D_FAGR | S4 | Freight Agreement | 운송 계약 |
| TVRO | ECC | Routes | 경로 |

## Transaction Data Tables
## 트랜잭션 데이터 테이블

### S/4HANA TM

| Table | System | Description | 설명 |
|-------|--------|-------------|------|
| /SCMTMS/D_TORROT | S4 | Freight Order Data | 운송 오더 데이터 |
| /SCMTMS/D_TORREQ | S4 | Transportation Request | 운송 요청 |
| /SCMTMS/D_TORFU | S4 | Freight Unit | 운송 단위 |
| /SCMTMS/D_TORFB | S4 | Freight Booking | 운송 부킹 |
| /SCMTMS/D_TCOND | S4 | Transportation Charges | 운송 비용 |
| /SCMTMS/D_SETTL | S4 | Settlement Data | 정산 데이터 |
| /SCMTMS/D_CHDOCF | S4 | Charge Document | 비용 문서 |
| /SCMTMS/D_EVENT | S4 | Events | 이벤트 |

### LE-TRA Classic (ECC)

| Table | System | Description | 설명 |
|-------|--------|-------------|------|
| VTTK | ECC | Shipment Header | 운송 헤더 |
| VTTP | ECC | Shipment Item | 운송 항목 |
| VTTS | ECC | Shipment Stages | 운송 단계 |
| VTSP | ECC | Shipment Stage Positions | 운송 단계 포지션 |
| VFKP | ECC | Shipment Cost Header | 운송 비용 헤더 |
| VFKN | ECC | Shipment Cost Item | 운송 비용 항목 |

## Configuration Tables
## 구성 테이블

| Table | System | Description | 설명 |
|-------|--------|-------------|------|
| TVRO | ECC | Routes (classic LE-TRA) | 경로(클래식 LE-TRA) |

## S/4HANA Specific
## S/4HANA 전용

All `/SCMTMS/*` tables listed above are S/4HANA TM specific (embedded or standalone TM).
위의 모든 `/SCMTMS/*` 테이블은 S/4HANA TM 전용입니다(임베디드 또는 독립형 TM).
