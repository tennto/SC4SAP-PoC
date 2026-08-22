# BW - Business Warehouse SPRO Configuration
# BW - 비즈니스 웨어하우스 SPRO 설정

## Enterprise Structure / System Settings
| Config Name | Table/View | Description |
|------------|-----------|-------------|
| Define Source Systems | RSDS | Source System definition (SAP ERP, file, web services) / 소스 시스템 정의 (SAP ERP, file, web services) |
| Define BW System Settings | RSADMIN | BW System Settings definition / BW 시스템 설정 정의 |
| Configure RFC Connections for BW | SM59 | RFC Connection configuration for BW / BW용 RFC 연결 설정 |
| Define Currency Translation Types | RSCRM | Currency Translation Type definition / 통화 환산 유형 정의 |
| Define Time-Dependent Hierarchies | RSHIEOBJ | Time-Dependent Hierarchy definition / 시간 의존 계층 정의 |

## InfoObjects (Master Data)
| Config Name | Table/View | Description |
|------------|-----------|-------------|
| Define InfoObject Catalog | RSOBJCAT | InfoObject Catalog definition / InfoObject 카탈로그 정의 |
| Create Characteristic InfoObjects | RSDIOBC | Characteristic InfoObject creation (0CUSTOMER, 0MATERIAL...) / 특성 InfoObject 생성 (0CUSTOMER, 0MATERIAL...) |
| Create Key Figure InfoObjects | RSDIOBJ | Key Figure InfoObject creation / 주요 수치 InfoObject 생성 |
| Define Attributes for Characteristics | RSDIOBIATTR | Characteristic Attribute definition / 특성 속성 정의 |
| Configure Hierarchies for InfoObjects | RSHIEOBJ | InfoObject Hierarchy configuration / InfoObject 계층 설정 |
| Define Compounding Characteristics | RSDIOBCOMP | Compounding Characteristic definition / 복합 특성 정의 |
| Maintain Master Data Tables | /BIC/M* or /BI0/M* | Master Data Table maintenance / 마스터 데이터 테이블 유지 |

## InfoProviders
| Config Name | Table/View | Description |
|------------|-----------|-------------|
| Create InfoCube | RSDCUBE | InfoCube creation (star schema structure) / InfoCube 생성 (star schema structure) |
| Create DataStore Object (DSO) | RSODSO | DataStore Object creation (ODS layer) / DataStore Object 생성 (ODS layer) |
| Create Advanced DSO | RSDODSO | Advanced DSO creation (BW/4HANA) / Advanced DSO 생성 (BW/4HANA) |
| Create Composite Provider | RSPROVIDER | Composite Provider creation / 복합 공급자 생성 |
| Create InfoSet (Joins) | RSINFOSOURCE | InfoSet creation (join multiple providers) / InfoSet 생성 (join multiple providers) |
| Create MultiProvider | RSMULTIPROV | MultiProvider creation / 멀티 공급자 생성 |
| Create VirtualProvider | RSVIRTPROV | VirtualProvider creation (real-time access) / 가상 공급자 생성 (real-time access) |

## Data Flow / ETL
| Config Name | Table/View | Description |
|------------|-----------|-------------|
| Create InfoSource | RSINFOSOURCE | InfoSource creation (transformation source) / InfoSource 생성 (transformation source) |
| Define DataSources | ROOSOURCE | DataSource definition (extractor-based) / DataSource 정의 (extractor-based) |
| Create Transformation Rules | RSTRANSF | Transformation Rule creation / 변환 규칙 생성 |
| Create Data Transfer Process (DTP) | RSDTP | Data Transfer Process creation / 데이터 전송 프로세스 생성 |
| Define InfoPackage | RSPCCHAIN | InfoPackage definition (delta/full load) / InfoPackage 정의 (delta/full load) |
| Configure Open Hub Destination | RSOHS | Open Hub Destination configuration / Open Hub 대상 설정 |
| Define Process Chains | RSPCCHAIN | Process Chain definition / 프로세스 체인 정의 |

## Reporting / Analysis
| Config Name | Table/View | Description |
|------------|-----------|-------------|
| Create Query (BEx Query Designer) | RSZCOMPDIR | Query creation (BEx Query Designer) / 쿼리 생성 (BEx 쿼리 디자이너) |
| Define Workbooks | RSZWBINDX | Workbook definition / 워크북 정의 |
| Configure Web Templates | RSRWBTEMPLA | Web Template configuration / 웹 템플릿 설정 |
| Define Variables | RSZGLOBV | Variable definition (selection variables, formula variables) / 변수 정의 (selection variables, formula variables) |
| Create Restricted Key Figures | RSZCEL | Restricted Key Figure creation / 제한된 주요 수치 생성 |
| Create Calculated Key Figures | RSZCEL | Calculated Key Figure creation / 계산된 주요 수치 생성 |
| Configure BW Authorizations | RSECADMIN | BW Authorization configuration / BW 권한 설정 |

## Performance / Administration
| Config Name | Table/View | Description |
|------------|-----------|-------------|
| Define Aggregates | RSDDAGGRDIR | Aggregate definition / 집계 정의 |
| Configure BW Accelerator (BWA) | RSBWACOCKPIT | BW Accelerator configuration / BW 가속기 설정 |
| Define Partitioning for InfoCubes | RSDCUBEDIM | InfoCube Partitioning definition / InfoCube 파티셔닝 정의 |
| Configure Compression Settings | RSADMIN | Compression Settings configuration / 압축 설정 구성 |
| Define Data Archiving | SARA | Data Archiving definition / 데이터 아카이빙 정의 |
