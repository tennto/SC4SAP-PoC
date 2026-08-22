# Common - Cross-Module BAPIs & Function Modules
# 공통 - 교차 모듈 BAPI 및 기능 모듈

모든 SAP 모듈에서 공통으로 사용되는 범용 BAPI/FM 참조.
Generic BAPIs/FMs used across all SAP modules.

## IDOC Processing / IDOC 처리

| BAPI/FM | System | Description / 설명 |
|---------|--------|---------------------|
| IDOC_INBOUND_SYNCHRONOUS | ECC/S4 | Synchronous inbound IDoc processing / 동기식 수신 IDoc 처리 |
| IDOC_INBOUND_ASYNCHRONOUS | ECC/S4 | Asynchronous inbound IDoc / 비동기식 수신 IDoc |
| IDOC_INBOUND_WRITE_TO_DB | ECC/S4 | Save IDoc to DB / IDoc을 DB에 저장 |
| IDOC_OUTPUT_CALL_TRIGGER | ECC/S4 | Trigger outbound IDoc / 발신 IDoc 트리거 |
| MASTER_IDOC_DISTRIBUTE | ECC/S4 | Distribute master data IDoc / 마스터 데이터 IDoc 배포 |
| EDI_DOCUMENT_OPEN_FOR_PROCESS | ECC/S4 | Open IDoc for processing / 처리용 IDoc 열기 |
| IDOC_STATUS_WRITE_TO_DATABASE | ECC/S4 | Write IDoc status / IDoc 상태 기록 |
| BAPI_IDOC_INPUT1 | ECC/S4 | Generic BAPI for inbound IDoc / 범용 수신 IDoc BAPI |
| ALE_MODEL_INFO_GET | ECC/S4 | Get ALE distribution model / ALE 배포 모델 조회 |

## Number Range / 번호 범위

| BAPI/FM | System | Description / 설명 |
|---------|--------|---------------------|
| NUMBER_GET_NEXT | ECC/S4 | Get next number from range / 다음 번호 조회 |
| NUMBER_GET_INFO | ECC/S4 | Get number range info / 번호 범위 정보 조회 |
| NUMBER_RANGE_UPDATE | ECC/S4 | Update number range / 번호 범위 업데이트 |
| NUMBER_RANGE_INTERVAL_LIST | ECC/S4 | List intervals / 구간 목록 |
| NUMBER_CHECK | ECC/S4 | Check number is valid in range / 범위 유효성 확인 |

## User / Authorization / 사용자 및 권한

| BAPI/FM | System | Description / 설명 |
|---------|--------|---------------------|
| BAPI_USER_CREATE1 | ECC/S4 | Create SAP user / SAP 사용자 생성 |
| BAPI_USER_CHANGE | ECC/S4 | Change user / 사용자 변경 |
| BAPI_USER_GETLIST | ECC/S4 | List users / 사용자 목록 |
| BAPI_USER_GET_DETAIL | ECC/S4 | Get user details / 사용자 상세 조회 |
| BAPI_USER_LOCK/UNLOCK | ECC/S4 | Lock/unlock user / 사용자 잠금/해제 |
| AUTHORITY_CHECK | ECC/S4 | ABAP authority check (statement) / ABAP 권한 점검 |
| AUTH_CHECK_TCODE | ECC/S4 | Check TCode authorization / TCode 권한 확인 |
| AUTHORITY_CHECK_DATASET | ECC/S4 | Check file access auth / 파일 접근 권한 확인 |
| SUSR_USER_READ | ECC/S4 | Read user data / 사용자 데이터 읽기 |

## Currency / Exchange Rate / 통화 및 환율

| BAPI/FM | System | Description / 설명 |
|---------|--------|---------------------|
| BAPI_EXCHANGERATE_GETDETAIL | ECC/S4 | Read exchange rate / 환율 조회 |
| BAPI_EXCHANGERATE_SAVEREPLICA | ECC/S4 | Save rate replica / 환율 복제 저장 |
| BAPI_EXCHANGERATE_GETLISTRATES | ECC/S4 | List rates / 환율 목록 |
| BAPI_CURRENCY_CONV_TO_EXTERNAL | ECC/S4 | Convert to display format / 외부 표시 형식 변환 |
| BAPI_CURRENCY_CONV_TO_INTERNAL | ECC/S4 | Convert to internal format / 내부 형식 변환 |
| CONVERT_TO_LOCAL_CURRENCY | ECC/S4 | Local currency conversion / 현지 통화 변환 |
| CONVERT_TO_FOREIGN_CURRENCY | ECC/S4 | Foreign currency conversion / 외화 변환 |
| READ_EXCHANGE_RATE | ECC/S4 | Read TCURR / TCURR 읽기 |

## Country / Language / Units / 국가, 언어, 단위

