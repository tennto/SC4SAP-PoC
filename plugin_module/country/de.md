# 🇩🇪 Germany

## Formats
- **Date**: `DD.MM.YYYY` (e.g., `15.04.2026`)
- **Number / decimal**: decimal `,` / thousands `.` (e.g., `1.234.567,89`) — **opposite of US**
- **Currency**: EUR (€) — 2 decimals
- **Phone**: `+49 (0) XXX-XXXXXXX` (variable length per city)
- **Postal code**: 5 digits (PLZ)
- **Timezone**: CET (UTC+1), DST observed

## Language & Locale
- SAP language key: `D` (DE)
- UTF-8; umlaut-safe (ä/ö/ü/ß)
- Typical locale: `de_DE.UTF-8`

## Tax System — USt (Umsatzsteuer / VAT)
- Standard 19%, reduced 7% (food, books, some services)
- **USt-IdNr. (VAT ID)**: `DE` + 9 digits — verify with EU VIES for intra-EU B2B
- Small business (Kleinunternehmer §19 UStG) — no VAT charged, no input VAT deduction
- Intra-EU: reverse charge + EC Sales List (Zusammenfassende Meldung)

## e-Invoicing / Fiscal Reporting
- **E-Rechnung** for B2G (public sector) since 2020 — XRechnung or ZUGFeRD 2+ XML formats mandatory
- **B2B e-invoicing phase-in 2025→2028**: from 2025-01-01 businesses must be able to **receive** structured e-invoices; from 2028 **issue** is mandatory for all B2B
- **ELSTER** — electronic tax filing (Finanzamt)
- **DATEV** — dominant tax-advisor / accounting exchange format; many SMBs export to DATEV

## Banking / Payments
- **SEPA** (Credit Transfer SCT, Direct Debit SDD) — EUR, EU-wide XML ISO 20022 (pain.001 / pain.008)
- **IBAN**: `DE` + 20 digits (2 check + BLZ 8 + account 10)
- **BIC/SWIFT**: 8 or 11 characters
- **BLZ** (Bankleitzahl) 8 digits — legacy but still present in data

## Master Data Peculiarities
- **Handelsregister** number (HRB/HRA + court) — company register entry
- **Steuernummer** (tax number — domestic, vs USt-IdNr.)
- Address: Straße Hausnummer / PLZ Ort / Land
- Legal forms: GmbH, AG, KG, OHG, UG, e.K. — suffix matters for contracts

## Statutory Reporting
- **USt-Voranmeldung**: monthly/quarterly pre-return via ELSTER (by 10th of following month)
- **USt-Jahreserklärung**: annual VAT return
- **ZM (EC Sales List)**: monthly/quarterly for intra-EU supplies
- **INTRASTAT**: monthly for physical intra-EU trade thresholds
- **Corporate tax (KSt)**: annual
- **Payroll**: monthly to Finanzamt + statutory insurance funds (Krankenkasse, BG, Rentenversicherung)

## SAP Country Version
- **CC DE** — includes:
  - USt tax procedure (TAXD)
  - ELSTER-compliant VAT filing reports
  - DATEV export (RFBELA00 / SD_DATEV / PwC tools)
  - E-Rechnung outbound (XRechnung / ZUGFeRD) — via SAP Document & Reporting Compliance (DRC) or 3rd-party
  - HCM-DE payroll (complex: SV-Meldung, Lohnsteueranmeldung)

## Common Customizations
- DATEV export (accounts + transactions + documents)
- ZUGFeRD / XRechnung PDF-XML hybrid invoice generation
- SEPA XML generation (national variants DE, AT, CH, …)
- GoBD-compliant archiving (Grundsätze zu Buchführung und Daten) — immutable storage + search
- Kreditorenworkflow (invoice approval) — German heavy on 4-eye principle

## Pitfalls / Anti-patterns
- US-style number formatting (`1,234.56`) in German reports — recipients interpret as 1234.56 vs 1.234,56
- Missing reverse-charge handling on intra-EU B2B → tax incorrectly posted
- E-invoice not compliant with XRechnung/ZUGFeRD → B2G rejection
- GoBD violations: editable accounting PDFs / no timestamp / gaps in document numbering
- Using old BLZ+account on recent masters instead of IBAN (SEPA requires IBAN)
- Mis-applying Kleinunternehmer rules to VAT-liable transactions
