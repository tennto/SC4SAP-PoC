# 🇨🇳 China

## Formats
- **Date**: `YYYY-MM-DD` (ISO) or `YYYY年MM月DD日`
- **Number / decimal**: decimal `.` / thousands `,`
- **Currency**: CNY / RMB (¥) — 2 decimals
- **Phone**: mobile `1XX-XXXX-XXXX` (11 digits)
- **Postal code**: 6 digits
- **Timezone**: CST (UTC+8), no DST (whole country)

## Language & Locale
- SAP language key: `1` (ZH, simplified); `M` (ZF, traditional)
- Mandatory GB18030 or UTF-8; avoid GB2312
- Typical locale: `zh_CN.UTF-8`

## Tax System — VAT (增值税)
- Standard rate: **13%** (goods), **9%** (specific), **6%** (services), zero-rated for exports
- General taxpayer (一般纳税人) vs small-scale (小规模纳税人)
- **Tax ID**: 统一社会信用代码 (Unified Social Credit Code) — 18 characters, alphanumeric
- Input VAT deduction requires **matched** special VAT invoice (增值税专用发票)

## e-Invoicing / Fiscal Reporting
- **Golden Tax System (金税)** — government-controlled VAT control. All special VAT invoices must be issued via Golden Tax-certified device/software (Aisino, Baiwang)
- **发票 (Fapiao)** types:
  - 增值税专用发票 (special VAT invoice, deductible)
  - 增值税普通发票 (general VAT invoice, non-deductible)
  - 电子发票 (e-fapiao) — rollout since 2021, mandatory in most provinces from 2023+
- **Fully digitalized e-fapiao (全电发票)** is the modern mandatory target state (2024+)
- Invoicing must match ERP line-by-line to amount/tax/buyer tax ID

## Banking / Payments
- **CNAPS** bank code for domestic transfers (12 digits)
- No IBAN; account number varies 16-19 digits
- Payment methods: bank transfer (转账), Alipay / WeChat Pay (B2C-heavy)
- Foreign exchange controls — SAFE (国家外汇管理局) approval for cross-border payments
- Corporate bank accounts are category-restricted: 基本户, 一般户, 专用户, 临时户

## Master Data Peculiarities
- **统一社会信用代码** on all customers/vendors (validate check digit)
- Customer name: Chinese legal name is primary; English is reference only
- Address format: 省 → 市 → 区/县 → 街道 → 门牌号
- Phone: `+86` country code; mobile 11 digits starting with `1`

## Statutory Reporting
- **VAT return (增值税申报)** — monthly
- **Corporate Income Tax (企业所得税)** — quarterly + annual
- **Individual Income Tax (个人所得税)** — monthly withholding
- **Social insurance (社保) + Housing fund (公积金)** — monthly

## SAP Country Version
- **CC CN** — includes:
  - Golden Tax interface (outbound invoice → GT tax device)
  - Special / general VAT invoice printouts
  - VAT reporting (RFUVCN*)
  - Withholding tax for IIT
- Most customers layer a 3rd-party Golden Tax connector (Aisino API, Baiwang, iSure) on top

## Common Customizations
- Golden Tax interface (SD billing → Aisino / Baiwang API, verify → post tax number)
- Fapiao request and verification workflow (pre-print, issue, redline/cancel)
- Chinese character address field length / sort (large-to-small)
- Bank CNAPS code lookup
- FX accounting (spot / forward / revaluation per month-end)

## Pitfalls / Anti-patterns
- Issuing invoices in ERP without Golden Tax link → non-deductible for buyer; compliance risk
- Mixing special and general VAT in same billing doc without explicit type flag
- Missing 统一社会信用代码 on customer master → Fapiao rejection
- Cross-border payment without SAFE documentation → FX failure
- Hardcoding Chinese text in programs without Unicode handling
