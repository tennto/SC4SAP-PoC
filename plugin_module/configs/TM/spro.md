# TM - Transportation Management SPRO Configuration
# TM - 운송 관리 SPRO 설정

## Enterprise Structure
| Config Name | Table/View | Description |
|------------|-----------|-------------|
| Define Organizational Units for TM | V_TM_ORG | TM Organizational Unit definition / TM 조직 단위 정의 |
| Define Transportation Planning Point | V_T115 | Transportation Planning Point definition / 운송 계획 지점 정의 |
| Assign Transportation Planning Point to Company Code | V_T115K | Assign Transportation Planning Point to Company Code / 운송 계획 지점을 회사코드에 배정 |
| Define Shipping Types | V_TVKBT | Shipping Type definition / 출하 유형 정의 |
| Define Means of Transport | V_TMTNS | Means of Transport definition / 운송 수단 정의 |
| Define Service Agents / Carriers | V_LFA1_CA | Service Agent / Carrier definition / 운송 업체 정의 |

## Master Data
| Config Name | Table/View | Description |
|------------|-----------|-------------|
| Define Transportation Zones | V_TZONE | Transportation Zone definition / 운송 구역 정의 |
| Define Routes | V_TROSD | Route definition / 경로 정의 |
| Define Route Stages | V_TROS | Route Stage definition / 경로 단계 정의 |
| Define Legs | V_TMLEG | Leg definition / 구간 정의 |
| Define Location Types | V_TMLOC | Location Type definition / 위치 유형 정의 |
| Define Resources (Vehicles/Equipment) | V_TMRES | Resource (Vehicles/Equipment) definition / 자원(차량/장비) 정의 |
| Define Carrier Profiles | V_TMCAR | Carrier Profile definition / 운송 업체 프로파일 정의 |
| Define Transportation Lane | V_TMLANE | Transportation Lane definition / 운송 레인 정의 |
| Configure Freight Unit Types | V_TMFUT | Freight Unit Type configuration / 화물 단위 유형 설정 |

## Freight Order Management
| Config Name | Table/View | Description |
|------------|-----------|-------------|
| Define Freight Order Types | V_TMFOT | Freight Order Type definition / 화물 오더 유형 정의 |
| Define Freight Booking Types | V_TMFBT | Freight Booking Type definition / 화물 예약 유형 정의 |
| Define Delivery-Based Freight Unit Building Rules | V_TMFUB | Delivery-Based Freight Unit Building Rule definition / 납품 기반 화물 단위 구축 규칙 정의 |
| Configure Tendering Settings | V_TMTEND | Tendering Settings configuration / 입찰 설정 설정 |
| Define Incompatibility Groups | V_TMINC | Incompatibility Group definition / 비호환 그룹 정의 |
| Configure Dangerous Goods Check | V_TMDG | Dangerous Goods Check configuration / 위험물 검사 설정 |

## Planning and Optimization
| Config Name | Table/View | Description |
|------------|-----------|-------------|
| Configure VSR Optimizer Settings | V_TMVSR | VSR Optimizer Settings configuration / VSR 최적화 도구 설정 |
| Define Planning Profile | V_TMPP | Planning Profile definition / 계획 프로파일 정의 |
| Define Selection Profile | V_TMSP | Selection Profile definition / 선택 프로파일 정의 |
| Configure Scheduling Settings | V_TMSCHED | Scheduling Settings configuration / 일정 계획 설정 설정 |
| Define Constraint Profiles | V_TMCP | Constraint Profile definition / 제약 프로파일 정의 |
| Configure Load Planning | V_TMLP | Load Planning configuration / 적재 계획 설정 |

## Charge Calculation / Freight Costing
| Config Name | Table/View | Description |
|------------|-----------|-------------|
| Define Freight Agreement Types | V_TMFAG | Freight Agreement Type definition / 운임 합의 유형 정의 |
| Define Rate Tables | V_TMRT | Rate Table definition / 요율 테이블 정의 |
| Define Calculation Sheets | V_TMCS | Calculation Sheet definition / 계산 시트 정의 |
| Configure Tariff Zones | V_TMTZ | Tariff Zone configuration / 요금 구역 설정 |
| Define Surcharge Types | V_TMSUR | Surcharge Type definition / 할증료 유형 정의 |
| Configure Settlement Documents | V_TMSD | Settlement Document configuration / 정산 문서 설정 |

## Event Management Integration
| Config Name | Table/View | Description |
|------------|-----------|-------------|
| Configure TM-EM Integration | V_TMEM | TM-EM Integration configuration / TM-EM 통합 설정 |
| Define Tracking and Tracing Events | V_TMTTE | Tracking and Tracing Event definition / 추적 이벤트 정의 |
| Configure Expected Events | V_TMEE | Expected Events configuration / 예상 이벤트 설정 |
