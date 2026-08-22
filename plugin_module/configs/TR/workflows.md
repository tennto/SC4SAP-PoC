# TR - Treasury Development Workflows
# TR - 재무부(자금) 개발 워크플로우

## Workflow 1: Electronic Bank Statement Processing Enhancement
### Steps
1. Review existing EBS format configuration in SPRO → TR → Cash Management → EBS
2. Identify bank statement format (MT940, CAMT.053, BAI2) used by house bank
3. Implement custom interpretation algorithm: create Z-copy of standard FM FEBC_INTERPRET_STATEMENT
4. Map external transaction codes to internal planning levels (V_T036K) and posting rules
5. Implement BAdI BANK_STATEMENT_POST for custom posting logic on unmatched items
6. Test: import test file via FEBAN (EBS posting), verify G/L postings and cash position in FF7A

### Required MCP Tools
- mcp__mcp-abap-adt__GetFunctionModule — read FEBC_IMPORT_BANK_STATEMENT and FEBC_POST_BANK_STATEMENT
- mcp__mcp-abap-adt__GetTable — inspect FEBKO, FEBEP (bank statement header/items)
- mcp__mcp-abap-adt__CreateClass — implement BAdI BANK_STATEMENT_POST
- mcp__mcp-abap-adt__GetClass — read BAdI interface IF_EX_BANK_STATEMENT_POST

### Related Config
- Planning Levels: OT55 / V_T036
- Account Symbols: V_T036I
- Transaction Types (EBS): V_T036K

---

## Workflow 2: Cash Position Report Enhancement
### Steps
1. Analyze standard cash position structure: planning levels in FF7A read from FLQITEM/FLQDB
2. Implement custom data source: FM reading uncommitted/expected cash flows from custom Z-tables
3. Enhance planning level hierarchy by adding custom sub-levels in V_T036G
4. Implement BAdI CASH_PLANNING_ITEM for injecting custom items into liquidity forecast
5. Populate FLQITEM structure with custom planning group, amount, currency, value date
6. Test: run FF7B and verify custom items appear in liquidity forecast drilldown

### Required MCP Tools
- mcp__mcp-abap-adt__GetTable — inspect FLQITEM, FLQDB structure
- mcp__mcp-abap-adt__GetClass — inspect BAdI CASH_PLANNING_ITEM interface
- mcp__mcp-abap-adt__CreateClass — implement cash flow injection
- mcp__mcp-abap-adt__CreateProgram — build custom cash flow data upload

### Related Config
- Planning Groups: V_T036G
- Cash Concentration: V_T036C

---

## Workflow 3: Treasury Deal Confirmation via IDoc/BAPIs
### Steps
1. Create financial transaction: BAPI_FINTRANS_CREATE with product type (money market/FX), amount, counterparty, dates
2. Check counterparty limit: TR_COUNTERPARTY_LIMIT_CHECK before deal creation
3. Commit; generate confirmation: read deal data and create correspondence via TRM correspondence FM
4. Send confirmation to counterparty: use BCS (Business Communication Services) or output via SAPScript/SmartForm
5. Post settlement: BAPI_FINTRANS_CHANGE to update settlement status; TBB1 for accounting entries
6. Reconcile: match with EBS entries using FEBAN

### Required MCP Tools
- mcp__mcp-abap-adt__GetFunctionModule — read BAPI_FINTRANS_CREATE interface
- mcp__mcp-abap-adt__GetTable — inspect VDBI, VDBJHD (TRM deal tables)
- mcp__mcp-abap-adt__CreateProgram — scaffold deal booking interface program

### Related Config
- Transaction Types: OT29 / V_TZF0
- Product Types: V_TVTFT
- Counterparty Limits: V_TZPG
