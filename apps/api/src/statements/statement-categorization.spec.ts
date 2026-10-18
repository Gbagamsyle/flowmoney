import { describe, expect, it } from 'vitest';
import { classify, parseTable, summarize } from './statement.logic.js';
import {
  applySavedCategory,
  categoryAllowed,
  counterpartyFor,
  groupCounterparties,
} from './statement-categorization.js';

describe('merchant and transfer categorization', () => {
  it.each([
    ['Transfer to Ada', 'OUT', 'External Transfer'],
    ['Transfer to Merchant Ada', 'OUT', 'External Transfer'],
    ['Transfer to KFC', 'OUT', 'Food & Dining'],
    ['Transfer from KFC', 'IN', 'Merchant Credit'],
    ['Transfer from Ada', 'IN', 'External Transfer'],
    ['Transfer from Gift Samuel', 'IN', 'External Transfer'],
    ['Transfer from Restaurant John', 'IN', 'External Transfer'],
    ['Transfer to Ada for SportyBet', 'OUT', 'External Transfer'],
    ['Transfer to SportyBet', 'OUT', 'Betting'],
    ['Transfer from SportyBet', 'IN', 'Betting Payout'],
    ['POS Bet9ja', 'OUT', 'Betting'],
    ['Bet9ja withdrawal', 'IN', 'Betting Payout'],
    ['Transfer from SportyBet refund', 'IN', 'Refund'],
    ['SportyBet deposit fee', 'OUT', 'Bank Fee'],
    ['POS merchant', 'OUT', 'Purchase'],
    ['POS merchant', 'IN', 'Merchant Credit'],
    ['POS Garden Restaurant', 'OUT', 'Food & Dining'],
    ['Bolt ride', 'OUT', 'Transport'],
    ['Transfer from ACME payroll', 'IN', 'Income'],
    ['group collection', 'IN', 'Contribution'],
  ])('identifies %s with direction %s', (description, direction, category) => {
    expect(classify(description, direction as 'IN' | 'OUT').category).toBe(
      category,
    );
  });
  it('keeps incoming transfers, betting returns, contributions and merchant credits out of earned-income patterns', () => {
    const rows = parseTable(
      [
        ['Date', 'Description', 'Amount'],
        ['2026-01-01', 'Transfer from Ada', '100'],
        ['2026-02-01', 'Transfer from Ada', '100'],
        ['2026-02-02', 'Transfer from SportyBet', '50'],
        ['2026-02-03', 'group collection', '30'],
        ['2026-02-04', 'POS merchant', '20'],
      ],
      'NGN',
    );
    expect(summarize(rows).incomeSources).toEqual([]);
    expect(rows.every((r) => r.category !== 'Unknown')).toBe(true);
  });
  it('keeps a generic POS purchase separate from identifiable food or transport', () => {
    expect(classify('POS ACME', 'OUT').category).toBe('Purchase');
    expect(
      classify('Transfer to Ada for restaurant meal', 'OUT').category,
    ).toBe('External Transfer');
  });
  it('does not allow a remembered spending purpose on incoming credits', () => {
    expect(categoryAllowed('Betting', 'IN')).toBe(false);
    expect(categoryAllowed('Betting Payout', 'OUT')).toBe(false);
  });
});

describe('counterparty preferences', () => {
  it('groups only precise counterparties and preserves identifying digits', () => {
    expect(counterpartyFor('Transfer to Ada Ref 123', 'OUT')).toEqual({
      name: 'Ada',
      key: 'transfer:ada',
    });
    expect(counterpartyFor('Transfer to Ada Ref 999', 'OUT')?.key).toBe(
      'transfer:ada',
    );
    expect(counterpartyFor('Transfer to Shop 101', 'OUT')?.key).not.toBe(
      counterpartyFor('Transfer to Shop 102', 'OUT')?.key,
    );
    expect(counterpartyFor('Transfer from Ada', 'OUT')).toBeNull();
    expect(counterpartyFor('NIP 1234567', 'IN')).toBeNull();
    expect(counterpartyFor('POS ACME Ref 123', 'OUT')?.key).toBe(
      'merchant:acme',
    );
  });
  it('applies exact user preferences only to their saved direction and currency, and preserves reversals', () => {
    const rule = {
      id: 'preference',
      counterpartyKey: 'transfer:ada',
      direction: 'IN',
      currency: 'NGN',
      category: 'Contribution',
    };
    const row = {
      description: 'Transfer from Ada',
      direction: 'IN' as const,
      ...classify('Transfer from Ada', 'IN'),
    };
    expect(applySavedCategory(row, 'NGN', [rule])).toMatchObject({
      category: 'Contribution',
      categorySource: 'saved-preference',
    });
    expect(applySavedCategory(row, 'USD', [rule]).category).toBe(
      'External Transfer',
    );
    expect(
      applySavedCategory(
        { ...row, description: 'Transfer from Adanna' },
        'NGN',
        [rule],
      ).category,
    ).toBe('External Transfer');
    expect(
      applySavedCategory(
        { ...row, description: 'Transfer from Ada', category: 'Refund' },
        'NGN',
        [rule],
      ).category,
    ).toBe('Refund');
    expect(
      applySavedCategory(
        { ...row, description: 'Transfer to Ada', direction: 'OUT' },
        'NGN',
        [rule],
      ).category,
    ).toBe('External Transfer');
  });
  it('separates opposite-direction groups and returns only repeated counterparties', () => {
    const rows = [
      {
        id: 'a',
        description: 'Transfer from Ada Ref 1',
        direction: 'IN',
        amountMinor: 1000,
        category: 'External Transfer',
      },
      {
        id: 'b',
        description: 'Transfer from Ada Ref 2',
        direction: 'IN',
        amountMinor: 2000,
        category: 'External Transfer',
      },
      {
        id: 'c',
        description: 'Transfer to Ada',
        direction: 'OUT',
        amountMinor: 500,
        category: 'External Transfer',
      },
    ];
    const groups = groupCounterparties(rows);
    expect(groups).toHaveLength(1);
    expect(groups[0]).toMatchObject({
      direction: 'IN',
      count: 2,
      total: 30,
      transactionIds: ['a', 'b'],
    });
  });
});
