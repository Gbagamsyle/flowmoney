import { describe, expect, it } from 'vitest';
import {
  CATEGORIES,
  classify,
  csvTable,
  dateValue,
  minor,
  parseTable,
  pdfTable,
  summarize,
} from './statement.logic.js';
describe('statement rules', () => {
  it.each([
    ['salary payroll', 'IN', 'Income'],
    ['POS merchant', 'OUT', 'Purchase'],
    ['electricity', 'OUT', 'Bill'],
    ['MTN airtime', 'OUT', 'Airtime/Data'],
    ['transfer fee', 'OUT', 'Bank Fee'],
    ['ATM', 'OUT', 'Cash Withdrawal'],
    ['Piggyvest', 'OUT', 'Savings'],
    ['self transfer', 'OUT', 'Own-account Transfer'],
    ['NIP transfer', 'IN', 'External Transfer'],
    ['loan repayment', 'OUT', 'Loan'],
    ['Netflix', 'OUT', 'Subscription'],
    ['reversal', 'IN', 'Refund'],
    ['random credit', 'IN', 'Unknown'],
  ])('classifies %s conservatively', (description, direction, category) =>
    expect(classify(description, direction as 'IN' | 'OUT').category).toBe(
      category,
    ),
  );

  it.each([
    ['IKEDC electricity bill payment', 'OUT', 'Bill'],
    ['Transfer to EKEDC', 'OUT', 'Bill'],
    ['DSTV subscription payment', 'OUT', 'Bill'],
    ['Airtel broadband bill', 'OUT', 'Bill'],
    ['School fees payment', 'OUT', 'Bill'],
    ['Transfer to BetKing', 'OUT', 'Betting'],
    ['POS 1xBet', 'OUT', 'Betting'],
    ['Betway payout', 'IN', 'Betting Payout'],
    ['Transfer to Ada for BetKing', 'OUT', 'External Transfer'],
    ['BetKing refund', 'IN', 'Refund'],
    ['Transfer from BetKing', 'OUT', 'External Transfer'],
  ])('classifies bill/betting narrative %s conservatively', (description, direction, category) =>
    expect(classify(description, direction as 'IN' | 'OUT').category).toBe(category),
  );

  it('handles BOM, quoted commas, exact minor units and day-first dates', () => {
    const rows = parseTable(
      csvTable(
        '\uFEFFDate,Description,Debit,Credit\n31/01/2026,"POS, shop","1,234.56",\n01/02/2026,Salary,,5000.01',
      ),
      'NGN',
    );
    expect(rows[0]).toMatchObject({
      amountMinor: 123456,
      direction: 'OUT',
      date: '2026-01-31',
      sourceRow: 2,
    });
    expect(rows[1].amountMinor).toBe(500001);
  });
  it.each(['31/02/2026', '2026-13-01', '01/01/26', 'garbage'])(
    'rejects invalid date %s',
    (value) => expect(() => dateValue(value)).toThrow(),
  );
  it.each(['1,23.00', 'NaN', '100.001', '=1+1', '1e5'])(
    'rejects malformed money %s',
    (value) => expect(() => minor(value)).toThrow(),
  );
  it('does not silently drop malformed or conflicting rows', () => {
    expect(() =>
      parseTable(
        csvTable('Date,Description,Debit,Credit\n2026-01-01,POS,10,20'),
        'NGN',
      ),
    ).toThrow('Row 2');
    expect(() =>
      parseTable(
        csvTable('Date,Description,Amount,Direction\n2026-01-01,POS,-10,CR'),
        'NGN',
      ),
    ).toThrow('conflicts');
    expect(() =>
      parseTable(
        csvTable('Date,Description,Amount,Currency\n2026-01-01,POS,-10,USD'),
        'NGN',
      ),
    ).toThrow('currency');
  });
  it('rejects text-only/scanned PDFs without a readable transaction table', () =>
    expect(() => parseTable(pdfTable('No readable text'), 'NGN')).toThrow(
      'No supported',
    ));
  it('accepts clearly delimited digital PDF text tables', () =>
    expect(
      parseTable(
        pdfTable('Date\tDescription\tAmount\n2026-01-01\tPOS shop\t-10.50'),
        'NGN',
      )[0].amountMinor,
    ).toBe(1050));
  it('separates transfers and unknowns, includes empty months, and detects repeated income', () => {
    const rows = parseTable(
      csvTable(
        'Date,Description,Amount\n2026-01-01,Salary ACME 123,1000\n2026-03-01,Salary ACME 456,2000\n2026-03-02,NIP transfer,-100\n2026-03-03,POS shop,-50\n2026-03-04,unsure,-25',
      ),
      'NGN',
    );
    const summary = summarize(rows);
    expect(summary).toMatchObject({
      totalInflow: 3000,
      totalOutflow: 175,
      netCashFlow: 2825,
      averageMonthlyInflow: 1000,
      transfersOut: 100,
      classifiedSpending: 50,
      months: 3,
    });
    expect(summary.incomeSources[0]).toMatchObject({
      count: 2,
      activeMonths: 2,
      likelyRecurring: true,
    });
    expect(summarize([])).toMatchObject({
      start: null,
      months: 0,
      totalInflow: 0,
    });
  });
});
