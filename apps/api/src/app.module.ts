import { Module } from '@nestjs/common';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { AccountsModule } from './accounts/accounts.module.js';
import { DashboardModule } from './dashboard/dashboard.module.js';
import { ExpectedIncomeModule } from './expected-income/expected-income.module.js';
import { ObligationsModule } from './obligations/obligations.module.js';
import { UsersModule } from './users/users.module.js';

@Module({
  imports: [AccountsModule, ExpectedIncomeModule, ObligationsModule, DashboardModule, UsersModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
