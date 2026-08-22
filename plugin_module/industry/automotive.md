# Automotive

## Business Characteristics
- Tiered supply structure: OEM → Tier 1 → Tier 2 → Tier 3 (raw materials)
- **JIT/JIS** delivery is central; line-stop risk is severe
- Long-term agreements (LTA) and EDI (VDA, ANSI X12, Odette) are mandatory
- Quality: IATF 16949, PPAP, APQP, FMEA, 8D Report
- Frequent Model Year, vehicle option, Engineering Change (ECO/ECN)
- Serialization (VIN), traceability required (recall)
- Very high warranty/recall costs

## Key Processes
- **Scheduling Agreement + Release**: LZ/LPA + DELFOR (forecast) / DELJIT (JIT call)
- **JIT/JIS Call-off**: sequenced delivery to the line side
- **Consignment Stock at Customer (VMI)**
- **Engineering Change**: ECM (ECR/ECO), BOM versioning
- **Quality — PPAP/APQP**, inspection, CoC
- **Warranty processing**, recall management

## Master Data Specifics
- **Material** — OE/AM split, mapping of internal part number to customer part number
- **Customer Material Info Record (KNMT)** — OEM-specific part numbers
- **BOM (CS01)** — ECM version, effectivity (date/serial)
- **Serial Number Profile**
- **Scheduling Agreement (SA)** — forecast + JIT horizon

## Module Implications
- **SD**: Scheduling Agreement (VA31/VA32), JIT Outbound (VJ01), Self-Billing (ERS)
- **MM**: Vendor Scheduling Agreement, Consignment, Kanban
- **PP**: Repetitive Manufacturing, REM backflush, line balancing
- **QM**: PPAP, inspection plan, Q-Info Record
- **LE/EWM**: Handling Unit, sequence-based picking
- **FI**: Self-Billing (ERS), customer consignment billing

## Common Customizations
- EDI mapping (DELFOR/DELJIT/DELINS → SA release)
- JIS sequence processing (line sequence ↔ pick sequence)
- Mapping customer part number ↔ internal material
- ECN mass-change programs
- Warranty claim system (Notification + Credit)
- IMDS (International Material Data System) integration

## SAP Industry Solutions
- **SAP for Automotive (IS-Auto)** — ECC-based
- **S/4HANA Automotive**
- **SAP Extended Warehouse Management (EWM)**
- **SAP Manufacturing Integration and Intelligence (MII)**

## Pitfalls / Anti-patterns
- Not separating Scheduling Agreement forecast from JIT → MRP / production planning confusion
- Managing without customer part number mapping → EDI failures
- Managing ECN effectivity only by BOM date → serial-based validity impossible
- Neglecting self-billing reflection → large AR open items left unbilled
- Treating Tier-to-Tier consignment as regular stock → ownership / valuation errors
