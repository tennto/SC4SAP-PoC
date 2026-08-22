# Food & Beverage

## Business Characteristics
- **Short shelf life**: expiration dates, FEFO mandatory
- **Catch weight**: actual vs nominal weight (variable-weight items)
- Certifications: HACCP, FSSC 22000, Halal / Kosher
- Highly volatile raw material prices (agricultural products, oil, sugar, etc.)
- Seasonality, high dependence on promotions, Trade Promotion Management (TPM)
- Cold chain and hygiene management
- Heavy use of co-packers (OEM) and private label

## Key Processes
- **Process Manufacturing + Packaging**
- **Batch / Expiry Management**, FEFO picking
- **Trade Promotion**: rebates, allowances, deductions
- **Catch Weight Sales**: variable weight per case
- **Route Settlement**: Direct Store Delivery (DSD) truck settlement

## Master Data Specifics
- **Batch** with shelf life expiration date
- **Material — Catch Weight** indicator
- **Units of Measure**: multi-level UoM (base / sales / issue)
- **Recipe** (PP-PI)

## Module Implications
- **PP-PI**: batch manufacturing, campaign planning with Cleaning (CIP) considerations
- **QM**: raw material inspection, microbial testing
- **SD/MM**: catch-weight UoM, FEFO batch determination
- **WM/EWM**: cold storage, expiry-based putaway
- **FI/CO**: promotion accrual, deduction management

## Common Customizations
- Catch weight processing (actual weight vs invoiced weight)
- Automatic block based on remaining shelf life
- TPM accrual automation
- DSD route settlement
- Deduction auto-matching in AR

## SAP Industry Solutions
- **SAP for Consumer Products (IS-CP)**
- **S/4HANA Consumer Products**
- **SAP TPM (Trade Promotion Management)**
- **SAP Agricultural Contract Management (ACM)** for raw materials

## Pitfalls / Anti-patterns
- Not applying catch weight → weight discrepancies between invoicing and inventory
- No shelf life blocking → shipping near-expiry stock
- Handling promotions purely as pricing conditions → accounting accruals missed
- Treating out-of-temperature cold-chain stock as normal stock
