# Cosmetics

## Business Characteristics
- **Batch/Lot management is mandatory**: production date, shelf life, raw material lot traceability
- Regulated industry: national cosmetics authorities (e.g., MFDS, FDA), EU Cosmetics Regulation, GMP
- Diverse sales channels: department stores, Health & Beauty chains, MLM/direct sales, duty-free, online, export
- Frequent promotions, samples, gift-with-purchase (GWP), set products
- Brand / line / seasonal collection structure, frequent Limited Editions
- Extensive use of overseas OEM/ODM; private label business common

## Key Processes
- **Formulation / Recipe Management**: formula management with version control
- **Batch Manufacturing**: process-industry characteristics, campaign production
- **QC/QA**: incoming / in-process / outgoing inspection, Certificate of Analysis (CoA)
- **Shelf Life Management**: First-Expired-First-Out (FEFO) picking
- **Sample / Tester / GWP (Gift with Purchase)** handling
- **Regulatory Reporting**: ingredient filing, country of origin, import/export duty
- **Channel Pricing**: separate price/margin structures per channel (department, H&B, duty-free, export)

## Master Data Specifics
- **Batch (MCH1/MCHA/MCHB)** — mandatory, with batch characteristics (production date, shelf life, test values)
- **Material — Shelf Life fields** (MARA-MHDRZ, MHDHB, MHDLP)
- **Recipe (PLPO with RM category)** — for process industry
- **Classification**: INCI ingredients, regulatory categories
- **Customer Hierarchy**: per channel (department / H&B / duty-free / export)

## Module Implications
- **PP-PI (Process Industry)**: Master Recipe, Process Order, Resource
- **QM**: inspections at GR/in-process/release, usage decision, CoA printing
- **MM**: batch management, vendor batch, shelf life at goods receipt
- **SD**: batch determination (FEFO), sample/GWP order types, channel-based pricing
- **WM/EWM**: batch/expiry-based picking, quarantine storage areas
- **EHS**: ingredient regulations, Safety Data Sheets (SDS)

## Common Customizations
- Automatic batch-characteristic population (production/expiry date calculation)
- FEFO strategy enhancement (batch search strategy)
- Dedicated order type for samples/testers with separate FI accounts
- Automatic GWP determination (Free Goods + BAdI)
- Automatic CoA generation (Smartform + QC results)
- Channel price-visibility restrictions (authorization + BAdI)
- Automatic label/ingredient sheet generation for exports

## SAP Industry Solutions
- **SAP for Consumer Products (IS-CP)**
- **S/4HANA Consumer Products** industry edition
- **SAP TPM (Trade Promotion Management)**
- **SAP GTS (Global Trade Services)** for imports/exports

## Pitfalls / Anti-patterns
- Running without batch management → expiry tracking and recall become impossible
- Setting shelf life only in MM01 without configuring batch determination → FEFO never takes effect
- Processing samples as regular sales → sales and margin distortion
- Handling channel pricing purely through customer pricing procedures → management complexity explodes (use Customer Hierarchy)
- Skipping recipe version control → unable to support regulatory audit history
- Handling OEM production as plain subcontracting without batch traceability
