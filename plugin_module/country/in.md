# 🇮🇳 India

## Formats
- **Date**: `DD-MM-YYYY` or `DD/MM/YYYY`
- **Number / decimal**: decimal `.` / thousands `,` but **Indian grouping** `12,34,567.89` (lakh/crore)
- **Currency**: INR (₹) — 2 decimals
- **Phone**: `+91 XXXXX-XXXXX` (mobile 10 digits)
- **Postal code**: PIN 6 digits
- **Timezone**: IST (UTC+5:30), no DST

## Language & Locale
- SAP language key: `E` (EN) primary; Hindi (`HI`) and 20+ regional available
- Typical locale: `en_IN.UTF-8`

## Tax System — GST (Goods and Services Tax, 2017+)
- **CGST** (central), **SGST/UTGST** (state/UT) for intra-state
- **IGST** for inter-state and imports
- Rates: 0%, 5%, 12%, 18%, 28% (+ cess on luxury/sin goods)
- **GSTIN** — 15-char `SSPPPPPPPPPPPPZC` (2 state + 10 PAN + 1 entity + Z + 1 check)
- **HSN code** for goods (4-8 digits), **SAC code** for services

## e-Invoicing / Fiscal Reporting
- **IRN (Invoice Reference Number)** — mandatory e-invoicing via IRP (Invoice Registration Portal); extended to all businesses with turnover ≥ ₹5 crore since 2023
- IRP returns IRN + QR code; must be on printed invoice
- **GSTR filings** (automated from e-invoice + sales data):
  - GSTR-1 (outward) — monthly/quarterly
  - GSTR-3B (summary + tax payment) — monthly
  - GSTR-2B (auto-populated inward) — monthly
  - GSTR-9 (annual reconciliation), GSTR-9C (audit) if applicable
- **e-Way Bill** — mandatory for movement of goods > ₹50,000 (generated via EWB portal)
- **TDS** (Tax Deducted at Source), **TCS** (Tax Collected at Source) — monthly challan + quarterly return

## Banking / Payments
- **NEFT / RTGS / IMPS / UPI** — domestic transfers (UPI for B2C dominant)
- **IFSC** — 11-char bank branch code (mandatory for transfer)
- **Account number**: variable length (9-18)
- No IBAN

## Master Data Peculiarities
- **PAN** (Permanent Account Number): 10-char alphanumeric; required for businesses and individuals; **PII**
- **GSTIN per state** — a legal entity with operations in multiple states has multiple GSTINs
- **State Code** (first 2 digits of GSTIN) — critical for IGST vs CGST+SGST determination
- **Place of Supply** rules complex — intra- vs inter-state based on POS, not just addresses
- TAN (Tax deduction Account Number) 10-char for TDS

## Statutory Reporting
- **GSTR-1**: monthly (turnover > ₹5 cr) or quarterly
- **GSTR-3B**: monthly
- **TDS return (26Q/27Q/24Q)**: quarterly
- **Form 16/16A**: annual TDS certificates
- **Income Tax return**: annual (by July for companies audited)
- **MCA (Ministry of Corporate Affairs)** — annual filings

## SAP Country Version
- **CC IN** — includes:
  - GST tax procedure (condition-based)
  - e-invoicing via SAP DRC or ASP/GSP (ClearTax, Avalara, IRIS, Taxilla)
  - e-Way Bill integration
  - TDS/TCS configuration
  - HCM-IN payroll (PF, ESI, Professional Tax, Form 16)
- IDoc & BAPI layer for GSP/ASP connection

## Common Customizations
- GSTIN validation + master-data check
- e-invoice / IRN integration per state / per business unit
- e-Way Bill generation on delivery / STO
- TDS determination by section (194C, 194J, 194I, 194Q…) and threshold
- HSN/SAC mapping at material / service master
- Lakh/crore formatting in reports

## Pitfalls / Anti-patterns
- Hardcoding Western number grouping (1,234,567) for Indian reports — stakeholders expect lakhs (12,34,567)
- Missing GSTIN → IRN cannot be generated
- Wrong state code on invoice → IGST vs CGST+SGST mismatch → ITC (input tax credit) blocked for buyer
- Not generating e-Way Bill for goods >₹50,000 movement → truck detention risk
- TDS deducted at wrong section / rate → notices from Income Tax Dept
- Cross-GSTIN postings within same legal entity treated as single entity
