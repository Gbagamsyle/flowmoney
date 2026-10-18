import { describe, expect, it } from 'vitest';
import { classify, parseTable, summarize } from './statement.logic.js';
describe('transaction direction and category', () => {
  it.each([
    'MTN airtime',
    'Airtel data bundle',
    'Netflix',
    'electricity',
    'ATM cash withdrawal',
    'bank fee',
  ])('does not call an incoming credit spending: %s', (description) => {
    expect(classify(description, 'IN').category).toBe('Unknown');
    expect(classify(description, 'IN').confidence).toBeLessThan(0.8);
  });
  it('keeps explicit airtime reversals in Refund and airtime transfers as transfers', () => {
    expect(classify('MTN airtime reversal', 'IN').category).toBe('Refund');
    expect(classify('NIP transfer MTN', 'IN').category).toBe(
      'External Transfer',
    );
    expect(classify('MTN airtime', 'OUT').category).toBe('Airtime/Data');
  });
  it('does not count incoming telecom credits as airtime purchases', () => {
    const rows = parseTable(
      [
        ['Date', 'Description', 'Amount'],
        ['2026-01-01', 'MTN airtime', '-100'],
        ['2026-01-02', 'MTN airtime', '200'],
        ['2026-01-03', 'MTN airtime refund', '50'],
      ],
      'NGN',
    );
    const summary = summarize(rows);
    expect(summary.categoryTotals['Airtime/Data']).toEqual({
      inflow: 0,
      outflow: 100,
    });
    expect(summary.categoryTotals.Refund.inflow).toBe(50);
    expect(summary.categoryTotals.Unknown.inflow).toBe(200);
  });
});
