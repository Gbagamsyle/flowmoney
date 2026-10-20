# FlowMoney deployment and PWA

## Status and release choice

The repository includes a Vercel Next.js configuration and a Render Blueprint for a **preview** API. Nothing is deployed by adding these files. Import `feat/deployment-pwa`, the branch containing these changes, not an older main branch. Build web and API from the same reviewed commit. Do not enable real-user production access while [privacy readiness](privacy-readiness.md) remains unresolved; `pnpm preflight:privacy` reports those items.

Do not paste provider keys into chat or commit them. Enter them in the provider secret/environment settings. Keep preview/test and production databases and Clerk instances separate. Never reuse the disposable QA database or the development database for real users.

## 1. Prepare Neon and authentication

Create a separate intended deployment database/branch and record its region and backup settings. Keep pooled `DATABASE_URL` for runtime and direct `DIRECT_URL` for Prisma migrations, both with the vendor-recommended TLS settings. Production creation/region/transfer review is not performed by these files.

Generate Prisma and apply **all tracked migrations** once against that exact target using a controlled environment:

```
pnpm install --frozen-lockfile
pnpm --filter @flowmoney/api db:generate
pnpm --filter @flowmoney/api db:migrate:deploy
```

The migration environment must explicitly point both URLs to the intended deployment target. Do not run the command against a guessed environment or use `db push`/reset for deployment. No seed or destructive reset is required. The preview Blueprint does not automatically run migrations during build or every startup. On an approved paid production service, use a pre-deploy migration command and an agreed release/rollback process.

Use test Clerk keys and synthetic data for preview. Use a separate production Clerk instance and matching `pk_live_`/`sk_live_` values for production. Configure approved domains, sign-in/sign-up redirect URLs and `/terms` plus `/privacy` links in Clerk. Never commit either secret key.

## 2. Render API import

Import as a Blueprint using root `render.yaml`, or create a Node web service with the same commands. The working directory is the repository root (leave Root Directory blank); workspaces and Prisma are outside `apps/api`.

| Setting | Value |
| --- | --- |
| Node | 24 |
| Build | `corepack enable && pnpm install --frozen-lockfile && pnpm --filter @flowmoney/api db:generate && pnpm build:api` |
| Start | `node apps/api/dist/main.js` |
| Health check | `/health` |
| Auto deploy | Off initially |
| Preview plan | Free, deliberately selected to avoid creating a paid service |

Set secrets `DATABASE_URL`, `DIRECT_URL`, `CLERK_SECRET_KEY`, `CLERK_PUBLISHABLE_KEY`. Set `NODE_ENV=production` and `WEB_ORIGIN` to the exact planned web origin (HTTPS, no path or trailing slash; comma-separated exact origins if necessary). Render supplies `PORT`; the API binds `0.0.0.0`. No persistent disk is needed or configured for statement uploads.

Choose a region deliberately during import, close to the selected database and consistent with the agreed transfer arrangements. The Blueprint omits `region`; Render defaults to Oregon if you do not choose one. Do not mistake that default for a reviewed production location. Record the actual choice in the privacy release register. Render Free is for preview, can spin down and has resource limits; Render advises against using it for production. Review compute capacity for two concurrent isolated statement parsers and approve any paid plan before production.

`GET /health` returns only `{ "status": "ok" }` after a database probe; database failures return 503 without details. API health alone does not verify schema migrations or Clerk configuration.

## 3. Vercel web import

Import the same repository/commit with **Root Directory `apps/web`**, Framework Next.js, Node 24. Enable access to source files outside the root directory for workspace packages. `apps/web/vercel.json` specifies `pnpm install --frozen-lockfile` and `pnpm --filter @flowmoney/calculations build && pnpm --filter @flowmoney/web build`; keep the default `.next` output and do not use a static export.

