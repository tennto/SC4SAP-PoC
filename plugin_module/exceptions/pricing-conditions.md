# Pricing / Conditions / Rebates
<!-- tier: minimal -->

Pricing data is **top-tier commercial risk**. Leakage exposes customer-specific discounts, margin structure, rebate agreements, and negotiated list prices — directly usable as competitive intelligence and as leverage in future negotiations. Default posture: **deny** at `minimal` tier (always enforced).

| Table | Description | Why |
|-------|-------------|-----|
| KONH | Conditions header (master) | Condition keys linking to item data |
| KONP | Conditions item (master) | **Actual prices / discounts / surcharges per condition record** |
| KONM | Conditions — quantity scales | Tiered pricing detail |
| KONW | Conditions — value scales | Value-based scales |
| KONA | Rebate agreements | **Customer-specific rebate %/rates** |
| KOTE* | Rebate condition tables | Rebate access paths with rates |
| KONV | Conditions — transaction data (ECC) | Per-document prices incl. negotiated margin (huge) |
| PRCD_ELEMENT | Pricing conditions (S/4 simplified — replaces KONV on S/4 sales docs) | Same sensitivity as KONV |
| PRCD_ELEMENTS | Legacy name of PRCD_ELEMENT | Same |
| PRCD_COND_HEAD | S/4 condition header (new pricing) | Header of pricing record |
| PRCD_COND | S/4 condition item (new pricing) | Item prices |
| A### | Condition access (dynamic tables A001–A999) | Price lookup records — **contains actual rates** (wildcard: `#` = single digit) |
| KONPR | Promotion conditions (Retail / IS-Retail) | Retail promotion pricing |
| KONDD | Bonus buy conditions (Retail) | Promotional bundle pricing |
| KONPAE | Archived conditions | Historical prices |

### Related Standard CDS Views

| View | Wraps | Why |
|------|-------|-----|
| I_PriceCondition | KONP / PRCD_ELEMENT | Condition records with rates |
| I_PricingProcedure | T683 + KONP | Procedure + rates |
| I_SalesPricingCondition | PRCD_ELEMENT | Sales-document pricing |
| I_PurchasingPricingCondition | PRCD_ELEMENT | Purchasing pricing |
| I_RebateAgreement | KONA | Rebate agreements |
| I_RebateCondition | KOTE* | Rebate access records |
| I_SalesContractPrice | VBKD / PRCD_ELEMENT | Contracted customer prices |
| I_PurchaseContractPrice | EKPO / PRCD_ELEMENT | Contracted vendor prices |
| I_SalesOrderItemPrice | VBAP + PRCD_ELEMENT | Per-line sales prices |
| I_BillingDocItemPrice | VBRP + PRCD_ELEMENT | Billed per-line prices |

> Permitted alternatives: `GetTable` for schema; `GetSqlQuery` with `COUNT(*)` aggregates only (no rate columns in SELECT); anonymized/synthetic pricing data for testing. Never extract `KBETR`, `KWERT`, `KPEIN`, `KMEIN`, or any rate/amount column from these tables in raw form.
