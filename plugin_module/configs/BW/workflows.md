# BW - Business Warehouse Development Workflows
# BW - 비즈니스 웨어하우스 개발 워크플로우

## Workflow 1: Custom DataSource Creation and Delta Load Setup
### Steps
1. Identify source data in ERP: determine source tables (e.g., VBAK for SD orders, BSEG for FI line items)
2. Create Generic DataSource in RSA6: use table/view or function module extraction method
3. For delta capability: implement FM-based extraction using delta pointer (ROIS delta queue or timestamp)
4. Create extraction FM: select changed records since last delta based on AEDАТ/AEZEIT or change document
5. In RSA1: replicate DataSource from source system; create InfoSource and transformation
6. Create DSO as staging layer: define key fields and data fields matching DataSource structure
7. Create DTP: set extraction mode (delta/full), define filter conditions
8. Create InfoPackage: schedule delta load via process chain
9. Create process chain in RSPC: sequence = InfoPackage → DTP to DSO → DTP to InfoCube → rollup aggregates

### Required MCP Tools
- mcp__mcp-abap-adt__CreateFunctionGroup — create extraction function group
- mcp__mcp-abap-adt__CreateFunctionModule — implement delta extraction FM
- mcp__mcp-abap-adt__GetTable — inspect source tables (VBAK, BSEG, etc.)
- mcp__mcp-abap-adt__UpdateFunctionModule — implement delta selection logic

### Related Config
- DataSources: ROOSOURCE / RSA6
- Process Chains: RSPC
- InfoPackages: RSA1

---

## Workflow 2: Custom BEx Query with Calculated and Restricted Key Figures
### Steps
1. Open BEx Query Designer (or RSA1 → Queries node) for target InfoProvider (InfoCube/CompositeProvider)
2. Create Restricted Key Figure: drag measure (e.g., Revenue 0NET_VAL_S) + restrict by characteristic (e.g., 0CALMONTH = current month variable)
3. Create Calculated Key Figure: define formula e.g., (Current Month Revenue - Prior Month Revenue) / Prior Month Revenue * 100 for growth %
4. Define Selection Variables: replacement path variable for prior month, user input variable for sales org
5. Create exception (traffic light): define thresholds for growth % (green > 5%, yellow 0-5%, red < 0%)
6. Add conditions: top/bottom N customers by revenue
7. Test query: RSRT (Query Monitor) → execute with test data
8. Publish: assign to role for Business Explorer portal or activate for Fiori Analytical app

### Required MCP Tools
- mcp__mcp-abap-adt__GetTable — inspect RSZCOMPDIR (query components), RSZGLOBV (variables)
- mcp__mcp-abap-adt__GetProgram — read standard BW query program for debugging

### Related Config
- Variables: RSZV
- Query Monitor: RSRT
- BW Authorizations: RSECADMIN

---

## Workflow 3: Enhance Standard BW Extractor (Enhancement Spot / Customer Exit)
### Steps
1. Identify standard SAP DataSource to enhance (e.g., 2LIS_11_VAHDR for SD order header)
2. Find enhancement spot: transaction CMOD → project for DataSource exits (e.g., RSAP0001)
3. Implement EXIT_SAPLRSAP_001 (header) or EXIT_SAPLRSAP_002 (item) user exit
4. In exit: add custom fields to ZFIELDS append structure of extraction structure (e.g., ZZ_CUSTOM_FIELD)
5. Add field to DataSource field list in RSA6: add ZZ_CUSTOM_FIELD with type, description, delta-relevant flag
6. Map field in BW transformation: add field to DSO/InfoCube structure; create transformation rule
7. Test via RSA3: verify custom field populated in extraction preview
8. Replicate DataSource in RSA1; adjust transformation; reload historical data (full init)

### Required MCP Tools
- mcp__mcp-abap-adt__GetInclude — read EXIT_SAPLRSAP_001 user exit structure
- mcp__mcp-abap-adt__UpdateInclude — implement custom field population logic
- mcp__mcp-abap-adt__CreateStructure — add ZZ append structure to extraction structure
- mcp__mcp-abap-adt__GetTable — inspect extraction structure (e.g., MC11VA0HDR for 2LIS_11_VAHDR)

### Related Config
- DataSource Maintenance: RSA6
- InfoObject for Custom Field: RSD1
- Transformation Rules: RSA1 → Transformations
