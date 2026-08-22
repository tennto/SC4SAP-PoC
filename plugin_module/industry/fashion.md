# Fashion / Apparel

## Business Characteristics
- **Variant-centric**: Style × Color × Size (thousands to tens of thousands of SKU combinations)
- Season-driven (SS/FW), rapid product turnover, short selling windows
- Lookbook / collection-based planning, MOQ constraints
- Global sourcing (OEM/ODM) with long lead times (3–6 months) and highly uncertain demand
- Heavy reliance on markdown; end-of-season moves to outlet / clearance
- Mixed Wholesale (B2B) + Retail (B2C) + E-commerce

## Key Processes
- **Collection / Season Management**: pre-season planning → buying → allocation → in-season replenishment → end-of-season
- **Pre-pack / Solid Pack / Assortment Pack**: bundled orders by size ratio
- **Size Curve / Grading**: sales ratios per size
- **Allocation & Replenishment**: store-level distribution driven by size curve
- **Sourcing**: global vendors, Letters of Credit (LC), import duty
- **Sample Management**: sample order/approval process

## Master Data Specifics
- **Generic Article + Variants**: a generic parent linked to Color/Size variants
- **Characteristic (CT04)**: color, size, fit, etc.
- **Grid (Size/Color)**: matrix-based order entry and inventory views
- **Seasonality Attributes**: season code, collection, theme
- **RFID tagging** increasingly common to improve store inventory accuracy

## Module Implications
- **SD**: Matrix order entry (size/color grid), pre-pack orders, drop shipment
- **MM**: global vendors, LC/trade, long lead-time POs, separate sample POs
- **PP**: subcontracting (OEM), Cut-Make-Trim (CMT), lot-based
- **WM/EWM**: separate storage for hanging garment vs flat pack, pick-by-variant
- **FI/CO**: season-level COGS/margin analysis, markdown reserve

## Common Customizations
- Size curve-driven allocation engine
- Markdown cascade (regular → sale → outlet → write-off)
- Pre-pack BOM expansion (Enhancement: VA01 BAdI)
- Grid UI (Fiori / WebDynpro)
- Return classification (defect / remorse / exchange) and restocking fee

## SAP Industry Solutions
- **SAP AFS (Apparel and Footwear Solution)** — ECC-based (legacy)
- **SAP Fashion Management Solution (FMS)** — S/4HANA successor
- **S/4HANA for Fashion and Vertical Business** — current recommended offering
- **SAP CAR** with Fashion extensions

## Pitfalls / Anti-patterns
- Registering each variant as a separate material → SKU explosion, planning/analysis becomes unmanageable
- Allocation that ignores size curve → simultaneous size-level stockouts and overstock
- Storing the season code only in the material description while ignoring classification
- Treating pre-pack as a plain sales BOM → variant-level inventory incorrect
- Failing to reflect landed cost (freight/duty) for global sourcing in the standard cost
