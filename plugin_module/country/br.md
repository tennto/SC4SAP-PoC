# 🇧🇷 Brazil

## Formats
- **Date**: `DD/MM/YYYY`
- **Number / decimal**: decimal `,` / thousands `.` (e.g., `1.234.567,89`)
- **Currency**: BRL (R$)
- **Phone**: `+55 XX XXXXX-XXXX` (mobile 11 digits incl. 9 prefix)
- **Postal code**: CEP `XXXXX-XXX`
- **Timezone**: BRT (UTC-3), DST abolished nationwide since 2019

## Language & Locale
- SAP language key: `P` (PT)
- Typical locale: `pt_BR.UTF-8`

## Tax System — extremely complex
Multiple overlapping federal/state/municipal taxes:
- **ICMS** — state VAT (goods), rates vary per state and product (interstate rates different)
- **IPI** — federal excise (manufactured goods)
- **PIS / COFINS** — federal contributions (cumulative or non-cumulative regime)
- **ISS / ISSQN** — municipal service tax
- **II / IE** — import / export duty
- **CFOP** — 4-digit operation code identifying every inbound/outbound transaction
- **CST** / **CSOSN** — tax situation codes per item per tax
- **NCM** — harmonized system code for goods
- **CNAE** — business activity code

## e-Invoicing / Fiscal Reporting
- **NF-e (Nota Fiscal Eletrônica)** — mandatory for all goods invoices; SEFAZ authorizes before shipment
- **NFS-e** — municipal service invoice (format varies by city!)
- **CT-e** — transport invoice
- **MDF-e** — freight manifest
- **SPED** (Sistema Público de Escrituração Digital):
  - **SPED Fiscal** (EFD ICMS/IPI) — monthly
  - **SPED Contribuições** (EFD Contribuições) — monthly
  - **SPED Contábil (ECD)** — annual
  - **ECF (Escrituração Contábil Fiscal)** — annual
- **DCTFWeb / EFD-Reinf** — social, withholding, labor
- **REINF**: withholding, retentions

## Banking / Payments
- **Boleto bancário** — dominant B2C/B2B collection instrument (bank slip with barcode)
- **PIX** — instant payment, mandatory for banks, rapidly dominating
- **TED** (same-day), **DOC** (legacy)
- No IBAN; Brazil uses Bank (3) + Branch (4) + Account number

## Master Data Peculiarities
- **CNPJ** (legal entity) — 14 digits `XX.XXX.XXX/XXXX-XX`
- **CPF** (individual) — 11 digits `XXX.XXX.XXX-XX` — sensitive PII (LGPD)
- **IE / IM** — state / municipal registration numbers (per establishment!)
- Customer often has multiple IEs (one per state of operation)
- Address: Rua / Número / Bairro / CEP / Cidade / UF (state)

## Statutory Reporting
- **SPED Fiscal**: monthly state/federal
- **SPED Contribuições**: monthly PIS/COFINS
- **DCTFWeb**: monthly
- **GFIP/eSocial**: labor / FGTS / INSS monthly
- **DIRF**: annual withholding return

## SAP Country Version
- **CC BR** — largest localization footprint:
  - **J1B*** transactions / **CBT (Condition-Based Tax calculation)**
  - NF-e integration (outbound SEFAZ with XML sign + authorize)
  - SPED extracts (complex — typically 3rd-party: Synchro, Mastersaf, Thomson Reuters ONESOURCE for LATAM)
  - ICMS/IPI/PIS/COFINS tax procedure (very complex condition matrix)
  - HCM-BR for payroll / eSocial
- Almost every Brazilian SAP rollout uses 3rd-party tax add-on for determination

## Common Customizations
- 3rd-party tax engine (Synchro, Mastersaf, Sovos, Invoiceware/Sovos LATAM) — replaces SAP default
- Boleto generation and bank return file processing
- PIX integration (API + QR code)
- NFS-e municipal format per city (hundreds of formats!)
- Custom fields for CFOP determination, retention rules

## Pitfalls / Anti-patterns
- Using only SAP standard tax for ICMS interstate → rates/rules change per state; need 3rd-party
- Missing CFOP on goods movement → SPED fails
- Wrong CST/CSOSN combo → NF-e rejection
- Per-municipality NFS-e not handled (cada prefeitura has own format)
- Confusing CNPJ/CPF validation (both have check digits)
- LGPD (Brazil GDPR) — CPF in plain text is a data incident
