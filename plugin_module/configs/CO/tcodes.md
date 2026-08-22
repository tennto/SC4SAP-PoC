# CO - Controlling Transaction Codes
# CO - 관리 회계 트랜잭션 코드

## Master Data
| TCode | System | Description |
|-------|--------|-------------|
| KS01 | ECC/S4 | Create Cost Center / 원가 센터 생성 |
| KS02 | ECC/S4 | Change Cost Center / 원가 센터 변경 |
| KS03 | ECC/S4 | Display Cost Center / 원가 센터 조회 |
| KA01 | ECC | Create Cost Element / 원가 요소 생성 — S/4HANA: FS00 (cost element = G/L account with cost element category) |
| KA02 | ECC | Change Cost Element / 원가 요소 변경 — S/4HANA: FS00 |
| KL01 | ECC/S4 | Create Activity Type / 활동 유형 생성 |
| KL02 | ECC/S4 | Change Activity Type / 활동 유형 변경 |
| KO01 | ECC/S4 | Create Internal Order / 내부 주문 생성 |
| KO02 | ECC/S4 | Change Internal Order / 내부 주문 변경 |
| KO03 | ECC/S4 | Display Internal Order / 내부 주문 조회 |
| KCH1 | ECC/S4 | Create Cost Center Group / 원가 센터 그룹 생성 |

## Planning
| TCode | System | Description |
|-------|--------|-------------|
| KP06 | ECC/S4 | Enter Cost Center Planning / 원가 센터 계획 입력 |
| KP26 | ECC/S4 | Enter Activity Type Planning / 활동 유형 계획 입력 |
| KP46 | ECC/S4 | Enter Statistical Key Figure Planning / 통계 수치 계획 입력 |
| KPF6 | ECC/S4 | Copy Planning / 계획 복사 |
| KO12 | ECC/S4 | Enter Internal Order Planning / 내부 주문 계획 입력 |

## Actual Postings
| TCode | System | Description |
|-------|--------|-------------|
| KB11N | ECC/S4 | Enter Manual Reposting of Costs / 원가 수동 재전기 |
| KB21N | ECC/S4 | Enter Activity Allocation / 활동 배분 입력 |
| KB31N | ECC/S4 | Enter Statistical Key Figures / 통계 수치 입력 |
| KSU5 | ECC/S4 | Execute Assessment Cycle / 배분 사이클 실행 |
| KSV5 | ECC/S4 | Execute Distribution Cycle / 분배 사이클 실행 |

## Product Costing
| TCode | System | Description |
|-------|--------|-------------|
| CK11N | ECC/S4 | Create Product Cost Estimate / 제품 원가 견적 생성 |
| CK24 | ECC/S4 | Price Update (Mark/Release) / 가격 갱신 (표시/해제) |
| CKMLCP | ECC/S4 | Cockpit for Material Ledger Closing / 자재 원장 마감 조종석 |
| KKF6N | ECC/S4 | Create Product Cost Collector / 제품 원가 수집기 생성 |
| CO88 | ECC/S4 | Actual Settlement: Production Orders / 제조 오더 실적 정산 |

## Profitability Analysis
| TCode | System | Description |
|-------|--------|-------------|
| KE21N | ECC/S4 | Enter CO-PA Line Items / CO-PA 항목 입력 |
| KE30 | ECC/S4 | Execute Profitability Report / 수익성 보고서 실행 |
| KE24 | ECC/S4 | Display Line Items (CO-PA) / CO-PA 항목 조회 |
| KEU5 | ECC/S4 | Execute CO-PA Assessment / CO-PA 배분 실행 |

## Configuration
| TCode | System | Description |
|-------|--------|-------------|
| OKKP | ECC/S4 | Maintain Controlling Area / 관리 영역 유지 |
| OKKS | ECC/S4 | Set Controlling Area / 관리 영역 설정 |
| OKB9 | ECC/S4 | Define Default Account Assignment / 기본 계정 배정 정의 |
| OKC9 | ECC/S4 | Define Order Types / 주문 유형 정의 |
| OKEON | ECC/S4 | Define Cost Center Standard Hierarchy / 표준 계층 정의 |

## Reporting
| TCode | System | Description |
|-------|--------|-------------|
| S_ALR_87013611 | ECC/S4 | Cost Centers: Actual/Plan/Variance / 원가 센터: 실적/계획/편차 |
| S_ALR_87012993 | ECC/S4 | Internal Orders: Actual/Plan/Variance / 내부 주문: 실적/계획/편차 |
| KSB1 | ECC/S4 | Cost Center Actual Line Items / 원가 센터 실적 항목 |
| KOB1 | ECC/S4 | Internal Order Actual Line Items / 내부 주문 실적 항목 |
| S_ALR_87013336 | ECC/S4 | Cost Element Report / 원가 요소 보고서 |

## Monitoring
| TCode | System | Description |
|-------|--------|-------------|
| CJIA | ECC/S4 | Project: Actual/Plan/Commitment / 프로젝트: 실적/계획/약정 |
| KO8G | ECC/S4 | Collective Settlement: Internal Orders / 내부 주문 집합 정산 |
| KSCG | ECC/S4 | Template Allocation / 템플릿 배분 |
