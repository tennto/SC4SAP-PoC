# Common - Cross-Module Key Tables
# 공통 - 교차 모듈 주요 테이블

모든 SAP 모듈에서 공통으로 참조되는 핵심 테이블.
Key tables referenced across all SAP modules.

## Data Dictionary (DD* series) / 데이터 사전

| Table | System | Description / 설명 |
|-------|--------|---------------------|
| DD02L | ECC/S4 | Tables metadata (all DB tables) / 테이블 메타데이터 |
| DD02T | ECC/S4 | Table short texts (multilingual) / 테이블 단축 텍스트 |
| DD03L | ECC/S4 | Table fields / 테이블 필드 |
| DD03T | ECC/S4 | Field texts / 필드 텍스트 |
| DD04L | ECC/S4 | Data elements / 데이터 요소 |
| DD04T | ECC/S4 | Data element texts / 데이터 요소 텍스트 |
| DD01L | ECC/S4 | Domains / 도메인 |
| DD01T | ECC/S4 | Domain texts / 도메인 텍스트 |
| DD07L | ECC/S4 | Domain fixed values / 도메인 고정값 |
| DD07T | ECC/S4 | Domain value texts / 도메인 값 텍스트 |
| DD08L | ECC/S4 | Foreign key definitions / 외래 키 정의 |
| DD12L | ECC/S4 | Secondary indexes / 보조 인덱스 |
| DD20L | ECC/S4 | Matchcode objects / 매치코드 오브젝트 |
| DD25L | ECC/S4 | Views / 뷰 |
| DD27S | ECC/S4 | View fields / 뷰 필드 |
| DD28S | ECC/S4 | View join conditions / 뷰 조인 조건 |
| DD40L | ECC/S4 | Table types / 테이블 유형 |
| DDLS | S4 | CDS view definitions (S/4HANA specific) / CDS 뷰 정의 |

## Client / Company / Country / 클라이언트, 회사, 국가

| Table | System | Description / 설명 |
|-------|--------|---------------------|
| T000 | ECC/S4 | Clients / 클라이언트 |
| T001 | ECC/S4 | Company Codes / 회사코드 |
| T005 | ECC/S4 | Countries / 국가 |
| T005S | ECC/S4 | Country Regions / 국가 지역 |
| T005T | ECC/S4 | Country Texts / 국가 텍스트 |
| T002 | ECC/S4 | Language Keys / 언어 키 |
| T002T | ECC/S4 | Language Texts / 언어 텍스트 |

## Currency / 통화

| Table | System | Description / 설명 |
|-------|--------|---------------------|
| TCURC | ECC/S4 | Currency Codes / 통화 코드 |
| TCURT | ECC/S4 | Currency Code Names / 통화 코드 이름 |
| TCURR | ECC/S4 | Exchange Rates (DAILY RATES) / 환율 (일일) |
| TCURV | ECC/S4 | Exchange Rate Types / 환율 유형 |
| TCURX | ECC/S4 | Currency Decimal Places / 통화 소수점 |
| TCURF | ECC/S4 | Exchange Rate Factor / 환율 계수 |

## Unit of Measure / 측정 단위

| Table | System | Description / 설명 |
|-------|--------|---------------------|
| T006 | ECC/S4 | Units of Measure / 측정 단위 |
| T006A | ECC/S4 | Language-Dependent UoM Texts / 언어별 UoM 텍스트 |
| T006D | ECC/S4 | UoM Dimensions / UoM 차원 |

## Calendar / 달력

| Table | System | Description / 설명 |
|-------|--------|---------------------|
| TFACS | ECC/S4 | Factory Calendar (Monthly Data) / 공장 달력 |
| THOC | ECC/S4 | Holiday Calendar Definitions / 휴일 달력 정의 |
| THOCT | ECC/S4 | Holiday Calendar Texts / 휴일 달력 텍스트 |
| THOL | ECC/S4 | Holiday Definitions / 휴일 정의 |
| THOLT | ECC/S4 | Holiday Descriptions / 휴일 설명 |

## Number Range / 번호 범위

| Table | System | Description / 설명 |
|-------|--------|---------------------|
| NRIV | ECC/S4 | Number Range Intervals (CRITICAL — all doc numbering) / 번호 범위 구간 (필수) |
| TNRO | ECC/S4 | Number range object definitions / 번호 범위 객체 정의 |
| TNROT | ECC/S4 | Number range object texts / 번호 범위 객체 텍스트 |

## Repository / Programs / 리포지토리 및 프로그램

