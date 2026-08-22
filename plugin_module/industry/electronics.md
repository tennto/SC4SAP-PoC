# Electronics / High-Tech

## Business Characteristics
- Short product lifecycle, rapid obsolescence, inventory write-down risk
- High share of **Configure-to-Order (CTO)** / **Make-to-Order (MTO)**
- Serial number / IMEI tracking, after-sales service
- Global supply chain, component shortage risk
- Heavy use of contract manufacturers (EMS/ODM)
- Multi-tier channel (Distributor → Reseller → End-user), complex rebate programs
- Complex revenue recognition (hardware + software + services bundles)

## Key Processes
- **Variant Configuration (LO-VC)** or **Advanced Variant Configuration (AVC)**
- **Serial number management**
- **Channel incentive / rebate / price protection**
- **RMA (Return Material Authorization)** and repair orders
- **Software license management**
- **Contract manufacturing** (subcontracting with full component supply)

## Master Data Specifics
- **Configurable Material (KMAT)** + characteristics + class + object dependencies
- **Serial Number Profile**
- **Equipment (ERP master)** — installed product
- **Customer Hierarchy** — distributor / reseller

## Module Implications
- **SD**: VC-based order entry, contract (outline agreement), rebate agreements
- **PP**: MTO/CTO planning strategies (20/25/50/82), assembly orders
- **MM**: subcontracting, VMI, consignment (component supply)
- **CS/Service**: warranty, repair, installed base
- **FI**: multi-element revenue recognition (SD-RR or SAP RAR)

## Common Customizations
- Configurator UI (Fiori / external)
- Rebate calculation enhancements for complex conditions
- Price protection (compensation for price drops on already-shipped stock)
- RMA → repair → return workflow
- Software license issuance and integration

## SAP Industry Solutions
- **SAP for High Tech**
- **S/4HANA for High Tech** (includes AVC)
- **SAP Revenue Accounting and Reporting (RAR)**
- **SAP Commissions (Callidus)**

## Pitfalls / Anti-patterns
- Registering thousands of SKUs without Variant Configuration → unmanageable master data
- Changing the Serial Number Profile after go-live → split history for existing serials
- Treating rebates as plain discounts → no accrual or settlement control
- Recognizing revenue only by billing date → violates complex-contract rules (VSOE / ASC 606)
- Not capturing EMS subcontracting component stock in your books → inventory mismatch
