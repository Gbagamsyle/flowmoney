# FlowMoney

**Know what you can safely spend, even when your income is unpredictable.**

FlowMoney is a cash-flow planning application for freelancers, contractors, creators, and independent professionals with irregular income. It is designed to bring current funds, expected payments, upcoming obligations, and protected money into one understandable financial picture.

FlowMoney is intended to be non-custodial: it will not hold, transfer, or invest user funds. The MVP is planned to begin with manual financial data entry.

**Status:** early development. The web app now includes a responsive waitlist landing page with local email validation, but the form is an unconnected UI preview: it does not submit or save email addresses. The `/signin` and `/signup` routes are placeholders that render no page content; authentication is not implemented. Initial API modules, a database model, and calculation helpers are also present, while onboarding and the full planning experience remain in development.

## Product direction

The core question is:

> Given the money I have, what I need to cover, and what may arrive later, what can I safely spend today?

The MVP is intended to support:

- Manually maintained current-fund accounts.
- Income sources and expected payments with dates, confidence, and status.
- Upcoming obligations with priority and recurrence.
- Buffer, savings, and allocation preferences.
- Explainable Safe-to-Spend, obligation coverage, and financial runway.
- A chronological cash-flow timeline.
- Hypothetical scenarios that leave the real plan unchanged.

Expected income must remain separate from current money. A future payment does not increase current Safe-to-Spend until its receipt is recorded.

The conceptual product formula is:

```text
Safe-to-Spend = Current Funds
             − Protected Obligations
             − Protected Buffer
             − Protected Savings
```

Exact protection horizons, rounding, recurrence, and runway rules belong in the Flow Engine specification. The current code is an initial implementation, not the final financial model.

Bank aggregation, money transfers, lending, investments, tax filing, and full accounting are outside the initial MVP.

## Technology

| Area | Current repository choice |
| --- | --- |
| Web application | Next.js App Router, React, TypeScript |
| Styling, components, and icons | Tailwind CSS, shared UI package, shadcn/ui configuration, Lucide React |
| API | NestJS, TypeScript |
| Database | PostgreSQL through Prisma |
| Financial logic | Shared `@flowmoney/calculations` package |
| Workspace management | pnpm workspaces; pnpm `12.4.2` |
| API tests | Vitest |
| API linting and formatting | Oxlint and Prettier |

Dependency versions are defined in the package manifests and resolved in `pnpm-lock.yaml`. Use the committed lockfile when installing.

Authentication is not yet integrated in the inspected scaffold. The `User` model includes `clerkId`, indicating an anticipated Clerk integration; confirm the implementation with the team before adding a provider.

## Repository structure

| Location | Responsibility |
| --- | --- |
| `apps/web/app/` | Web routes and layouts; `/` is the waitlist landing page, while `/signin` and `/signup` are empty placeholders |
| `apps/web/components/` | Web-specific components and theme provider |
| `apps/web/components/brand/` | FlowMoney logo and landing-page illustration components |
| `apps/web/components/layout/` | Landing-page header and footer |
| `apps/web/components/landing/` | Waitlist form preview and three-benefit feature strip |
| `apps/web/public/images/` | `flowmoney-logo.png` and `flowmoney-hero.png`, used by the landing page |
| `apps/api/src/` | API modules for accounts, income, obligations, and dashboard data |
| `apps/api/src/common/prisma/` | Prisma service and module |
| `packages/ui/` | Shared components, utilities, and styles |
| `packages/calculations/` | Shared financial calculation helpers |
| `packages/domain/` | Domain package scaffold |
| `packages/validation/` | Validation package scaffold |
| `packages/config/` | Configuration package scaffold |
| `prisma/schema.prisma` | Database models and PostgreSQL connection configuration |
| `pnpm-workspace.yaml` | Workspace package discovery and dependency build settings |

## Getting started

### Prerequisites

- Git.
- A supported Node.js version compatible with the workspace dependencies. Node.js 24 LTS is the suggested development baseline; the repository does not currently pin a Node runtime version.
- pnpm `12.4.2`, as specified in the root `package.json`.
- PostgreSQL and a development connection string when running the API.

### Clone and install

```bash
git clone https://github.com/Gbagamsyle/flowmoney.git
cd flowmoney
npm install --global pnpm@12.4.2
pnpm install --frozen-lockfile
```

Run workspace commands from the repository root. If you already cloned the project, use that checkout rather than creating another application inside it.

### Start the web application

```bash
pnpm dev
```

Open the address printed in the terminal, normally `http://localhost:3000`. The home page displays the FlowMoney waitlist landing page and can be viewed without running the API. Its email field validates locally and displays a preview status; there is no waitlist submission endpoint or email persistence.

### Configure and start the API

