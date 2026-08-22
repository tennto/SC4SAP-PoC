# MM - Materials Management Development Workflows
# MM - 자재 관리 개발 워크플로우

## Workflow 1: Create Purchase Order via BAPI
### Steps
1. Gather vendor (LFA1/LFM1), material (MARA/MARC), and purchasing org data
2. Populate POHEADER (doc type NB, purchasing org, purchasing group, company code)
3. Populate POITEM table: material, plant, quantity, delivery date, price unit
4. Populate POACCOUNT for account assignment (if cost center / project based)
5. Populate POSCHEDULE for delivery schedule lines
6. Call BAPI_PO_CREATE1 with all populated tables
7. Check RETURN table for errors (TYPE = 'E')
8. BAPI_TRANSACTION_COMMIT on success, BAPI_TRANSACTION_ROLLBACK on error
9. Store PURCHASEORDER number from POHEADER_EXP

### Required MCP Tools
- mcp__mcp-abap-adt__GetFunctionModule — read BAPI_PO_CREATE1 signature
- mcp__mcp-abap-adt__GetTable — inspect EKKO, EKPO, LFA1 structures
- mcp__mcp-abap-adt__CreateProgram — scaffold test program
- mcp__mcp-abap-adt__UpdateProgram — iterate on implementation

### Related Config
- PO Document Types: V_T161
- Item Categories: V_T163
- Account Assignment Categories: V_T163K

---

## Workflow 2: Post Goods Receipt with BAPI_GOODSMVT_CREATE
### Steps
1. Determine reference document (PO number EBELN, PO item EBELP) from EKKO/EKPO
2. Populate GOODSMVT_HEADER: posting date, document date, reference
3. Populate GOODSMVT_ITEM: movement type (101 for GR against PO), plant, storage location, quantity
4. Set GM_CODE = '01' for GR for purchase order
5. Call BAPI_GOODSMVT_CREATE
6. Parse RETURN for errors; on success read MATERIALDOCUMENT and MATDOCUMENTYEAR
7. Commit transaction; verify stock update in MARD (storage location stock) and MKPF/MSEG (material document)

### Required MCP Tools
- mcp__mcp-abap-adt__GetTable — inspect MKPF, MSEG, MARD
- mcp__mcp-abap-adt__GetFunctionModule — read BAPI_GOODSMVT_CREATE signature
- mcp__mcp-abap-adt__CreateProgram — create test posting program

### Related Config
- Movement Types: V_156 / OMJJ
- Storage Locations: V_T001L

---

## Workflow 3: Extend Material Master to New Plant
### Steps
1. Read existing material views from MARA (general), MARC (plant), MARD (storage loc)
2. Prepare CLIENTDATA (basic data), PLANTDATA (MRP, purchasing, storage), STORAGELOCATIONDATA
3. Call BAPI_MATERIAL_SAVEDATA with HEADDATA specifying material and views to extend
4. Set HEADDATA-IND_SECTOR, HEADDATA-MATL_TYPE for new views
5. Check RETURN table; commit on success
6. Verify extension in MM03 or by reading MARC for new plant entry

### Required MCP Tools
- mcp__mcp-abap-adt__GetFunctionModule — inspect BAPI_MATERIAL_SAVEDATA parameters
- mcp__mcp-abap-adt__GetTable — read MARA, MARC, MARD structure
- mcp__mcp-abap-adt__GetView — inspect V_T134 for material type config

### Related Config
- Material Types: V_T134 / OMS2
- Plant Configuration: V_T001W
