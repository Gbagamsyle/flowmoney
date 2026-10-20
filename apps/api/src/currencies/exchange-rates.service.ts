import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service.js';
import {
  convertAmount,
  currencyCode,
  originalCurrency,
  parseSnapshot,
  type RateSnapshot,
} from './currency.logic.js';

export type Conversion = {
  target: string;
  estimated: boolean;
  asOf: string | null;
  stale: boolean;
  convert: (amount: string | number, from: string | null | undefined) => number;
};
@Injectable()
export class ExchangeRatesService {
  private cache: RateSnapshot | null = null;
  private pending: Promise<RateSnapshot> | null = null;
  private retryAt = 0;
  constructor(private readonly prisma: PrismaService) {}

  private usable(snapshot: RateSnapshot | null): snapshot is RateSnapshot {
    return (
      !!snapshot &&
      snapshot.asOf.getTime() <= Date.now() + 300000 &&
      Date.now() - snapshot.asOf.getTime() <= 72 * 3600000
    );
  }
  private async load(): Promise<RateSnapshot> {
    if (!this.cache) {
      const stored = await this.prisma.exchangeRateSnapshot.findUnique({
        where: { base: 'USD' },
      });
      if (stored) {
        try {
          this.cache = parseSnapshot({
            result: 'success',
            base_code: 'USD',
            rates: stored.rates,
            time_last_update_unix: stored.asOf.getTime() / 1000,
            time_next_update_unix: stored.nextUpdate.getTime() / 1000,
          });
        } catch {
          this.cache = null;
        }
      }
    }
    if (this.usable(this.cache) && this.cache.nextUpdate.getTime() > Date.now())
      return this.cache;
    if (Date.now() >= this.retryAt) {
      this.retryAt = Date.now() + 5 * 60000;
      try {
        // Fixed public request: no balances, identities, statements or caller-controlled URLs.
        const response = await fetch('https://open.er-api.com/v6/latest/USD', {
          signal: AbortSignal.timeout(5000),
          redirect: 'error',
        });
        if (!response.ok) throw new Error('Exchange-rate provider unavailable');
        const text = await response.text();
        if (text.length > 100000)
          throw new Error('Exchange-rate response too large');
        const snapshot = parseSnapshot(JSON.parse(text));
        await this.prisma.exchangeRateSnapshot.upsert({
          where: { base: 'USD' },
          create: { base: 'USD', ...snapshot },
          update: { ...snapshot, fetchedAt: new Date() },
        });
        this.cache = snapshot;
      } catch {
        // A recent persisted snapshot can still support a clearly labeled estimate.
      }
    }
    if (!this.usable(this.cache))
      throw new ServiceUnavailableException(
        'Exchange rates are unavailable. Original amounts are unchanged; try again later.',
      );
    return this.cache;
  }
  async quote(
    sources: (string | null | undefined)[],
    target: string,
  ): Promise<Conversion> {
    currencyCode(target);
    sources.forEach(originalCurrency);
    const estimated = sources.some((code) => code !== target);
    let snapshot: RateSnapshot | null = null;
    if (estimated) {
      this.pending ??= this.load().finally(() => {
        this.pending = null;
      });
      snapshot = await this.pending;
    }
    const rates = snapshot?.rates ?? {};
    return {
      target,
      estimated,
      asOf: snapshot?.asOf.toISOString() ?? null,
      stale: !!snapshot && snapshot.nextUpdate.getTime() <= Date.now(),
      convert: (amount, from) =>
        convertAmount(amount, originalCurrency(from), target, rates),
    };
  }
}