The API connects to PostgreSQL on startup. It needs a database with the expected schema and a generated Prisma client.

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | Development PostgreSQL connection string used by Prisma |
| `PORT` | API listening port; use `3001` when the web application uses `3000` |

The current API bootstrap does not explicitly load a dotenv file. Set these variables in the terminal that runs the API, or use the team's agreed environment-loading setup. Merely creating `.env` is not sufficient to establish that the API will load it.

**PowerShell:**

```powershell
$env:DATABASE_URL = "postgresql://USER:PASSWORD@localhost:5432/flowmoney?schema=public"
$env:PORT = "3001"
pnpm --filter @flowmoney/api db:generate
pnpm dev:api
```

**macOS or Linux shell:**

```bash
export DATABASE_URL='postgresql://USER:PASSWORD@localhost:5432/flowmoney?schema=public'
export PORT=3001
pnpm --filter @flowmoney/api db:generate
pnpm dev:api
```

Replace the example connection string with your development credentials. `db:generate` generates the Prisma client; it does not create database tables.

For an **empty, disposable local development database**, the repository provides:

```bash
pnpm --filter @flowmoney/api db:push
```

Run this after setting `DATABASE_URL` and before starting the API if that local database needs its initial tables. Confirm the destination first. Shared databases need a team-reviewed schema-change process; `db:push` is not a substitute for migration history.

Use `prisma/schema.prisma` as the repository's current database definition. Separately proposed schemas need reconciliation with it before adoption.

## Development commands

Run these from the repository root:

| Command | Purpose |
| --- | --- |
| `pnpm dev` | Start the web development server |
| `pnpm dev:api` | Start the API in watch mode |
| `pnpm build` | Build the web application |
| `pnpm build:api` | Build the API |
| `pnpm typecheck` | Type-check the web workspace |
| `pnpm --filter @flowmoney/api test` | Run API unit tests |
| `pnpm --filter @flowmoney/api test:e2e` | Run API end-to-end tests |
| `pnpm --filter @flowmoney/api lint` | Run the API linter |
| `pnpm --filter @flowmoney/api db:generate` | Generate Prisma Client |

The root build and type-check scripts target the web workspace; they do not verify the entire repository. API tests that initialize the database-backed application may require a configured test database. Existing tests do not establish coverage of the complete product.

## Current implementation and next milestones

| Area | Current state | Next work |
| --- | --- | --- |
| Web | Responsive waitlist landing page with header, hero artwork, benefit strip, locally validated but unconnected email form, and footer. `/signin` and `/signup` exist as empty route placeholders; authentication is not implemented. | Connect waitlist submission to an agreed backend contract; implement sign-up and sign-in, then onboarding, welcome, and currency setup |
| API | Initial accounts, expected-income, obligations, and dashboard modules | Authentication, request validation, ownership enforcement, and complete workflows |
| Database | User, account, income-source, expected-income, and obligation models | Align onboarding, currency, protection, recurrence, and scenarios with the PRD |
| Calculations | Current-funds and initial Safe-to-Spend helpers | Specify and test decimal arithmetic, protection, runway, allocations, and scenarios |
| Supporting packages | Domain, validation, and config scaffolds | Establish shared contracts as features are implemented |

The current dashboard uses a provisional 10% buffer. The Safe-to-Spend helper clamps its result to zero and does not yet include protected savings. These behaviors need review against the Flow Engine specification.

Some controllers currently fall back to `demo-user` when an authenticated identity is absent. This is development scaffolding, not production authorization. Do not expose those endpoints with real financial data until authentication and user isolation are implemented and tested.

## Contributing

1. Start from the team's agreed base branch and create a focused feature branch.
2. Keep changes within the relevant workspace and reuse shared components.
3. Run the checks relevant to your changes.
4. Commit only the intended files and open a pull request.
5. Describe the behavior changed, testing performed, and any outstanding setup requirements. Include screenshots for UI changes.

For example, from an up-to-date checkout:

```bash
git switch -c feature/initial-screens
```

After committing your changes:

```bash
git push -u origin feature/initial-screens
```

Use pnpm consistently. Keep dependency changes and their lockfile updates together. A frozen-lockfile failure should be investigated rather than bypassed by deleting the lockfile.

Keep credentials, personal financial data, and local environment files out of commits. Commit placeholder environment examples when configuration is introduced. Coordinate auth, database, and shared-package changes with the team.

## Product references

The project is guided by these team documents:

- FlowMoney Product Discovery Blueprint.
- FlowMoney MVP PRD v0.1.
- FlowMoney User Flows & Screen Inventory v0.1.

These references are currently shared separately. Add repository links when the team versions them in Git. Product requirements and proposed designs should not be presented as completed functionality.

## License

A repository-level license has not yet been established. The root manifest currently declares `ISC`, while the API manifest declares `UNLICENSED`. The team should reconcile these declarations and add a license file before publishing a definitive licensing statement.
