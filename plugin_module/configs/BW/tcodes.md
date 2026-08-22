# BW - Business Warehouse Transaction Codes
# BW - 비즈니스 웨어하우스 트랜잭션 코드

## Modeling / InfoObjects
| TCode | System | Description |
|-------|--------|-------------|
| RSA1 | ECC/S4 | Data Warehousing Workbench / 데이터 웨어하우징 워크벤치 (main BW admin UI) |
| RSD1 | ECC/S4 | Maintain InfoObjects / InfoObject 유지 |
| RSDIOBC | ECC/S4 | InfoObject Catalog / InfoObject 카탈로그 |
| RSDMPRO | ECC | Maintain MultiProvider / 멀티 공급자 유지 — BW/4HANA: Use CompositeProvider |
| RSODSO | ECC/S4 | Maintain DataStore Object / DataStore Object 유지 |
| RSDCUBE | ECC | Maintain InfoCube / InfoCube 유지 — BW/4HANA: InfoCubes deprecated, use ADSO |
| RSPLAN | ECC | BW Planning Functions / BW 계획 기능 — BW/4HANA: BPS deprecated, use BPC/SAC |

## Data Flow / ETL
| TCode | System | Description |
|-------|--------|-------------|
| RSA3 | ECC/S4 | Extractor Checker / 추출기 검사기 |
| RSA5 | ECC/S4 | Install DataSources from Business Content / 비즈니스 컨텐츠에서 DataSource 설치 |
| RSA6 | ECC/S4 | Maintain DataSources (Enhance) / DataSource 유지 (향상) |
| ROOSOURCE | ECC/S4 | DataSource Maintenance / DataSource 유지 |
| RSPC | ECC/S4 | Process Chain Maintenance / 프로세스 체인 유지 |
| RSPCM | ECC/S4 | Process Chain Monitor / 프로세스 체인 모니터 |
| SM37 | ECC/S4 | Job Overview (BW background jobs) / 작업 개요 |

## Data Loading / Management
| TCode | System | Description |
|-------|--------|-------------|
| RSA7 | ECC/S4 | BW Delta Queue Monitor / BW 델타 큐 모니터 |
| RSRQ | ECC/S4 | BW Request Administration / BW 요청 관리 |
| RSMRT | ECC/S4 | BW Monitoring / BW 모니터링 |
| RSMO | ECC/S4 | Data Load Monitor / 데이터 로드 모니터 |
| RSRV | ECC/S4 | Analysis and Repair of BW Objects / BW 개체 분석 및 복구 |

## Reporting / Queries
| TCode | System | Description |
|-------|--------|-------------|
| RSRT | ECC/S4 | Query Monitor / 쿼리 모니터 (test/debug queries) |
| RSRT2 | ECC/S4 | Query Properties / 쿼리 속성 |
| RSZV | ECC/S4 | Variables Maintenance / 변수 유지 |
| RSZDELETE | ECC/S4 | Delete Query Elements / 쿼리 요소 삭제 |
| LISTSCHEME | ECC | BEx Workbook / BEx 워크북 — BW/4HANA: BEx deprecated, use SAC |

## Performance
| TCode | System | Description |
|-------|--------|-------------|
| RSDDV | ECC | Aggregate Maintenance / 집계 유지 — BW/4HANA: Aggregates not needed (HANA in-memory) |
| RSDDAGGR | ECC | Aggregate Monitor / 집계 모니터 — BW/4HANA: Aggregates not needed |
| RSRWBSPTEMPL | ECC | BW Web Template Workbench / BW 웹 템플릿 워크벤치 — BW/4HANA: Deprecated, use SAC |
| RSSTATMAN | ECC/S4 | Statistics Data Management / 통계 데이터 관리 |

## Configuration
| TCode | System | Description |
|-------|--------|-------------|
| SPRO | ECC/S4 | BW Customizing / BW 커스터마이징 |
| SM59 | ECC/S4 | RFC Destinations / RFC 대상 (source system connections) |
| RSADMIN | ECC/S4 | BW System Administration / BW 시스템 관리 |
| RSCRM | ECC/S4 | Currency Translation / 통화 환산 |
| RSSM | ECC/S4 | Authorization Objects for Reporting / 보고용 권한 개체 |

## Monitoring
| TCode | System | Description |
|-------|--------|-------------|
| RSMON | ECC/S4 | BW Administrator Workbench Monitor / BW 관리자 워크벤치 모니터 |
| SM21 | ECC/S4 | System Log / 시스템 로그 |
| ST22 | ECC/S4 | ABAP Dump Analysis / ABAP 덤프 분석 |
| RSPCM | ECC/S4 | Process Chain Monitor / 프로세스 체인 모니터 |
| RSBATCH | ECC/S4 | BW Batch Management / BW 배치 관리 |
