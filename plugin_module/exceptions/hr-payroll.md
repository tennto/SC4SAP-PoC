# HR / Payroll / Personnel (Infotypes & Clusters)
<!-- tier: minimal -->

Employee master data, payroll results, medical records, family/dependent data, time tracking, bank details. The highest-sensitivity category in any SAP system.

| Table / Pattern | Description | Why |
|-----------------|-------------|-----|
| PA0000 | Actions | Employment events |
| PA0001 | Organizational assignment | Position/org PII |
| PA0002 | Personal data | Name, DOB, gender, nationality |
| PA0006 | Addresses (employee) | Home address PII |
| PA0007 | Planned working time | Schedule PII |
| PA0008 | Basic pay | **Salary** — never extract |
| PA0009 | Bank details (employee) | Employee banking |
| PA0014 | Recurring payments/deductions | Payroll detail |
| PA0015 | Additional payments | Payroll detail |
| PA0017 | Travel privileges | Personal travel data |
| PA0019 | Monitoring of dates | Personal milestones |
| PA0021 | Family / related persons | Dependent PII |
| PA0023 | Previous employers | CV data |
| PA0024 | Qualifications | Personal skills |
| PA0027 | Cost distribution | Payroll detail |
| PA0028 | Internal medical service | **Medical data — highly sensitive** |
| PA0033 | Statistics | Employee statistics |
| PA0040 | Objects on loan | Asset assignments |
| PA0041 | Date specifications | Personal dates |
| PA0105 | Communication (user IDs, email, phone) | Contact PII |
| PA0185 | Personal IDs | Passport / national ID |
| PA0267 | One-time payments | Off-cycle payroll |
| PA0377 | Miscellaneous plans | Benefits |
| PA2001 | Absences | Sickness/leave PII |
| PA2002 | Attendances | Time tracking |
| PA2010 | EE remuneration info | Pay detail |
| PA2050 | Annual calendar | Personal schedule |
| PA* (all PA0xxx / PA2xxx / PA4xxx infotypes) | HR Infotypes | All employee PII |
| HRP1000 | Org object | Org structure |
| HRP1001 | Relationships | Org / person links |
| HRP* (all HRPxxxx infotypes) | OM/PD Infotypes | Personnel / Org data |
| PCL1 | HR cluster — time | Time evaluation clusters |
| PCL2 | HR cluster — **payroll results** | **Payroll results — NEVER extract** |
| PCL3 | HR cluster — applicant data | Recruitment PII |
| PCL4 | HR cluster — change documents | HR audit trail |
| PCL5 | HR cluster — travel expense | Travel payroll |
| PA9* / PB9* / PD9* | Customer-specific HR infotypes | Customer PII extensions |
| T526 | Administrator assignment | HR admin linkage |
| T52* (payroll config with values) | Payroll customizing with amounts | Wage-type values |
