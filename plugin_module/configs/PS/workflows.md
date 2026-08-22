# PS - Project System Development Workflows
# PS - 프로젝트 시스템 개발 워크플로우

## Workflow 1: Create Project Structure (Def + WBS + Network) via BAPI
### Steps
1. Call BAPI_PS_INITIALIZATION to reset buffers
2. Populate project header (PROJECT_DEFINITION, PROJECT_PROFILE, COMPANY_CODE, CONTROLLING_AREA)
3. Build WBS hierarchy table (levels, POSID, description, responsible person) for BAPI_PROJECT_MAINTAIN
4. Call BAPI_PROJECT_MAINTAIN with method tables: I_METHOD_PROJECT, I_METHOD_WBS
5. Call BAPI_PS_PRECOMMIT; check RETURN for errors; rollback on failure
6. Call BAPI_NETWORK_MAINTAIN for network header + activities + relationships
7. Call BAPI_PS_PRECOMMIT again, then BAPI_TRANSACTION_COMMIT with WAIT = 'X'
8. Verify in CJ20N; check PROJ, PRPS, AFKO, AFVC records

### Required MCP Tools
- mcp__mcp-abap-adt__GetFunctionModule — read BAPI_PROJECT_MAINTAIN interface
- mcp__mcp-abap-adt__GetTable — inspect PROJ, PRPS, AUFK, AFKO, AFVC
- mcp__mcp-abap-adt__CreateProgram — scaffold test program

### Related Config
- Project Profile: OPSA / V_TCJ41
- Network Profile: OPUU / V_TCNT
- Number Ranges: CJ81 (project def), CJ82 (network)

---

## Workflow 2: WBS Validation Enhancement (CNEX0007 / BAdI)
### Steps
1. Identify requirement: validate custom field on WBS save (e.g., must have responsible person for billing WBS)
2. Create project in CMOD; assign enhancement CNEX0007 (or implement BAdI WORKORDER_UPDATE filter PS)
3. In EXIT_SAPLCJWB_002 (or BAdI method AT_SAVE): read PRPS internal table, apply rule
4. Raise MESSAGE with TYPE 'E' to abort save, or 'W' for warning
5. Alternative modern: implement BAdI BADI_CJWBS for subscreen-level checks
6. Test via CJ20N and CJ02 save operations; verify rejection behavior
7. Check status change via JEST/JCDS; confirm no orphan DB writes

### Required MCP Tools
- mcp__mcp-abap-adt__GetInclude — inspect CMOD exit includes (ZXCNEU07)
- mcp__mcp-abap-adt__UpdateInclude — implement validation logic
- mcp__mcp-abap-adt__GetClass — read BAdI interface IF_EX_WORKORDER_UPDATE
- mcp__mcp-abap-adt__GetTable — PRPS, PROJ, T399A

### Related Config
- CMOD Project Enhancement: SMOD CNEX0007
- Status Profile: OK02 / V_TJ30A

---

## Workflow 3: Milestone Billing Automation
### Steps
1. Identify milestone usage marked for billing (TCN21 — usage type 'billing')
2. When milestone is confirmed (flag USR01 set in MLST), trigger release of associated FPLT billing line
3. Implement BAdI PS_MILESTONE_BILL method RELEASE_BILLING to customize release logic
4. Read MLST → FPLT link (FPLT-MLSTN), update FPLT-FAKSP (blocking reason) to ' '
5. Optionally call SD billing via BAPI_BILLINGDOC_CREATEMULTIPLE for the release date
6. Test: confirm milestone in CNMT, run VF04 for the linked SD order, verify invoice creation

### Required MCP Tools
- mcp__mcp-abap-adt__GetClass — inspect BAdI PS_MILESTONE_BILL definition
- mcp__mcp-abap-adt__GetTable — MLST, FPLA, FPLT, VBAK, VBAP
- mcp__mcp-abap-adt__GetFunctionModule — BAPI_BILLINGDOC_CREATEMULTIPLE

### Related Config
- Milestone Usage: OPT6 / V_TCN21
- Billing Plan Type: OVBO / V_TFPLA_SD

---

## Workflow 4: Project Cost Rollup Report (CDS on S/4HANA)
### Steps
1. Determine sources: ACDOCA (actual), ACDOCP (plan), BPGE (budget), RPSCO (info DB summary — ECC fallback)
2. Design CDS view `ZC_PROJECT_COST_ROLLUP` joining I_WBSElement with I_JournalEntryItem filtered by OBJNR category 'PR'
3. Aggregate by project definition (PSPID) and cost element with SUM(amount in company code currency)
4. Extend with ASSOCIATIONs to I_ProjectDefinition for descriptive fields
5. Expose as analytical query via `@Analytics.query: true` annotation; publish OData service
6. Build Fiori Elements list or Smart Business KPI tile; add plant, fiscal year variables
7. For ECC, build ABAP report using AD-HOC JOIN on COEP + COSP summarized by PSPNR

### Required MCP Tools
- mcp__mcp-abap-adt__CreateCdsView — create CDS view
- mcp__mcp-abap-adt__GetTable — ACDOCA, ACDOCP, BPGE, RPSCO, PRPS, PROJ
- mcp__mcp-abap-adt__GetAbapSemanticAnalysis — validate CDS syntax

### Related Config
- CO Area: V_TKA01
- Project Profile: OPSA
- Controlling Version: OKEQ

---

## Workflow 5: Progress Analysis with Custom POC (CNE1 / PROGRESS_CUST)
### Steps
1. Define Progress Version and Measurement Method in OPTV/OPS6
2. Assign measurement method to WBS/activity level via CJ20N (Progress tab)
3. Implement BAdI PROGRESS_CUST (method CALCULATE_POC) with custom formula (e.g., milestone-weighted POC)
4. Schedule progress determination via CNE1 (periodic)
5. Results written to table JCDS / COEP (earned value line items)
6. Run CNE5 for progress analysis report; verify EVP, ACWP, BCWS, BCWP values
7. For S/4HANA: use Event-Based Revenue Recognition integration if revenue must be recognized per POC

### Required MCP Tools
- mcp__mcp-abap-adt__GetClass — inspect BAdI PROGRESS_CUST interface
- mcp__mcp-abap-adt__GetTable — COEP/ACDOCA, JCDS, PRPS, RPSCO
- mcp__mcp-abap-adt__RunUnitTest — unit test custom formula class

### Related Config
- Progress Version: OPTV / V_TCJ4T
- Measurement Method: OPS6 / V_T7PEPE
