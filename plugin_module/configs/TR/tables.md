# TR - Key Tables Reference
# TR - 주요 테이블 참조

## Master Data Tables
## 마스터 데이터 테이블

### Bank

| Table | System | Description | 설명 |
|-------|--------|-------------|------|
| T012 | ECC/S4 | House Banks | 자사 은행 |
| T012K | ECC/S4 | Bank Accounts (classic) | 은행 계좌(클래식) |
| T028B | ECC/S4 | House Bank Accounts | 자사 은행 계좌 |
| TIBAN | ECC/S4 | IBAN Data | IBAN 데이터 |
| BNKA | ECC/S4 | Bank Master | 은행 마스터 |
| FCLM_BAM_AMD | S4 | Bank Account Master (S/4HANA BAM) | 은행 계좌 마스터(S/4HANA BAM) |
| FCLM_BAM_SIG | S4 | BAM Signatories | BAM 서명자 |

### Loan Master

| Table | System | Description | 설명 |
|-------|--------|-------------|------|
| VDARL | ECC/S4 | Loan Master | 대출 마스터 |
| VDKOPF | ECC/S4 | Loan Data | 대출 데이터 |

## Transaction Data Tables
## 트랜잭션 데이터 테이블

### Financial Transaction

| Table | System | Description | 설명 |
|-------|--------|-------------|------|
| VTBFHA | ECC/S4 | Financial Transaction Header | 금융 거래 헤더 |
| VTBFHAPO | ECC/S4 | Cash Flows | 현금 흐름 |
| VTBBEWO | ECC/S4 | Valuation Data | 평가 데이터 |
| VTBFHAZU | ECC/S4 | Transaction Status | 거래 상태 |
| VTBNACHL | ECC/S4 | Payment Request | 지급 요청 |

### Cash Management

| Table | System | Description | 설명 |
|-------|--------|-------------|------|
| FDSR | ECC | Cash Management Memo Records — S/4HANA: replaced by FQM_FLOW | 현금 관리 메모 레코드 — S/4HANA: FQM_FLOW로 대체 |
| FDES | ECC | Planning Data — S/4HANA: FQM_FLOW | 계획 데이터 — S/4HANA: FQM_FLOW |
| FDSB | ECC | Cash Management Source Data | 현금 관리 소스 데이터 |
| FQM_FLOW | S4 | One Exposure flow (S/4HANA Cash Management) | One Exposure 흐름(S/4HANA 현금 관리) |
| FQMA | S4 | Cash Management data storage | 현금 관리 데이터 저장 |

### In-House Cash

| Table | System | Description | 설명 |
|-------|--------|-------------|------|
| IHC_DB_HEAD | ECC/S4 | IHC Header | IHC 헤더 |
| IHC_DB_ITEM | ECC/S4 | IHC Items | IHC 항목 |
| IHC_ACC | ECC/S4 | IHC Accounts | IHC 계좌 |

## Configuration Tables
## 구성 테이블

| Table | System | Description | 설명 |
|-------|--------|-------------|------|
| T036 | ECC/S4 | Planning Groups | 계획 그룹 |
| EWUFI_CMAN | ECC/S4 | Cash Management Settings | 현금 관리 설정 |
| T058A | ECC/S4 | Planning Levels | 계획 레벨 |

## S/4HANA Specific
## S/4HANA 전용

- `FQM_FLOW`, `FQMA` — One Exposure (replaces FDSR/FDES in S/4HANA Cash Management).
- `FCLM_BAM_AMD`, `FCLM_BAM_SIG` — Bank Account Management (BAM) in S/4HANA (replaces classic T012K-based setup).
- `FQM_FLOW`, `FQMA` — One Exposure(S/4HANA 현금 관리에서 FDSR/FDES 대체).
- `FCLM_BAM_AMD`, `FCLM_BAM_SIG` — S/4HANA의 은행 계좌 관리(BAM)(클래식 T012K 기반 설정 대체).
