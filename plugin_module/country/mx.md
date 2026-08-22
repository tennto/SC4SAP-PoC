# 🇲🇽 Mexico

## Formats
- **Date**: `DD/MM/YYYY` or `YYYY-MM-DD`
- **Number / decimal**: decimal `.` / thousands `,` (like US)
- **Currency**: MXN ($) — 2 decimals
- **Phone**: `+52 XX XXXX XXXX`
- **Postal code**: 5 digits
- **Timezone**: CST/CDT (varies; DST used)

## Language & Locale
- SAP language key: `S` (ES — same key as Spain; distinguish via country)
- Typical locale: `es_MX.UTF-8`

## Tax System
- **IVA**: 16% standard, 0% border region and specific goods
- **IEPS** — excise (fuel, alcohol, tobacco, sugary drinks)
- **ISR** (Impuesto Sobre la Renta) — income tax, withholding common
- **RFC** (Registro Federal de Contribuyentes):
  - Legal: 12 chars `XXX######XXX`
  - Individual: 13 chars
- **CURP** — unique personal ID 18 chars (individuals, PII)

## e-Invoicing / Fiscal Reporting — CFDI
- **CFDI (Comprobante Fiscal Digital por Internet)** version **4.0** (mandatory since 2023)
- All invoices, receipts, payroll, cancellations — digital XML certified by PAC (Proveedor Autorizado de Certificación) and stamped by SAT
- **Complementos**: extensions per use case (Pagos 2.0, Nómina, Comercio Exterior, Carta Porte 3.0, INE, Leyendas Fiscales, etc.)
- **SAT** (Servicio de Administración Tributaria) is the tax authority
- **Electronic accounting (contabilidad electrónica)** — monthly XML upload (chart of accounts, trial balance, journal entries on request)
- **DIOT** — monthly 3rd-party transactions declaration
- **Carta Porte 3.0** — mandatory for goods transport (since 2024)

## Banking / Payments
- **SPEI** — domestic transfer (fast)
- **CLABE** — 18-digit domestic bank account number (always used)
- No IBAN
- **Cheque** still used but declining
- Foreign currency operations common near border

## Master Data Peculiarities
- RFC on every customer/vendor
- **Uso del CFDI** (usage code) required per invoice: G01, G03, P01, S01, D01, …
- **Régimen fiscal** per taxpayer (601, 603, 606, 612, 621, 626, RESICO…)
- Address: Calle / Número Ext / Int / Colonia / CP / Municipio / Estado

## Statutory Reporting
- **IVA**: monthly (DIOT + tax return via SAT portal)
- **ISR**: monthly provisional + annual
- **Nómina CFDI**: each payroll run per employee
- **Buzón Tributario**: electronic mailbox from SAT (mandatory to check)
- **DPIVA**: annual

## SAP Country Version
- **CC MX** — includes:
  - Mexican tax procedure, IVA/IEPS/ISR handling
  - CFDI 4.0 generation (SAP DRC or PAC integration: EDICOM, Pegaso, Interfactura, ECO-Mexico)
  - Nómina CFDI (HCM-MX)
  - DIOT, Electronic Accounting extracts (catálogo cuentas, balanza comprobación, pólizas)

## Common Customizations
- PAC integration (CFDI stamping via SOAP/REST to PAC API)
- Carta Porte complemento for distribution/logistics
- Complemento de Pago (CFDI of payments) — separate XML per payment
- Cancellation workflow (requires counterparty approval for certain amounts)
- SAT 69-B / blacklisted taxpayer validation

## Pitfalls / Anti-patterns
- Cancelling CFDI without counterparty approval → SAT fine
- Missing Complemento Pago on payments → buyer cannot deduct
- Wrong Uso del CFDI / Régimen combination → SAT rejection
- Not validating Buzón Tributario messages → miss tax notices
- Carta Porte omission for B2B transport → customs/audit risk
- Relying on SAP standard tax for IEPS without extensions
