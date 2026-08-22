# 🇸🇬 Singapore

## Formats
- **Date**: `DD/MM/YYYY` (business), `YYYY-MM-DD` (IT)
- **Number / decimal**: decimal `.` / thousands `,` (like US)
- **Currency**: SGD (S$) — 2 decimals
- **Phone**: `+65 XXXX XXXX`
- **Postal code**: 6 digits
- **Timezone**: SGT (UTC+8), no DST

## Language & Locale
- SAP language key: `E` (EN) primary; CN/MY/TA also official
- Typical locale: `en_SG.UTF-8`

## Tax System — GST
- GST: **9%** (since 2024-01-01; was 8% in 2023, 7% before 2023)
- Zero-rated (exports), exempt (financial services, residential property, digital payment tokens)
- **GST registration threshold**: S$1M turnover
- **UEN** (Unique Entity Number) — business identifier, typically 9-10 chars

## e-Invoicing / Fiscal Reporting
- **InvoiceNow** — Peppol-based e-invoice network (Singapore is Peppol Authority)
- Mandatory for GST-registered newly incorporated businesses (2025 rollout), broader mandate 2026
- IRAS — tax authority
- **FATCA / CRS** reporting for financial accounts
- **Bizfile / ACRA** — company filings

## Banking / Payments
- **FAST** — domestic instant transfer
- **GIRO** — batch direct-debit for bills / salary
- **PayNow** — instant via mobile/UEN
- **MEPS** — high-value real-time gross settlement
- SWIFT for international
- No IBAN; bank code + branch + account

## Master Data Peculiarities
- UEN on every business record
- NRIC / FIN — individual ID (NRIC citizens/PRs, FIN foreigners) — **sensitive PII, regulated under PDPA**
- Address: Block/Street/Level/Unit/Postcode Singapore

## Statutory Reporting
- **GST F5**: quarterly (monthly if big)
- **Corporate Tax (Form C/C-S)**: annual
- **CPF** (Central Provident Fund): monthly contribution submission
- **IR8A / IR21** (employee income / leaving): annual / event
- **FATCA/CRS**: annual

## SAP Country Version
- **CC SG** — modest localization (SG built on MY/ASEAN templates typically):
  - GST tax procedure (standard-rated, zero-rated, exempt)
  - IRAS audit file (IAF / GAF) extract
  - HCM-SG CPF, IR8A, IR21
- Peppol InvoiceNow via SAP DRC or 3rd-party (Storecove, Pagero)

## Common Customizations
- UEN validation / lookup against ACRA
- PayNow corporate QR generation (receivables)
- GIRO file generation (MAS GIRO formats)
- IAF/GAF (IRAS Audit File / GST Audit File) extract
- NRIC masking / encryption

## Pitfalls / Anti-patterns
- Using pre-2024 8% or pre-2023 7% GST codes after rate change
- Storing NRIC without PDPA basis or masking
- Forgetting CPF ceilings / percentage tiers by age
- Missing IR8A submission for employees (annual by March)
- No bilingual invoice where required by buyer
