# Utilities (Electricity / Gas / Water / District Heating)

## Business Characteristics
- **Millions of consumer accounts**, periodic meter reading and billing
- Device-centric operations (meters): installation / removal / replacement cycles
- Regulated industry (tariff approvals); complex tariff structures (time-of-use, seasonal, tiered)
- Arrears/collections, dunning, disconnection
- Huge network asset base — distribution / pipeline / substation
- Growing renewables and smart grid
- Tight integration with Customer Interaction Center (CIC)

## Key Processes
- **Device Management**: install / remove / replace, meter reading (MR)
- **Billing**: meter reading → bill calculation → invoice
- **Collection / Dunning**: FI-CA based
- **Move-in / Move-out**: tenant in / tenant out
- **Outage / Disconnection**
- **Regulatory reporting**

## Master Data Specifics
- **Business Partner (BP)** + Contract Account (FI-CA)
- **Contract** — product / tariff
- **Installation / Connection Object / Device Location**
- **Device (Equipment)**

## Module Implications
- **IS-U Core**: device, billing, invoicing
- **FI-CA (Contract Accounting)**: dedicated AR module for high-volume processing
- **CRM (IC-WebClient)**: call center
- **PM**: asset maintenance

## Common Customizations
- Smart Meter / AMI integration
- Tariff rate changes (mass updates on regulatory changes)
- Mobile field service (workforce management)
- Self-service portals

## SAP Industry Solutions
- **SAP for Utilities (IS-U)**
- **S/4HANA Utilities**
- **SAP Cloud for Utilities**
- **SAP FI-CA** (Contract Accounting)

## Pitfalls / Anti-patterns
- Using standard FI AR → open-items collapse under millions of consumers (FI-CA is required)
- No device history tracking → replacement / maintenance records missing
- Managing tariff changes only in custom Z-tables → regulatory audit failures
- Manual move-in / move-out processing → settlement gaps
