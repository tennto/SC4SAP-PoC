# Banking / Payment — Customer & Vendor Financial Credentials
<!-- tier: minimal -->

Bank accounts, payment runs, cheque and card data — direct financial-credential exposure.

| Table | Description | Why |
|-------|-------------|-----|
| BNKA | Bank master data | Customer/vendor bank account credentials |
| KNBK | Customer bank details | Customer bank account numbers |
| LFBK | Vendor bank details | Vendor bank account numbers |
| BUT0BK | Business Partner bank details (S/4) | BP bank account numbers |
| T012K | House banks / bank account details | Company banking credentials |
| REGUH | Settlement data from payment program | Outgoing payment details |
| REGUP | Processed items from payment program | Payment line items |
| PAYR | Payment medium file | Cheque/payment numbers |
| FPLT | Billing plan — dates | Linked payment data |
| FPLTC | Billing plan — payment cards | Credit card tokens |
| CCARD | Payment cards (obsolete) | Credit card numbers |
| TCRCO | Credit card organizations | Card processor credentials |
| BSEGC | FI doc payment card segment | Card transaction data |
| FPAYH / FPAYHX / FPAYP / FPAYPX | Payment medium data | Payment file contents |

### Related Standard CDS Views

| View | Wraps | Why |
|------|-------|-----|
| I_BankAccount | BNKA / T012K | Bank master and house-bank accounts |
| I_Bank | BNKA | Bank master |
| I_BusinessPartnerBankDetails | BUT0BK | BP bank accounts |
| I_CustomerBankDetails | KNBK | Customer bank accounts |
| I_SupplierBankDetails | LFBK | Vendor bank accounts |
| I_HouseBankAccount | T012K | Company-code house bank |
| I_PaymentMediumMT940 | FEBKO / FEBEP | Bank statement lines |
| I_PaymentCard | CCARD / FPLTC | Payment-card tokens |
