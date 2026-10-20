# Statement Insights v1

Entry point: **Statements** in desktop/mobile navigation (`/statements`). The API uses the existing Clerk bearer-token guard and local user ownership on every route.

## Workflow and financial boundaries

Upload → parse → preview → optionally review purposes and exclude rows, then confirm the selected transactions together → import approved historical transactions. No bank credentials, bank connection, custody, payment initiation, AI provider, or OCR is involved. This feature never updates FinancialAccount, ExpectedIncome, IncomeSource or Obligation records, including after approval.

`StatementImport` records user, SHA-256 file digest, format, explicit currency, parser version, timestamps and REVIEW/IMPORTED status. `StatementTransaction` records extracted row number, date, description, exact minor units, direction, original category, rule confidence/reason, current reviewed category, approval and review time. Only `approved = true` rows of an IMPORTED statement constitute imported history; excluded rows remain visible as excluded provenance until the statement is deleted. Imported summary metrics use approved rows only. Preview metrics use all parsed rows.

Category suggestions are rules, not calibrated probabilities. All imported rows require explicit confirmation through Import selected transactions. Unknown may be retained without assigning a purpose; individual category review is optional. Amount/date correction requires a corrected export and re-upload. Category corrections preserve original classification and confidence. Approval is atomic with a conditional REVIEW→IMPORTED transition; repeated/concurrent approvals return 409. Identical bytes are deduplicated per user. Overlapping periods from different exports are **not** deduplicated: inspect them before approval, since legitimate repeated identical payments cannot safely be guessed away.

## Supported data contracts

- UTF-8 comma-separated CSV, optional BOM, quoting and embedded commas.
- Unencrypted XLSX with one worksheet, no formulas, hyperlinks, macros or external links. Styled Excel dates and plain ISO/day-first dates work. Legacy XLS/DOC/DOCX are unsupported.
- Unencrypted digital PDF with text and clearly aligned transaction columns. A recognizable header establishes the columns; supported continuation pages can reuse them. Rotated layouts, fragmented headings, merged columns or ambiguous tables may be rejected. No scanned images or OCR. Synthetic real PDF/XLSX fixtures are covered; A Moniepoint digital export with Date/Narration/Reference/Debit/Credit/Balance columns has been locally validated, including wrapped ISO timestamps and rows split across pages. This does not certify all Moniepoint export versions or other bank templates. Prefer CSV if a PDF layout fails.

Header aliases: Date / Transaction Date / Value Date / Posting Date; Description / Narration / Details / Transaction Details / Remarks; Debit / Withdrawal(s) / Debit Amount; Credit / Deposit(s) / Credit Amount; or Amount / Transaction Amount. Amount-only tables use negative = out, positive = in. Optional Direction / Type / DRCR must be DR, CR, DEBIT, CREDIT, IN or OUT. Optional Currency / CCY must agree with the selected currency on every row. Debit/credit tables require exactly one positive side per row. No balance-based inference is performed. Numeric dates are **DD/MM/YYYY** or DD-MM-YYYY; YYYY-MM-DD is also accepted. Money uses at most two decimal places with optional comma thousands separators. Mixed currencies and decimal-comma locale formats are rejected. The existing formatMoney helper is reused; currency defaults to user preference but must reflect the actual statement. No FX conversion occurs.

Categories: Income, Purchase, Bill, Airtime/Data, Bank Fee, Cash Withdrawal, Savings, Own-account Transfer, External Transfer, Loan, Subscription, Refund, Unknown. Broad transfer rules have low confidence; credits are not assumed to be income. Savings and both transfer types are excluded from classified non-transfer outflow. Unknown outflows are excluded too. Cash withdrawal and loan payments remain separate visible categories; classified non-transfer outflow should not be interpreted as a precise consumption measure.

Metrics: total inflow/outflow (including transfers), net cash flow, monthly averages, category inflow/outflow, transfers/savings out, classified non-transfer outflow, transaction date range, and conservative income-description grouping. Averages divide by inclusive calendar months from first to last transaction, including empty and partial months; these are transaction coverage dates, not a verified bank statement reporting period. Recurrence means a matched income description appears in at least two distinct months and is only a suggestion.

## API

