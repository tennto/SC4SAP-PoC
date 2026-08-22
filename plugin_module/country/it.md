# 🇮🇹 Italy

## Formats
- **Date**: `DD/MM/YYYY`
- **Number / decimal**: decimal `,` / thousands `.` (e.g., `1.234.567,89`)
- **Currency**: EUR (€)
- **Phone**: `+39 XXX XXX XXXX`
- **Postal code**: CAP 5 digits
- **Timezone**: CET/CEST

## Language & Locale
- SAP language key: `I` (IT)
- Typical locale: `it_IT.UTF-8`

## Tax System — IVA
- Standard 22%, 10%, 5%, 4% (food essentials)
- **Partita IVA** (VAT ID): `IT` + 11 digits
- **Codice Fiscale**: 16-char alphanumeric (individuals) — functions like tax ID
- **Split Payment (Scissione dei Pagamenti)** — buyer pays VAT directly to tax authority on public-sector B2G transactions
- **Esterometro** — quarterly reporting of cross-border transactions (merged with SDI from 2022)

## e-Invoicing / Fiscal Reporting
- **FatturaPA / SDI (Sistema di Interscambio)** — **mandatory** e-invoicing for **all** domestic B2B/B2G/B2C since 2019 (B2B from 2019-01)
- Strictly defined XML (FatturaPA format)
- Routed through SDI portal; invoice is legally invalid if not accepted by SDI
- Fiscal receipt / corrispettivi telematici also digitized
- Every invoice has SDI destinatario code or certified email (PEC) of recipient

## Banking / Payments
- **SEPA** (SCT/SDD)
- **IBAN**: `IT` + 25 chars
- **RIBA (Ricevuta Bancaria)** — dominant B2B collection instrument; bank-initiated on supplier's behalf
- **RID** (legacy, replaced by SDD)
- MAV / RAV (paper-based)

## Master Data Peculiarities
- Partita IVA + Codice Fiscale both often present on a company master
- **Codice Destinatario** (SDI code) — 7-char code to route invoices
- **PEC (Posta Elettronica Certificata)** — mandatory for companies, alternative routing
- Address format: Via / CAP Città (Provincia)

## Statutory Reporting
- **LIPE** — quarterly VAT summary
- **Dichiarazione IVA**: annual
- **Esterometro / Spesometro**: cross-border transactions (now through SDI)
- **CU (Certificazione Unica)** — withholding certificate, annual
- **F24** — unified tax payment form

## SAP Country Version
- **CC IT** — includes:
  - IVA tax procedure, LIPE/annual IVA reports
  - FatturaPA generation (SAP Document & Reporting Compliance — DRC)
  - Split Payment handling
  - RIBA generation (bill of exchange file)
  - Withholding tax (ritenuta d'acconto)

## Common Customizations
- FatturaPA XML with all custom fields (CIG, CUP for public contracts)
- RIBA file generation and bank dialog
- PEC integration for invoice delivery + legal archiving
- Progressive invoice numbering per fiscal year (strict rules — gap detection)
- Withholding on services (ritenuta d'acconto, 20% typical)

## Pitfalls / Anti-patterns
- Invoice gaps / out-of-sequence numbering — fiscal violation (numero progressivo)
- Missing Codice Destinatario or PEC → SDI rejects
- Not applying Split Payment on B2G → VAT paid to wrong party
- FatturaPA field mismatches (address, tax types) → SDI rejection ("errore di controllo")
- Forgetting ritenuta d'acconto on freelancer invoices
