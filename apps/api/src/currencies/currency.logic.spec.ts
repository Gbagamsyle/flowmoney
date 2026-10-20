import { describe, it, expect } from 'vitest';
import {
  CURRENCIES,
  convertAmount,
  currencyCode,
  originalCurrency,
  parseSnapshot,
  validateStoredAmount,
  sumMoney,
  validatePlanMinor,
} from './currency.logic.js';
describe('currency math and source identity', () => {
  it('validates source precision and sums exact decimal values', () => {
    expect(() => validateStoredAmount(1.5, 'JPY')).toThrow(/decimal places/);
    expect(() => validateStoredAmount(0, 'NGN')).toThrow();
    expect(() => validateStoredAmount(0, 'NGN', true)).not.toThrow();
    expect(sumMoney([0.1, 0.2], 'USD')).toBe(0.3);
    expect(() => validatePlanMinor(101, 'JPY')).toThrow(/whole/);
    expect(() => validatePlanMinor(100, 'JPY')).not.toThrow();
    expect(() => validatePlanMinor(101, 'USD')).not.toThrow();
    expect(() => sumMoney([90000000000000, 90000000000000], 'USD')).toThrow(
      /range/,
    );
  });
  const rates = { USD: 1, NGN: 1500, GBP: 0.8, JPY: 150, XOF: 600 };
  it('converts through a common base instead of relabeling or compounding prior estimates', () => {
    expect(convertAmount('150000', 'NGN', 'USD', rates)).toBe(100);
    expect(convertAmount('100', 'USD', 'NGN', rates)).toBe(150000);
    expect(convertAmount('150000', 'NGN', 'GBP', rates)).toBe(80);
    const record = Object.freeze({ amount: '150000', currency: 'NGN' });
    for (const target of ['USD', 'GBP', 'USD', 'NGN'])
      convertAmount(record.amount, record.currency, target, rates);
    expect(record).toEqual({ amount: '150000', currency: 'NGN' });
  });
  it('rounds once using the target currency exponent and exact decimal arithmetic', () => {
    expect(convertAmount('10.005', 'USD', 'USD', rates)).toBe(10.01);
    expect(convertAmount('-10.005', 'USD', 'USD', rates)).toBe(-10.01);
    expect(convertAmount('1.01', 'USD', 'JPY', rates)).toBe(152);
    expect(convertAmount('0.01', 'USD', 'XOF', rates)).toBe(6);
    expect(Object.is(convertAmount('-0.001', 'USD', 'USD', rates), -0)).toBe(
      false,
    );
  });
  it('never guesses missing source currencies or falls back to a unit rate', () => {
    expect(() => originalCurrency(null)).toThrow(
      /Confirm the original currency/,
    );
    expect(() => currencyCode('naira')).toThrow();
    expect(() => convertAmount('100', 'NGN', 'USD', {})).toThrow();
    expect(() => convertAmount('NaN', 'USD', 'NGN', rates)).toThrow();
    expect(() =>
      convertAmount('9999999999999999', 'USD', 'USD', rates),
    ).toThrow();
  });
  it('rejects incomplete, future, expired and malformed provider payloads', () => {
    const now = Date.now();
    const payload = {
      result: 'success',
      base_code: 'USD',
      rates: Object.fromEntries(
        CURRENCIES.map((c) => [c, c === 'USD' ? 1 : 2]),
      ),
      time_last_update_unix: Math.floor(now / 1000) - 10,
      time_next_update_unix: Math.floor(now / 1000) + 86400,
    };
    expect(parseSnapshot(payload).rates.NGN).toBe(2);
    for (const invalid of [
      { ...payload, result: 'error' },
      { ...payload, rates: { USD: 1 } },
      { ...payload, rates: { ...payload.rates, NGN: 0 } },
      { ...payload, time_last_update_unix: now / 1000 + 3600 },
      { ...payload, time_last_update_unix: now / 1000 - 4 * 86400 },
      { ...payload, time_next_update_unix: 0 },
    ])
      expect(() => parseSnapshot(invalid)).toThrow();
  });
});
