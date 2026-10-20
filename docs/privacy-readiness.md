# Privacy readiness — pre-launch

Operator: GeeTech. Privacy/support email: ogabasyle@gmail.com (confirmed by the operator).
Policy version: 0.1, draft dated 20 October 2026. No launch effective date is asserted.

## Deployment gate

Run `pnpm preflight:privacy` before deployment. It deliberately fails while the release register has unresolved entries. A passing code build is not a privacy/legal approval. Complete `docs/privacy-release.json` from actual vendor configuration and professional review, update the published pages to match, then rerun. Do not mark a check true merely to deploy. This task does not deploy or purchase services.

The selected architecture is Vercel for Next.js, Render for the persistent Nest API/parser subprocesses, existing Neon for Postgres, and Clerk for authentication. Hosting remains planned, not provisioned. Choose production regions together after confirming database placement, contracts and transfer safeguards. Use distinct development/staging/production identities, keys and databases. No hosting plan, vendor region, DPA or backup lifecycle is inferred from a development connection string.

## Implementation versus published promises

| Area | Observed implementation / notice | Remaining action |
| --- | --- | --- |
| Raw uploads | Multer memory buffers; isolated hidden parser; no disk/object storage; buffers cleared in finally on success/failure; child terminated | Verify production proxy, platform crash dumps and logging do not persist request bodies |
| Parsed data | Review rows saved at analysis, including unknown and excluded rows; no draft TTL; only approved rows count as imported | Set documented retention schedule if introducing expiry; current notices disclose retention until deletion |
| Original credentials | No bank credential collection or bank connection from upload | Never ask testers to email PIN/password/OTP or raw statements |
| AI | Deterministic parsing/classification; no external AI statement pipeline | Any future external processing requires a new vendor/risk review and accurate notice |
| Financial changes | Statement analysis/import does not automatically change balances/income/obligations; separate confirmed planning actions do | Preserve confirmation and original currencies |
| Authentication | Clerk; signed-in APIs and owner predicates | Verify production Clerk domain, processors, regional handling, DPA and deletion request procedure |
| Data store | Neon/Postgres | Confirm production project/region, least-privilege administrators, TLS and vendor terms |
| Error monitoring | Sentry only with DSN; shared allowlist replaces exception text, strips user/request/contexts/extra/tags/breadcrumbs; tracing disabled | Verify received production test event and vendor retention; do not enable replay or logs |
| Analytics | Explicit browser opt-in; allowlisted named events; no financial arguments; autocapture/page capture/replay disabled | Confirm provider retention/region, inspect received events and complete request/deletion workflow |
| Deletion | Transaction removes financial child records; identity fields anonymised; minimal deletion row remains; Clerk identity separate | Verify live deletion plus backup restore reconciliation and provider deletion requests |
| Browser state | Theme, analytics choice, tour/onboarding state; account deletion clears account-scoped event markers | Browser preferences may remain; notices distinguish these from financial records |
| Currency provider | Fixed public USD rates URL; no identity or amounts sent | Keep provider attribution; do not add raw-data exports |
| Rights | Manual request channel through privacy email; no self-service full-account export exists | Verify email monitoring and identity verification, access/export/correction/objection request runbook |
| Under-18 use | Adults-only terms and sign-up notice; not an age-verification system | Review eligibility controls with counsel; do not claim age verification |
| Terms acknowledgement | Visible sign-up links; statement acknowledgement is per-upload UI state, not a durable legal-consent ledger | Configure Clerk Terms/Privacy links in production. Decide and document versioned acceptance requirements with counsel |

## DPIA / processing risk register

Data: identity, balances, expected income, obligations, plans, transaction dates/descriptions/counterparties/references, categories/confidence and limited usage/diagnostics. Purpose: requested personal cash-flow planning and statement analysis. Assess necessity field by field; descriptions can contain third-party identifiers even though raw files are not retained.

Main risks: cross-user access, financial payloads in logs/monitoring, parser attack/resource exhaustion, wrong categories or mixed-currency totals, indefinite review drafts, deleted records reappearing through backup restore, and vendor international transfers. Controls include authenticated ownership queries, memory-only isolated parsing with size/time limits, conservative classifications, review/approval, original-currency preservation, diagnostic filtering and deletion tests. These controls reduce risk; they do not replace a completed DPIA or establish legal compliance.

The operator must document likelihood, severity, residual risk, accountable owner and sign-off before public launch. Assess NDPC controller/processor registration and any additional obligations against the actual processing profile with a qualified Nigerian privacy professional. The pasted package incorrectly expanded NDPC as National Drug Policy Committee and cited a draft GAID; use Nigeria Data Protection Commission and the final 2025 guidance instead.

## Retention register to confirm

- Active financial records and parsed review/imported/excluded rows: until user deletion; no automatic draft expiry today.
- Raw upload: request/parser lifetime, bounded deadline (PDF 60 seconds, XLSX 15 seconds); memory copies reclaimed by runtime. No guarantee of instantaneous erasure of all copies.
- Anonymous deletion row: current implementation has no automatic purge; document necessity and review schedule.
- Infrastructure logs, Sentry, PostHog and support mailbox: configure actual periods; do not invent numbers in published notices.
- Backup frequency, expiry, access, restore checks and deletion reconciliation: confirm vendor settings and rehearse recovery. Never restore deleted financial data to live use without reconciliation.

## Rights requests

1. Monitor the privacy inbox; record a request ID, received date, scope and responsible person without copying financial content into general issue trackers.
2. Verify the requester proportionately via the signed-in identity; never request a banking secret.
3. Identify FlowMoney, Clerk, optional analytics/diagnostics, support and backup data in scope. Export through a controlled authenticated delivery process; do not email raw account data by default.
4. Apply correction/deletion/objection/restriction or explain a lawful limitation; track the applicable response deadline after professional review. Withdrawal of analytics stops future capture, not automatic retrospective vendor erasure.
5. Record minimal completion evidence and reconcile deletions during backup recovery.

## Incident response

GeeTech owns response. Report privately to ogabasyle@gmail.com; do not attach statements or credentials. Triage and contain the affected service/key, preserve limited access-controlled evidence, identify records/users/vendors affected, rotate compromised secrets, and investigate without logging financial content. Obtain advice on applicable notification thresholds and deadlines promptly, notify the regulator/affected people where required, document decisions and remediate. Rehearse the process and assign backup coverage before launch.

## Sources checked on 20 October 2026

- Nigeria Data Protection Act 2023: https://ndpc.gov.ng/download/nigeria-data-protection-act-2023
- Final GAID 2025: https://ndpc.gov.ng/wp-content/uploads/2025/03/NDP-ACT-GAID-2025-MARCH-20TH.pdf
- NDPC rights and guidance: https://ndpc.gov.ng/faqs/
- Next.js hosting: https://vercel.com/docs/frameworks/full-stack/nextjs
- Persistent Node services: https://render.com/docs/web-services

The operator identity/email is supplied by the user; the registration status of GeeTech is not asserted. The package still requires professional review. No production environment or legal sign-off was obtained in this implementation task.

## Local verification

[QA evidence](qa/legal-privacy-2026-10-20.json): web typecheck and production build passed, 20 web logic tests passed, 20 public-page responsive/accessibility checks and eight statement-notice component checks passed. The upload checks use stub authentication/API; no real statement was uploaded. The privacy preflight fails as expected until operational review is complete. Sentry intentionally removes detailed exception text and stack/context data, reducing debugging detail to avoid financial disclosure.
