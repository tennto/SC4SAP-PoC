# BW - Business Warehouse BAPIs & Function Modules
# BW - 비즈니스 웨어하우스 BAPI 및 기능 모듈

## Core BAPIs / APIs
| BAPI/FM | System | Description | Usage |
|---------|--------|-------------|-------|
| BAPI_IOBJ_GETLIST | ECC/S4 | Get InfoObject List / InfoObject 목록 조회 | List all InfoObjects of specified type (characteristic, key figure) |
| BAPI_IOBJ_GETDETAIL | ECC/S4 | Get InfoObject Detail / InfoObject 상세 조회 | Read InfoObject properties and attributes |
| BAPI_CUBE_GETLIST | ECC | Get InfoCube List / InfoCube 목록 조회 | List InfoCubes. BW/4HANA: InfoCubes deprecated, use ADSO |
| BAPI_CUBE_GETDETAIL | ECC | Get InfoCube Detail / InfoCube 상세 조회 | Read InfoCube structure. BW/4HANA: Use ADSO |
| BAPI_ODSO_GETLIST | ECC/S4 | Get DSO List / DSO 목록 조회 | List DataStore Objects |
| BAPI_ODSO_GETDETAIL | ECC/S4 | Get DSO Detail / DSO 상세 조회 | Read DSO field structure |
| BAPI_QUERY_GETLIST | ECC/S4 | Get Query List / 쿼리 목록 조회 | List BEx queries for InfoProvider |
| BAPI_QUERY_GETDETAIL | ECC/S4 | Get Query Detail / 쿼리 상세 조회 | Read query definition, characteristics, key figures |

## Data Loading FMs
| BAPI/FM | System | Description | Usage |
|---------|--------|-------------|-------|
| RSDMD_MASTERDATA_WRITE | ECC/S4 | Write Master Data / 마스터 데이터 쓰기 | Load characteristic master data (attributes, texts, hierarchies) into BW |
| RSDMD_MASTERDATA_READ | ECC/S4 | Read Master Data / 마스터 데이터 읽기 | Read BW master data for a characteristic |
| RSIODS_WRITE_TO_ODSO | ECC/S4 | Write to DSO / DSO에 쓰기 | Write records to DataStore Object |
| RSIODS_READ_FROM_ODSO | ECC/S4 | Read from DSO / DSO에서 읽기 | Read data records from DSO active table |
| RSB_API_IPAK_GET_LIST | ECC/S4 | Get InfoPackage List / InfoPackage 목록 조회 | List InfoPackages for DataSource |
| RSB_API_IPAK_EXECUTE | ECC/S4 | Execute InfoPackage / InfoPackage 실행 | Trigger data load for InfoPackage (full or delta) |
| RSPC_API_CHAIN_START | ECC/S4 | Start Process Chain / 프로세스 체인 시작 | Programmatically start BW process chain |
| RSPC_API_CHAIN_GET_STATE | ECC/S4 | Get Process Chain State / 프로세스 체인 상태 조회 | Read current execution status of process chain |

## Query / Reporting FMs
| BAPI/FM | System | Description | Usage |
|---------|--------|-------------|-------|
| BICS_PROV_OPEN | ECC/S4 | Open BW Provider (BICS) / BW 공급자 열기 (BICS) | Open InfoProvider for data reading via BICS interface |
| BICS_PROV_GET_RESULT_SET | ECC/S4 | Get Query Result Set / 쿼리 결과 집합 조회 | Execute query and retrieve result data from BICS |
| BICS_PROV_CLOSE | ECC/S4 | Close BW Provider / BW 공급자 닫기 | Close BICS provider after reading |
| RSBOLAP_READ_DATA | ECC | Read OLAP Data / OLAP 데이터 읽기 | Older API. BW/4HANA: Use BICS interface |

## Extractor / Delta FMs
| BAPI/FM | System | Description | Usage |
|---------|--------|-------------|-------|
| RSA3_DATASOURCE_TEST | ECC/S4 | Test DataSource Extraction / DataSource 추출 테스트 | Simulate data extraction from source system (RSA3 equivalent) |
| RODPS_REPL_ODATA_SRV_CALL | ECC/S4 | Call ODP OData Service / ODP OData 서비스 호출 | Trigger ODP (Operational Data Provisioning) delta extraction |
| BAPI_MASTERDATA_SEND | ECC/S4 | Send Master Data to BW / BW에 마스터 데이터 전송 | Push master data from ERP to BW via ALE/IDoc |

## Utility FMs
| BAPI/FM | System | Description | Usage |
|---------|--------|-------------|-------|
| RSDRI_INFOPROV_READ | ECC/S4 | Read InfoProvider Data / InfoProvider 데이터 읽기 | Direct data read from any BW InfoProvider (cube, DSO, CompositeProvider) |
| RSSEM_BPS_WRITE_DATA | ECC | Write BPS Planning Data / BPS 계획 데이터 쓰기 | BPS deprecated. BW/4HANA: Use BPC or SAC Planning |
| RSZR_GET_OBJECTS | ECC/S4 | Get Query Objects / 쿼리 개체 조회 | Read query metadata objects from RSZCOMPDIR |