| BAPI/FM | System | Description / 설명 |
|---------|--------|---------------------|
| BAPI_COUNTRY_GETLIST | ECC/S4 | List countries (T005) / 국가 목록 |
| BAPI_COUNTRY_GETDETAIL | ECC/S4 | Country details / 국가 상세 |
| BAPI_LANGUAGE_GETLIST | ECC/S4 | List languages / 언어 목록 |
| BAPI_UNIT_OF_MEASURE_GETLIST | ECC/S4 | List UoM / 측정 단위 목록 |
| UNIT_CONVERSION_SIMPLE | ECC/S4 | Convert between UoM / 단위 변환 |
| UNIT_CONVERSION_WITH_FACTOR | ECC/S4 | With conversion factor / 변환 계수 사용 |

## Calendar / 달력

| BAPI/FM | System | Description / 설명 |
|---------|--------|---------------------|
| FACTORYDATE_CONVERT_TO_DATE | ECC/S4 | Convert factory date / 공장 날짜 변환 |
| DATE_CONVERT_TO_FACTORYDATE | ECC/S4 | Convert to factory date / 공장 날짜로 변환 |
| DATE_COMPUTE_DAY | ECC/S4 | Compute day of week / 요일 계산 |
| DATE_CHECK_PLAUSIBILITY | ECC/S4 | Validate date / 날짜 유효성 검증 |
| FACTORYDATE_GET_NEXT | ECC/S4 | Next factory day / 다음 공장 영업일 |
| HOLIDAY_CHECK_AND_GET_INFO | ECC/S4 | Check if date is holiday / 휴일 여부 확인 |
| BAPI_BUPA_BIRTHDATE_CHANGE | ECC/S4 | (example calendar-related) / 달력 관련 예시 |

## Transaction Control / 트랜잭션 제어

| BAPI/FM | System | Description / 설명 |
|---------|--------|---------------------|
| BAPI_TRANSACTION_COMMIT | ECC/S4 | Commit SAP LUW (CRITICAL for all BAPIs) / LUW 커밋 (필수) |
| BAPI_TRANSACTION_ROLLBACK | ECC/S4 | Rollback work / 작업 롤백 |
| ENQUEUE_* | ECC/S4 | Enqueue objects before modification / 수정 전 잠금 설정 |
| DEQUEUE_* | ECC/S4 | Release locks / 잠금 해제 |

## Generic Data Access / 범용 데이터 액세스

| BAPI/FM | System | Description / 설명 |
|---------|--------|---------------------|
| RFC_READ_TABLE | ECC/S4 | Generic table read via RFC (USE WITH CAUTION — performance) / 범용 RFC 테이블 읽기 (성능 주의) |
| RFC_GET_TABLE_ENTRIES | ECC/S4 | Get table entries / 테이블 항목 조회 |
| DDIF_FIELDINFO_GET | ECC/S4 | Get DDIC field info / DDIC 필드 정보 |
| DDIF_TABL_GET | ECC/S4 | Get table metadata / 테이블 메타데이터 |
| RS_COMPLEX_OBJECT_BUILD | ECC/S4 | Build complex objects / 복합 오브젝트 빌드 |

## Output / Messages / 출력 및 메시지

| BAPI/FM | System | Description / 설명 |
|---------|--------|---------------------|
| MESSAGE_TEXT_BUILD | ECC/S4 | Build message from ID/Number / 메시지 ID/번호로 텍스트 빌드 |
| BAL_LOG_CREATE | ECC/S4 | Application log create / 애플리케이션 로그 생성 |
| BAL_LOG_MSG_ADD | ECC/S4 | Add message to log / 로그에 메시지 추가 |
| BAL_DB_SAVE | ECC/S4 | Save app log to DB / 앱 로그 DB 저장 |
| BAL_DSP_LOG_DISPLAY | ECC/S4 | Display log / 로그 표시 |

## Workflow / 워크플로우

| BAPI/FM | System | Description / 설명 |
|---------|--------|---------------------|
| SAP_WAPI_CREATE_EVENT | ECC/S4 | Trigger workflow event / 워크플로우 이벤트 트리거 |
| SAP_WAPI_WORKITEM_COMPLETE | ECC/S4 | Complete workitem / 작업 항목 완료 |
| SAP_WAPI_START_WORKFLOW | ECC/S4 | Start workflow / 워크플로우 시작 |

## S/4HANA Specific / S/4HANA 전용

| BAPI/FM/Class | System | Description / 설명 |
|---------------|--------|---------------------|
| CL_ABAP_CONTEXT_INFO=>GET_USER_TECHNICAL_NAME | S4 | Cloud-compatible user get / 클라우드 호환 사용자 조회 |
| /UI2/CL_JSON | S4 | JSON parsing / JSON 파싱 |
| CL_HTTP_CLIENT | ECC/S4 | HTTP client / HTTP 클라이언트 |
