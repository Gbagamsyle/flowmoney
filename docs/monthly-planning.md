# Monthly planning v1

`/planning` brings category allocations, savings goals, approved statement history, obligations and expected income together in the existing monochrome UI. Scenarios remain available through **What if?** and their original navigation entry; existing routes are preserved. Statements still precede Scenarios. Mobile navigation scrolls horizontally so all destinations keep a usable touch width.

## Money and coverage

- Accounts are summed only in the plan currency. Plans retain their creation currency; there is no FX conversion. Existing obligations and expected income use the application's preferred-currency convention. If the preference changes, older plans hide those records and warn rather than mixing currencies. Verify their amounts when changing currency because the existing records have no independent currency field.
- Current balances are live user-entered values, not inferred opening balances. They must already reflect recorded spending. Available-to-allocate = recorded funds minus outstanding commitments, category reserves and the explicit safety buffer. A new plan starts with an editable 10% buffer, not a continuously changing deduction.
- Expense reserve = max(0, allocation minus matched recorded debit spending). Overspending is visible separately. Subtracting recorded spending a second time from current balances would double count it, so this is deliberately avoided.
- Savings reserve = previously earmarked funds plus this month's allocation. Previously earmarked funds must be included in Current Funds. Goal target, set-aside and still-needed labels are distinct from spending. A goal date can represent annual rent, school fees or another future expense. All earmarking is manual, with no custody or bank transfer.
- Existing obligations appear once as protected commitments. Linking a debit to an obligation removes it from category spending and reduces that commitment's outstanding amount within this plan. It does not mark the obligation paid or update its original amount. Pending commitments beyond the selected month remain protected too.
- Only approved transactions from imported statements, matching the month and currency, are used. At most 10,000 entries are processed. Original dates, descriptions and reviewed statement categories stay unchanged. Counts and recorded date range are evidence, not proof that every date or account is covered. Overlapping import date ranges produce a warning; different accounts may legitimately overlap.
- Transfers, savings, cash withdrawals and loan movements do not automatically become consumption. Users may explicitly assign an outgoing movement to an expense or commitment. Credits, including refunds, do not automatically offset spending because their destination is unknown.
- Plans for past/future months use today's recorded funds, with a warning. They are not historical balances or globally funded envelopes. Plans do not reserve funds across one another, and savings/allocations do not roll over automatically.

## Workflow

Create the month, edit suggested categories, rename/regroup or add custom categories, allocate amounts and set a buffer. Optional statement-purpose matches must be unique across expense categories. Savings goals cannot have spending matches. Uncertain purposes remain valid; individual outgoing entries can be assigned, linked to a commitment, kept separate, or returned to automatic matching. These are planning links, not changes to approved history.

Allocation moves are atomic plan saves. They preserve total allocation and cannot reuse money already spent. Ordinary category editing may deliberately leave a category overspent; the result is displayed. Every mutation includes the plan revision. A stale window receives 409 rather than overwriting another save. There is no autosave, automatic monthly rollover or automatic financial-record creation.

The cash-flow outlook starts from current funds after category reserves, buffer and commitments outside the selected month. It shows a current-funds-only balance separately from one that includes only future, CONFIRMED, EXPECTED income. Delayed, likely, uncertain and partial receipts are not spendable and cannot fund this projection. PARTIAL records have no reliable remaining amount in the existing schema, so they are excluded. Bills are processed before receipts on the same date. Dates use UTC. This is a conditional estimate, not a bank balance or guarantee.

Everyday spending's weekly guide uses the remaining allocation and calendar days left, with imported-history freshness displayed. Incomplete statements make the guide incomplete; updating current funds and statement history remains the user's responsibility.

An approved debit/credit can be a starting point for a new future obligation/expected income. Users must explicitly confirm its name, positive amount and current/future date. New expected income starts UNCERTAIN. Repetition alone does not establish salary, earnings or recurrence. There is a unique source/kind provenance marker, so repeated submissions cannot create the same suggestion twice. Deleting a suggested record does not automatically reset this marker. These actions never change account balances, statement rows or obligation status.

## Storage and API

New Prisma models: MonthlyPlan, PlanCategory, PlanTransactionLink, PlanningAction. Money is integer minor units in Decimal(16,0), with safe integer bounds at the application boundary. Constraints enforce nonnegative reserves, valid types and exactly one transaction-link destination. Foreign-key cascades remove planning links with their source records. Account deletion explicitly removes plans and action provenance before anonymizing the user; its transaction deadline is 30 seconds to allow remote database cleanup.

- `GET /planning?month=YYYY-MM`: owner-scoped month/context, without automatically creating a plan.
- `POST /planning`: explicitly create the month and initial categories.
- `PATCH /planning/:id`: revision, bufferMinor and complete categories array.
- `POST /planning/:id/assign`: revision, transactionId, destination (auto/ignore/category ID/obligation ID) and optional CATEGORY/OBLIGATION kind.
- `POST /planning/:id/from-statement`: revision, transactionId, kind, title, amountMinor and future/current date.

Clerk authentication, owner/currency/month scoping, no-store headers and safe database-unavailable messages apply to every financial route. Creation and mutation queries use the existing Prisma/Users architecture. No AI, raw statement files or bank credentials are involved.

## Setup and validation

No new environment variables. Deploy `20261018230000_monthly_planning` after the existing migrations:

```powershell
pnpm --filter @flowmoney/api db:generate
pnpm --filter @flowmoney/api db:migrate:deploy
```

Restart the API after client generation/migration. Unit/API tests cover arithmetic, pending income, owner boundaries, transaction scopes, revision conflicts, strict inputs, authentication and account cleanup. The complete migration chain and persistence workflow are additionally exercised with synthetic records in an isolated temporary PostgreSQL schema, which is removed afterward. No real statement fixtures are committed. Browser interaction smoke checks use the actual planning component with synthetic authentication/API responses; a real Clerk deployment journey remains a separate check.

Opening/closing balance reconciliation, cross-account transfer matching, calibrated classification, automatic rollover and trustworthy period comparisons remain outside v1. Existing imported transaction history is immutable; suggestions expose their reasons and original parsed category for review.


## Independent plans
Choose **Use my existing funds** or **Create a standalone plan** from Plan source. Each month can keep one of each; existing plans are migrated to LINKED without changing their allocations. STANDALONE plans use an explicit, editable starting amount and no account balances, obligations, expected income, statement transactions or saved action history are queried. Standalone categories have no automatic statement matching. Statement-link and future-record endpoints reject standalone plans server-side. Currency formatting still follows the creation preference; no bank credentials or new account are required. These are independent budget previews, without a separate actual-spending ledger.

Additional additive migration: `20261019001000_standalone_plans`. MonthlyPlan stores mode and startingFundsMinor, with a unique owner/month/mode key and a constraint preventing linked plans from storing a manual funds override. Existing API clients default to LINKED; GET may pass `mode=STANDALONE`, creation passes mode and startingFundsMinor, and standalone saves may update startingFundsMinor.
