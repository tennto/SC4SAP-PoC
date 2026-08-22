# Common - Cross-Module SPRO Configuration
# 공통 - 교차 모듈 SPRO 설정

모든 SAP 모듈에서 공통으로 설정되는 SPRO 커스터마이징 참조.
SPRO customizing shared across all SAP modules.

## Enterprise Structure (Cross-Module) / 기업 구조 (교차 모듈)

| Config | System | Table | Description / 설명 | TCode |
|--------|--------|-------|--------------------|-------|
| Define Client | ECC/S4 | T000 | Client definition / 클라이언트 정의 | SCC4 |
| Define Country | ECC/S4 | T005 | Country definition / 국가 정의 | OY01 |
| Define Language | ECC/S4 | T002 | Language definition / 언어 정의 | - |
| Define Company | ECC/S4 | T880 | Company (trading partner) / 회사 정의 | - |
| Define Company Code | ECC/S4 | T001 | Company Code / 회사코드 정의 | OX02 |
| Assign Company Code to Company | ECC/S4 | T001_ASSIGN | Assignment / 배정 | - |
| Define Business Area | ECC/S4 | TGSB | Business Area / 사업 영역 정의 | - |
| Define Functional Area | ECC/S4 | TFKB | Functional Area / 기능 영역 정의 | - |
| Define Segment | ECC/S4 | FAGL_SEGM | Segment / 세그먼트 정의 | - |

## Currency / Exchange Rate / 통화 및 환율

| Config | System | Table | Description / 설명 | TCode |
|--------|--------|-------|--------------------|-------|
| Define Currency Codes | ECC/S4 | TCURC | Currency Codes / 통화 코드 | OY03 |
| Define Currency Translation Factors | ECC/S4 | TCURF | Translation Factors / 환율 변환 계수 | - |
| Maintain Exchange Rates | ECC/S4 | TCURR | Exchange Rates / 환율 | OB08 |
| Define Exchange Rate Types | ECC/S4 | TCURV | Rate Types / 환율 유형 | - |
| Define Decimal Places | ECC/S4 | TCURX | Decimal Places / 소수점 자릿수 | - |

## Calendar / 달력

| Config | System | Table | Description / 설명 | TCode |
|--------|--------|-------|--------------------|-------|
| Maintain Factory Calendar | ECC/S4 | TFACS | Factory Calendar / 공장 달력 | SCAL |
| Maintain Public Holidays | ECC/S4 | THOL | Public Holidays / 공휴일 | SCAL |
| Maintain Holiday Calendar | ECC/S4 | THOC | Holiday Calendar / 휴일 달력 | SCAL |
| Assign Factory Calendar to Plant | ECC/S4 | T001W | Plant-Calendar Assignment / 플랜트 달력 배정 | - |

## Units of Measure / 측정 단위

| Config | System | Table | Description / 설명 | TCode |
|--------|--------|-------|--------------------|-------|
| Check Units of Measure | ECC/S4 | T006 | Units of Measure / 측정 단위 | CUNI |
| Dimensions | ECC/S4 | T006D | UoM Dimensions / 측정 단위 차원 | - |

## Number Range (Cross-Module) / 번호 범위 (교차 모듈)

| Config | System | Table | Description / 설명 | TCode |
|--------|--------|-------|--------------------|-------|
| Maintain Number Range Objects | ECC/S4 | TNRO | Number Range Object Def / 번호 범위 객체 | SNRO |
| Number Range Intervals | ECC/S4 | NRIV | Intervals (per object) / 번호 범위 구간 | - |

## Fiscal Year / 회계 연도

| Config | System | Table | Description / 설명 | TCode |
|--------|--------|-------|--------------------|-------|
| Define Fiscal Year Variant | ECC/S4 | T009 | Fiscal Year Variant / 회계 연도 변형 | OB29 |
| Assign Fiscal Year Variant to CoCd | ECC/S4 | T001_GJ | Assignment to Company Code / 회사코드에 배정 | - |

## Logical System / ALE Cross-System / 논리적 시스템 및 ALE

| Config | System | Table | Description / 설명 | TCode |
|--------|--------|-------|--------------------|-------|
| Define Logical System | ECC/S4 | TBDLS | Logical System / 논리적 시스템 | BD54 |
| Assign Logical System to Client | ECC/S4 | T000 | Client-Logical System Link / 클라이언트 연결 | SCC4 |
| Maintain Distribution Model | ECC/S4 | TBD62 | Distribution Model / 배포 모델 | BD64 |
| RFC Destination Configuration | ECC/S4 | RFCDES | RFC Destinations / RFC 대상 | SM59 |

## Output / Message Control / 출력 및 메시지 제어

| Config | System | Table | Description / 설명 | TCode |
|--------|--------|-------|--------------------|-------|
| Maintain Output Determination | ECC/S4 | NAST | Output Configuration / 출력 결정 | NACE |
| Condition Maintenance | ECC/S4 | KONH/KONP | Condition records / 조건 레코드 | - |

## Address Management / 주소 관리

| Config | System | Table | Description / 설명 | TCode |
|--------|--------|-------|--------------------|-------|
| Define Address Check | ECC/S4 | SAD_ADRCHK | Address Validation / 주소 검증 | - |
| Define Communication Types | ECC/S4 | T77S0 | Communication types / 통신 유형 | - |

## Authorization / 권한

| Config | System | Table | Description / 설명 | TCode |
|--------|--------|-------|--------------------|-------|
| Define Authorization Object | ECC/S4 | TOBJ | Authorization Object Def / 권한 객체 정의 | SU21 |
| Maintain Profiles (generated via PFCG) | ECC/S4 | AGR_* | Role-based profiles / 역할 기반 프로파일 | PFCG |

## Client Administration / 클라이언트 관리

| Config | System | Table | Description / 설명 | TCode |
|--------|--------|-------|--------------------|-------|
| Client Settings (SCC4) | ECC/S4 | T000 | Role, changes allowed / 역할 및 변경 허용 | SCC4 |
| Default Client for Logon | ECC/S4 | - | Profile parameter login/system_client / 기본 클라이언트 | - |
| Copy Client (SCC1) | ECC/S4 | - | Client copy / 클라이언트 복사 | SCC1 |
