# PP - Production Planning Development Workflows
# PP - 생산 계획 개발 워크플로우

## Workflow 1: Create and Release Production Order via BAPI
### Steps
1. Read BOM and routing for material/plant using CS_BOM_EXPL_MAT_V2 and BAPI_ROUTING_GET_DETAIL
2. Populate BAPI_PRODORD_CREATE parameters: material, plant, order type, quantity, basic dates
3. Call BAPI_PRODORD_CREATE; check RETURN for errors
4. On success, retrieve ORDER_NUMBER from return
5. Release order: call BAPI_PRODORD_CHANGE with ORDER_STATUS = 'REL'
6. Check material availability: BAPI_MATERIAL_AVAILABILITY for all components
7. Post goods issue for components: BAPI_GOODSMVT_CREATE with movement type 261
8. Commit transaction; verify order status in CO03

### Required MCP Tools
- mcp__mcp-abap-adt__GetFunctionModule — read BAPI_PRODORD_CREATE interface
- mcp__mcp-abap-adt__GetTable — inspect AUFK, AFKO, AFPO, RESB structures
- mcp__mcp-abap-adt__CreateProgram — scaffold test program

### Related Config
- Order Types: OPJN / V_T003O
- MRP Controllers: OP43 / V_T024D
- Scheduling Parameters: V_T460S

---

## Workflow 2: Custom MRP User Exit for Special Procurement
### Steps
1. Identify USEREXIT_MD_CHANGE_MRP_DATA in include MD_USEREXIT
2. Implement logic to override procurement type or lot size for specific materials
3. Alternatively use BAdI MD_PURREQ_CHANGE for purchase requisition modifications after MRP
4. In exit: check material attributes (MARC-BESCHR, MARC-DISPO), apply business rules
5. Modify PLSC (planned order) or EBAN (purchase requisition) data structures
6. Test: run MD01 for affected material, verify results in MD04

### Required MCP Tools
- mcp__mcp-abap-adt__GetInclude — read MD_USEREXIT structure
- mcp__mcp-abap-adt__UpdateInclude — implement user exit
- mcp__mcp-abap-adt__GetTable — inspect MARC, PLAF, EBAN
- mcp__mcp-abap-adt__GetClass — inspect BAdI MD_PURREQ_CHANGE interface

### Related Config
- MRP Types: V_T438A
- Special Procurement: V_T460A
- Lot Sizing: V_T439

---

## Workflow 3: Production Order Confirmation with Goods Movement
### Steps
1. Read production order details via BAPI_PRODORD_GET_DETAIL for operation list
2. Identify operation to confirm (AUFPL + APLZL from AFVC)
3. Populate BAPI_PRODORDCONF_CREATE_TT: order number, operation, yield/scrap quantities, activities
4. Include GOODSMOVEMENTS for simultaneous goods movements (261 for components, 101 for finished goods)
5. Call BAPI_PRODORDCONF_CREATE_TT with all tables
6. Check RETURN; commit on success
7. Verify stock changes in MMBE and confirmation in AFRU (confirmation records)

### Required MCP Tools
- mcp__mcp-abap-adt__GetFunctionModule — read confirmation BAPI interface
- mcp__mcp-abap-adt__GetTable — inspect AFRU, AFVC, AUFK
- mcp__mcp-abap-adt__CreateProgram — create confirmation program

### Related Config
- Confirmation Parameters: OPJ8 / V_TCO9
- Goods Movement Defaults: V_TCO15
