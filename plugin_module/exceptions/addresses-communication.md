# Addresses / Communication
<!-- tier: minimal -->

Central Address Management tables (ADR*) — home/work addresses, phone, fax, email, URLs. All PII.

| Table | Description | Why |
|-------|-------------|-----|
| ADRC | Address master | Street, city, postal — PII |
| ADRP | Person master | Personal name, title, DOB |
| ADR2 | Telephone numbers | Phone PII |
| ADR3 | Fax numbers | Contact PII |
| ADR6 | Email addresses | Email PII |
| ADR7 | Teletex numbers | Contact PII |
| ADR9 | Communication types (misc) | Contact PII |
| ADR11 | Print data | Contact info |
| ADR12 | URLs (WWW) | Personal websites |
| ADR13 | Pager numbers | Contact PII |
| ADRT | Communication data — text | Free-text comm notes |
| ADRCT | Address text (notes) | Free-text PII |

### Related Standard CDS Views

| View | Wraps | Why |
|------|-------|-----|
| I_Address | ADRC | Full address |
| I_AddressEmailAddress | ADR6 | Email PII |
| I_AddressPhoneNumber | ADR2 | Phone PII |
| I_AddressFaxNumber | ADR3 | Fax PII |
| I_AddressWebAddress | ADR12 | URLs |
| I_BusinessPartnerAddress | BUT020 + ADRC | BP address |
| I_BusinessPartnerEmailAddress | BUT020 + ADR6 | BP email |
| I_BusinessPartnerPhoneNumber | BUT020 + ADR2 | BP phone |
| I_PersonName | ADRP | Person name / title / DOB |
