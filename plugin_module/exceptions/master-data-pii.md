# Customer / Vendor / BP Master PII
<!-- tier: minimal -->

Name, address, tax ID, DUNS, national ID, DOB, relationships — core master-data PII for business partners, customers, and vendors.

| Table | Description | Why |
|-------|-------------|-----|
| KNA1 | Customer master — general | Name, address, tax ID, DUNS |
| KNB1 | Customer master — company code | Tax/credit data |
| KNVK | Customer contact person | Personal contact PII |
| KNVV | Customer sales data | Linked PII |
| KNVL | Customer tax license | Tax IDs |
| LFA1 | Vendor master — general | Name, address, tax ID |
| LFB1 | Vendor master — company code | Tax data |
| LFM1 / LFM2 | Vendor purchasing data | Linked PII |
| BUT000 | Business Partner — general (S/4) | BP core PII (name, DOB, gender) |
| BUT020 | BP addresses | Linked address keys |
| BUT021 / BUT021_FS | BP address usages | Address type per BP |
| BUT050 / BUT051 | BP relationships | Personal/business relations |
| BUT100 | BP roles | Role assignments |
| BUT0ID | BP identification numbers | Passport, national ID, SSN |
| BUT0BANK | BP bank data (S/4) | BP banking credentials |

### Related Standard CDS Views

| View | Wraps | Why |
|------|-------|-----|
| I_Customer | KNA1 / KNB1 / KNVV | Customer master PII |
| I_CustomerText | KNA1 text | Customer names / descriptions |
| I_CustomerSalesArea | KNVV / KNVP | Sales-area customer PII |
| I_CustomerCompany | KNB1 | Company-code customer PII |
| I_Supplier | LFA1 / LFB1 | Vendor master PII |
| I_SupplierCompany | LFB1 | Vendor CoCode PII |
| I_SupplierPurchasingOrg | LFM1 / LFM2 | Vendor purchasing PII |
| I_BusinessPartner | BUT000 | BP core PII (name, DOB, gender) |
| I_BusinessPartnerName | BUT000 | BP names / salutation |
| I_BusinessPartnerContact | BUT050 / BUT051 | BP personal relationships |
| I_BusinessPartnerRelationship | BUT050 | BP relationships |
| I_BusinessPartnerRole | BUT100 | Role assignment per BP |
| I_BusinessPartnerTaxNumber | BUT0ID / BUT0TX | Tax IDs / national IDs |
| I_BusinessPartnerIdentification | BUT0ID | Passport / SSN / national IDs |
| I_Employee | PA0002 / HRP1000 | Employee master PII |
| I_EmployeeName | PA0002 | Employee names |
| I_WorkAgreement | PA0001 | Employment contract PII |
| I_WorkforcePerson | PA* | Workforce PII |
