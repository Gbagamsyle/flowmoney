# Private-alpha release checklist

Recorded 19 October 2026; interface checks updated 20 October 2026. A checked item has local evidence; unchecked items require a live run
or an owner decision. Passing unit tests is not evidence of real authentication or device coverage.

## Verified locally

- [x] 188 API tests pass across 23 files, including origin configuration, parsing, classification,
  summaries, owner boundaries, plan isolation and account deletion regression coverage.
- [x] 17 web logic tests pass (analytics consent, calculator, overview, planning inputs and statement filters).
- [x] Web TypeScript check and web/API production builds pass.
- [x] Frozen dependency installation succeeds with the committed lockfile.
- [x] Browser suite discovers the extended authenticated journey.
- [x] Browser QA artifacts are excluded from version control; authenticated traces are disabled.
- [x] Theme-aware in-app logo assets are included in the release changes.
- [x] Guided walkthrough, landing icons and Help & feedback refinements verified: 30 layout
  checks and four main-content accessibility checks, plus all nine tour steps at four viewport
  sizes and 32 tour accessibility checks. [Interface evidence](qa/interface-polish-2026-10-20.json).
  Tour completion is remembered per user/browser; [behavior and limitations](product-tour.md).

- [x] Live authenticated local PDF/CSV/XLSX API checks passed in an empty temporary database:
  review before approval, duplicate reuse, repeated approval rejection, unsupported PDF rejection
  and unchanged accounts. [Result record](qa/live-formats-2026-10-19.json).
- [x] Automated accessibility checks passed for main content on nine app pages in both themes
  with synthetic data. Corrected light-theme contrast on delete controls and muted text.
  [Result record](qa/accessibility-2026-10-19.json). Physical-device and manual keyboard QA remain open.
- [x] Analytics regression verifies disabled/enabled/re-enabled consent, immediate revocation,
  SDK initialization retry, no duplicate opt-in, and one-time-event retry after revocation.

- [x] Live responsive coverage completed with actual Clerk/API data: 54 screenshots across nine
  populated pages, three viewport sizes and both themes; all 18 desktop main-content accessibility
  checks passed. [Result record](qa/live-browser-2026-10-19.json). The full authenticated journey also passed, including currency confirmation, deletion and fresh onboarding.
  Both browser tests passed; the temporary Clerk identity and database were removed.

- [x] Reran both authenticated browser tests on 20 October, including walkthrough welcome,
  skip and Settings replay; 54 responsive captures and 18 desktop accessibility checks passed.
  Temporary test resources were removed. [Latest live result](qa/live-browser-2026-10-20.json).

## Before merging

- [ ] GitHub Quality workflow passes on the final PR commit. The first run was blocked before any steps: GitHub reported that the account is locked due to a billing issue. Resolve account billing, then rerun Quality; hosted CI is not verified. Configure branch protection to require it.
- [ ] Review the PR, especially the production WEB_ORIGIN requirement and the preserved logo changes.
- [x] Run the dedicated authenticated journey locally: both tests passed with a real Clerk session and isolated migrated database. Live financial screens, both planning modes, currency confirmation, deletion and restart are verified. Hosted QA remains unrun while GitHub billing is locked.
- [x] Responsive component audit: 220 checks across 10 emulated viewport sizes, including forms, individual statement review, planning edits and onboarding; no overflow or runtime errors. See [the result record](qa/responsive-2026-10-19.json). This used synthetic auth/API responses and does not prove live integration.

## Authenticated QA setup

Create the GitHub environment `private-alpha-qa` and configure these environment secrets:
`QA_CLERK_PUBLISHABLE_KEY`, `QA_CLERK_SECRET_KEY`, `QA_USER_EMAIL`, `QA_USER_PASSWORD`.
Use a Clerk **test instance** with a dedicated, verified QA user whose login can complete using
email/password. Use a reserved `+clerk_test` address so the test can complete Clerk Device Trust with
the documented fixed OTP, without email delivery. Do not weaken production authentication.
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
start the API, and run the web `core-journey.spec.ts` suite. A temporary Clerk test user and separate empty database were provisioned for local QA without
changing the application environment files. Each attempt cleans up its own test user and database.
The full browser journey passed, along with API authentication and all supported format checks.
See the [live browser result](qa/live-browser-2026-10-19.json). No persistent disposable-user credentials were committed.

## Current local scope

The owner confirmed local-only verification. There is no staging/deployed URL to sign off.
The initial clean-install QA exposed a missing direct Tailwind dependency in the shared UI package;
this is now declared and locked, and the clean production build passes. Local QA uses `.next-qa`
so it does not share the active development build cache. The 127.0.0.1 development origin is explicitly
allowed by Next.js. The workflow obtains an official Clerk testing token using test-instance keys;
see [Clerk testing guidance](https://clerk.com/docs/guides/development/testing/overview).

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
- [x] Exercise digital PDF, CSV and XLSX imports locally with real authentication and synthetic fixtures; unsupported PDFs are rejected, approval boundaries hold and duplicates reuse the existing import.
- [ ] Repeat the deployment smoke checks on staging once a deployed URL is available.
- [ ] Verify database recovery/backups and a rollback path. Keep additive migrations on app rollback;
  do not delete user data to roll back the UI. Assign an incident/contact owner.
- [ ] Check keyboard navigation, focus, zoom, contrast and one real phone/tablet/desktop browser.
  Emulation alone does not certify accessibility or all devices.

## Private alpha and next decisions

- [ ] Choose 5–10 willing testers; get permission before inviting or messaging them.
- [ ] Share a short task: add funds, review a statement, make a plan, explain the result in their own words.
- [x] Add the owner-provided support contact, ogabasyle@gmail.com, to Settings.
- [x] Prepare [tester tasks and feedback guidance](private-alpha-feedback.md), including non-custodial
  behavior, statement limitations, manual balances, currency handling and deletion.
- [ ] Share that guidance with the selected testers after release approval; no invitations have been sent.
- [ ] Review issues after the first week. Log severity, reproducible steps and synthetic examples;
  avoid collecting raw statements in analytics or issue trackers.
- [ ] Choose the next release from observed problems. Candidates: data export and fewer manual
  statement corrections. No automatic rollover, bank connection or currency conversion is promised.

Figma synchronization is separate design documentation work; remaining screens and visual QA are
pending connector quota availability. It is not evidence that deployed product QA has passed.
