import { Module } from '@nestjs/common';
import { PrismaModule } from '../common/prisma/prisma.module.js';
import { ExpectedIncomeController } from './expected-income.controller.js';
import { ExpectedIncomeService } from './expected-income.service.js';

@Module({
  imports: [PrismaModule],
  controllers: [ExpectedIncomeController],
  providers: [ExpectedIncomeService],
})
export class ExpectedIncomeModule {}