| Environment variable | Where / meaning |
| --- | --- |
| `NEXT_PUBLIC_API_URL` | Vercel: exact HTTPS Render API origin, without trailing slash; public, baked into the web build |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Vercel: matching Clerk instance public key |
| `CLERK_SECRET_KEY` | Vercel server environment: matching Clerk secret for server auth; never prefix with NEXT_PUBLIC |
| `NEXT_PUBLIC_POSTHOG_KEY`, `NEXT_PUBLIC_POSTHOG_HOST` | Optional; enable only after retention/region review and payload verification |
| `SENTRY_DSN`, `NEXT_PUBLIC_SENTRY_DSN` | Optional server/browser monitoring; verify filtering and retention before enabling |

The two Clerk keys must match the API's instance. Set variables separately for Preview and Production. Leave `FLOWMONEY_ISOLATED_QA` unset in hosting; it is only for local test build isolation. Do not set database URLs on Vercel: the web app uses the authenticated API.

Review Vercel plan eligibility for this business product: Hobby is limited to personal/non-commercial use; select an appropriate plan before commercial launch. No paid plan is purchased by this setup.

After Vercel assigns a URL, set Render `WEB_ORIGIN` to that exact origin and redeploy the API. Preview URLs can change; update the explicit origin rather than enabling a wildcard. If a custom domain is later selected, configure it in the providers and Clerk and update the origins. Redeploy the web app after changing any NEXT_PUBLIC variable.

## 4. Deployment smoke checks

- Confirm HTTPS, `/health`, and unauthenticated financial API responses returning 401.
- Use a dedicated preview identity with synthetic records to verify signup/onboarding, financial CRUD, scenarios, statement analysis/explicit approval, planning, currency changes, and deletion/restart.
- Verify original financial values are unchanged and legacy currencies require explicit confirmation.
- Confirm no financial payload in provider logs, analytics or Sentry. Opted-out analytics must emit no product events.
- Complete `pnpm preflight:privacy`, finalise the effective policy version, provider regions/contracts, retention/backups and incident/rights workflows before real-user production access.
- Only then promote the reviewed release, enable deliberate auto-deploy policy, and invite testers. Nothing in this task sends invitations or merges PRs.

## PWA behaviour

The generated `/manifest.webmanifest` gives FlowMoney a stable identity, standalone window, `/dashboard` launch URL, scoped brand icons and Apple home-screen metadata. Settings has an install action when the browser offers one, platform instructions otherwise, and user-triggered update controls. Updates do not force-reload unfinished edits.

The service worker registers only in a production build on a secure origin (localhost works for local QA). Development does not register it. It caches **only** `/offline.html` and the four known public PWA icons. All navigations use the network with `cache: no-store`; a failed navigation returns the public offline screen. API requests, uploads, Clerk traffic, financial pages and JavaScript bundles are never stored by this service worker. No background sync, push permission, notification subscription, bank credentials or financial IndexedDB storage is added.

The application requires a connection for financial data. Already open pages can still show data in runtime memory when connectivity drops; the PWA does not make that data available as a persistent offline record. Existing browser/HTTP behaviour is distinct from the worker cache. New worker activation removes only earlier `flowmoney-public-*` caches, not unrelated origin storage. The worker script itself is served with no-cache/no-store headers.

Test installation on a physical Android Chrome device and iPhone Safari, plus a desktop browser, over the deployed HTTPS URL. iOS uses Share → Add to Home Screen rather than the Chromium prompt. Emulation cannot certify OS-level installation, standalone auth redirects or all platform behaviour.

## Sources

- https://nextjs.org/docs/app/guides/progressive-web-apps
- https://vercel.com/docs/monorepos
- https://vercel.com/docs/plans/hobby
- https://render.com/docs/blueprint-spec
- https://render.com/docs/free

## Local verification evidence

[21 October QA result](qa/pwa-deployment-2026-10-21.json): 212 API tests, 24 web logic tests, typecheck and both builds passed. The production-browser worker/cache/offline checks and eight offline-screen layout/accessibility checks passed. Both real authenticated journey tests passed in 5.2 minutes, with 54 responsive captures and 18 desktop main-content accessibility checks; the temporary Clerk identity and isolated database were removed. OS-level installation still needs physical devices and the final HTTPS deployment.
