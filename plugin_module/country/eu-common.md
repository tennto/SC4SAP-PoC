# 🇪🇺 European Union — Cross-Country Common Rules

Use together with country-specific files (`de.md`, `fr.md`, `it.md`, `es.md`, `nl.md`, `gb.md` for UK pre-Brexit context, etc.) when dealing with intra-EU transactions or EU-wide harmonized rules.

## VAT ID Format (EU-wide)

Country prefix + national format. Validate with **VIES (VAT Information Exchange System)**.

| Country | Prefix | Format (after prefix) |
|---------|--------|------------------------|
| Austria | AT | U + 8 digits |
| Belgium | BE | 10 digits (starts with 0 or 1) |
| Bulgaria | BG | 9 or 10 digits |
| Croatia | HR | 11 digits (OIB) |
| Cyprus | CY | 8 digits + 1 letter |
| Czechia | CZ | 8/9/10 digits |
| Denmark | DK | 8 digits |
| Estonia | EE | 9 digits |
| Finland | FI | 8 digits |
| France | FR | 2 chars + 9 digits |
| Germany | DE | 9 digits |
| Greece | EL (not GR) | 9 digits |
| Hungary | HU | 8 digits |
| Ireland | IE | 8-9 chars alphanumeric |
| Italy | IT | 11 digits |
| Latvia | LV | 11 digits |
| Lithuania | LT | 9 or 12 digits |
| Luxembourg | LU | 8 digits |
| Malta | MT | 8 digits |
| Netherlands | NL | 9 digits + B + 2 digits |
| Poland | PL | 10 digits |
| Portugal | PT | 9 digits |
| Romania | RO | 2-10 digits |
| Slovakia | SK | 10 digits |
| Slovenia | SI | 8 digits |
| Spain | ES | letter/digit + 7 digits + letter/digit |
| Sweden | SE | 12 digits (ends with `01`) |
| Northern Ireland | XI | follows UK VAT format (post-Brexit carve-out for goods) |

**Never** store just digits — prefix is part of the ID. Run VIES check for intra-EU reverse-charge eligibility.

## Intra-EU Transactions

### Reverse Charge (Supply of Services B2B)
- Supplier issues invoice **without VAT**, with note `Reverse charge – Article 196 VAT Directive` (or national equivalent)
- Both VAT IDs must be valid and VIES-verified at time of supply
- Recipient self-assesses VAT (input + output neutral)

### Zero-Rated Intra-EU Supply of Goods
- Goods cross EU border, both parties VAT-registered → 0% with supporting evidence (CMR, packing list, proof of arrival)
- Recipient self-assesses acquisition VAT

## EC Sales List (ESL / VIES)
- Listing of all intra-EU sales of goods + services per partner VAT ID per period
- Filing frequency varies (DE monthly/quarterly, FR monthly, IT quarterly, …)
- Name differs: DE Zusammenfassende Meldung, FR DES, IT Esterometro (merged), ES Modelo 349, NL ICP

## INTRASTAT
- Statistical reporting of physical goods movement between EU states
- **Arrival** (inbound) and **Dispatch** (outbound) threshold-triggered per country
- Monthly; detailed goods classification (CN code 8-digit), mass, value, Incoterms, country of origin

## OSS / IOSS (distance sales)
- **OSS (One-Stop-Shop)**: B2C intra-EU distance sales of goods and services — single return per quarter, taxed in destination country (>€10,000 threshold)
- **IOSS (Import One-Stop-Shop)**: B2C imports ≤ €150 — single return
- Replaces MOSS (which was digital services only)

## SEPA (Single Euro Payments Area)
- 36 countries (EU27 + UK + CH + NO + IS + LI + …)
- **SCT** (Credit Transfer), **SDD** (Direct Debit Core/B2B), **SCT Inst** (Instant Credit Transfer)
- XML ISO 20022: **pain.001** (credit transfer), **pain.008** (direct debit)
- **Mandate Management** for SDD (unique mandate ID, sequence type FRST/RCUR/FNAL/OOFF)
- **End-to-End ID**, **Instruction ID**, **Creditor/Debtor Agent BIC**, **Remittance Info**

## GDPR / Data Protection
- EU-wide Regulation since 2018 — applies to any entity processing EU residents' data
- **Lawful basis required** (consent, contract, legal obligation, legitimate interest, vital interest, public interest)
- Subject rights: access, rectification, erasure ("right to be forgotten"), portability, objection
- Data breach notification within 72 hours
- **ILM (Information Lifecycle Management)** or SAP's Data Protection Workbench for retention / blocking / deletion
- PII in SAP: BUT000, ADRC, PA*, HRP*, and any Z-table with personal data

## Common Customizations (cross-country)
- EU VAT validation (format + VIES API)
- INTRASTAT extract with country-specific variants
- ESL/VIES report (country-specific formats: DE ZM-XML, FR DES, IT Esterometro)
- SEPA XML (pain.001 / pain.008) with country-specific quirks (DE: BankToCustomer, FR: banque tiers)
- GDPR deletion workflow (mark BP for deletion / blocking / purge)
- Multi-currency and multi-language layouts

## Pitfalls / Anti-patterns
- Treating UK (GB) as EU post-Brexit — UK left VAT system (but XI for NI goods stays)
- Missing ESL / INTRASTAT for intra-EU trade above threshold
- VIES not checked per transaction → reverse charge invalid → VAT liability shift back to supplier
- SEPA mandate not unique / missing sequence type → SDD R-messages (rejections)
- GDPR: storing BP data without lawful basis or retention plan
