# Retail

## Business Characteristics
- Very large SKU count (tens to hundreds of thousands), short product lifecycle, strong seasonality
- Multi-channel: brick-and-mortar stores, online, mobile, omnichannel
- Store-level sales and inventory management; promotion- and discount-driven pricing
- POS integration with tens of millions of daily transactions
- Vendor power varies; direct-buy, consignment, and concession models coexist

## Key Processes
- **Merchandising**: Assortment Planning, Listing, Allocation, Replenishment
- **Pricing & Promotion**: store/channel-specific pricing, promotions, coupons, loyalty
- **Store Operations**: POS, store inventory, store-to-store transfers, returns
- **Distribution Center**: cross-docking, flow-through, pick-by-line
- **Season Management**: in-season/out-of-season, markdown, clearance
- **Vendor Management**: direct buy, consignment, concession

## Master Data Specifics
- **Article (MARA)** — in Retail it is Article, not Material, with Generic/Variant structure
- **Site (T001W)** — stores and DCs are separate site types
- **Assortment** — list of articles carried per site
- **Listing Conditions** — which article is sold/stocked in which site
- **Merchandise Category Hierarchy** — article classification hierarchy (MC)

## Module Implications
- **SD**: channel/POS-based rather than customer-based; concession stores use consignment sales
- **MM**: high-volume POs, vendor management, EDI, auto-replenishment
- **WM/EWM**: cross-docking, wave management, put-to-store
- **FI/CO**: store-level profit center, daily close, inventory valuation (FIFO/Moving Avg)
- **BW/CAR**: real-time store sales/inventory analytics via CAR (Customer Activity Repository)

## Common Customizations
- POS interface (POSDM, SAP POS DM)
- Markdown / clearance automation
- Vendor commission calculation (concession / consignment)
- Store replenishment logic (BAdI: `MB_DOCUMENT_BADI`)
- EDI order/invoice (IDOC: `ORDERS05`, `INVOIC02`)

## SAP Industry Solutions
- **IS-Retail** (ECC)
- **S/4HANA for Retail** (extended into Fashion & Vertical Business)
- **SAP CAR (Customer Activity Repository)** — real-time POS/inventory analytics
- **SAP Customer Checkout**, **SAP Omnichannel Promotion Pricing (OPP)**

## Pitfalls / Anti-patterns
- Confusing Article with Material — Retail requires the Article structure
- Reusing customer-based pricing without redesigning around store/channel
- Processing consignment purchases as regular POs → ownership and revenue recognition errors
- Aggregating FI postings without accounting for POS volume → performance issues
- Modeling season/markdown pricing as plain conditions instead of leveraging Promotion Pricing
