# 🇯🇵 Japan

## Formats
- **Date**: `YYYY/MM/DD` or `YYYY年MM月DD日`; imperial calendar (和暦) still appears in government forms (`R6/4/1` for 令和)
- **Number / decimal**: decimal `.` / thousands `,`
- **Currency**: JPY (¥) — no decimals; display `¥1,234,567`
- **Phone**: `03-1234-5678` (Tokyo), `090-XXXX-XXXX` (mobile)
- **Postal code**: `123-4567`
- **Timezone**: JST (UTC+9), no DST

## Language & Locale
- SAP language key: `J` (JA)
- Full double-byte; mixed Kanji/Hiragana/Katakana/alphanumeric; must use Unicode
- Typical locale: `ja_JP.UTF-8`

## Tax System — Consumption Tax (消費税)
- Standard rate: **10%** (reduced 8% for food, newspapers)
- **Qualified Invoice System (適格請求書等保存方式)** effective **October 2023** — invoice issuer must be a registered "qualified invoice issuer" (適格請求書発行事業者 / 登録番号 `T + 13 digits`) for buyer to claim input VAT
- Registration number: `T` + 13-digit corporate number (法人番号)
- Filing: annual for small business, monthly/quarterly for large

## e-Invoicing / Fiscal Reporting
- **Invoice requirements (2023+)**: must show registration number, applicable tax rate per line, total tax per rate
- **Peppol JP** — Japan's digital invoice network (since 2023); adoption growing
- **電子帳簿保存法 (Electronic Bookkeeping Act)**: electronic records of transactions must be preserved digitally with integrity/searchability rules (strict from 2024-01)
- Paper invoice + e-invoice coexist

## Banking / Payments
- **Zengin** — national clearing format for domestic transfers (fixed-length text)
- **Furikomi (振込)** — standard B2B transfer
- **Bank code (4) + branch (3) + account type + account (7)** — no IBAN
- **Furikae (振替)** — direct debit
- Late payment uncommon; invoicing end-of-month / payment end-of-following-month (月末締め翌月末払い) is default

## Master Data Peculiarities
- **Corporate Number (法人番号)**: 13 digits, public; on every qualified invoice
- **My Number (個人番号)**: 12-digit personal ID — **highly sensitive PII**, storage regulated by 番号法
- Customer names in Kanji (NAME1) + Kana/Romaji (NAME2) + Furigana (searchable)
- Address goes large-to-small: 〒 (postal) → 都道府県 → 市区町村 → 番地 → building

## Statutory Reporting
- **Consumption tax return (消費税申告)** — annual or interim
- **Corporate tax (法人税)** — annual
- **Withholding (源泉徴収)** — monthly (10th of following month)
- **Year-end adjustment (年末調整)** December payroll
- **Social insurance (社会保険)**: 健康保険, 厚生年金, 雇用保険, 労災保険

## SAP Country Version
- **CC JP** — includes:
  - Qualified Invoice layout (2023+)
  - Consumption tax reporting (RFUVJP01, TAX-JP reports)
  - Withholding tax on services, rent, honoraria
  - HCM-JP payroll with 年末調整
  - Bank file formats (Zengin / ANSER)

## Common Customizations
- Qualified invoice number assignment + validation
- Zengin bank file generation (outbound) and MT940-like import
- 源泉徴収 calculation per line (sometimes per pay element)
- 印鑑 (stamp) on forms (workflow + PDF overlay)
- Imperial calendar display on legal forms

## Pitfalls / Anti-patterns
- Ignoring qualified invoice requirement post-2023-10 → buyer cannot deduct input VAT
- Storing My Number in plain text → 番号法 violation
- Single tax rate on invoice when 8%/10% mix → invoice rejected
- Not handling imperial calendar in government-facing reports
- Using Furikae when payment terms require Furikomi, or vice versa
