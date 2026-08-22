# 🇬🇧 United Kingdom

## Formats
- **Date**: `DD/MM/YYYY`
- **Number / decimal**: decimal `.` / thousands `,` (like US)
- **Currency**: GBP (£) — 2 decimals
- **Phone**: `+44 (0) XXXX XXXXXX`
- **Postal code**: alphanumeric `SW1A 1AA` (very specific format per region)
- **Timezone**: GMT/BST (UTC+0/+1), DST observed

## Language & Locale
- SAP language key: `E` (EN)
- Note: British English spelling in user-facing text (colour, organisation, …)

## Tax System — VAT
- Standard 20%, reduced 5%, zero-rated, exempt
- **VAT Number**: `GB` + 9 or 12 digits (some variants)
- Post-Brexit (2021): UK VAT separate from EU VAT — UK no longer in EU VAT system
- NI (Northern Ireland) stays in EU goods VAT scheme (`XI` prefix for NI VAT)

## e-Invoicing / Fiscal Reporting
- **Making Tax Digital (MTD)** — mandatory since 2022 for all VAT-registered; returns filed via API to HMRC
- **MTD for ITSA** (Income Tax Self Assessment) phase-in 2026–2027 for self-employed
- No mandatory B2B e-invoicing yet (2026 as of writing); consultations ongoing
- **Construction Industry Scheme (CIS)** — withholding for subcontractors
- **Plastic Packaging Tax** — quarterly for in-scope businesses

## Banking / Payments
- **IBAN**: `GB` + 20 digits
- **Sort code** (6 digits) + **Account number** (8 digits) — domestic
- **BACS** (3-day), **Faster Payments** (FPS, near real-time), **CHAPS** (same-day high-value)
- Direct Debit (DDI) under BACS
- **Open Banking** APIs for initiating payments

## Master Data Peculiarities
- Companies House number (8 digits) for registered companies
- UTR (Unique Taxpayer Reference) 10 digits
- NI Number (individual) — sensitive PII
- Address includes County (may be omitted); postcode is critical for delivery

## Statutory Reporting
- **VAT return**: quarterly (MTD API)
- **Corporate Tax (CT600)**: annual
- **PAYE** (payroll) real-time to HMRC (RTI) on or before pay date
- **P11D** expenses/benefits annual
- **Companies House annual return** (confirmation statement)

## SAP Country Version
- **CC GB** — includes:
  - UK VAT procedure, MTD integration (SAP Document & Reporting Compliance — DRC)
  - HMRC-compliant VAT return (via DRC or 3rd-party)
  - HCM-GB payroll with RTI submission
  - BACS / FPS payment file generation
  - CIS withholding

## Common Customizations
- MTD API connector if not using DRC
- CIS subcontractor verification & deduction statements
- Remittance advice / self-billing arrangements
- Open Banking payment initiation
- NI (Northern Ireland) dual-VAT handling (GB vs XI)

## Pitfalls / Anti-patterns
- Post-Brexit: treating UK as EU → ESL / INTRASTAT wrongly filed; VAT should be UK-only
- Mixing up GB and XI (NI) VAT prefixes for goods transactions
- Manual VAT return submission — not MTD-compliant
- Hardcoding sort code + account without IBAN for international payments
- Missing CIS withholding on construction payments
