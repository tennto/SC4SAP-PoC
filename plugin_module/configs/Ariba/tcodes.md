# Ariba - SAP Ariba Integration Transaction Codes
# Ariba - SAP Ariba 통합 트랜잭션 코드

## Master Data / Integration Setup
| TCode | System | Description |
|-------|--------|-------------|
| SM59 | ECC/S4 | RFC Destinations / RFC 대상 |
| SOAMANAGER | ECC/S4 | SOA Manager (Web Service Config) / SOA 관리자 |
| WE20 | ECC/S4 | Partner Profiles (IDoc) / 파트너 프로파일 (IDoc) |
| WE21 | ECC/S4 | Ports in IDoc Processing / IDoc 처리 포트 |
| BD54 | ECC/S4 | Maintain Logical Systems / 논리적 시스템 유지 |
| XK01 | ECC | Create Vendor (for Ariba Supplier) / 공급업체 생성 (Ariba) — S/4HANA: Use BP |
| XK02 | ECC | Change Vendor Master / 공급업체 마스터 변경 — S/4HANA: Use BP |
| BP | S4 | Maintain Business Partner / 비즈니스 파트너 유지 |

## Procurement (SAP MM side of Ariba integration)
| TCode | System | Description |
|-------|--------|-------------|
| ME21N | ECC/S4 | Create Purchase Order (from Ariba approved req) / PO 생성 |
| ME22N | ECC/S4 | Change Purchase Order / PO 변경 |
| ME51N | ECC/S4 | Create Purchase Requisition / 구매 요청 생성 |
| MIGO | ECC/S4 | Post Goods Receipt (transfers to Ariba) / 입고 전기 |
| MIRO | ECC/S4 | Enter Incoming Invoice (from Ariba e-invoice) / 수신 송장 입력 |
| ME2M | ECC/S4 | Purchase Orders by Material / 자재별 PO |

## Contract Management
| TCode | System | Description |
|-------|--------|-------------|
| ME31K | ECC/S4 | Create Contract (imported from Ariba) / 계약 생성 |
| ME32K | ECC/S4 | Change Contract / 계약 변경 |
| ME33K | ECC/S4 | Display Contract / 계약 조회 |
| ME38 | ECC/S4 | Maintain Scheduling Agreement / 일정 합의 유지 |

## IDoc Monitoring
| TCode | System | Description |
|-------|--------|-------------|
| WE02 | ECC/S4 | IDoc List / IDoc 목록 |
| WE05 | ECC/S4 | IDoc Overview / IDoc 개요 |
| WE09 | ECC/S4 | Search for IDoc / IDoc 검색 |
| BD87 | ECC/S4 | Status Monitor for ALE Messages / ALE 메시지 상태 모니터 |
| MONI | ECC/S4 | ALE/IDoc Monitor / ALE/IDoc 모니터 |

## Configuration
| TCode | System | Description |
|-------|--------|-------------|
| SPRO | ECC/S4 | Ariba Integration Customizing / Ariba 통합 커스터마이징 |
| SALE | ECC/S4 | ALE Customizing / ALE 커스터마이징 |
| BD64 | ECC/S4 | Maintain Distribution Model / 배포 모델 유지 |
| SWI5 | ECC/S4 | Workitem Selection / 작업 항목 선택 |

## Reporting
| TCode | System | Description |
|-------|--------|-------------|
| ME2L | ECC/S4 | POs by Vendor / 공급업체별 PO |
| ME2N | ECC/S4 | POs by PO Number / PO 번호별 PO |
| FBL1N | ECC/S4 | Vendor Line Items (for Ariba invoices) / 공급업체 항목 |
| MIR5 | ECC/S4 | Display List of Invoice Documents / 송장 문서 목록 조회 |

## Monitoring
| TCode | System | Description |
|-------|--------|-------------|
| SLG1 | ECC/S4 | Application Log / 애플리케이션 로그 |
| SM58 | ECC/S4 | Transactional RFC Monitor / 트랜잭션 RFC 모니터 |
| SXMB_MONI | ECC/S4 | PI/PO Message Monitor / PI/PO 메시지 모니터 |
| AL11 | ECC/S4 | SAP Directories (for Ariba file exchange) / SAP 디렉토리 |
| SM21 | ECC/S4 | System Log / 시스템 로그 |
