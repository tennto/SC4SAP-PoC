# 🇰🇷 Korea

## Formats
- **Date**: `YYYY.MM.DD` (official), `YYYY-MM-DD` (IT), `YYYY년 MM월 DD일` (formal)
- **Number / decimal**: decimal `.` / thousands `,` (e.g., `1,234,567.89`)
- **Currency**: KRW (원) — no decimals typically; display as `1,234,567원` or `₩1,234,567`
- **Phone**: `02-1234-5678` (Seoul), `010-XXXX-XXXX` (mobile)
- **Postal code**: 5 digits (new), 3+3 old
- **Timezone**: KST (UTC+9), no DST

## Language & Locale
- SAP language key: `3` (KO)
- Double-byte (UTF-16/UTF-8) handling — must use Unicode-compatible ABAP
- Typical locale: `ko_KR.UTF-8`

## Tax System — VAT
- **VAT (부가가치세, 부가세)**: standard 10%
- Registered businesses: 과세사업자 (standard) / 간이과세자 (simplified)
- Zero-rated: exports, specific goods
- VAT ID = 사업자등록번호 (Business Registration Number): **10 digits** `XXX-XX-XXXXX`
- Filing: quarterly (standard), semi-annual (simplified); reported to NTS (국세청)

## e-Invoicing / Fiscal Reporting
- **Mandatory e-tax invoice (전자세금계산서)** for all VAT-registered businesses (B2B)
- Issued/received via **NTS e-세로** portal, ERP-integrated vendors (Bizforce, Kyobo, Smartbill, Douzone, …), or KERIS-certified ASP
- XML format with NTS-defined schema; digital signature required
- **Real-time transmission to NTS within 1 day** (부가세 신고 자동 연계)
- Credit-note / debit-note same channel (수정세금계산서)
- **Tax invoice types**: 세금계산서 (taxable), 계산서 (duty-free), 현금영수증 (cash receipt for B2C)

## Banking / Payments
- **Virtual Accounts (가상계좌)**: one-time per transaction, heavily used for B2C collection
- **Firm Banking (펌뱅킹)** for B2B payments
- **Zengin-like** batch transfer files via bank EDI
- Payment methods: 계좌이체 (transfer), 어음 (promissory note — legacy), 카드
- No IBAN — bank code (3) + branch (3) + account (variable)

## Master Data Peculiarities
- **주민등록번호 (RRN)** — 13-digit national ID. **Highly regulated PII** — storage requires legal basis; default = do not store, use masking/encryption
- **외국인등록번호** — 13-digit foreigner registration number (same structure)
- Customer name commonly stored as Korean + English romanization (NAME1 / NAME2)
- **사업자등록번호** is the equivalent to Tax ID / VAT ID for companies
- Address format: province (광역시/도) → city (시/군/구) → district (동/읍/면) → detailed

## Statutory Reporting
- **VAT Return** (부가세 신고): quarterly via Hometax
- **Corporate Tax** (법인세): annual; interim installment (중간예납)
- **Year-end adjustment** (연말정산) for employee withholding
- **4대보험** (4 social insurances): 국민연금, 건강보험, 고용보험, 산재보험

## SAP Country Version
- **CC KR** — Korean localization includes:
  - e-tax invoice integration interface (Korean EDI IDocs)
  - 부가세 신고서 (VAT return) report RFUVKR00 / FI-KR reports
  - 원천징수 (withholding tax) configuration
  - Korean check lot, VAT registration number validation (check digit)
- Standard: FI-KR, HCM-KR (Korean payroll), MM-KR check for 사업자등록번호

## Common Customizations
- e-세금계산서 interface (custom IDOC or REST API to Bizforce/Douzone/Smartbill)
- **RRN masking** in all displays (viewer/report/ALV)
- 어음 (promissory note) management (legacy; declining)
- 세금계산서 발행/수신 대장 전용 보고서
- 현금영수증 발행 연계 (B2C)
- 원천징수영수증 출력

## Pitfalls / Anti-patterns
- Storing raw RRN in custom Z-tables without encryption → **정보통신망법 / 개인정보보호법 위반**
- Treating 사업자등록번호 as simple text → missing check-digit validation triggers invalid e-invoices
- Not separating 과세 / 면세 / 영세 items on invoice → VAT return errors
- Issuing e-tax invoice only at billing — NTS requires issue **within 10 days of supply date** (공급일)
- Ignoring 수정세금계산서 (correction invoice) workflow → reconciliation nightmares
- Using `SAP_LANGUAGE=EN` for Korean-only reports → layout/UoM label problems
