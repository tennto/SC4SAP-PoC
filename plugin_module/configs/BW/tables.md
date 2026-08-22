# BW - Key Tables Reference
# BW - 주요 테이블 참조

## Master Data Tables
## 마스터 데이터 테이블

### Metadata Directory

| Table | System | Description | 설명 |
|-------|--------|-------------|------|
| RSDIOBJ | ECC/S4 | InfoObject Directory | InfoObject 디렉터리 |
| RSDCUBE | ECC | InfoProvider Directory (InfoCube) — deprecated in BW/4HANA | InfoProvider 디렉터리(InfoCube) — BW/4HANA에서 사용 중단 |
| RSDODSO | ECC/S4 | DSO/ADSO Directory | DSO/ADSO 디렉터리 |
| RSDADSO | S4 | BW/4HANA ADSO Directory | BW/4HANA ADSO 디렉터리 |
| RSTRAN | ECC/S4 | Transformation Directory | 변환 디렉터리 |
| RSDTP | ECC/S4 | DTP Directory | DTP 디렉터리 |
| RSDS | ECC/S4 | DataSource Directory | DataSource 디렉터리 |
| RSPCCHAIN | ECC/S4 | Process Chain Directory | 프로세스 체인 디렉터리 |
| RSRREPDIR | ECC/S4 | Query Directory | 쿼리 디렉터리 |
| RSZCOMPDIR | ECC/S4 | Query Components | 쿼리 컴포넌트 |

## Transaction Data Tables
## 트랜잭션 데이터 테이블

### Monitoring

| Table | System | Description | 설명 |
|-------|--------|-------------|------|
| RSPCPROCESSLOG | ECC/S4 | Process Chain Log | 프로세스 체인 로그 |
| RSMONICDP | ECC/S4 | Monitor: InfoProvider Data | 모니터: InfoProvider 데이터 |
| RSSELDONE | ECC/S4 | Request Status | 요청 상태 |
| RSREQDONE | ECC/S4 | Request Status Completed | 요청 상태(완료) |
| RSSTATMANPART | ECC/S4 | Statistics: Query Performance | 통계: 쿼리 성능 |

### Data Tables (Generated)

| Table | System | Description | 설명 |
|-------|--------|-------------|------|
| /BIC/A{dso}00 | ECC/S4 | ADSO Active Table | ADSO 활성 테이블 |
| /BIC/F{cube}, /BIC/E{cube} | ECC | Fact tables (InfoCube) | 팩트 테이블(InfoCube) |
| /BIC/S{iobj} | ECC/S4 | SID Table | SID 테이블 |
| /BIC/P{iobj} | ECC/S4 | Master data | 마스터 데이터 |
| /BIC/T{iobj} | ECC/S4 | Texts | 텍스트 |
| /BIC/H{iobj} | ECC/S4 | Hierarchy | 계층 |

### Extraction

| Table | System | Description | 설명 |
|-------|--------|-------------|------|
| RODCHA | ECC/S4 | Characteristic DataSources | 특성 DataSource |
| ROIDOCPRMS | ECC/S4 | Data transfer control parameters | 데이터 전송 제어 파라미터 |
| RSA7TAB | ECC/S4 | Delta queue entries | 델타 큐 항목 |

## Configuration Tables
## 구성 테이블

| Table | System | Description | 설명 |
|-------|--------|-------------|------|
| RSADMINA | ECC/S4 | BW Admin Settings | BW 관리 설정 |

## S/4HANA Specific (BW/4HANA)
## S/4HANA 전용 (BW/4HANA)

- `RSDADSO` — BW/4HANA ADSO directory.
- InfoCube-related tables (`RSDCUBE`, `/BIC/F*`, `/BIC/E*`) are deprecated in BW/4HANA; use ADSO instead.
- InfoCube 관련 테이블(`RSDCUBE`, `/BIC/F*`, `/BIC/E*`)은 BW/4HANA에서 사용 중단됨; 대신 ADSO 사용.
