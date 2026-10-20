import { BadRequestException, ConflictException } from '@nestjs/common';
import { Prisma } from '@prisma/client';

export const CURRENCIES = [
  'USD',
  'GBP',
  'EUR',
  'NGN',
  'CAD',
  'AUD',
  'GHS',
  'KES',
  'ZAR',
  'TZS',
  'UGX',
  'RWF',
  'XOF',
  'XAF',
  'INR',
  'JPY',
  'CNY',
  'SGD',
  'NZD',
  'CHF',
  'SEK',
  'NOK',
  'DKK',
  'PLN',
  'BRL',
  'MXN',
  'AED',
  'SAR',
  'TRY',
  'EGP',
] as const;
export function currencyCode(value: unknown): string {
  if (
    typeof value !== 'string' ||
    !(CURRENCIES as readonly string[]).includes(value)
  )
    throw new BadRequestException('Choose a supported currency.');
  return value;
}
export function originalCurrency(value: unknown): string {
  if (!value)
    throw new ConflictException({
      code: 'CURRENCY_REVIEW_REQUIRED',
      message:
        'Confirm the original currency of older income and obligations in Settings before viewing combined totals.',
    });
  return currencyCode(value);
}
const digitsCache = new Map<string, number>();
export function currencyDigits(currency: string): number {
  if (digitsCache.has(currency)) return digitsCache.get(currency)!;
  const digits = new Intl.NumberFormat('en', {
    style: 'currency',
    currency,
  }).resolvedOptions().maximumFractionDigits!;
  digitsCache.set(currency, digits);
  return digits;
}
const Decimal = Prisma.Decimal.clone({
  precision: 40,
  rounding: Prisma.Decimal.ROUND_HALF_UP,
});
export function convertAmount(
  value: Prisma.Decimal.Value,
  from: string,
  to: string,
  rates: Record<string, number>,
): number {
  currencyCode(from);
  currencyCode(to);
  const amount = new Decimal(value);
  const sourceRate = from === to ? 1 : rates[from];
  const targetRate = from === to ? 1 : rates[to];
  if (
    !amount.isFinite() ||
    !Number.isFinite(sourceRate) ||
    !Number.isFinite(targetRate) ||
    sourceRate <= 0 ||
    targetRate <= 0
  )
    throw new BadRequestException(
      'A supported exchange rate or amount is unavailable.',
    );
  const result = amount
    .mul(targetRate)
    .div(sourceRate)
    .toDecimalPlaces(currencyDigits(to));
  if (
    result
      .abs()
      .mul(10 ** currencyDigits(to))
      .gt(Number.MAX_SAFE_INTEGER)
  )
    throw new BadRequestException(
      'The converted amount exceeds the supported display range.',
    );
  return result.isZero() ? 0 : result.toNumber();
}
export type RateSnapshot = {
  rates: Record<string, number>;
  asOf: Date;
  nextUpdate: Date;
};
export function parseSnapshot(data: unknown, now = Date.now()): RateSnapshot {
  const p = data as any;
  if (
    !p ||
    p.result !== 'success' ||
    p.base_code !== 'USD' ||
    !p.rates ||
    Array.isArray(p.rates)
  )
    throw new Error('Invalid exchange-rate response');
  const asOf = new Date(p.time_last_update_unix * 1000);
  const nextUpdate = new Date(p.time_next_update_unix * 1000);
  if (
    !Number.isFinite(asOf.getTime()) ||
    asOf.getTime() > now + 300000 ||
    asOf.getTime() < now - 72 * 3600000 ||
    !Number.isFinite(nextUpdate.getTime()) ||
    nextUpdate <= asOf ||
    nextUpdate.getTime() > now + 48 * 3600000
  )
    throw new Error('Invalid exchange-rate timestamps');
  const rates: Record<string, number> = {};
  for (const code of CURRENCIES) {
    const rate = p.rates[code];
    if (
      typeof rate !== 'number' ||
      !Number.isFinite(rate) ||
      rate <= 0 ||
      rate > 1e12
    )
      throw new Error('Incomplete exchange-rate response');
    rates[code] = rate;
  }
  if (rates.USD !== 1) throw new Error('Invalid base exchange rate');
  return { rates, asOf, nextUpdate };
}

export function validateStoredAmount(
  value: unknown,
  currency: string,
  allowZero = false,
) {
  if (
    typeof value !== 'number' ||
    !Number.isFinite(value) ||
    value < 0 ||
    (!allowZero && value === 0) ||
    value > 1000000000000
  )
    throw new BadRequestException('Enter a supported positive amount.');
  const amount = new Decimal(value);
  if (!amount.equals(amount.toDecimalPlaces(currencyDigits(currency))))
    throw new BadRequestException(
      `Amounts in ${currency} allow ${currencyDigits(currency)} decimal places.`,
    );
}
export function sumMoney(
  values: (string | number)[],
  currency: string,
): number {
  const total = values.reduce((sum, amount) => sum.add(amount), new Decimal(0));
  return convertAmount(total.toString(), currency, currency, {});
}

// Planning's existing storage uses hundredths for every currency; zero-decimal sources must use whole units.
export function validatePlanMinor(value: number, currency: string) {
  currencyCode(currency);
  const step = 10 ** Math.max(0, 2 - currencyDigits(currency));
  if (value % step !== 0)
    throw new BadRequestException(
      `Use whole ${currency} amounts for this plan.`,
    );
}
