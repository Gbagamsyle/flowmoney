# Private-alpha release checklist

Recorded 19 October 2026. A checked item has local evidence; unchecked items require a live run
or an owner decision. Passing unit tests is not evidence of real authentication or device coverage.

## Verified locally

- [x] 188 API tests pass across 23 files, including origin configuration, parsing, classification,
  summaries, owner boundaries, plan isolation and account deletion regression coverage.
- [x] 16 web logic tests pass (calculator, overview, planning inputs and statement filters).
- [x] Web TypeScript check and web/API production builds pass.
- [x] Frozen dependency installation succeeds with the committed lockfile.
- [x] Browser suite discovers the extended authenticated journey.
- [x] Browser QA artifacts are excluded from version control; authenticated traces are disabled.
- [x] Theme-aware in-app logo assets are included in the release changes.

## Before merging

- [ ] GitHub Quality workflow passes on the final PR commit. Configure branch protection to require it.
- [ ] Review the PR, especially the production WEB_ORIGIN requirement and the preserved logo changes.
- [ ] Run Authenticated release QA with the dedicated test identity; inspect responsive screenshots.
- [x] Responsive component audit: 220 checks across 10 emulated viewport sizes, including forms, individual statement review, planning edits and onboarding; no overflow or runtime errors. See [the result record](qa/responsive-2026-10-19.json). This used synthetic auth/API responses and does not prove live integration.

## Authenticated QA setup

Create the GitHub environment `private-alpha-qa` and configure these environment secrets:
`QA_CLERK_PUBLISHABLE_KEY`, `QA_CLERK_SECRET_KEY`, `QA_USER_EMAIL`, `QA_USER_PASSWORD`.
Use a Clerk **test instance** with a dedicated, verified QA user whose login can complete using
email/password without an interactive second factor. Do not weaken production authentication.
Ensure Clerk test-instance domain settings allow the local workflow URL. The workflow provisions
a fresh temporary PostgreSQL database, applies every migration, and destroys the service at job end.
It does not use a deployed DATABASE_URL. Dispatch with confirmation `DISPOSABLE`.

The journey covers onboarding; a synthetic CSV uploaded for review; exclusion of one extracted row;
explicit approval of the other two; unchanged Current Funds; linked plan save/reload; independent
standalone plan creation/reload; scenarios; currency acknowledgement; deletion and fresh onboarding.
It captures nine authenticated pages at mobile (390x844), tablet (820x1180), desktop (1440x900), in
light/dark themes, and checks document overflow. These are emulated viewports, not physical devices.
Only synthetic financial data is used. Authentication traces are disabled and PNG artifacts expire
after seven days. Do not upload real statements or personal records to this workflow.

For a local live run, point both apps at a disposable database, configure Clerk test keys and the
dedicated `FLOWMONEY_E2E_EMAIL`/`FLOWMONEY_E2E_PASSWORD`, set `FLOWMONEY_E2E_DISPOSABLE=true`,
start the API, and run the web `core-journey.spec.ts` suite. Credentials are not currently configured
in the reviewed local environment, so that journey has not been claimed as passed.

## Before inviting users

- [ ] Merge the reviewed PR; deploy web and API from the same release commit.
- [ ] Apply all tracked Prisma migrations to the intended deployment database using
  `pnpm --filter @flowmoney/api db:migrate:deploy`; generate the client and restart the API.
  Include `20261018230000_monthly_planning` and `20261019001000_standalone_plans`.
  This release adds no new database migration.
- [ ] Set production `WEB_ORIGIN` to the exact deployed web origin, `NEXT_PUBLIC_API_URL` to the API,
  and use matching Clerk keys/allowed domains. Verify unauthenticated API requests return 401 and
  signed-in requests from the deployed site succeed.
- [ ] Configure Sentry DSNs and confirm a controlled test error arrives without financial values or
  unnecessary personal data. Do not intentionally crash a user's session.
- [ ] Configure PostHog, confirm no product events before consent and expected events after opt-in.
  Check actual payloads for names, descriptions, amounts and tokens; these must be absent.
- [ ] Exercise digital PDF, CSV and XLSX imports in staging with synthetic fixtures; scanned PDFs
  must show the unsupported-layout message. Confirm approval boundaries and duplicate handling.
- [ ] Verify database recovery/backups and a rollback path. Keep additive migrations on app rollback;
  do not delete user data to roll back the UI. Assign an incident/contact owner.
- [ ] Check keyboard navigation, focus, zoom, contrast and one real phone/tablet/desktop browser.
  Emulation alone does not certify accessibility or all devices.

## Private alpha and next decisions

- [ ] Choose 5–10 willing testers; get permission before inviting or messaging them.
- [ ] Share a short task: add funds, review a statement, make a plan, explain the result in their own words.
- [ ] Provide an in-product/support contact and explain non-custodial behavior, statement limitations,
  manual balances, currency relabeling without FX and how to delete FlowMoney data.
- [ ] Review issues after the first week. Log severity, reproducible steps and synthetic examples;
  avoid collecting raw statements in analytics or issue trackers.
- [ ] Choose the next release from observed problems. Candidates: data export and fewer manual
  statement corrections. No automatic rollover, bank connection or currency conversion is promised.

Figma synchronization is separate design documentation work; remaining screens and visual QA are
pending connector quota availability. It is not evidence that deployed product QA has passed.
