# PM - Plant Maintenance Development Workflows
# PM - 설비 관리 개발 워크플로우

## Workflow 1: Create PM Notification and Work Order via BAPI
### Steps
1. Identify equipment/functional location from EQUI or IFLOT tables
2. Create notification: call BAPI_ALM_NOTIF_CREATE with notification type (M1=breakdown, M2=maintenance request), equipment, description, priority
3. Check RETURN; save notification: BAPI_ALM_NOTIF_SAVE; commit
4. Convert notification to order: populate BAPI_ALM_ORDER_MAINTAIN HEADER with order type, notification reference
5. Add operations in OPERATION table: work center, control key, planned work
6. Add components in COMPONENT table: material, quantity, plant
7. Call BAPI_ALM_ORDER_MAINTAIN with method = 'CREATE'
8. Release order: call again with HEADER-STATUS = 'REL'
9. Commit; verify in IW33

### Required MCP Tools
- mcp__mcp-abap-adt__GetFunctionModule — read BAPI_ALM_NOTIF_CREATE and BAPI_ALM_ORDER_MAINTAIN
- mcp__mcp-abap-adt__GetTable — inspect QMEL, AUFK, EQUI structures
- mcp__mcp-abap-adt__CreateProgram — scaffold PM integration program

### Related Config
- Notification Types: OIYL / V_T351
- Order Types: OIH2 / V_T003O
- Priority Types: V_T356

---

## Workflow 2: Automated Preventive Maintenance Scheduling
### Steps
1. Read maintenance plan data: BAPI_MAINTPLAN_GETDETAIL for strategy-based plans (MPLAN/MPLA)
2. Read equipment counter readings from measurement documents (MSEG equivalent: IMRG)
3. Implement scheduling BAdI: IP_SCHEDULE_MAINTENANCE_PLAN for custom call determination
4. In BAdI: calculate next due date based on operating hours/kilometers (counter-based scheduling)
5. Update measurement documents: BAPI_MEASUREDOCUMENT_CREATE with new readings
6. Trigger scheduling: program RISTRA20 (IP30 equivalent) for automatic order generation
7. Verify generated orders in IW37N (outstanding orders)

### Required MCP Tools
- mcp__mcp-abap-adt__GetTable — inspect MPLAN, MPLA, IMRG, IMPT
- mcp__mcp-abap-adt__GetClass — inspect scheduling BAdI interface
- mcp__mcp-abap-adt__CreateClass — implement scheduling logic
- mcp__mcp-abap-adt__GetProgram — read RISTRA20 for scheduling logic reference

### Related Config
- Maintenance Strategies: OIM0 / V_T355
- Scheduling Indicators: V_T355I
- Cycle Sets: V_T356C

---

## Workflow 3: Equipment Installation/Dismantling Integration
### Steps
1. Implement user exit EXIT_SAPLIPW1_002 (equipment installation) or BAdI IBAS_EQUI_STATUS
2. In exit: validate business rules before installation/dismantling (e.g., open orders check)
3. Read current equipment installation data from ILOA (location and account assignment)
4. After installation: update custom Z-tables or send IDoc to external system
5. Trigger notification: BAPI_ALM_NOTIF_CREATE for record keeping
6. Commit and log to application log (BAL_LOG_CREATE / BAL_DSP_LOG_DISPLAY)

### Required MCP Tools
- mcp__mcp-abap-adt__GetInclude — read user exit include structure
- mcp__mcp-abap-adt__UpdateInclude — implement equipment status validation
- mcp__mcp-abap-adt__GetTable — inspect ILOA, EQUI, IFLOT
- mcp__mcp-abap-adt__CreateClass — create BAdI implementation

### Related Config
- Equipment Categories: OIB2 / V_T370E
- Functional Location Categories: OIOF / V_T370C
