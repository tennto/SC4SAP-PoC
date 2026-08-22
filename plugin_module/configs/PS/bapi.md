# PS - Project System BAPIs & Function Modules
# PS - 프로젝트 시스템 BAPI 및 기능 모듈

## Project Definition & WBS BAPIs
| BAPI/FM | System | Description | Usage |
|---------|--------|-------------|-------|
| BAPI_PROJECTDEF_CREATE | ECC/S4 | Create Project Definition / 프로젝트 정의 생성 | Create header record in PROJ |
| BAPI_PROJECTDEF_UPDATE | ECC/S4 | Update Project Definition / 프로젝트 정의 변경 | Change project attributes |
| BAPI_PROJECTDEF_GETDETAIL | ECC/S4 | Get Project Definition Detail / 프로젝트 정의 상세 | Read PROJ record |
| BAPI_PROJECT_GETINFO | ECC/S4 | Get Project Info (multi-level) / 프로젝트 정보 조회 | Read project + WBS + network hierarchy |
| BAPI_PROJECT_MAINTAIN | ECC/S4 | Maintain Project Structure / 프로젝트 구조 유지 | Full CRUD on project def, WBS, milestones |
| BAPI_BUS2001_CREATE | ECC/S4 | Create Project (BO) / 프로젝트 생성 (BO) | Object-oriented project creation |
| BAPI_BUS2001_CHANGE | ECC/S4 | Change Project (BO) / 프로젝트 변경 | Change via BO wrapper |
| BAPI_BUS2001_DELETE | ECC/S4 | Delete Project (BO) / 프로젝트 삭제 | Deletion flag |
| BAPI_BUS2054_CREATE_MULTI | ECC/S4 | Create WBS Elements (multiple) / WBS 다중 생성 | Bulk WBS creation under project |
| BAPI_BUS2054_CHANGE_MULTI | ECC/S4 | Change WBS Elements / WBS 다중 변경 | Bulk WBS change |
| BAPI_BUS2054_GETDATA | ECC/S4 | Read WBS Detail / WBS 상세 조회 | Read PRPS fields |
| BAPI_BUS2054_DELETE_MULTI | ECC/S4 | Delete WBS / WBS 삭제 | Set deletion flag |

## Network & Activity BAPIs
| BAPI/FM | System | Description | Usage |
|---------|--------|-------------|-------|
| BAPI_NETWORK_MAINTAIN | ECC/S4 | Create/Change Network / 네트워크 생성·변경 | Full network maintenance (header, activities, relationships) |
| BAPI_NETWORK_GETLIST | ECC/S4 | List Networks / 네트워크 목록 | Filter by project, plant, dates |
| BAPI_NETWORK_GETDETAIL | ECC/S4 | Network Detail / 네트워크 상세 | Read header/activities/components |
| BAPI_NETWORK_COMP_ADD | ECC/S4 | Add Network Components / 자재 구성요소 추가 | Assign materials to activities |
| BAPI_NETWORK_COMP_CHANGE | ECC/S4 | Change Components / 구성요소 변경 | Modify component data |
| BAPI_BUS2002_ACT_CREATE_MULTI | ECC/S4 | Create Activities / 활동 다중 생성 | Add activities under network |
| BAPI_BUS2002_ACT_CHANGE_MULTI | ECC/S4 | Change Activities / 활동 변경 | Modify AFVC/AFVV |
| BAPI_ACTIVITY_ALLOC_POST | ECC/S4 | Post Activity Allocation / 활동 배분 포스팅 | CO allocation to WBS/network |

## Process & Commit BAPIs
| BAPI/FM | System | Description | Usage |
|---------|--------|-------------|-------|
| BAPI_PS_INITIALIZATION | ECC/S4 | Initialize PS Buffers / PS 버퍼 초기화 | Must be called before project maintain BAPIs |
| BAPI_PS_PRECOMMIT | ECC/S4 | Pre-Commit Validation / 사전 커밋 검증 | Validates buffer consistency before COMMIT |
| BAPI_PS_POSTCOMMIT | ECC/S4 | Post-Commit Processing / 사후 커밋 처리 | Post-processing hook |
| BAPI_TRANSACTION_COMMIT | ECC/S4 | Commit Transaction / 트랜잭션 커밋 | Persist PS changes (wait=X recommended) |
| BAPI_TRANSACTION_ROLLBACK | ECC/S4 | Rollback Transaction / 롤백 | Discard uncommitted buffer |

## Milestone, Planning & Billing
| BAPI/FM | System | Description | Usage |
|---------|--------|-------------|-------|
| BAPI_BUS2040_CREATE | ECC/S4 | Create Milestone / 마일스톤 생성 | Insert into MLST |
| BAPI_BUS2040_CHANGE | ECC/S4 | Change Milestone / 마일스톤 변경 | Update MLST fields |
| BAPI_PROJECT_SIMULATION_CREATE | ECC/S4 | Create Project Simulation / 프로젝트 시뮬레이션 생성 | Version management |
| BAPI_PROJECT_SIMULATION_TRANSFER | ECC/S4 | Transfer Simulation to Operational / 시뮬레이션 전환 | Transfer simulated project |
| BAPI_NETWORKCONF_CREATE_MULTI | ECC/S4 | Confirm Network Activities / 네트워크 확인 | Confirmation BAPI |
| BAPI_COSTACTPLN_POSTPRIMCOST | ECC/S4 | Post Primary Cost Planning / 1차 원가 계획 포스팅 | Cost element planning per WBS |
| CJ_MILESTONE_BILLING | ECC/S4 | Milestone Billing Release / 마일스톤 대금청구 승인 | Trigger billing plan release |

## Utility FMs
| BAPI/FM | System | Description | Usage |
|---------|--------|-------------|-------|
| CJDB_PROJ_GET | ECC/S4 | Read Project Database / 프로젝트 DB 조회 | Wrapper to read PROJ+PRPS |
| CNIF_PS_OBJECT_READ | ECC/S4 | Read PS Object / PS 객체 조회 | Generic project object reader |
| CN_AC_LIST_SELECTION | ECC/S4 | Activity Selection / 활동 선택 | Used by info system |
| K_WBS_ELEMENT_GET | ECC/S4 | Read WBS Element / WBS 조회 | Read PRPS by POSID |
| BAPI_BUS2054_PARTNER_ASSIGN | ECC/S4 | Assign Partners (BP) / 파트너 배정 | Assign BP to WBS (S/4) |
