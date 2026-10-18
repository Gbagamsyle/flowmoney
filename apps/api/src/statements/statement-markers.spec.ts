import { describe, expect, it } from 'vitest';
import { minor, parseTable } from './statement.logic.js';
import { pdfPositionTable, type PdfPage } from './pdf-layout.js';
describe('bank statement export markers', () => {
  it('treats a double dash as an empty debit/credit cell', () => {
    expect(minor('--')).toBe(0);
    expect(
      parseTable(
        [
          ['Date', 'Description', 'Debit', 'Credit'],
          ['10 Jan 2026', 'Synthetic credit', '--', '25.50'],
        ],
        'NGN',
      )[0],
    ).toMatchObject({ amountMinor: 2550, direction: 'IN' });
    expect(() => minor('--25.50')).toThrow();
  });
  it('ignores an explicit period summary between tables without importing it as a row', () => {
    const page: PdfPage = {
      items: [
        { text: 'Date', x: 0, y: 740, width: 40 },
        { text: 'Description', x: 100, y: 740, width: 70 },
        { text: 'Debit', x: 300, y: 740, width: 40 },
        { text: 'Credit', x: 400, y: 740, width: 40 },
        { text: '10 Jan 2026', x: 0, y: 700, width: 70 },
        { text: 'Synthetic purchase', x: 100, y: 700, width: 90 },
        { text: '25.50', x: 300, y: 700, width: 35 },
        {
          text: 'Savings Account Period: 01 Jan 2026 - 31 Jan 2026',
          x: 100,
          y: 650,
          width: 300,
        },
        {
          text: 'Opening Balance Total Debit Debit Count',
          x: 100,
          y: 620,
          width: 300,
        },
      ],
    };
    const rows = parseTable(pdfPositionTable([page]), 'NGN');
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      date: '2026-01-10',
      description: 'Synthetic purchase',
      amountMinor: 2550,
    });
  });
  it('still rejects missing dates on transaction-looking rows', () => {
    expect(() =>
      parseTable(
        [
          ['Date', 'Description', 'Debit', 'Credit'],
          ['', 'Payment', '25.50', ''],
        ],
        'NGN',
      ),
    ).toThrow('Row 2');
  });
  it('keeps separately rendered currency units out of the column boundaries', () => {
    const page: PdfPage = {
      items: [
        { text: 'Date', x: 0, y: 740, width: 40 },
        { text: 'Description', x: 100, y: 740, width: 70 },
        { text: 'Debit', x: 300, y: 740, width: 24 },
        { text: '(₦)', x: 327, y: 740, width: 10 },
        { text: 'Credit', x: 350, y: 740, width: 26 },
        { text: '(₦)', x: 378, y: 740, width: 12 },
        { text: 'Balance After', x: 420, y: 746, width: 70 },
        { text: '(₦)', x: 420, y: 734, width: 10 },
        { text: '10 Jan 2026', x: 0, y: 700, width: 70 },
        { text: 'Synthetic purchase', x: 100, y: 700, width: 90 },
        { text: '125.50', x: 300, y: 700, width: 55 },
        { text: '--', x: 355, y: 700, width: 12 },
        { text: '1000.00', x: 420, y: 700, width: 50 },
      ],
    };
    const rows = parseTable(pdfPositionTable([page]), 'NGN');
    expect(rows[0]).toMatchObject({ amountMinor: 12550, direction: 'OUT' });
  });
});
