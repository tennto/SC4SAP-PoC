# SD - Sales and Distribution Development Workflows
# SD - 영업 및 유통 개발 워크플로우

## Workflow 1: Create Sales Order via BAPI
### Steps
1. Determine Sales Area (Sales Org / Distribution Channel / Division) from customer master (KNA1, KNVV)
2. Read material and pricing data using BAPI_MATERIAL_GET_DETAIL
3. Simulate order first with BAPI_SALESORDER_SIMULATE to validate pricing and ATP
4. Populate BAPISDHEAD1 (header), BAPISDITEM (items), BAPISDSCHEDULE (schedule lines), BAPIPARTNR (partners)
5. Call BAPI_SALESORDER_CREATEFROMDAT2 with populated tables
6. Check RETURN table: filter TYPE = 'E' for errors, TYPE = 'S' for success with SALESDOCUMENT
7. Call BAPI_TRANSACTION_COMMIT if no errors; BAPI_TRANSACTION_ROLLBACK on error
8. Log the created VBELN (sales document number) to VBAK

### Required MCP Tools
- mcp__mcp-abap-adt__GetFunctionModule — read BAPI signature
- mcp__mcp-abap-adt__GetTable — inspect VBAK, VBAP, KNVV table structures
- mcp__mcp-abap-adt__CreateProgram — scaffold test program
- mcp__mcp-abap-adt__UpdateProgram — iterate on implementation

### Related Config
- Sales Document Types: VOV8 / V_TVAK
- Item Categories: VOV4 / V_TVAPT
- Pricing Procedure: V/08

---

## Workflow 2: Implement Custom Pricing Condition (User Exit)
### Steps
1. Identify target pricing procedure via V/08 transaction and V_T683V view
2. Create new condition type in V_T685 with appropriate calculation type
3. Create access sequence in V_T682 pointing to required condition tables
4. Implement pricing user exit: USEREXIT_PRICING_PREPARE_TKOMV in include MV45AFZZ (for orders) or RV60AFZZ (for billing)
5. Alternatively use BAdI SD_CND_ACCESS for modern implementations
6. In user exit, populate TKOMV structure with calculated condition amount
7. Activate condition type in pricing procedure with requirement/alternative calculation routine if needed
8. Test via VA01 (create sales order) and verify condition appears in pricing analysis (condition tab → Analysis)

### Required MCP Tools
- mcp__mcp-abap-adt__GetView — inspect V_T685, V_T683
- mcp__mcp-abap-adt__GetInclude — read MV45AFZZ for user exit structure
- mcp__mcp-abap-adt__UpdateInclude — implement user exit code
- mcp__mcp-abap-adt__GetClass — inspect BAdI implementation class

### Related Config
- Condition Types: V_T685
- Pricing Procedures: V_T683
- Access Sequences: V_T682

---

## Workflow 3: Enhance Sales Order Output (SmartForm/PDF)
### Steps
1. Identify output type in V_TNAPR (e.g., BA00 for order confirmation)
2. Review existing output program and form in NACE transaction
3. Create enhancement spot or copy standard SmartForm (SF_EXAMPLE_01 pattern) to Z-namespace
4. Add custom fields: extend communication structure using append structure to KOMKBV1/KOMPBV1
5. Implement USEREXIT_FILL_VBCO3 in MV45AFZZ to populate custom fields
6. Assign new SmartForm to output type via NACE → Processing routines
7. Test output via VA02 → Output → Issue output to

### Required MCP Tools
- mcp__mcp-abap-adt__GetProgram — read standard output driver
- mcp__mcp-abap-adt__CreateProgram — create Z-copy of output program
- mcp__mcp-abap-adt__GetStructure — inspect KOMKBV1, KOMPBV1
- mcp__mcp-abap-adt__CreateStructure — add append structure for custom fields
- mcp__mcp-abap-adt__UpdateInclude — implement user exit

### Related Config
- Output Types: V_TNAPR
- Output Condition Tables: V_TNACS
- Partner Output Assignment: V_TNAPN
