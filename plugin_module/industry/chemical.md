# Chemical

## Business Characteristics
- Classic **process industry**: continuous or batch production
- Dangerous Goods, REACH, GHS, SDS management are required
- Frequent by-products / co-products; yield variability
- Prices linked to crude/feedstock; formula-based pricing (indexed prices)
- Bulk transport: tank truck, rail car, ship, pipeline
- Container management: drum / IBC / ISO tank (returnable, cleaning required)
- Campaign production (high changeover cost)

## Key Processes
- **Process Manufacturing**: Master Recipe, continuous / campaign
- **Blending**, **Tolling (toll manufacturing)**
- **Tank / Silo inventory**, bulk movement
- **Dangerous Goods shipping**: DG classification, placarding
- **Formula Pricing**: prices tied to external indices (e.g., Platts)

## Master Data Specifics
- **Batch** + tank/silo storage location
- **Material — DG info**, UN number, hazard class
- **Characteristics** — concentration, purity, viscosity, other specs
- **Recipe with Co-/By-Product**
- **Vendor/Customer — DG qualifications / licenses**

## Module Implications
- **PP-PI**: continuous process, tank level, co-/by-product handling
- **EHS**: SDS, DG, REACH, product safety
- **SD/MM**: DG checks, container return, formula pricing
- **WM**: tank management, silos
- **QM**: tank sampling, CoA

## Common Customizations
- Formula pricing engine integrated with external index feeds
- Automatic DG document generation
- Tank level interface (PI → SAP)
- Container deposit / return (returnable packaging)
- Automatic goods receipt and valuation of co-/by-products

## SAP Industry Solutions
- **SAP for Chemicals (IS-Chem)**
- **S/4HANA Chemicals**
- **SAP EHS Management**
- **SAP Global Batch Traceability (GBT)**

## Pitfalls / Anti-patterns
- Posting co-/by-products as separate goods receipts without including them in the recipe → distorted costing
- Keeping DG info only on the material master and skipping EHS integration → missing shipping documents
- Tracking tank inventory only by storage location → mismatch with actual levels
- Manually updating formula pricing daily → errors and delays
- Not managing container returns → significant losses over time
