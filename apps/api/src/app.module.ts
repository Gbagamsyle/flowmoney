import { HealthModule } from './health/health.module.js';
import { CurrenciesModule } from './currencies/currencies.module.js';
import { PlanningModule } from './planning/planning.module.js';
import { StatementsModule } from './statements/statements.module.js';
import { Module } from '@nestjs/common';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { AccountsModule } from './accounts/accounts.module.js';
import { DashboardModule } from './dashboard/dashboard.module.js';
import { ExpectedIncomeModule } from './expected-income/expected-income.module.js';
import { ObligationsModule } from './obligations/obligations.module.js';
import { UsersModule } from './users/users.module.js';
import { ScenariosModule } from './scenarios/scenarios.module.js';

@Module({
  imports: [
    HealthModule,
    CurrenciesModule,
    PlanningModule,
    StatementsModule,
    AccountsModule,
    ExpectedIncomeModule,
    ObligationsModule,
    DashboardModule,
    ScenariosModule,
    UsersModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
