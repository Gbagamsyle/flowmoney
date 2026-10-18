# Statement categorization and optional review

The approved monochrome design is retained. The review section now starts with all extracted transactions selected and shows the number selected and the amounts entering/leaving the account. The user explicitly presses **Import selected transactions** once. Individual rows can be excluded, and no import happens merely from uploading, viewing, or selecting a category. Dates and amounts still use strict extraction validation; malformed or ambiguous source rows fail rather than entering an automatic import.

## Money movement versus purpose

“Transfer to…” is an outgoing transfer; “Transfer from…” is an incoming transfer. The actual parsed debit/credit direction remains authoritative. A transfer alone establishes neither account ownership nor salary, earnings, shopping, gifts, or contributions. Generic transfers are shown as transfers with purpose unspecified, rather than unknown transactions requiring attention. Repetition alone does not turn a credit into salary.

Recognizable card/POS activity is classified as merchant purchases. A known food merchant or an explicit transport description can receive a more specific suggestion; a generic merchant name does not reveal what was bought. Incoming merchant activity has a separate category and is not assumed to be earnings. Clear refunds/reversals take priority over merchant categories.

Betting recognition covers explicit SportyBet, Bet9ja, BetKing, 1xBet, Betway, Betano, NairaBet, MerryBet, Betwinner, betPawa, Paripesa, 22Bet, Melbet and MSport operator descriptions. Payments to these operators and money received from them have distinct categories. A bank payment is not proof that the money was wagered, and incoming money is not automatically described as winnings or earned income. Personal transfers mentioning an operator only in a remark remain generic transfers. Recognition is deliberately limited; other operators and merchants can be identified manually and remembered when an exact counterparty is available.

New canonical categories are Betting, Betting Payout, Merchant Credit, Food & Dining, Transport, Contribution, and Gift. The existing Purchase category is presented as Merchant purchases. Unknown remains available and is displayed as Purpose unspecified. Purpose unspecified is allowed in an explicitly confirmed import. Earned-income patterns still use only Income credits, excluding generic transfers, contributions, gifts, refunds, betting returns and merchant credits.

Official operator references used to confirm that payments and bank withdrawals must be distinguished: [SportyBet help](https://www.sportybet.com/ng/help?nav=others), [Bet9ja withdrawal help](https://help.bet9ja.com/how-to-withdraw/).

## Grouping and remembered choices

Repeated counterparties are grouped separately for incoming and outgoing transactions. The optional group controls apply a selected purpose to the group's transaction IDs; the user can refine exceptions individually. Groups may contain different purposes, so grouping itself is not proof of a shared purpose. Counterparty extraction supports explicit Transfer to/from, TRF to/from, and POS/card/merchant prefixes. It normalizes casing and punctuation, removes explicitly marked reference metadata, preserves identifying digits, and does not group vague NIP references or unknown counterparties.

Remembering a preference is opt-in and saved atomically with the final import. A preference matches the same user, exact normalized counterparty, direction and currency; it does not use fuzzy/global description matches. Clear refunds and fees override ordinary saved preferences. A conflicting purpose within the same selected group is rejected if remembering is enabled. At most 50 preferences may be saved per import. Preferences can be viewed and forgotten from the Recent statements section.

Pending previews use current classifier suggestions and the user's preferences when opened. Original parsed category, confidence and reason remain available as provenance. Approved/imported history is never automatically reclassified. Forgetting a preference affects pending/future suggestions and does not rewrite past approved transactions. Amounts and dates are not changed by classification or preferences.

## Database and API

`StatementCategoryRule` stores the owning user, normalized counterparty key/display name, direction, currency, selected category and timestamps. The unique match key is `(userId, counterpartyKey, direction, currency)`. Rules cascade on hard user deletion and are explicitly deleted during the existing account-anonymization flow.

Migration: `prisma/migrations/20261016200000_statement_category_preferences/migration.sql`. Generate Prisma types and deploy migrations before starting the updated API. No new environment variables or AI providers are required.

- `GET /statements/:id` additionally returns current suggestions, grouped counterparties, category source and allowed categories by direction. Draft updates are derived rather than persisted merely by reading.
- `POST /statements/:id/approve` retains the explicit transaction-ID/category approval contract and accepts optional `remember: true` per selected transaction. Preferences are created/upserted inside the same transaction as approval. Unselected rows remain excluded.
- `GET /statements/category-rules` lists only the current user's preferences.
- `DELETE /statements/category-rules/:ruleId` forgets only the current user's preference; foreign IDs return 404.

Every route remains protected by Clerk and owner checks. No raw statement, counterparty or merchant data is sent to AI or analytics by this feature. Current Funds, Expected Income and Obligations remain untouched.


### Transaction explorer
Category movement totals open the matching transactions. Search covers descriptions and detected counterparty names; category, direction, inclusive date and absolute amount filters combine. Amounts use the statement currency with no FX conversion. Preview category totals follow current purpose choices and include all extracted rows. Imported history defaults to approved rows, with an explicit option to show unselected reference entries. Filter totals cover all matches, including rows beyond the first 50 displayed. Filters never change import selection or stored history.
