# Ariba - SAP Ariba Integration Development Workflows
# Ariba - SAP Ariba 통합 개발 워크플로우

## Workflow 1: Purchase Order Transfer from SAP to Ariba Network
### Steps
1. PO created in SAP (ME21N or BAPI_PO_CREATE1) with Ariba-enabled vendor (LFA1-ANID populated)
2. Output condition triggers ORDERS05 IDoc generation (message type ORDERS, basic type ORDERS05)
3. IDoc dispatched to Ariba middleware (SAP PI/PO or CIG): converted to cXML PurchaseOrderRequest
4. Ariba Network delivers cXML to supplier; supplier confirms via OrderConfirmation cXML
5. Confirmation returns to SAP as ORDERSP IDoc: triggers PO confirmation update in EKKO/EKPO
6. Implement enhancement: BAdI ME_PROCESS_PO_CUST to add custom fields to PO IDoc before dispatch
7. Monitor IDoc flow: WE02/WE05 for IDoc status; SXMB_MONI for PI/PO message status

### Required MCP Tools
- mcp__mcp-abap-adt__GetClass — inspect BAdI ME_PROCESS_PO_CUST interface
- mcp__mcp-abap-adt__CreateClass — implement PO enhancement for Ariba custom fields
- mcp__mcp-abap-adt__GetTable — inspect EKKO, EKPO, NAST (message control)
- mcp__mcp-abap-adt__GetFunctionModule — read IDOC_OUTPUT_ORDCHG for PO change IDoc

### Related Config
- IDoc Message Types: V_ARIBA_IDT
- Partner Profiles: WE20
- Ports: WE21

---

## Workflow 2: Ariba e-Invoice Processing in SAP (LIV Integration)
### Steps
1. Supplier submits invoice via Ariba Network; cXML InvoiceRequest received at Ariba side
2. Ariba validates invoice against PO (3-way match: PO, GR, invoice)
3. Approved invoice dispatched to SAP as INVOIC02 IDoc via CIG/PI middleware
4. Inbound IDoc processing: IDOC_INPUT_INVOIC calls BAPI_INCOMINGINVOICE_CREATE
5. Implement enhancement: user exit EXIT_SAPLMRM_IVC for custom invoice validation
6. Apply tolerance check against V_ARIBA_TOL: block if price/qty variance exceeds limit
7. Matched invoices auto-posted (FI document created); exceptions routed to MRBR for manual release
8. Payment executed via F110 (automatic payment run); remittance advice sent back to Ariba

### Required MCP Tools
- mcp__mcp-abap-adt__GetFunctionModule — read IDOC_INPUT_INVOIC and BAPI_INCOMINGINVOICE_CREATE
- mcp__mcp-abap-adt__GetInclude — read user exit EXIT_SAPLMRM_IVC
- mcp__mcp-abap-adt__UpdateInclude — implement invoice validation logic
- mcp__mcp-abap-adt__GetTable — inspect RBKP, RSEG (invoice posting tables)

### Related Config
- Invoice Transfer: V_ARIBA_EINV
- Three-Way Match: V_ARIBA_3WM
- Tolerance Settings: V_ARIBA_TOL

---

## Workflow 3: Supplier Onboarding Automation (Ariba SLP → SAP Vendor)
### Steps
1. New supplier registered and qualified in Ariba SLP (Supplier Lifecycle and Performance)
2. Qualification approval triggers outbound message: supplier master data sent to SAP
3. Receive supplier data via IDoc or web service; map Ariba supplier fields to SAP LFA1/LFB1/LFM1
4. Implement custom FM/class for vendor creation: call BAPI_VENDOR_CREATE with mapped data
5. Assign vendor to purchasing organization: call BAPI_VENDOR_CHANGE to add LFM1 record
6. Map Ariba Network ID (ANID) to SAP vendor in custom Z-table for future PO routing
7. Trigger confirmation back to Ariba: send vendor number as external reference
8. Monitor vendor sync via SLG1 (application log) with custom log object

### Required MCP Tools
- mcp__mcp-abap-adt__GetFunctionModule — read BAPI_VENDOR_CREATE interface
- mcp__mcp-abap-adt__GetTable — inspect LFA1, LFB1, LFM1 structures
- mcp__mcp-abap-adt__CreateProgram — build supplier onboarding integration program
- mcp__mcp-abap-adt__CreateTable — create Z-table for ANID→vendor mapping

### Related Config
- Supplier Master Data Sync: V_ARIBA_VEN
- Vendor Account Groups: V_T077K_ARB
- Ariba Network ID Mapping: V_ARIBA_ANID
