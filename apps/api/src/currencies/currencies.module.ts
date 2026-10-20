import { Module } from '@nestjs/common';
import { PrismaModule } from '../common/prisma/prisma.module.js';
import { CurrenciesController } from './currencies.controller.js';
import { CurrenciesService } from './currencies.service.js';
import { ExchangeRatesService } from './exchange-rates.service.js';
@Module({
  imports: [PrismaModule],
  controllers: [CurrenciesController],
  providers: [CurrenciesService, ExchangeRatesService],
  exports: [ExchangeRatesService],
})
export class CurrenciesModule {}
