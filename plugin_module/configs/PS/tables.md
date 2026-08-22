# PS - Key Tables Reference
# PS - 주요 테이블 참조

## Master Data Tables

| Table | System | Description |
|-------|--------|-------------|
| PROJ | ECC/S4 | Project Definition |
| PRPS | ECC/S4 | WBS Element Master Data |
| PRHI | ECC/S4 | WBS Hierarchy (parent-child) |
| PRTE | ECC/S4 | WBS Scheduling Data |
| PRPS_R | ECC/S4 | WBS elements (reporting) |
| MLST | ECC/S4 | Milestones |
| MLGT | ECC/S4 | Milestone Group |
| AUFK | ECC/S4 | Order Master (Network order header) |
| AFKO | ECC/S4 | Network/Order Header Data |
| AFVC | ECC/S4 | Activity / Operation (Network activity) |
| AFVV | ECC/S4 | Activity Quantities & Dates |
| AFAB | ECC/S4 | Network Relationships (predecessor/successor) |
| AFFH | ECC/S4 | PRT Assignment (Production Resources/Tools) |
| RESB | ECC/S4 | Reservations / Network Components |
| NPTX | ECC/S4 | Activity Texts |

## Cost & Budget Tables

| Table | System | Description |
|-------|--------|-------------|
| COSP | ECC (compat view on S/4) | Cost Totals — external postings |
| COSS | ECC (compat view on S/4) | Cost Totals — internal postings |
| COEP | ECC (compat view on S/4) | CO Line Items (per period) |
| COEJ | ECC/S4 | CO Plan Line Items (per fiscal year) |
| ACDOCA | S4 | Universal Journal — replaces COEP/COSP/COSS/BSEG for actuals |
| ACDOCP | S4 | Plan Line Items (S/4HANA) |
| BPGE | ECC/S4 | Budget Totals (overall) |
| BPJA | ECC/S4 | Budget Totals (annual) |
| BPEG | ECC/S4 | Budget Line Items (overall) |
| BPEJ | ECC/S4 | Budget Line Items (annual) |
| BPTR | ECC/S4 | Budget Transfers |
| RPSCO | ECC/S4 | Project Info DB: Costs, Revenues, Finances (summary) |
| RPSQT | ECC/S4 | Project Info DB: Quantities |
| COVP | ECC/S4 | CO object (WBS) value logical view |

## Investment & Settlement Tables

| Table | System | Description |
|-------|--------|-------------|
| IMPR | ECC/S4 | Investment Program Position |
| IMZO | ECC/S4 | Investment Program / WBS Assignment |
| AUAK | ECC/S4 | Settlement Document Header |
| AUAA | ECC/S4 | Settlement Document — Receiver Segment |
| AUAI | ECC/S4 | Settlement Rules per depreciation area |
| COBRA | ECC/S4 | Settlement Rule Header |
| COBRB | ECC/S4 | Settlement Rule Distribution Rules |

## Billing / DIP

| Table | System | Description |
|-------|--------|-------------|
| AD01DLI | ECC/S4 | Dynamic Items (RRB result) |
| AD01C_H | ECC/S4 | DIP Profile Header |
| VBAK / VBAP | ECC/S4 | Sales Order header/item (billing requests) |
| FPLA / FPLT | ECC/S4 | Billing Plan / Billing Plan Dates (milestone) |

## Status & Configuration Tables

| Table | System | Description |
|-------|--------|-------------|
| JEST | ECC/S4 | Individual Object Statuses |
| JCDS | ECC/S4 | Change Docs for Statuses |
| TJ30 / TJ30T | ECC/S4 | User Status Profile / Texts |
| TCJ41 | ECC/S4 | Project Profile |
| TCNT | ECC/S4 | Network Profile |
| TCJBU | ECC/S4 | Budget Profile |
| TCJ45 | ECC/S4 | Planning Profile |
| T8J5 | ECC/S4 | Settlement Profile |
| TCN21 | ECC/S4 | Milestone Usage |

## S/4HANA Specifics

- **ACDOCA (Universal Journal)** replaces COEP/COSP/COSS/BSEG for actual postings; compatibility views `V_COEP`, `V_COSP_VV` preserved for legacy code.
- **ACDOCP** for plan data replaces COEJ (plan line items) — used by Universal Allocation and new cost planning apps.
- **Hierarchical Project (S/4HANA 1909+)**: simplified tables `CPD_PROJECT`, `CPD_TASK`, `CPD_ROLE` for Commercial Project Management scenarios.
- **CDS views**: `I_WBSElement`, `I_WBSElementBasic`, `I_ProjectDefinition`, `I_NetworkActivity`, `I_ProjectHierarchyNode` — preferred for reporting and Fiori apps.
- **Project Control Fiori app** uses `C_Project*` consumption views.

## Related Tables

- **MM**: EBAN / EBKN (purchase requisition account assignment to WBS), EKKO / EKPO, MIGO documents reference WBS in account assignment.
- **SD**: VBAK / VBAP (sales order with WBS account assignment), FPLT (milestone billing).
- **FI**: BKPF / BSEG (ECC); ACDOCA (S/4) — document references WBS/network.
- **PP**: CO/PP production orders can settle to WBS receivers.
- **HR/CATS**: CATSDB (timesheets to WBS/activity).
