# Currency display conversion

FlowMoney preserves each record’s original amount and currency. `User.preferredCurrency` now selects
the display currency and the initial currency of a new form; changing it never rewrites money.

## What users see

- Overview and Scenarios normalize records to the display currency before calculating combined totals.
- Current Funds, Expected Income and Obligations show a converted estimate with the original amount
  underneath. Edit forms always use the stored original currency, even when the display is different.
- New funds, income and obligations have an explicit currency selector. Original currencies cannot
  be changed by relabeling an existing record. Source precision and supported amount limits are validated.
- Statements and saved plans retain their original analysis/edit currency. A separate summary estimates
  their headline values in the display currency. Saved plans continue linking only records in the plan’s
  original currency, regardless of a later display preference change.
- Settings has a per-record review for older income and obligations with no recorded currency. No default
  is preselected. Confirmation checks ownership, the recorded amount and the still-unconfirmed state;
  it writes only the currency. Combined Overview/Scenario totals are blocked until these are confirmed.

These are current-rate reference estimates, not historical accounting exchange values, executable bank
quotes, bank fees, or a promise that an account balance can be exchanged at that rate. No money moves.

## Provider and cache

The API requests only `https://open.er-api.com/v6/latest/USD` from ExchangeRate-API. No user identifier,
amount, bank detail or statement is sent. The fixed URL cannot be changed through request input.
The free open endpoint updates daily; attribution links appear wherever estimates use its data.
See [provider documentation](https://www.exchangerate-api.com/docs/free) and
[terms](https://www.exchangerate-api.com/terms). It requires no key or new environment variable.

A shared `ExchangeRateSnapshot` stores the public rate table and provider timestamps in Postgres.
Responses are checked for all 30 supported codes, finite positive rates, base identity and reasonable
update timestamps. Concurrent refreshes share a promise; failed refreshes back off for five minutes.
A persisted snapshot is reused across process restarts. An expired snapshot can be used for up to
72 hours from its provider timestamp, explicitly labeled cached. Older or absent data fails closed.
Same-currency views do not require the provider. There is no raw-rate-table endpoint: authenticated
responses return only estimates for owned financial records, plans and statements.

Cross conversion uses decimal arithmetic through the common USD base, with rounding at the target
ISO currency precision, including zero-decimal currencies. Original values never take part in an
in-place conversion, so repeated switching cannot compound rounding into stored records.

## Schema and API

Apply tracked migration `20261020120000_original_currencies_and_fx_cache` and regenerate Prisma:

```powershell
pnpm --filter @flowmoney/api db:migrate:deploy
pnpm --filter @flowmoney/api db:generate
```

Restart the API after migration/generation. The additive migration leaves existing account, statement
and plan currencies unchanged and adds nullable `ExpectedIncome.currency` and `Obligation.currency`.
Legacy nullable currencies deliberately stay unknown; do not backfill them from today’s preference.

Authenticated endpoints:

- `GET /currencies/display`: estimates for the caller’s records, currency metadata and review count.
- `GET /currencies/review`: the caller’s unconfirmed income and obligations.
- `PATCH /currencies/review`: confirm `{kind, id, amount, currency}` for one unchanged owned record.
- `GET /currencies/summary/:kind/:id`: current-rate headline estimates for an owned `plan` or `statement`.
- Existing create endpoints accept an explicit supported `currency`, defaulting new records to the
  current preference for older clients. Updates preserve original currency and source-unit amounts.

Rate failures return 503 for unavailable cross-currency totals; unconfirmed sources return 409 with
`CURRENCY_REVIEW_REQUIRED`. Source records remain readable. Switching back to the source currency
works without rates. The browser handles stale requests and never substitutes the display symbol
for an unconverted source amount.

## Verification

Deterministic tests cover conversion/cross rates, target precision, overflow, immutable originals,
provider validation, persisted/fresh/stale/missing caches, deduplicated requests and retry backoff.
An isolated legacy-schema database is migrated with synthetic records, then checked for confirmation
ownership, unchanged amounts, repeated currency switching and saved-plan currency isolation.
Component browser checks cover explicit review, original-unit editing and stale/unavailable displays
in both themes at phone, landscape and desktop sizes. The separate authenticated journey verifies
conversion and switching back through real Clerk/API access in a fresh database with a synthetic
public-rate snapshot. A separate smoke check validates the actual provider’s current payload.

Latest local evidence: [currency QA](qa/currency-conversion-2026-10-20.json). The configured local
database has the additive migration applied; deployment databases still require it before rollout.
