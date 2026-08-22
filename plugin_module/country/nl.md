# 🇳🇱 Netherlands

## Formats
- **Date**: `DD-MM-YYYY`
- **Number / decimal**: decimal `,` / thousands `.` (like DE) — sometimes `'` per legacy
- **Currency**: EUR (€)
- **Phone**: `+31 XX XXX XXXX`
- **Postal code**: `1234 AB` (4 digits + space + 2 letters)
- **Timezone**: CET/CEST

## Language & Locale
- SAP language key: `N` (NL); English widely used in business
- Typical locale: `nl_NL.UTF-8`

## Tax System — BTW
- Standard 21%, reduced 9%, 0%
- **BTW nummer**: `NL` + 9 digits + `B` + 2 digits (new format post-2020 uses Omzetbelastingnummer for sole traders, separate from legal number)
- KvK (Kamer van Koophandel / Chamber of Commerce) number — 8 digits

## e-Invoicing / Fiscal Reporting
- **B2G mandatory** via Peppol (UBL) since 2017
- B2B voluntary but Peppol adoption high
- **XAF (XML Auditfile Financieel)** — standardized audit file on request from Belastingdienst
- **Standard Audit File Tax (SAF-T)** adoption via EU initiative

## Banking / Payments
- **SEPA** dominant
- **IBAN**: `NL` + 16 chars
- **iDEAL** for B2C online payments
- Dutch domestic historically very fast; SEPA Instant common

## Master Data Peculiarities
- KvK number on all legal entities
- BSN (Burgerservicenummer, 9 digits) — national personal ID (sensitive)
- Address: Street Number / PostalCode City

## Statutory Reporting
- **BTW-aangifte**: quarterly (large: monthly)
- **ICP-opgave** (EC Sales List): intra-EU
- **XAF**: ad-hoc upon Belastingdienst request
- **Loonaangifte**: monthly payroll submission

## SAP Country Version
- **CC NL** — includes:
  - BTW tax procedure, BTW-aangifte extract
  - ICP intra-EU reporting
  - XAF extract (auditfile)
  - HCM-NL (Loonaangifte, pension funds)
  - Peppol UBL invoice outbound (DRC)

## Common Customizations
- Peppol UBL outbound via access point (AP) integration
- XAF generator with enrichment (cost centers, project codes)
- G-rekening (blocked account) for labour subcontracting
- Tax retention (loonheffing) for payroll

## Pitfalls / Anti-patterns
- Omitting postal code space format (`1234AB` vs `1234 AB`) — PTT rejection
- BSN in customer master without justification → AVG (GDPR) violation
- Skipping G-rekening on labour-intensive subcontract payments
- B2G without Peppol UBL → government reject
