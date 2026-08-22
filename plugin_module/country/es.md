# 🇪🇸 Spain

## Formats
- **Date**: `DD/MM/YYYY`
- **Number / decimal**: decimal `,` / thousands `.` (e.g., `1.234.567,89`)
- **Currency**: EUR (€)
- **Phone**: `+34 XXX XXX XXX`
- **Postal code**: 5 digits
- **Timezone**: CET/CEST (Canarias: WET/WEST)

## Language & Locale
- SAP language key: `S` (ES); regional: Catalan, Galician, Basque (SAP `CA`/`GL`/`EU` — often handled via separate text elements)
- Typical locale: `es_ES.UTF-8`

## Tax System — IVA
- Standard 21%, reduced 10%, super-reduced 4%; IGIC (Canarias) 7% separate
- **NIF** (Número de Identificación Fiscal) for individuals, **CIF** historically for companies (both now NIF)
- Format: letter + 8 digits or 8 digits + letter, check-digit validated
- Intra-EU: `ES` + NIF for VIES

## e-Invoicing / Fiscal Reporting
- **SII (Suministro Inmediato de Información)** — near real-time VAT reporting to AEAT (Tax Agency). Large taxpayers mandatory since 2017; submissions within **4 business days**
- **TicketBAI** — Basque Country (Álava, Bizkaia, Gipuzkoa) real-time invoice reporting; phased 2022+
- **FACe** / **FACeB2B** — e-invoicing platform, mandatory B2G, voluntary B2B; **Crea y Crece** law extends mandatory B2B in phases (from 2026 for large firms)
- **Modelo** forms: 303 (VAT), 390 (annual VAT), 349 (intra-EU), 347 (domestic), 720 (foreign assets)

## Banking / Payments
- **SEPA** (SCT/SDD)
- **IBAN**: `ES` + 22 chars
- **Confirming** (reverse factoring) — very common in Spain; vendor gets early payment via buyer's bank
- **Pagaré** (promissory note) — legacy B2B
- **Cuaderno 43/34/19** — AEB/CECA bank file formats for confirming/SEPA/direct debits

## Master Data Peculiarities
- NIF check-digit validation critical (ERP should reject invalid)
- Separate legal entities for Canarias (IGIC) and mainland
- Autonomous Community (Comunidad Autónoma) impacts some reporting
- Address: Calle / CP Ciudad (Provincia)

## Statutory Reporting
- **Modelo 303**: monthly/quarterly VAT
- **Modelo 390**: annual VAT summary
- **Modelo 349**: intra-EU operations
- **Modelo 347**: annual domestic transactions > €3,005.06 per partner
- **SII**: real-time ledgers (invoices, received invoices, investments)
- **Modelo 111/190**: withholding income tax
- **SEPE**: social security monthly

## SAP Country Version
- **CC ES** — includes:
  - IVA tax procedure, Modelo reports (303/347/349/390)
  - **SII integration** via SAP DRC or RFIDESM_SII / certified 3rd-party (Sovos, Pagero)
  - Confirming file formats (Cuaderno 68 / 58 / 43)
  - HCM-ES payroll (TC-1/TC-2, CRA)
  - Canarias IGIC setup

## Common Customizations
- SII real-time submission (DRC or 3rd-party adapter) — must handle 4-day latency with queue/retry
- Confirming ("factoring inverso") integration with banks
- TicketBAI for Basque legal entities (separate flow)
- Withholding on freelancer invoices (retención de IRPF/IRNR)
- Modelo 347 threshold tracking

## Pitfalls / Anti-patterns
- Missing SII submission within 4 working days → penalties
- Applying IGIC to mainland CoCode or vice versa
- Cuaderno format mismatches (old 19 vs SEPA SDD)
- Not recording "Régimen Especial" codes on invoices (REAGYP, REBU, SII régimen)
- Ignoring TicketBAI for Basque subsidiaries