| Table | System | Description / 설명 |
|-------|--------|---------------------|
| TSTC | ECC/S4 | Transaction Codes / 트랜잭션 코드 |
| TSTCT | ECC/S4 | Transaction Code Texts / 트랜잭션 코드 텍스트 |
| TFDIR | ECC/S4 | Function Modules / 기능 모듈 |
| TRDIR | ECC/S4 | Programs (ABAP programs) / 프로그램 |
| TADIR | ECC/S4 | Repository Objects (all Z/Y objects) / 리포지토리 오브젝트 |
| TDEVC | ECC/S4 | Packages (Development Classes) / 패키지 |
| REPOSRC | ECC/S4 | Program Source Code / 프로그램 소스 |
| DOKIL | ECC/S4 | Documentation Index / 문서 인덱스 |
| DOKTL | ECC/S4 | Documentation Texts / 문서 텍스트 |

## IDoc / ALE

| Table | System | Description / 설명 |
|-------|--------|---------------------|
| EDIDC | ECC/S4 | IDoc Control Record / IDoc 제어 레코드 |
| EDIDD | ECC/S4 | IDoc Data Segments / IDoc 데이터 세그먼트 |
| EDIDS | ECC/S4 | IDoc Status Record / IDoc 상태 레코드 |
| EDP12 | ECC/S4 | Partner Profile Outbound / 파트너 프로파일 발신 |
| EDP13 | ECC/S4 | Partner Profile Inbound / 파트너 프로파일 수신 |
| EDPAR | ECC/S4 | Partner Profile / 파트너 프로파일 |
| EDMSG | ECC/S4 | Message Types / 메시지 유형 |
| EDIMSG | ECC/S4 | IDoc Messages / IDoc 메시지 |
| TBD05 | ECC/S4 | Filter object types / 필터 오브젝트 유형 |

## User / Authorization / 사용자 및 권한

| Table | System | Description / 설명 |
|-------|--------|---------------------|
| USR01 | ECC/S4 | User Master (runtime data) / 사용자 마스터 |
| USR02 | ECC/S4 | User Logon Data / 사용자 로그온 데이터 |
| USR04 | ECC/S4 | User Authorizations / 사용자 권한 |
| USR21 | ECC/S4 | User → Address Mapping / 사용자-주소 매핑 |
| ADRP | ECC/S4 | Persons / 개인 |
| ADRC | ECC/S4 | Addresses / 주소 |
| AGR_DEFINE | ECC/S4 | Role Definition / 역할 정의 |
| AGR_USERS | ECC/S4 | Role-User Assignment / 역할-사용자 배정 |
| AGR_TCODES | ECC/S4 | Role-TCode Assignment / 역할-TCode 배정 |

## Output / Messages / 출력 및 메시지

| Table | System | Description / 설명 |
|-------|--------|---------------------|
| NAST | ECC/S4 | Output Control Table (condition records) / 출력 제어 테이블 |
| TNAPR | ECC/S4 | Output Processing Programs / 출력 처리 프로그램 |

## Change Documents (Audit) / 변경 문서

| Table | System | Description / 설명 |
|-------|--------|---------------------|
| CDHDR | ECC/S4 | Change Document Header / 변경 문서 헤더 |
| CDPOS | ECC/S4 | Change Document Items (old/new values) / 변경 문서 항목 |

## Application Log / 애플리케이션 로그

| Table | System | Description / 설명 |
|-------|--------|---------------------|
| BALHDR | ECC/S4 | App Log Header / 앱 로그 헤더 |
| BALM | ECC/S4 | App Log Messages / 앱 로그 메시지 |

## Workflow / 워크플로우

| Table | System | Description / 설명 |
|-------|--------|---------------------|
| SWWWIHEAD | ECC/S4 | Work Item Header / 작업 항목 헤더 |
| SWPNODELOG | ECC/S4 | Workflow Log / 워크플로우 로그 |
| SWEL | ECC/S4 | Event Log / 이벤트 로그 |

## Batch Input / 배치 입력

| Table | System | Description / 설명 |
|-------|--------|---------------------|
| APQI | ECC/S4 | Batch Input Session Directory / 배치 입력 세션 디렉토리 |
| APQD | ECC/S4 | Batch Input Data / 배치 입력 데이터 |

## Archiving / 아카이빙

| Table | System | Description / 설명 |
|-------|--------|---------------------|
| ARCH_IDX | ECC/S4 | Archive Index / 아카이브 인덱스 |
| ARCH_USR | ECC/S4 | Archive User / 아카이브 사용자 |

## S/4HANA Specific / S/4HANA 전용

| Table | System | Description / 설명 |
|-------|--------|---------------------|
| ACDOCA | S4 | Universal Journal — shared across FI/CO/AA / 유니버설 저널 |
| I_* CDS views | S4 | Interface CDS views (virtual data model) / 인터페이스 CDS 뷰 |
| DDLS | S4 | CDS definition repository / CDS 정의 리포지토리 |
