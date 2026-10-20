import { describe, expect, it } from 'vitest';
import { pdfPositionTable, type PdfPage } from './pdf-layout.js';
import { parseTable } from './statement.logic.js';
const page = (header: string[]): PdfPage => ({
  items: [
    ...header.map((text, i) => ({ text, x: i * 150, y: 700, width: 60 })),
    { text: '2026-01-01', x: 0, y: 680, width: 70 },
    { text: 'Salary', x: 150, y: 680, width: 40 },
    { text: '100.00', x: 450, y: 680, width: 45 },
  ],
});
describe('PDF column layout', () => {
  it('preserves empty debit cells instead of shifting credits into debits', () => {
    expect(
      pdfPositionTable([page(['Date', 'Description', 'Debit', 'Credit'])])[1],
    ).toEqual(['2026-01-01', 'Salary', '', '100.00']);
  });
  it('reuses the last table layout on continuation pages without headers', () => {
    const continuation: PdfPage = {
      items: [
        { text: '2026-01-02', x: 0, y: 700, width: 70 },
        { text: 'Rent', x: 150, y: 700, width: 35 },
        { text: '250.00', x: 300, y: 700, width: 45 },
      ],
    };
    const rows = parseTable(
      pdfPositionTable([
        page(['Date', 'Description', 'Debit', 'Credit']),
        continuation,
      ]),
      'NGN',
    );
    expect(rows).toHaveLength(2);
    expect(rows[1]).toMatchObject({
      date: '2026-01-02',
      description: 'Rent',
      amountMinor: 25000,
      direction: 'OUT',
    });
  });

  it('parses a long statement whose continuation pages omit repeated headers', () => {
    const continuationPages = Array.from(
      { length: 92 },
      (_, index): PdfPage => ({
        items: [
          {
            text: `2026-02-${String((index % 28) + 1).padStart(2, '0')}`,
            x: 0,
            y: 700,
            width: 70,
          },
          { text: `Transaction ${index + 1}`, x: 150, y: 700, width: 90 },
          { text: '10.00', x: 300, y: 700, width: 45 },
        ],
      }),
    );
    const rows = parseTable(
      pdfPositionTable([
        page(['Date', 'Description', 'Debit', 'Credit']),
        ...continuationPages,
      ]),
      'NGN',
    );
    expect(rows).toHaveLength(93);
  });

  it('accepts a later page with a changed column order and signed-amount layout', () => {
    const changedLayout: PdfPage = {
      items: [
        { text: 'Date', x: 0, y: 740, width: 40 },
        { text: 'Description', x: 100, y: 740, width: 75 },
        { text: 'Direction', x: 330, y: 740, width: 55 },
        { text: 'Transaction Amount', x: 440, y: 740, width: 110 },
        { text: '2026-01-02', x: 0, y: 700, width: 70 },
        { text: 'Salary', x: 100, y: 700, width: 40 },
        { text: 'CR', x: 330, y: 700, width: 15 },
        { text: '500.00', x: 440, y: 700, width: 40 },
      ],
    };
    const rows = parseTable(
      pdfPositionTable([
        page(['Date', 'Description', 'Debit', 'Credit']),
        changedLayout,
      ]),
      'NGN',
    );
    expect(rows).toHaveLength(2);
    expect(rows[1]).toMatchObject({
      date: '2026-01-02',
      description: 'Salary',
      amountMinor: 50000,
      direction: 'IN',
    });
  });

  it('joins wrapped descriptions with no date or amount into the preceding transaction', () => {
    const wrapped: PdfPage = {
      items: [{ text: 'international transfer', x: 150, y: 660, width: 120 }],
    };
    const rows = parseTable(
      pdfPositionTable([
        page(['Date', 'Description', 'Debit', 'Credit']),
        wrapped,
      ]),
      'NGN',
    );
    expect(rows[0].description).toBe('Salary international transfer');
  });
});

describe('wrapped Moniepoint timestamps', () => {
  const header = [
    'Date',
    'Narration',
    'Reference',
    'Debit',
    'Credit',
    'Balance',
  ].map((text, i) => ({ text, x: i * 150, y: 700, width: 60 }));
  it('groups centered money and wrapped dates/narrations into one transaction', () => {
    const rows = parseTable(
      pdfPositionTable([
        {
          items: [
            ...header,
            { text: '2026-01-01T07:', x: 0, y: 660, width: 90 },
            { text: '34:56', x: 0, y: 647, width: 30 },
            { text: 'Transfer from', x: 150, y: 666, width: 80 },
            { text: 'Synthetic sender', x: 150, y: 653, width: 90 },
            { text: '0.00', x: 450, y: 654, width: 30 },
            { text: '100.00', x: 600, y: 654, width: 40 },
            { text: '2026-01-02T09:', x: 0, y: 590, width: 90 },
            { text: '12', x: 0, y: 577, width: 30 },
            { text: 'POS synthetic shop', x: 150, y: 590, width: 100 },
            { text: '12.50', x: 450, y: 584, width: 35 },
            { text: '0.00', x: 600, y: 584, width: 30 },
          ],
        },
      ]),
      'NGN',
    );
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({
      date: '2026-01-01',
      description: 'Transfer from Synthetic sender',
      direction: 'IN',
      amountMinor: 10000,
    });
    expect(rows[1]).toMatchObject({
      date: '2026-01-02',
      direction: 'OUT',
      amountMinor: 1250,
    });
  });
  it('joins a row split across a page without repeating the header', () => {
    const rows = parseTable(
      pdfPositionTable([
        {
          items: [
            ...header,
            { text: '2026-01-01T07:', x: 0, y: 40, width: 90 },
            { text: 'Transfer from', x: 150, y: 45, width: 80 },
            { text: '0.00', x: 450, y: 35, width: 30 },
            { text: '100.00', x: 600, y: 35, width: 40 },
          ],
        },
        {
          items: [
            { text: '34:56', x: 0, y: 740, width: 30 },
            { text: 'Synthetic sender', x: 150, y: 740, width: 90 },
            { text: '2026-01-02T09:', x: 0, y: 660, width: 90 },
            { text: '12:00', x: 0, y: 647, width: 30 },
            { text: 'POS synthetic shop', x: 150, y: 660, width: 100 },
            { text: '12.50', x: 450, y: 654, width: 35 },
            { text: '0.00', x: 600, y: 654, width: 30 },
          ],
        },
      ]),
      'NGN',
    );
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({
      description: 'Transfer from Synthetic sender',
      amountMinor: 10000,
    });
  });
  it('rejects incomplete timestamps instead of dropping date fragments', () => {
    expect(() =>
      pdfPositionTable([
        {
          items: [
            ...header,
            { text: '2026-01-01T07:', x: 0, y: 660, width: 90 },
          ],
        },
      ]),
    ).toThrow('Incomplete transaction timestamp');
  });
});
