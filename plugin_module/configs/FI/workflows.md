# FI - Financial Accounting Development Workflows
# FI - 재무 회계 개발 워크플로우

## Workflow 1: Post FI Document via BAPI_ACC_DOCUMENT_POST
### Steps
1. Determine company code, posting date, fiscal year period using FI_PERIOD_DETERMINE
2. Populate DOCUMENTHEADER: company code, doc type (SA/KR/DR), posting date, reference
3. Populate ACCOUNTGL table for G/L line items: G/L account, amount, debit/credit indicator, cost center
4. Populate ACCOUNTRECEIVABLE or ACCOUNTPAYABLE for subledger items
5. Populate CURRENCYAMOUNT: currency, amount in document/local/group currency
6. Call BAPI_ACC_DOCUMENT_POST
7. Check RETURN for errors (TYPE = 'E'); commit on success
8. Store returned OBJECTKEY (= concatenated company code + document number + fiscal year)

### Required MCP Tools
- mcp__mcp-abap-adt__GetFunctionModule — read BAPI_ACC_DOCUMENT_POST interface
- mcp__mcp-abap-adt__GetTable — inspect BKPF, BSEG structures
- mcp__mcp-abap-adt__CreateProgram — scaffold test posting program

### Related Config
- Document Types: V_T003
- Posting Keys: OB41
- Field Status Groups: V_T004F

---

## Workflow 2: Automatic Payment Run Enhancement (User Exit)
### Steps
1. Identify required user exit: EXIT_SAPFF110_001 (payment method selection) or BAdI FI_PAYMENT_PROGRAM
2. Implement BAdI FI_PAYMENT_PROGRAM method IF_FI_PAYMENT_PROGRAM~CHANGE_PAYMENT_DATA
3. In implementation: read payment proposal from REGUH/REGUP tables
4. Apply custom logic: modify bank details, split payments, change payment method
5. Activate implementation in SE19 (classic BAdI) or SPRO (new BAdI)
6. Test via F110: create payment run → payment proposal → display → execute

### Required MCP Tools
- mcp__mcp-abap-adt__GetClass — inspect BAdI interface IF_FI_PAYMENT_PROGRAM
- mcp__mcp-abap-adt__CreateClass — create BAdI implementation class
- mcp__mcp-abap-adt__UpdateClass — implement BAdI methods
- mcp__mcp-abap-adt__GetTable — inspect REGUH, REGUP structures

### Related Config
- Payment Methods: V_T042Z
- House Banks: V_T012
- Bank Accounts: V_T012K

---

## Workflow 3: Custom Dunning Letter (SAPscript/SmartForm)
### Steps
1. Review dunning procedure config in V_T047 and dunning levels in V_T047S
2. Identify dunning form assigned to level (MHNK-MFORMULAR)
3. Copy standard dunning program SAPF150D to Z-namespace
4. Copy/create SmartForm for dunning letter with company-specific layout
5. Add custom fields: read open items from BSID (AR open items) and BSID_VARI
6. Assign Z-form to dunning level in FBMP (dunning procedure maintenance)
7. Test via F150: create dunning run → print dunning notices

### Required MCP Tools
- mcp__mcp-abap-adt__GetProgram — read SAPF150D structure
- mcp__mcp-abap-adt__CreateProgram — create Z-copy
- mcp__mcp-abap-adt__GetTable — inspect MHNK, BSID structures
- mcp__mcp-abap-adt__UpdateProgram — add custom logic

### Related Config
- Dunning Procedures: V_T047
- Dunning Levels: V_T047S
