# QM - Quality Management Development Workflows
# QM - 품질 관리 개발 워크플로우

## Workflow 1: Automatic Inspection Lot Processing Interface
### Steps
1. Determine inspection type from material QM view (MARC-QPMAT, MARA-QKZGR)
2. Read inspection plan: BAPI_INSPPLAN_GETDETAIL for material/plant/usage
3. Create inspection lot: BAPI_INSPLOT_CREATE with material, plant, inspection type, quantity, batch
4. Check RETURN; retrieve INSPECTIONLOT number
5. Record results: BAPI_INSPOPER_RECRESULTS for each characteristic with measured values
6. Evaluate: calculate whether results pass/fail based on specification limits
7. Record usage decision: BAPI_INSPLOT_USAGE_DECISION with UD code and stock posting decision
8. Commit; verify lot status in QA03

### Required MCP Tools
- mcp__mcp-abap-adt__GetFunctionModule — read BAPI_INSPLOT_CREATE and BAPI_INSPOPER_RECRESULTS
- mcp__mcp-abap-adt__GetTable — inspect QALS, QAVE, QAMV structures
- mcp__mcp-abap-adt__CreateProgram — scaffold automatic result recording program

### Related Config
- Inspection Types: OQI1 / V_T161_QM
- Sampling Procedures: OQB1 / V_T708
- Usage Decision Catalog: OQL1 / V_T1006

---

## Workflow 2: Customer Complaint (Q1 Notification) Process Enhancement
### Steps
1. Implement BAdI QISR_SUBSCREEN to add custom fields to Q1 notification screen
2. Create notification via BAPI_QUALNOT_CREATE: type Q1, sold-to party, material, quantity, defect description
3. Add defect items: populate NOTIFITMCHANGE with defect codes from catalog (T705/T705B)
4. Add tasks: populate NOTIFTASKCHANGE with corrective action tasks, responsible partner
5. Save: BAPI_QUALNOT_SAVE; commit
6. Implement 8D workflow: custom status sequence via Enhancement Spot QMEL_HEADER_CHANGE
7. Send email notification: use BCS (Business Communication Services) or workflow task
8. Monitor via QM50 (timeline) and QM10 (list processing)

### Required MCP Tools
- mcp__mcp-abap-adt__GetFunctionModule — read BAPI_QUALNOT_CREATE interface
- mcp__mcp-abap-adt__GetClass — inspect BAdI QISR_SUBSCREEN
- mcp__mcp-abap-adt__CreateClass — implement customer complaint enhancements
- mcp__mcp-abap-adt__GetTable — inspect QMEL, QMFE, QMMA structures

### Related Config
- QM Notification Types: OIYL / V_T351_QM
- Catalog Profiles: V_T352B_QM
- 8D Report Settings: V_T351_8D

---

## Workflow 3: Statistical Process Control (SPC) Data Collection
### Steps
1. Define control chart characteristics in inspection plan (QP01): characteristic type = variable, with control chart indicator
2. Implement custom results recording: read measurement data from external source (scale, sensor via RFC)
3. Call BAPI_INSPOPER_RECRESULTS with measured values for each sample
4. Trigger SPC calculation: FM QCC_CONTROL_CHART_CALCULATE after results posting
5. Check control chart signals: read QCCR (control chart results) for rule violations
6. If violation detected: automatically create internal quality notification (Q3) via BAPI_QUALNOT_CREATE
7. Send alert to responsible person; track corrective actions

### Required MCP Tools
- mcp__mcp-abap-adt__GetTable — inspect QCCR, QAMV, QASBS
- mcp__mcp-abap-adt__GetFunctionModule — inspect QCC_CONTROL_CHART_CALCULATE
- mcp__mcp-abap-adt__CreateProgram — build SPC data collection report
- mcp__mcp-abap-adt__UpdateProgram — implement sensor data read and posting

### Related Config
- Inspection Methods: V_T706
- Sampling Procedures: V_T708
- Dynamic Modification Rules: V_T713
