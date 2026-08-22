# 🇦🇺 Australia

## Formats
- **Date**: `DD/MM/YYYY`
- **Number / decimal**: decimal `.` / thousands `,` (e.g., `1,234,567.89`)
- **Currency**: AUD ($) — 2 decimals
- **Phone**: `+61 X XXXX XXXX`
- **Postal code**: 4 digits
- **Timezone**: AEST/AEDT (UTC+10/+11), varies by state — DST not observed in QLD/NT/WA

## Language & Locale
- SAP language key: `E` (EN)
- Typical locale: `en_AU.UTF-8`

## Tax System — GST
- GST: 10% standard, 0% (GST-free: basic food, health, education), input-taxed (financial)
- **ABN** (Australian Business Number): 11 digits, required on all invoices > $82.50
- **ACN** (Australian Company Number): 9 digits (subset of ABN)
- **Simplified GST** for non-resident businesses

## e-Invoicing / Fiscal Reporting
- **Peppol PINT A-NZ** e-invoicing standard — all federal agencies support since 2022; B2B adoption growing
- **Single Touch Payroll (STP) Phase 2** — real-time reporting of wages/tax/super to ATO on each pay run (mandatory)
- **BAS (Business Activity Statement)** — quarterly or monthly GST + PAYG withholding + PAYG instalments return
- **TFN** (Tax File Number) — individual, highly sensitive PII

## Banking / Payments
- **BSB (6 digits) + Account number** — domestic
- **PayID** / **NPP (New Payments Platform)** — instant
- No IBAN; SWIFT for international
- **Direct Entry** file format (ABA) for bulk payments
- **Direct Debit** common for B2C recurring

## Master Data Peculiarities
- ABN validation (mod-89 check)
- GST-registered vs not (threshold $75,000 turnover)
- State is relevant for payroll tax (state-based, 5.45% NSW, 4.85% VIC, etc.)

## Statutory Reporting
- **BAS**: monthly or quarterly to ATO
- **IAS (Instalment Activity Statement)** for some
- **Taxable Payments Annual Report (TPAR)** for certain industries
- **Superannuation Guarantee**: 11.5% (rising to 12% 2025-07)
- **STP Phase 2**: per pay run
- **Payroll Tax**: state-level, monthly

## SAP Country Version
- **CC AU** — includes:
  - GST tax procedure, BAS extract
  - STP Phase 2 integration (via SAP ECP / 3rd-party payroll)
  - ABA payment file format
  - HCM-AU payroll with STP, superannuation SuperStream

## Common Customizations
- ABN validation + Australian Business Register lookup (ABR API)
- Peppol A-NZ invoice generation
- SuperStream data for superannuation contributions
- Payroll tax per-state determination
- TFN encryption / masking

## Pitfalls / Anti-patterns
- Missing ABN on invoice > $82.50 → buyer must withhold 47% (no-ABN withholding)
- STP Phase 2 misconfiguration → ATO penalties; each pay run reports
- Ignoring state payroll-tax thresholds / grouping rules
- BAS mismatch with GL — reconcile GST clearing monthly
- TFN stored in plain text → Privacy Act breach
