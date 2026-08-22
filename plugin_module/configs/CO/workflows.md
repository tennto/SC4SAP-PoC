# CO - Controlling Development Workflows
# CO - 관리 회계 개발 워크플로우

## Workflow 1: Post Activity Allocation via BAPI
### Steps
1. Identify sender cost center and activity type (CSKS/CSLA tables)
2. Identify receiver cost center or internal order (CSKS/AUFK)
3. Populate BAPI_ACC_ACTIVITY_ALLOC_POST parameters: document header, sender/receiver data
4. Set DOCUMENTHEADER: company code, controlling area, posting date, version
5. Set SENDERACTIVITYALLOC: sender cost center, activity type, quantity
6. Set RECEIVERCOSTCENTER or RECEIVERORDER for receiver
7. Call BAPI_ACC_ACTIVITY_ALLOC_POST
8. Check RETURN table; commit on success
9. Verify posting in KSB1 (cost center actual line items)

### Required MCP Tools
- mcp__mcp-abap-adt__GetFunctionModule — read BAPI interface
- mcp__mcp-abap-adt__GetTable — inspect COBK, COEP, CSKS, CSLA
- mcp__mcp-abap-adt__CreateProgram — scaffold allocation test program

### Related Config
- Activity Types: V_CSLT / KL01
- Cost Centers: OKEON / KS01
- Versions: V_TKA09

---

## Workflow 2: Custom Assessment Cycle Enhancements
### Steps
1. Review standard assessment cycle definition in KSU1 (T-code) / V_RKAB
2. Identify sender rules (cost centers) and receiver tracing factors
3. Implement custom tracing factor: create statistical key figure update program reading from custom data source
4. Post statistical key figures via KB31N or BAPI equivalent
5. Reference statistical key figure as tracing factor in assessment cycle sender/receiver rule
6. Execute cycle via KSU5 (single) or month-end job via program RKABL000
7. Validate results in S_ALR_87013611 (Actual/Plan/Variance report)

### Required MCP Tools
- mcp__mcp-abap-adt__GetTable — inspect RKAB (cycle header), RKAB_SEG (segments)
- mcp__mcp-abap-adt__CreateProgram — create statistical key figure update report
- mcp__mcp-abap-adt__UpdateProgram — implement custom tracing logic

### Related Config
- Assessment Cycles: V_RKAB / KSU1
- Statistical Key Figures: V_TKEV / KB31N

---

## Workflow 3: Implement CO-PA Enhancement for SD Billing Transfer
### Steps
1. Identify CO-PA transfer structure (V_TKEVS) and value fields assigned to SD conditions
2. Review SD-CO-PA assignment in KEI1 (PA transfer structure for SD)
3. Implement BAdI COPA_FIELD_FILL to populate custom CO-PA characteristics during billing transfer
4. In BAdI method: access VBRK/VBRP data, populate custom characteristics (e.g., region, sales rep)
5. Activate BAdI implementation
6. Test by creating SD billing document (VF01) and verify PA line items in KE24

### Required MCP Tools
- mcp__mcp-abap-adt__GetClass — inspect BAdI IF_EX_COPA_FIELD_FILL
- mcp__mcp-abap-adt__CreateClass — create BAdI implementation
- mcp__mcp-abap-adt__UpdateClass — implement characteristic derivation logic
- mcp__mcp-abap-adt__GetTable — inspect CE1xxxx (CO-PA actual data table for operating concern)

### Related Config
- Operating Concern: V_TKE1
- PA Transfer Structure: KEI1
- Characteristic Derivation: KEDR
