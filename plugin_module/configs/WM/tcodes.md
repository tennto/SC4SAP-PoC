# WM - Warehouse Management Transaction Codes
# WM - 창고 관리 트랜잭션 코드

> **⚠ LE-WM은 S/4HANA에서 지원되지 않습니다. S/4HANA에서는 EWM (Extended Warehouse Management)을 사용하십시오.**
> **⚠ LE-WM is deprecated in S/4HANA. Use EWM (Extended Warehouse Management) instead.**

## Master Data (ECC LE-WM)
| TCode | System | Description |
|-------|--------|-------------|
| LS01N | ECC | Create Storage Bin / 저장 빈 생성 |
| LS02N | ECC | Change Storage Bin / 저장 빈 변경 |
| LS03N | ECC | Display Storage Bin / 저장 빈 조회 |
| LS04 | ECC | Set Storage Bin Lock / 저장 빈 잠금 설정 |
| LS05 | ECC | Block/Unblock Storage Type / 저장 유형 블록/해제 |
| LN01 | ECC | Create Warehouse Number / 창고 번호 생성 |
| LX02 | ECC | Storage Bin List / 저장 빈 목록 |

## Transfer Orders (ECC LE-WM)
| TCode | System | Description |
|-------|--------|-------------|
| LT01 | ECC | Create Transfer Order for Inventory Diff / 재고 차이에 대한 TO 생성 |
| LT0A | ECC | Create Transfer Order from TR / TR로부터 TO 생성 |
| LT1A | ECC | Confirm Transfer Order Item / TO 항목 확인 |
| LT12 | ECC | Confirm Transfer Order / TO 확인 |
| LT21 | ECC | Display Transfer Order / TO 조회 |
| LT22 | ECC | Change Transfer Order / TO 변경 |
| LT4A | ECC | Cancel Transfer Order / TO 취소 |
| LT25 | ECC | Print Transfer Order / TO 인쇄 |
| MIGO | ECC/S4 | Goods Movement (triggers auto-TO) / 재고 이동 (자동 TO 트리거) |

## Transfer Requirements (ECC LE-WM)
| TCode | System | Description |
|-------|--------|-------------|
| LB01 | ECC | Create Transfer Requirement / 이전 요청 생성 |
| LB02 | ECC | Change Transfer Requirement / 이전 요청 변경 |
| LB03 | ECC | Display Transfer Requirement / 이전 요청 조회 |
| LB10 | ECC | TR for Storage Type / 저장 유형별 이전 요청 |
| LB11 | ECC | TR Items / 이전 요청 항목 |

## Inventory (ECC LE-WM)
| TCode | System | Description |
|-------|--------|-------------|
| MI01 | ECC/S4 | Create Physical Inventory Document / 실사 문서 생성 |
| MI04 | ECC/S4 | Enter Inventory Count / 재고 실사 입력 |
| MI07 | ECC/S4 | Post Inventory Differences / 재고 차이 전기 |
| LI01 | ECC | Create WM Inventory Document / WM 재고 실사 문서 생성 |
| LI02 | ECC | Change WM Inventory Document / WM 재고 실사 문서 변경 |
| LI04 | ECC | Enter WM Inventory Count / WM 재고 실사 입력 |
| LI20 | ECC | Post WM Inventory Differences / WM 재고 차이 전기 |
| LX26 | ECC | Start Annual Inventory / 연간 재고 실사 시작 |

## Configuration (ECC LE-WM)
| TCode | System | Description |
|-------|--------|-------------|
| SPRO | ECC/S4 | WM Customizing / WM 커스터마이징 |
| LM00 | ECC | Lean WM Configuration / 린 WM 설정 |
| OMLT | ECC | Define Storage Type / 저장 유형 정의 |
| OMBO | ECC | Define Movement Types for WM / WM 이동 유형 정의 |

## Reporting (ECC LE-WM)
| TCode | System | Description |
|-------|--------|-------------|
| LS26 | ECC | Stock Overview per Storage Bin / 저장 빈별 재고 개요 |
| LX03 | ECC | Bin Status Report / 빈 상태 보고서 |
| LX04 | ECC | Capacity Load Utilization / 용량 부하 활용도 |
| MB52 | ECC/S4 | Warehouse Stocks of Material / 창고 자재 재고 |
| LQ010 | ECC | Quants in Storage Type / 저장 유형별 재고 |

## Monitoring (ECC LE-WM)
| TCode | System | Description |
|-------|--------|-------------|
| LT41 | ECC | Confirm TO in Foreground / 포그라운드에서 TO 확인 |
| LX05 | ECC | Log of TO without Confirmation / 확인 없는 TO 로그 |
| LX08 | ECC | Negative Stocks / 마이너스 재고 |
| LL01 | ECC | Warehouse Activity Monitor / 창고 활동 모니터 |

## EWM Transaction Codes (S/4HANA)
| TCode | System | Description |
|-------|--------|-------------|
| /SCWM/MON | S4 | EWM Warehouse Monitor / EWM 창고 모니터 |
| /SCWM/PRDI | S4 | EWM Inbound Delivery / EWM 인바운드 납품 |
| /SCWM/PRDO | S4 | EWM Outbound Delivery / EWM 아웃바운드 납품 |
| /SCWM/ADGI | S4 | Post Goods Issue (EWM) / 출고 전기 (EWM) |
| /SCWM/ADGR | S4 | Post Goods Receipt (EWM) / 입고 전기 (EWM) |
| /SCWM/PACK | S4 | Packing (EWM) / 패킹 (EWM) |
| /SCWM/PI_PROCESS | S4 | Physical Inventory (EWM) / 실사 (EWM) |
