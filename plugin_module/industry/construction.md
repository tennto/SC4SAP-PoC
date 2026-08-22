# Construction / Engineering & Construction (E&C)

## Business Characteristics
- **Project-centric** accounting and operations (PS is required)
- Long-duration projects (months to years), progress billing
- **Revenue recognition**: Percentage-of-Completion (POC), IFRS 15
- Site-level material, labor, and equipment management
- Subcontracting; joint ventures (JV)
- Actual cost vs execution budget (EVM) gap management
- Equipment rental and ownership (rental equipment fleet)

## Key Processes
- **Project structuring**: WBS, Network, Activity
- **Budgeting / cost planning / release**
- **Progress measurement**: POC, milestone billing
- **Subcontractor management**: service PO, service entry sheet
- **Site logistics**: inbound/outbound on site, material flow
- **Claim / variation orders**

## Master Data Specifics
- **Project (PS) / WBS / Network**
- **Cost/revenue planning at WBS**
- **Service master** (for external services)
- **Equipment** (plant equipment, rentals)

## Module Implications
- **PS (Project System)**: core module; all costs/revenues aggregate under WBS
- **SD**: milestone billing, down payment request, resource-related billing (DP91)
- **MM**: project stock, service PO + service entry sheet (ML81N)
- **CO**: POC results recognition (KKA*), results analysis
- **PM**: equipment management, preventive maintenance

## Common Customizations
- Automatic POC calculation enhancements
- Automatic generation of milestone billing plans
- On-site mobile app (material flow, attendance)
- Joint Venture accounting (JV settlement)
- Execution budget vs actual dashboards

## SAP Industry Solutions
- **SAP for Engineering, Construction & Operations (IS-EC&O)**
- **S/4HANA for EC&O**
- **SAP Commercial Project Management (CPM)**
- **SAP Portfolio and Project Management (PPM)**

## Pitfalls / Anti-patterns
- Cost-center-only accounting → no project-level profitability analysis
- Monthly manual POC calculation → delays and errors
- Receiving invoices without service entry sheets → missing evidence
- Managing on-site material only in the central warehouse view → discrepancy with physical site
- Handling variation orders outside of contract structures → cost traceability is lost
