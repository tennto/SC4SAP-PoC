# WM - Key Tables Reference
# WM - 주요 테이블 참조

> **Deprecation Note**: LE-WM tables are ECC-only. S/4HANA uses EWM tables (`/SCWM/*`).
> **사용 중단 안내**: LE-WM 테이블은 ECC 전용입니다. S/4HANA는 EWM 테이블(`/SCWM/*`)을 사용합니다.

## Master Data Tables
## 마스터 데이터 테이블

### LE-WM (ECC)

| Table | System | Description | 설명 |
|-------|--------|-------------|------|
| LAGP | ECC | Storage Bins | 저장 빈 |
| T300 | ECC | Warehouse Numbers | 창고 번호 |
| T301 | ECC | Storage Types | 저장 유형 |
| T302 | ECC | Storage Sections | 저장 섹션 |
| T303 | ECC | Storage Bin Types | 저장 빈 유형 |

## Transaction Data Tables
## 트랜잭션 데이터 테이블

### LE-WM (ECC)

| Table | System | Description | 설명 |
|-------|--------|-------------|------|
| LQUA | ECC | Quants (Stock per Bin) | 수량(빈별 재고) |
| LTAK | ECC | Transfer Order Header | 이송 지시 헤더 |
| LTAP | ECC | Transfer Order Items | 이송 지시 항목 |
| LTBK | ECC | Transfer Requirement Header | 이송 요구 헤더 |
| LTBP | ECC | Transfer Requirement Items | 이송 요구 항목 |
| LEIN | ECC | Storage Unit Header | 저장 단위 헤더 |
| LINK | ECC | Storage Unit Items | 저장 단위 항목 |
| LINP | ECC | Inventory Document Items | 재고 실사 문서 항목 |
| LINV | ECC | Inventory Data | 재고 실사 데이터 |

## Configuration Tables
## 구성 테이블

### LE-WM (ECC)

| Table | System | Description | 설명 |
|-------|--------|-------------|------|
| T331 | ECC | Putaway Strategies | 입고 전략 |
| T333 | ECC | Picking Strategies | 피킹 전략 |
| T340D | ECC | Movement Type Mapping (MM→WM) | 이동 유형 매핑(MM→WM) |

## S/4HANA Specific (EWM)
## S/4HANA 전용 (EWM)

| Table | System | Description | 설명 |
|-------|--------|-------------|------|
| /SCWM/AQUA | S4 | EWM Quants | EWM 수량 |
| /SCWM/LAGP | S4 | EWM Storage Bins | EWM 저장 빈 |
| /SCWM/TUNIT | S4 | Storage Units | 저장 단위 |
| /SCWM/ORDIM_O | S4 | Warehouse Task Open | 창고 작업(미완료) |
| /SCWM/ORDIM_C | S4 | Warehouse Task Confirmed | 창고 작업(확인됨) |
| /SCWM/WHO | S4 | Warehouse Order | 창고 오더 |
| /SCWM/T301 | S4 | EWM Storage Types | EWM 저장 유형 |
| /SCWM/T300_WH | S4 | EWM Warehouse Number | EWM 창고 번호 |
| /SCDL/DB_PROCI_O | S4 | EWM Inbound Process | EWM 입고 프로세스 |
| /SCDL/DB_PROCI_I | S4 | Delivery Item | 납품 항목 |
| /SCWM/WAVE | S4 | Wave Management | 웨이브 관리 |
