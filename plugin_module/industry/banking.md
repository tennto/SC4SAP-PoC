# Banking / Financial Services

## Business Characteristics
- Highest regulatory intensity (BIS, IFRS 9, Basel III, local IFRS variants)
- Very high transaction volume, real-time requirements, 24/7 operations
- Product-centric accounting (deposits / loans / cards / investments)
- Critical risk management (credit / market / operational risk)
- Strict data protection (GDPR and local equivalents)

## Key Processes
- **Core banking integration** (SAP typically complements a core banking system)
- **Financial accounting**: parallel ledger (local IFRS + regulatory reporting)
- **Treasury**: cash / liquidity, hedge accounting
- **Expense management**, procurement
- **HR / payroll**

## Module Implications
- **FS-CD (Collections & Disbursements)**: banking-specific AR/AP
- **FS-BP (Banking Business Partner)**
- **TRM (Treasury and Risk Management)**
- **FI-AA**: branch / equipment asset management
- **HCM**

## SAP Industry Solutions
- **SAP for Banking**
- **S/4HANA for Financial Services**
- **SAP Deposits Management, Loans Management, Collateral Management**

## Pitfalls / Anti-patterns
- Trying to handle banking volume with standard FI instead of FS-CD / FS-BP → performance collapse
- Missing parallel ledger configuration → cannot separate regulatory vs local IFRS reporting
- No PII masking → regulatory violations
