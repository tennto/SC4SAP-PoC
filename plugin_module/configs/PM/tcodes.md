# PM - Plant Maintenance Transaction Codes
# PM - 설비 관리 트랜잭션 코드

## Master Data
| TCode | System | Description |
|-------|--------|-------------|
| IL01 | ECC/S4 | Create Functional Location / 기능 위치 생성 |
| IL02 | ECC/S4 | Change Functional Location / 기능 위치 변경 |
| IL03 | ECC/S4 | Display Functional Location / 기능 위치 조회 |
| IE01 | ECC/S4 | Create Equipment / 설비 생성 |
| IE02 | ECC/S4 | Change Equipment / 설비 변경 |
| IE03 | ECC/S4 | Display Equipment / 설비 조회 |
| IM01 | ECC/S4 | Create Measuring Point / 측정점 생성 |
| IK01 | ECC/S4 | Create Measurement Document / 측정 문서 생성 |
| IP01 | ECC/S4 | Create Maintenance Plan / 유지보수 계획 생성 |
| IP02 | ECC/S4 | Change Maintenance Plan / 유지보수 계획 변경 |

## Notifications
| TCode | System | Description |
|-------|--------|-------------|
| IW21 | ECC/S4 | Create PM Notification / PM 알림 생성 |
| IW22 | ECC/S4 | Change PM Notification / PM 알림 변경 |
| IW23 | ECC/S4 | Display PM Notification / PM 알림 조회 |
| IW28 | ECC/S4 | Change PM Notification (List) / PM 알림 목록 변경 |
| IW29 | ECC/S4 | Display PM Notification (List) / PM 알림 목록 조회 |

## Work Orders
| TCode | System | Description |
|-------|--------|-------------|
| IW31 | ECC/S4 | Create PM Order / PM 오더 생성 |
| IW32 | ECC/S4 | Change PM Order / PM 오더 변경 |
| IW33 | ECC/S4 | Display PM Order / PM 오더 조회 |
| IW38 | ECC/S4 | Change PM Orders (List) / PM 오더 목록 변경 |
| IW41 | ECC/S4 | Enter PM Order Confirmation / PM 오더 확인 입력 |
| IW42 | ECC/S4 | Overall Completion Confirmation / 전체 완료 확인 |
| IWBK | ECC/S4 | Post Goods for PM Order / PM 오더 재고 전기 |

## Preventive Maintenance
| TCode | System | Description |
|-------|--------|-------------|
| IP10 | ECC/S4 | Maintain Maintenance Call / 유지보수 호출 유지 |
| IP30 | ECC/S4 | Maintenance Plan Scheduling Monitor / 유지보수 계획 일정 모니터 |
| IP31 | ECC/S4 | Maintenance Plan Scheduling (Deadline) / 기한 기준 계획 일정 |

## Configuration
| TCode | System | Description |
|-------|--------|-------------|
| OIOF | ECC/S4 | Define Functional Location Categories / 기능 위치 범주 정의 |
| OIB2 | ECC/S4 | Define Equipment Categories / 설비 범주 정의 |
| OIH2 | ECC/S4 | Define Order Types for PM / PM 주문 유형 정의 |
| OIYL | ECC/S4 | Define Notification Types / 알림 유형 정의 |
| OIM0 | ECC/S4 | Define Maintenance Strategies / 유지보수 전략 정의 |

## Reporting
| TCode | System | Description |
|-------|--------|-------------|
| IW39 | ECC/S4 | Display PM Orders (List) / PM 오더 목록 조회 |
| IW69 | ECC/S4 | Display PM Notifications (List) / PM 알림 목록 조회 |
| MCJB | ECC/S4 | PM: Order Selection / PM 오더 선택 |
| S_ALR_87012894 | ECC/S4 | Equipment List / 설비 목록 |
| MCIZ | ECC/S4 | PM: Breakdown Analysis / PM 고장 분석 |

## Monitoring
| TCode | System | Description |
|-------|--------|-------------|
| IW37N | ECC/S4 | Outstanding PM Orders / 미결 PM 오더 |
| IP24 | ECC/S4 | Maintenance Plan List / 유지보수 계획 목록 |
| IW65 | ECC/S4 | PM Notification Overview / PM 알림 개요 |
| PMSM | ECC/S4 | PM Summary Report / PM 요약 보고서 |
