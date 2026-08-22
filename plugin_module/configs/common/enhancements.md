# Common - Cross-Module Enhancements
# 공통 - 교차 모듈 향상

모든 SAP 모듈에서 공통으로 사용되는 사용자 출구, BAdI, 향상점 참조.
User exits, BAdIs, and enhancement spots shared across all SAP modules.

## Authorization Check Enhancements / 권한 점검 향상

| Enhancement | System | Description / 설명 |
|-------------|--------|---------------------|
| SUSR0001 | ECC/S4 | User Exit: Check password / 비밀번호 검사 |
| SUSR0002 | ECC/S4 | User exit at user maintenance / 사용자 유지 시 출구 |
| BADI_CCM_AUTHORITY | ECC/S4 | Custom authorization checks / 사용자 정의 권한 점검 |
| AUTHORITY_CHECK | ECC/S4 | ABAP statement (can be enhanced via wrapper) / ABAP 명령문 |

## Number Range Enhancements / 번호 범위 향상

| Enhancement | System | Description / 설명 |
|-------------|--------|---------------------|
| NUMBER_RANGE_NR_DATE | ECC/S4 | Number Range BAdI / 번호 범위 BAdI |
| SAPLSNR3 customer exit | ECC/S4 | 고객 출구 |
| BAdI EXIT_SAPLSNR3_001 | ECC/S4 | SAPLSNR3 관련 BAdI |

## IDoc Processing (Generic) / IDoc 처리 (범용)

| Enhancement | System | Description / 설명 |
|-------------|--------|---------------------|
| IDOC_DATA_MAPPER | ECC/S4 | Generic IDoc data mapper BAdI / 범용 IDoc 매퍼 |
| EDI_IDOC_INPUT | ECC/S4 | Inbound IDoc exit / 수신 IDoc 출구 |
| BD_BADI_IDOC_DATA_MAPPER | ECC/S4 | IDoc mapper / IDoc 매퍼 |
| Change view for inbound: WE57 | ECC/S4 | 수신 IDoc 뷰 변경 |
| Outbound exit per message type | ECC/S4 | 메시지 유형별 발신 출구 |
| ZXEDIZZZ | ECC | CMOD-based IDoc user exit (legacy) / 레거시 CMOD IDoc 출구 |

## Change Document Enhancements / 변경 문서 향상

| Enhancement | System | Description / 설명 |
|-------------|--------|---------------------|
| CHANGEDOCUMENT_OPEN | ECC/S4 | Open change doc / 변경 문서 열기 |
| CHANGEDOCUMENT_SINGLE_CASE | ECC/S4 | Single case / 단일 케이스 |
| CHANGEDOCUMENT_CLOSE | ECC/S4 | Close / 닫기 |
| Object-specific CHANGEDOCUMENT_* | ECC/S4 | 오브젝트별 변경 문서 FM |
| SCDO | ECC/S4 | Transaction for change document objects / 변경 문서 오브젝트 트랜잭션 |

## Application Log Enhancements / 애플리케이션 로그 향상

| Enhancement | System | Description / 설명 |
|-------------|--------|---------------------|
| BAL_LOG_CREATE | ECC/S4 | FM — Create log / 로그 생성 |
| BAL_LOG_MSG_ADD | ECC/S4 | Add message / 메시지 추가 |
| BAL_CALLBACK_SETUP | ECC/S4 | BAdI — callback setup / 콜백 설정 BAdI |

## Workflow Enhancements / 워크플로우 향상

| Enhancement | System | Description / 설명 |
|-------------|--------|---------------------|
| SAP_WAPI_CREATE_EVENT | ECC/S4 | Trigger event / 이벤트 트리거 |
| SWO1 | ECC/S4 | Business objects maintenance / 비즈니스 오브젝트 유지 |
| WF_BADI_BACKGROUND | ECC/S4 | Background processing BAdI / 백그라운드 처리 BAdI |
| WORKITEM_CHANGE | ECC/S4 | Work item change BAdI / 작업 항목 변경 BAdI |

## Batch Input Enhancements / 배치 입력 향상

| Enhancement | System | Description / 설명 |
|-------------|--------|---------------------|
| BDC_OPEN_GROUP | ECC/S4 | Open BDC session / BDC 세션 열기 |
| BDC_INSERT | ECC/S4 | Insert BDC data / BDC 데이터 삽입 |
| BDC_CLOSE_GROUP | ECC/S4 | Close BDC session / BDC 세션 닫기 |
| Custom BDC session handling | ECC/S4 | 사용자 정의 BDC 세션 처리 |

## Output Determination (NACE generic) / 출력 결정 (NACE 범용)

| Enhancement | System | Description / 설명 |
|-------------|--------|---------------------|
| EXIT_SAPLV61B_001 | ECC/S4 | Customer exit (output determination data) / 고객 출구 |
| OUTPUT_DETERMINATION | ECC/S4 | BAdI for output determination / 출력 결정 BAdI |
| VOFM routines | ECC/S4 | Common for SD; also used in MM/FI / VOFM 루틴 |

## CDS / RAP Common Extensions (S/4HANA) / CDS 및 RAP 확장

| Enhancement | System | Description / 설명 |
|-------------|--------|---------------------|
| CDS View Extension | S4 | @AbapCatalog.extensibility / CDS 뷰 확장 |
| Meta-extension annotations | S4 | @Metadata.ignorePropagatedAnnotations / 메타 확장 어노테이션 |
| Behavior Definition extensions | S4 | RAP behavior extensions / RAP 동작 정의 확장 |
| Core Data Services annotations | S4 | CDS 어노테이션 |

## Global Class Enhancements (Method Additions) / 글로벌 클래스 향상

| Enhancement | System | Description / 설명 |
|-------------|--------|---------------------|
| Enhancement Implementations (SE19) | ECC/S4 | For global classes / 글로벌 클래스용 |
| Method Extensions | ECC/S4 | Pre/post/overwrite methods / 전/후/덮어쓰기 메서드 |
| Implicit Enhancements | ECC/S4 | ENHANCEMENT-POINT / 암시적 향상점 |

## Archive Enhancements / 아카이브 향상

| Enhancement | System | Description / 설명 |
|-------------|--------|---------------------|
| ARCHIVE_OPEN_* | ECC/S4 | Archive open FMs / 아카이브 열기 FM |
| ARCHIVE_WRITE_* | ECC/S4 | Archive write FMs / 아카이브 쓰기 FM |
| ARCHIVE_SAVE | ECC/S4 | Save archive / 아카이브 저장 |
| Archive Object-specific programs | ECC/S4 | 아카이브 오브젝트별 프로그램 |
| BAdI ARCHIVE_RELOAD | ECC/S4 | 아카이브 재로드 BAdI |

## Common SAP Enhancement Spots (ES_*) / 공통 SAP 향상점

| Enhancement Spot | System | Description / 설명 |
|------------------|--------|---------------------|
| ES_SAPUSER | ECC/S4 | User exits / 사용자 출구 |
| ES_SAPLSNR3 | ECC/S4 | Number ranges / 번호 범위 |
| ES_SAPLEINA | ECC/S4 | General purchasing / 일반 구매 |
| ES_SAPLKKBL | ECC/S4 | Document display / 문서 표시 |
