import { describe, expect, it } from 'vitest';
import {
  monthRange,
  summarizePlan,
  type PlanCategory,
  type PlanTransaction,
  type Commitment,
  type PendingIncome,
} from './planning.logic.js';
const category: PlanCategory = {
  id: 'food',
  name: 'Food',
  group: 'Everyday spending',
  kind: 'EXPENSE',
  allocatedMinor: 10000,
  targetMinor: 0,
  savedMinor: 0,
  targetDate: null,
  matches: ['Purchase', 'Bill'],
};
const row: PlanTransaction = {
  id: 'row',
  date: '2026-10-02',
  description: 'Synthetic purchase',
  amountMinor: 4000,
  direction: 'OUT',
  category: 'Purchase',
  importId: 'import',
};
const bill: Commitment = {
  id: 'bill',
  title: 'Rent',
  date: '2026-10-22',
  amountMinor: 20000,
  status: 'PENDING',
};
const receipt: PendingIncome = {
  id: 'salary',
  title: 'Salary',
  date: '2026-10-20',
  amountMinor: 50000,
  status: 'EXPECTED',
  confidence: 'CONFIRMED',
};
const base = {
  month: '2026-10',
  today: '2026-10-18',
  fundsMinor: 100000,
  bufferMinor: 10000,
  categories: [category],
  transactions: [row],
  links: [],
  obligations: [bill],
  income: [receipt],
};
describe('monthly planning arithmetic', () => {
  it('reserves remaining allocation without subtracting recorded spending from current funds again', () => {
    const result = summarizePlan(base);
    expect(result.categories[0]).toMatchObject({
      spentMinor: 4000,
      remainingMinor: 6000,
    });
    expect(result.unallocatedMinor).toBe(64000);
    expect(result.expectedMinor).toBe(50000);
    expect(result.unallocatedMinor).not.toBe(114000);
  });
  it('links one payment to a commitment instead of counting it as category spending too', () => {
    const result = summarizePlan({
      ...base,
      links: [
        {
          transactionId: 'row',
          categoryId: null,
          obligationId: 'bill',
          ignored: false,
        },
      ],
    });
    expect(result.categories[0].spentMinor).toBe(0);
    expect(result.obligations[0]).toMatchObject({
      paidMinor: 4000,
      outstandingMinor: 16000,
    });
    expect(result.unallocatedMinor).toBe(64000);
  });
  it('does not turn transfers, savings, loans, withdrawals or incoming money into spending', () => {
    const transactions = [
      'External Transfer',
      'Own-account Transfer',
      'Savings',
      'Loan',
      'Cash Withdrawal',
    ].map((category, index) => ({ ...row, id: String(index), category }));
    const result = summarizePlan({
      ...base,
      transactions: [
        ...transactions,
        { ...row, id: 'credit', direction: 'IN' },
      ],
    });
    expect(result.categories[0].spentMinor).toBe(0);
    expect(result.unmappedCount).toBe(5);
  });
  it('allows a user-confirmed transfer purpose and an explicit separate movement', () => {
    const result = summarizePlan({
      ...base,
      transactions: [{ ...row, category: 'External Transfer' }],
      links: [
        {
          transactionId: 'row',
          categoryId: 'food',
          obligationId: null,
          ignored: false,
        },
      ],
    });
    expect(result.categories[0].spentMinor).toBe(4000);
    const ignored = summarizePlan({
      ...base,
      links: [
        {
          transactionId: 'row',
          categoryId: null,
          obligationId: null,
          ignored: true,
        },
      ],
    });
    expect(ignored.categories[0].spentMinor).toBe(0);
    expect(ignored.unmappedCount).toBe(0);
  });
  it('uses savings target language and reserves both previously earmarked and monthly allocations', () => {
    const goal = {
      ...category,
      id: 'goal',
      kind: 'SAVINGS',
      allocatedMinor: 5000,
      savedMinor: 20000,
      targetMinor: 50000,
      matches: [],
    };
    const result = summarizePlan({ ...base, categories: [goal] });
    expect(result.categories[0]).toMatchObject({
      spentMinor: 0,
      remainingMinor: 25000,
      stillNeededMinor: 25000,
    });
    expect(result.unallocatedMinor).toBe(45000);
  });
  it('shows overspending without creating a negative reserve or crediting future income', () => {
    const result = summarizePlan({
      ...base,
      fundsMinor: 1000,
      transactions: [{ ...row, amountMinor: 15000 }],
    });
    expect(result.categories[0]).toMatchObject({
      remainingMinor: 0,
      overspentMinor: 5000,
    });
    expect(result.unallocatedMinor).toBe(-29000);
  });
  it('does not reserve paid/skipped commitments or blindly pay past bills from statement text', () => {
    const result = summarizePlan({
      ...base,
      obligations: [
        { ...bill, status: 'PAID' },
        { ...bill, id: 'skip', status: 'SKIPPED' },
      ],
    });
    expect(result.protectedMinor).toBe(0);
    expect(result.categories[0].spentMinor).toBe(4000);
  });
  it('keeps conservative and confirmed-income projections separate, with bills first on the same date', () => {
    const result = summarizePlan({
      ...base,
      income: [
        { ...receipt, date: bill.date },
        { ...receipt, id: 'late', date: '2026-10-01' },
        { ...receipt, id: 'uncertain', confidence: 'UNCERTAIN' },
        { ...receipt, id: 'partial', status: 'PARTIAL' },
        { ...receipt, id: 'delayed', status: 'DELAYED' },
      ],
    });
    expect(result.timeline.filter((e) => e.projectedMinor > 0)).toHaveLength(1);
    const sameDay = result.timeline.filter((e) => e.date === bill.date);
    expect(sameDay[0].kind).toBe('OBLIGATION');
    expect(sameDay.at(-1)?.projectedBalanceMinor).toBeGreaterThan(
      sameDay.at(-1)?.currentOnlyMinor ?? 0,
    );
  });
  it('reserves later commitments before projecting the selected month', () => {
    const result = summarizePlan({
      ...base,
      obligations: [
        bill,
        { ...bill, id: 'annual', date: '2027-01-01', amountMinor: 10000 },
      ],
    });
    expect(result.protectedMinor).toBe(30000);
    expect(result.timeline.at(-1)?.currentOnlyMinor).toBe(54000);
    expect(result.unallocatedMinor).toBe(54000);
  });
  it('labels coverage by actual recorded dates and does not project a past month', () => {
    expect(summarizePlan(base)).toMatchObject({
      recordedThrough: '2026-10-02',
      recordedFrom: '2026-10-02',
    });
    expect(summarizePlan({ ...base, today: '2026-11-01' }).timeline).toEqual(
      [],
    );
    expect(
      summarizePlan({ ...base, transactions: [] }).recordedThrough,
    ).toBeNull();
  });
  it('validates months and handles leap-year and year-end boundaries', () => {
    expect(monthRange('2028-02').end.toISOString()).toBe(
      '2028-03-01T00:00:00.000Z',
    );
    expect(monthRange('2026-12').end.toISOString()).toBe(
      '2027-01-01T00:00:00.000Z',
    );
    for (const month of [
      '2026-00',
      '2026-13',
      '2026-2',
      '../../file',
      '1900-01',
    ])
      expect(() => monthRange(month)).toThrow();
  });
});
