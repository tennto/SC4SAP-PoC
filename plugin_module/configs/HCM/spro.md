# HCM - Human Capital Management SPRO Configuration
# HCM - 인적 자본 관리 SPRO 설정

## Enterprise Structure
| Config Name | Table/View | Description |
|------------|-----------|-------------|
| Define Personnel Area | V_T500P | Personnel Area definition / 인사 영역 정의 |
| Define Personnel Subarea | V_T001P | Personnel Subarea definition / 인사 하위 영역 정의 |
| Define Employee Group | V_T501 | Employee Group definition / 직원 그룹 정의 |
| Define Employee Subgroup | V_T503 | Employee Subgroup definition / 직원 하위 그룹 정의 |
| Assign Employee Subgroup to Employee Group | V_T503K | Assign Employee Subgroup to Employee Group / 직원 하위 그룹을 직원 그룹에 배정 |
| Define Company Code for HCM | V_T500L | Company Code definition for HCM / HCM용 회사코드 정의 |
| Assign Personnel Area to Company Code | V_T500P_KO | Assign Personnel Area to Company Code / 인사 영역을 회사코드에 배정 |

## Personnel Administration (PA)
| Config Name | Table/View | Description |
|------------|-----------|-------------|
| Define Info Types | V_T777D | Info Type definition / 인포 유형 정의 |
| Define Number Ranges for Personnel Numbers | NUMKR | Personnel Number Range definition / 인사 번호 번호 범위 정의 |
| Define Actions | V_T529A | Personnel Action definition (hiring, transfer, termination...) / 인사 조치 정의 (hiring, transfer, termination...) |
| Define Reasons for Actions | V_T530 | Action Reason definition / 조치 이유 정의 |
| Configure Personnel Action Types | V_T529T | Personnel Action Type configuration / 인사 조치 유형 설정 |
| Define Job / Position Definitions | V_T513 | Job / Position definition / 직무/직위 정의 |
| Define Pay Scale Structure | V_T510 | Pay Scale Structure definition / 급여 등급 구조 정의 |
| Define Pay Scale Types | V_T510A | Pay Scale Type definition / 급여 등급 유형 정의 |
| Define Pay Scale Areas | V_T510B | Pay Scale Area definition / 급여 등급 지역 정의 |

## Organizational Management (OM)
| Config Name | Table/View | Description |
|------------|-----------|-------------|
| Define Object Types | V_T778O | Object Type definition (O=Org Unit, S=Position, C=Job...) / 개체 유형 정의 (O=Org Unit, S=Position, C=Job...) |
| Define Relationship Types | V_T778A | Relationship Type definition / 관계 유형 정의 |
| Define Plan Versions | V_T778G | Plan Version definition / 계획 버전 정의 |
| Configure Evaluation Paths | V_T778E | Evaluation Path configuration / 평가 경로 설정 |
| Define Feature for OM Integration | V_TPARK | Feature definition for OM Integration / OM 통합 기능 정의 |

## Time Management
| Config Name | Table/View | Description |
|------------|-----------|-------------|
| Define Work Schedule Rules | V_T508A | Work Schedule Rule definition / 근무 일정 규칙 정의 |
| Define Break Schedules | V_T550P | Break Schedule definition / 휴식 일정 정의 |
| Define Daily Work Schedules | V_T550A | Daily Work Schedule definition / 일별 근무 일정 정의 |
| Define Period Work Schedules | V_T551A | Period Work Schedule definition / 기간별 근무 일정 정의 |
| Define Public Holiday Classes | V_T513M | Public Holiday Class definition / 공휴일 클래스 정의 |
| Define Factory Calendar | V_TFACD | Factory Calendar definition / 공장 달력 정의 |
| Configure Absence Types | V_T554S | Absence Type configuration / 결근 유형 설정 |
| Configure Attendance Types | V_T554L | Attendance Type configuration / 출근 유형 설정 |
| Define Time Evaluation Schema | V_T52C5 | Time Evaluation Schema definition / 근무 시간 평가 스키마 정의 |

## Payroll
| Config Name | Table/View | Description |
|------------|-----------|-------------|
| Define Payroll Area | V_T549A | Payroll Area definition / 급여 영역 정의 |
| Define Control Record for Payroll | V_T549S | Payroll Control Record definition / 급여 통제 레코드 정의 |
| Define Wage Types | V_512W | Wage Type definition / 급여 유형 정의 |
| Define Processing Classes | V_T512E | Processing Class definition / 처리 클래스 정의 |
| Define Evaluation Classes | V_T512F | Evaluation Class definition / 평가 클래스 정의 |
| Configure Payroll Schema | V_T52C0 | Payroll Schema configuration / 급여 스키마 설정 |
| Define Payroll Posting to FI | V_T52EK | Payroll Posting to FI configuration / FI에 급여 전기 설정 |
| Configure Tax Calculation | V_T5D0K | Tax Calculation configuration (country-specific) / 세금 계산 설정 (country-specific) |
