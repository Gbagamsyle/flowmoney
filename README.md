# FlowMoney

**Know what you can safely spend, even when your income is unpredictable.**

FlowMoney is a cash-flow planning application for freelancers, contractors, creators, and independent professionals with irregular income. It is designed to bring current funds, expected payments, upcoming obligations, and protected money into one understandable financial picture.

FlowMoney is non-custodial: it does not hold, transfer, or invest user funds. The MVP begins with manual financial data entry.

**Status:** early development. The repository contains Clerk authentication, first-time onboarding, current-funds entry, expected-income and obligation APIs, and an initial dashboard. The planning and financial model continue to evolve.

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
| Styling and components | Tailwind CSS, shared UI package, shadcn/ui configuration |
| API | NestJS, TypeScript |
| Database | PostgreSQL through Prisma |
| Financial logic | Shared `@flowmoney/calculations` package |
| Workspace management | pnpm workspaces; pnpm `12.4.2` |
| API tests | Vitest |
| API linting and formatting | Oxlint and Prettier |

Dependency versions are defined in the package manifests and resolved in `pnpm-lock.yaml`. Use the committed lockfile when installing.

Authentication uses Clerk in the web app and API. API requests verify Clerk bearer tokens and scope financial records to the authenticated local user.

## Repository structure

| Location | Responsibility |
| --- | --- |
| `apps/web/app/` | Web routes and layouts |
| `apps/web/components/` | Web-specific components |
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

### Configure the API

The dashboard and onboarding save data through the API. If the API is not running or cannot connect to PostgreSQL, the browser will report that its fetch failed.

Create `apps/api/.env` from the committed `apps/api/.env.example`, then set `DATABASE_URL` to a reachable PostgreSQL database and `CLERK_SECRET_KEY` to the secret for the Clerk instance used by the web app. Keep the actual `.env` file private and never commit it. The API loads this file on startup.

Generate Prisma Client and apply tracked migrations:

```bash
pnpm exec prisma generate --schema prisma/schema.prisma
pnpm --filter @flowmoney/api db:migrate:deploy
```

The migration command requires a reachable database. The migration adds onboarding completion state to `User`.

### Start the application

```bash
pnpm dev
```

`pnpm dev` starts both the Next.js web app and NestJS API. Open `http://localhost:3000`. New signed-in users are guided through onboarding; returning users go to the dashboard. Configure the Clerk public key for the web app in `apps/web/.env.local` as described by Clerk.

## Development commands

Run these from the repository root:

| Command | Purpose |
| --- | --- |
| `pnpm dev` | Start the web development server and API together |
| `pnpm dev:api` | Start the API in watch mode |
| `pnpm build` | Build the web application |
| `pnpm build:api` | Build the API |
| `pnpm typecheck` | Type-check the web workspace |
| `pnpm --filter @flowmoney/api test` | Run API unit tests |
| `pnpm --filter @flowmoney/api test:e2e` | Run API end-to-end tests |
| `pnpm --filter @flowmoney/api lint` | Run the API linter |
| `pnpm exec prisma generate --schema prisma/schema.prisma` | Generate Prisma Client from the root schema |
| `pnpm --filter @flowmoney/api db:migrate:deploy` | Apply tracked Prisma migrations |

The root build and type-check scripts target the web workspace; they do not verify the entire repository. API tests that initialize the database-backed application may require a configured test database. Existing tests do not establish coverage of the complete product.

## Current implementation and next milestones

| Area | Current state | Next work |
| --- | --- | --- |
| Web | Clerk auth, onboarding, current funds, income, obligations, and dashboard | Complete product flows and validation feedback |
| API | Clerk-guarded accounts, expected-income, obligations, dashboard, and user endpoints | Request validation and complete lifecycle workflows |
| Database | User onboarding timestamp and financial account, income, and obligation models | Align currency, protection, recurrence, and scenarios with the PRD |
| Calculations | Current-funds and initial Safe-to-Spend helpers | Specify and test decimal arithmetic, protection, runway, allocations, and scenarios |
| Supporting packages | Domain, validation, and config scaffolds | Establish shared contracts as features are implemented |

The current dashboard uses a provisional 10% buffer. The Safe-to-Spend helper clamps its result to zero and does not yet include protected savings. These behaviors need review against the Flow Engine specification.

API routes handling user financial data require a verified Clerk bearer token. Keep database and Clerk secret credentials in the API's local environment file; never commit them.

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
