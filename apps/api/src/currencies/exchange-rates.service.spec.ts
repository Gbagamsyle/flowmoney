import { afterEach, describe, expect, it, vi } from 'vitest';
import { ExchangeRatesService } from './exchange-rates.service.js';
import { CURRENCIES } from './currency.logic.js';
const payload = (age = 10000) => ({
  result: 'success',
  base_code: 'USD',
  rates: Object.fromEntries(CURRENCIES.map((c) => [c, c === 'USD' ? 1 : 1500])),
  time_last_update_unix: Math.floor((Date.now() - age) / 1000),
  time_next_update_unix: Math.floor((Date.now() - age + 86400000) / 1000),
});
const db = (data: any = null) => ({
  exchangeRateSnapshot: {
    findUnique: vi.fn().mockResolvedValue(data),
    upsert: vi.fn().mockResolvedValue({}),
  },
});
afterEach(() => vi.unstubAllGlobals());
describe('persistent exchange-rate cache', () => {
  it('does not contact the provider for same-currency displays, including offline use', async () => {
    const fetcher = vi.fn();
    vi.stubGlobal('fetch', fetcher);
    const prisma = db();
    const service = new ExchangeRatesService(prisma as any);
    const quote = await service.quote(['NGN'], 'NGN');
    expect(quote.convert('100', 'NGN')).toBe(100);
    expect(quote.estimated).toBe(false);
    expect(fetcher).not.toHaveBeenCalled();
    expect(prisma.exchangeRateSnapshot.findUnique).not.toHaveBeenCalled();
  });
  it('deduplicates concurrent requests, persists a validated snapshot, and sends no financial data', async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValue(new Response(JSON.stringify(payload())));
    vi.stubGlobal('fetch', fetcher);
    const prisma = db();
    const service = new ExchangeRatesService(prisma as any);
    const quotes = await Promise.all([
      service.quote(['NGN'], 'USD'),
      service.quote(['USD'], 'NGN'),
    ]);
    expect(quotes[0].convert('150000', 'NGN')).toBe(100);
    expect(quotes[1].convert('100', 'USD')).toBe(150000);
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(fetcher.mock.calls[0][0]).toBe(
      'https://open.er-api.com/v6/latest/USD',
    );
    expect(fetcher.mock.calls[0][1]).not.toHaveProperty('body');
    expect(prisma.exchangeRateSnapshot.upsert).toHaveBeenCalledOnce();
    await service.quote(['NGN'], 'USD');
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
  it('uses a fresh persisted snapshot after restart and labels expired-but-recent fallback stale', async () => {
    const data = payload();
    const stored = {
      rates: data.rates,
      asOf: new Date(data.time_last_update_unix * 1000),
      nextUpdate: new Date(data.time_next_update_unix * 1000),
    };
    const fetcher = vi.fn().mockRejectedValue(new Error('offline'));
    vi.stubGlobal('fetch', fetcher);
    const fresh = await new ExchangeRatesService(db(stored) as any).quote(
      ['NGN'],
      'USD',
    );
    expect(fresh.stale).toBe(false);
    expect(fetcher).not.toHaveBeenCalled();
    const old = payload(2 * 86400000);
    const oldStored = {
      rates: old.rates,
      asOf: new Date(old.time_last_update_unix * 1000),
      nextUpdate: new Date(old.time_next_update_unix * 1000),
    };
    const service = new ExchangeRatesService(db(oldStored) as any);
    expect((await service.quote(['NGN'], 'USD')).stale).toBe(true);
    await service.quote(['NGN'], 'USD');
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
  it('fails closed without a usable snapshot and rejects unconfirmed source currencies before fetching', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));
    const service = new ExchangeRatesService(db() as any);
    await expect(service.quote(['NGN'], 'USD')).rejects.toThrow(/unavailable/);
    await expect(service.quote([null], 'USD')).rejects.toThrow(/Confirm/);
  });
});
