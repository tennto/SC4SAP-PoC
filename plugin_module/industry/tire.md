# Tire

## Business Characteristics
- **Mixed manufacturing**: Process (compound mixing) + Discrete (building) + Repetitive (curing/finishing)
- Raw materials: natural rubber, synthetic rubber, carbon black, steel cord — highly volatile prices
- Two fundamentally different business models:
  - **OE (Original Equipment)**: supply to automotive OEMs — JIT/JIS, long-term scheduling agreements, long-term agreements (LTA)
  - **RE (Replacement / Aftermarket)**: dealers, tire shops, online — brand/marketing-driven, promotions
- Product variants: Size × Pattern × Load Index × Speed Rating × Season (Summer/Winter/All-Season)
- Regulations/certifications: DOT, ECE, EU Tyre Label, recall management
- Retreading business, warranty claim handling

## Key Processes
- **Mixing (Process)**: rubber compound blending, batch/lot
- **Component Prep**: calendering, extrusion, bead, ply
- **Building (Discrete)**: green tire assembly
- **Curing (Repetitive)**: vulcanization, capacity per mold
- **Finishing/QC**: X-ray, uniformity, balance
- **OE Supply**: JIT/JIS delivery, sequenced delivery, EDI
- **RE Distribution**: dealer network, consignment, promotion
- **Warranty/Claim**: mileage/age warranty, return analysis

## Master Data Specifics
- **Material** — separated or flagged for OE vs RE
- **Variant Configuration** or Classification for specs
- **Mold** — managed as Equipment/Resource, drives capacity
- **Batch** — compound lot, cure lot traceability (recall)
- **Scheduling Agreement (LPA/LPB)** — supply contract with OE customers

## Module Implications
- **PP / PP-PI mixed**: compound in PP-PI; building/curing in REM (Repetitive) or PP
- **SD**: OE uses Scheduling Agreement + JIT Call-off (VA31/SA); RE uses normal orders
- **MM**: raw material price volatility (Moving Avg or Standard + Variance), LTAs
- **QM**: batch-level test results, recall batch traceability
- **EHS**: chemical substance management, some Dangerous Goods
- **WM/EWM**: tires are bulky with loading constraints; dedicated racks

## Common Customizations
- OE Scheduling Agreement EDI (DELFOR/DELJIT → production plan)
- Just-in-Sequence (JIS) sequenced call-off processing
- Warranty claim system (Notification + Credit Memo)
- Mold capacity planning enhancement
- Dealer portal (order/claim/inventory)
- Compound batch genealogy (for recalls)
- Automatic EU Tyre Label generation

## SAP Industry Solutions
- No dedicated IS — typically a combination of IS-Auto (OE side) + IS-Mill Products (selective) + standard PP/PP-PI
- **SAP Direct Procurement for Automotive** (OE parts perspective)
- **SAP EWM** for bulky-product logistics

## Pitfalls / Anti-patterns
- Treating OE and RE under the same sales org / pricing → pricing, margin, and promotion chaos
- Modeling compounds as discrete BOMs → batch / yield control fails
- Managing molds only as Work Centers without Equipment Master → no preventive maintenance or availability tracking
- No batch genealogy design for recalls → months of reactive work later
- Treating OE Scheduling Agreements as regular POs → no EDI automation or forecast integration
- Allowing raw material price swings without standard cost updates → distorted margins
