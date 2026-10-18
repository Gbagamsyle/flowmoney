import { describe, expect, it } from 'vitest';
import { dateValue, parseTable } from './statement.logic.js';
describe('statement dates with month names', () => {
  it.each([
    ['10 Jan 2026', '2026-01-10'],
    ['1 January 2026', '2026-01-01'],
    ['29-Feb-2024', '2024-02-29'],
    [' 03 SEP 2026 ', '2026-09-03'],
    ['31 December 2026', '2026-12-31'],
    ['2\u00a0Oct\u00a02026', '2026-10-02'],
  ])('normalizes %s without locale-dependent guessing', (input, expected) =>
    expect(dateValue(input)).toBe(expected),
  );
  it.each([
    '29 Feb 2026',
    '31 Apr 2026',
    '10 Foo 2026',
    '10 Jan 26',
    'Jan 10 2026',
    '10 Jan 2026 extra',
  ])('rejects invalid or ambiguous date %s', (input) =>
    expect(() => dateValue(input)).toThrow(),
  );
  it('parses named-month dates in a debit/credit statement table', () => {
    expect(
      parseTable(
        [
          ['Date', 'Description', 'Debit', 'Credit'],
          ['10 Jan 2026', 'Synthetic purchase', '25.50', ''],
        ],
        'NGN',
      )[0],
    ).toMatchObject({
      date: '2026-01-10',
      amountMinor: 2550,
      direction: 'OUT',
    });
  });
});
