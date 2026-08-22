# 🇫🇷 France

## Formats
- **Date**: `DD/MM/YYYY`
- **Number / decimal**: decimal `,` / thousands ` ` (space) or `.` (e.g., `1 234 567,89`)
- **Currency**: EUR (€) — 2 decimals
- **Phone**: `+33 X XX XX XX XX`
- **Postal code**: 5 digits
- **Timezone**: CET/CEST

## Language & Locale
- SAP language key: `F` (FR)
- UTF-8; accents (é/è/ç/à)
- Typical locale: `fr_FR.UTF-8`

## Tax System — TVA
- Standard 20%, intermediate 10%, reduced 5.5%, super-reduced 2.1%
- **Numéro TVA intracommunautaire**: `FR` + 2 check digits + SIREN (9) = 13 chars total
- Reverse charge for intra-EU; SEPA for payments

## e-Invoicing / Fiscal Reporting
- **FEC (Fichier des Écritures Comptables)** — mandatory annual accounting data export in standardized format for tax audit
- **B2B e-invoicing mandate**:
  - Reception obligation **September 2026** for all businesses
  - Issuance obligation phased: large firms **Sept 2026**, medium/small by 2027
  - Via PDPs (Plateformes de Dématérialisation Partenaires) + central PPF directory
  - Format: Factur-X (hybrid PDF-A/3 + XML), UBL, or CII
- **DEB / DES** — deklaration for intra-EU trade

## Banking / Payments
- **SEPA** (SCT / SDD)
- **IBAN**: `FR` + 25 chars
- **RIB**: Relevé d'Identité Bancaire (legacy info) — Bank code (5) + Branch (5) + Account (11) + RIB key (2)
- **LCR** — Lettre de Change Relevé (commercial bill, still used B2B)

## Master Data Peculiarities
- **SIREN** (9 digits) — unique business identifier
- **SIRET** (14 digits) — SIREN + establishment (5)
- **APE / NAF code** — industry classification
- Address format: Rue / CP Ville / France
- Legal forms: SA, SARL, SAS, SASU, SCI, EURL …

## Statutory Reporting
- **TVA (CA3)**: monthly/quarterly
- **DEB/DES**: monthly intra-EU movements
- **FEC**: annual, in case of audit — must deliver instantly
- **Liasse fiscale**: annual corporate tax pack
- **URSSAF**: monthly social contributions
- **DSN** (Déclaration Sociale Nominative) — monthly payroll submission

## SAP Country Version
- **CC FR** — includes:
  - TVA tax procedure, CA3 extract
  - FEC extract (RFUMSV00 family + French specific)
  - Factur-X e-invoicing (SAP DRC or 3rd-party) for 2026+
  - HCM-FR / DSN payroll
  - LCR / BOR (bordereau) payment media

## Common Customizations
- FEC generator with FR-specific field order + dates
- Factur-X PDF+XML generation
- LCR management (acceptance, discount, maturity)
- DSN file (very complex, most use SAP HR or Sage add-on)
- SIRET/SIREN validation

## Pitfalls / Anti-patterns
- Document date format — French `31/12/2025` misread as MM/DD
- Decimal comma in CSV exports breaks downstream tools expecting `.`
- Skipping FEC — immediate audit penalty
- Not preparing for 2026 mandate (reception) — cannot accept supplier e-invoices
- Mixing SIREN/SIRET in vendor master
