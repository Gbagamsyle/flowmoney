import { describe, expect, it } from 'vitest';
import ExcelJS from 'exceljs';
import { zipSync, strToU8 } from 'fflate';
import { extract } from './statement.extract.js';
import { parseTable } from './statement.logic.js';

function pdf(lines: string[][]) {
  const stream = lines
    .map((cells, row) =>
      cells
        .map(
          (cell, col) =>
            `BT /F1 10 Tf 1 0 0 1 ${40 + col * 180} ${750 - row * 20} Tm (${cell}) Tj ET`,
        )
        .join('\n'),
    )
    .join('\n');
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 650 800] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
    `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`,
  ];
  let text = '%PDF-1.4\n';
  const offsets = [0];
  objects.forEach((object, i) => {
    offsets.push(text.length);
    text += `${i + 1} 0 obj\n${object}\nendobj\n`;
  });
  const xref = text.length;
  text += `xref\n0 6\n0000000000 65535 f \n${offsets
    .slice(1)
    .map((n) => String(n).padStart(10, '0') + ' 00000 n \n')
    .join('')}trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return Buffer.from(text);
}
describe('binary statement extraction', () => {
  it('extracts a real digital PDF table', async () => {
    const table = await extract(
      pdf([
        ['Date', 'Description', 'Amount'],
        ['2026-01-01', 'POS shop', '-12.50'],
      ]),
      'PDF',
    );
    expect(table).toEqual([
      ['Date', 'Description', 'Amount'],
      ['2026-01-01', 'POS shop', '-12.50'],
    ]);
    expect(parseTable(table, 'NGN')[0]).toMatchObject({
      amountMinor: 1250,
      direction: 'OUT',
    });
  }, 20000);
  it('rejects a PDF without readable transactions without OCR', async () => {
    await expect(
      extract(pdf([['Image-only statement']]), 'PDF'),
    ).rejects.toThrow('Scanned PDFs are unsupported');
  }, 20000);
  it('extracts XLSX dates and decimal amounts', async () => {
    const book = new ExcelJS.Workbook();
    const sheet = book.addWorksheet('Transactions');
    sheet.addRow(['Date', 'Description', 'Debit', 'Credit']);
    sheet.addRow([new Date('2026-01-01'), 'Salary', '', 1234.56]);
    const table = await extract(
      Buffer.from(await book.xlsx.writeBuffer()),
      'XLSX',
    );
    expect(parseTable(table, 'NGN')[0]).toMatchObject({
      amountMinor: 123456,
      direction: 'IN',
    });
  }, 20000);
  it('rejects formulas and multi-sheet workbooks', async () => {
    const book = new ExcelJS.Workbook();
    const sheet = book.addWorksheet('Transactions');
    sheet.addRow(['Date', 'Description', 'Amount']);
    sheet.addRow(['2026-01-01', 'POS', { formula: '1+1', result: 2 }]);
    await expect(
      extract(Buffer.from(await book.xlsx.writeBuffer()), 'XLSX'),
    ).rejects.toThrow('Unsupported');
    book.addWorksheet('Second');
    await expect(
      extract(Buffer.from(await book.xlsx.writeBuffer()), 'XLSX'),
    ).rejects.toThrow('Unsupported');
  }, 20000);
  it('rejects archive expansion bombs before workbook loading', async () => {
    const bytes = Buffer.from(
      zipSync({ 'xl/large.xml': strToU8('x'.repeat(20_000_001)) }),
    );
    await expect(extract(bytes, 'XLSX')).rejects.toThrow('Unsupported');
  }, 20000);
});