- `GET /statements`: most recent 50 import headers for the current user.
- `POST /statements`: multipart `file` and `currency`; returns preview, transaction provenance, categories and summary. Processing failures return 400; oversized files 413; parser concurrency saturation 429.
- `GET /statements/:id`: owner-scoped review/history and summary; missing/foreign IDs return 404.
- `POST /statements/:id/approve`: JSON `{ "transactions": [{ "id": "...", "category": "Purchase", "reviewed": true }] }`. Select 1–5,000 distinct rows from this statement. Unselected rows are excluded. Imported statements cannot be edited or re-approved.
- `DELETE /statements/:id`: permanently removes this user's preview/import and cascades its transactions.

Responses with financial content use Cache-Control: no-store. JSON request limit is 1 MB to support explicit review of 5,000 rows.

## File handling and limits

5 MB/file, one multipart file and currency field, 5,000 transactions, max 250 PDF pages, bounded CSV records. Multer memory storage is used; filenames are used solely for extension validation and are not retained or used as paths. Upload buffers are zeroed in finally on success/error. No raw uploaded files are written to disk or uploaded to object storage. Parser strings/IPC copies are transient and reclaimed when processing ends; JavaScript does not guarantee erasure of all memory copies.

PDF/XLSX parsers run in a hidden child process with a 128 MB V8 heap limit and a 60-second PDF / 15-second XLSX deadline. Native allocations are not constrained by the V8 limit. Child processes receive only minimal OS environment variables, not application secrets; stdout/stderr are discarded to avoid sensitive parser logs. XLSX archives are inspected before expansion: max 20 MB declared expanded content, 200 entries, no macro/external-link parts. Two concurrent parses per API process and one per user are allowed. These limits are per process, not a distributed rate limiter. Use existing deployment ingress limits for public rollout; no new service is required for private alpha.

Parsed previews/history persist until users delete them. Account deletion now deletes statement imports and their transaction rows before anonymizing the user. No raw statements or transaction contents are sent to analytics or AI by this feature.

## Setup

No new environment variables. Existing DATABASE_URL, DIRECT_URL, Clerk configuration and NEXT_PUBLIC_API_URL are reused. Install dependencies, then run:

```powershell
pnpm install
pnpm --filter @flowmoney/api db:generate
pnpm --filter @flowmoney/api db:migrate:deploy
```

Migrations: `prisma/migrations/20261016160000_statement_insights/migration.sql` and `prisma/migrations/20261016200000_statement_category_preferences/migration.sql`. Restart the API after generating the client and deploying the migration. If Windows locks the Prisma engine DLL, stop the API/dev process that holds it and rerun db:generate. Do not use db:push as a substitute for deploying the committed migration.

## Tests

Parser/classifier/summary tests cover exact amounts, quoted CSV, date validation, ambiguous rows, currency mismatches, transfers, income patterns and empty months. Real synthetic PDF/XLSX tests cover binary extraction and unsafe workbook rejection. Service tests cover owner scoping, explicit approval, concurrency, provenance, byte deduplication and raw buffer cleanup. HTTP integration tests exercise authentication boundaries, multipart memory storage, size limits and unexpected fields. Account-deletion regression includes statement data cleanup. The signed-in browser journey remains unverified and needs a disposable Clerk user and test database. Deployment environments must apply both committed migrations; parser and unit tests do not apply migrations automatically.

## Connection failures

Statement operations require persistent storage and bypass the general user-service offline fallback. Database connection/timeout failures return HTTP 503 with a safe message. Uploads and approvals are not automatically replayed; refresh history before retrying because a response can fail after a write has completed. Raw upload buffers are still cleared on failure.

### Additional tested PDF conventions

The parser accepts day-first English month names (for example 10 Jan 2026), double-dash empty debit/credit cells, multi-line column headings, and explicit reporting-period summary blocks between transaction sections. The supplied 93-page statement was checked locally against independently positioned date, debit and credit cells; its private contents are not included in repository fixtures.

## Easier categorization and import

See [Statement categorization and optional review](statement-categorization.md) for the current grouped review flow, merchant and betting categories, optional purposes, saved preferences, API additions and migration. The final import confirms the selected rows together; categorizing every row individually is no longer required.

### Moniepoint PDF regression (2026-10-20)

A locally supplied 207-page digital export produced 2,140 valid transactions after reconstructing wrapped timestamps, narration and page continuations. The former 100-page cap caused a misleading generic rejection; named page, text and password errors now explain the cause. Limits remain 5 MB, 5,000 transactions, 100,000 text items and 2,000,000 characters. The raw statement and financial contents are not included in fixtures or QA evidence; regression fixtures use synthetic data. No original file or user financial records were changed.
