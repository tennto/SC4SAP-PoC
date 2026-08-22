# HCM - Key Tables Reference
# HCM - 주요 테이블 참조

## Master Data Tables

### PA Infotypes

| Table | System | Description |
|-------|--------|-------------|
| PA0000 | ECC/S4 | Actions |
| PA0001 | ECC/S4 | Organizational Assignment |
| PA0002 | ECC/S4 | Personal Data |
| PA0006 | ECC/S4 | Addresses |
| PA0007 | ECC/S4 | Planned Working Time |
| PA0008 | ECC/S4 | Basic Pay |
| PA0009 | ECC/S4 | Bank Details |
| PA0014 | ECC/S4 | Recurring Payments / Deductions |
| PA0015 | ECC/S4 | Additional Payments |
| PA0027 | ECC/S4 | Cost Distribution |
| PA0105 | ECC/S4 | Communications |
| PA2001 | ECC/S4 | Absences |
| PA2002 | ECC/S4 | Attendances |
| PA2003 | ECC/S4 | Substitutions |
| PA2006 | ECC/S4 | Absence Quotas |
| PA2010 | ECC/S4 | Time Wage Types |

### OM (HRP) Tables

| Table | System | Description |
|-------|--------|-------------|
| HRP1000 | ECC/S4 | Objects (OM) |
| HRP1001 | ECC/S4 | Relationships |
| HRP1002 | ECC/S4 | Description |
| HRP1007 | ECC/S4 | Vacancies |
| HRP1008 | ECC/S4 | Account Assignment |
| HRP1028 | ECC/S4 | Address |
| OBJEC | ECC/S4 | Object Table (generic) |

## Transaction Data Tables

### Payroll / Time Clusters

| Table | System | Description |
|-------|--------|-------------|
| PCL1 | ECC/S4 | Payroll Cluster (TE, TX, B2) |
| PCL2 | ECC/S4 | Payroll Cluster (RT, CRT, BT) |
| PCL3 | ECC/S4 | Applicant Cluster |
| PCL4 | ECC/S4 | Application Cluster |
| T549A | ECC/S4 | Payroll Areas |
| T549Q | ECC/S4 | Payroll Periods |
| T512W | ECC/S4 | Wage Types |
| T554S | ECC/S4 | Absence / Attendance Types |

## Configuration Tables

| Table | System | Description |
|-------|--------|-------------|
| T500P | ECC/S4 | Personnel Areas |
| T001P | ECC/S4 | Personnel Subareas |
| T503 | ECC/S4 | Employee Groups / Subgroups |
| T510 | ECC/S4 | Pay Scale Groups |
| T526 | ECC/S4 | Administrator |
| T527X | ECC/S4 | Org Units (old) |
| T528B | ECC/S4 | Positions |

## S/4HANA Specific

- SAP HCM for S/4HANA (on-premise) is available as a compatibility pack; core PA/PD/PT/PY tables remain identical to ECC.
- H4S4 (HCM for S/4HANA) is the recommended path when SuccessFactors Employee Central is not adopted.
- Integration with SuccessFactors Employee Central uses replication via SAP Cloud Platform Integration (CPI) — PA infotypes map to EC entities.
- Core Hybrid deployment: PA/PD remain on-premise, Payroll on-premise, EC for talent processes.

## Related Tables

- CSKS — Cost Centers (CO integration via PA0001 / PA0027).
- T001 / T001P — Company code / personnel subarea mapping.
- BUT000 — Business Partner (when HCM-BP integration is active in S/4HANA).
- PTEX2000 / PTEX2010 — Interface tables for external time data transfer.
