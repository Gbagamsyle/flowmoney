import { spawn } from 'node:child_process';
import { csvTable } from './statement.logic.js';
import { pdfPositionTable, type PdfPage } from './pdf-layout.js';

export const MAX_BYTES = 5 * 1024 * 1024;
export const MAX_PDF_PAGES = 250;
// Isolate binary parsers from API heap and enforce a deadline. No file is written.
export async function extract(
  buffer: Buffer,
  format: string,
): Promise<unknown[][]> {
  if (format === 'CSV')
    return csvTable(new TextDecoder('utf-8', { fatal: true }).decode(buffer));
  const pdfUrl = import.meta.resolve('pdfjs-dist/legacy/build/pdf.mjs');
  const excelUrl = import.meta.resolve('exceljs');
  const zipUrl = import.meta.resolve('fflate');
  const code = `
    process.once('message', (workerData) => {
    (async () => {
      const bytes = Buffer.from(workerData.bytes, 'base64');
      try {
        if (workerData.format === 'PDF') {
          const { getDocument } = await import(workerData.pdfUrl);
          const task = getDocument({ data: new Uint8Array(bytes), isEvalSupported: false, useSystemFonts: false, disableFontFace: true, verbosity: 0 });
          try {
            const document = await task.promise;
            if (document.numPages > workerData.maxPdfPages) throw Error('PDF_PAGE_LIMIT');
            const pages = []; let characters = 0, itemCount = 0;
            for (let number = 1; number <= document.numPages; number++) {
              const page = await document.getPage(number);
              const content = await page.getTextContent();
              const items = [];
              for (const item of content.items) if ('str' in item) {
                characters += item.str.length; itemCount++;
                if (characters > 2000000 || itemCount > 100000) throw Error('PDF_TEXT_LIMIT');
                items.push({ text: item.str, x: item.transform[4], y: item.transform[5], width: item.width });
              }
              pages.push({ items }); page.cleanup();
            }
            process.send({ pages });
          } finally { await task.destroy(); }
        } else {
          const { unzipSync } = await import(workerData.zipUrl);
          let size = 0, count = 0;
          unzipSync(bytes, { filter: entry => {
            size += entry.originalSize; count++;
            if (size > 20000000 || count > 200 || /vbaProject|externalLinks/i.test(entry.name)) throw Error('limit');
            return false;
          }});
          const { default: ExcelJS } = await import(workerData.excelUrl);
          const book = new ExcelJS.Workbook();
          await book.xlsx.load(bytes);
          if (book.worksheets.length !== 1) throw Error('One worksheet required');
          const sheet = book.worksheets[0];
          if (sheet.rowCount > 5100 || sheet.columnCount > 30) throw Error('limit');
          const rows = [];
          sheet.eachRow({ includeEmpty: true }, row => {
            const cells = [];
            for (let i = 1; i <= Math.max(sheet.columnCount, 1); i++) {
              const cell = row.getCell(i);
              if (cell.formula || cell.hyperlink) throw Error('Formula/hyperlink not supported');
              const v = cell.value;
              cells.push(v instanceof Date ? v.toISOString().slice(0, 10) : v == null ? '' : typeof v === 'object' ? cell.text : v);
            }
            rows.push(cells);
          });
          process.send({ rows });
        }
      } finally { bytes.fill(0); }
    })().catch((error) => { process.send({ error: true, reason: ['PDF_PAGE_LIMIT', 'PDF_TEXT_LIMIT'].includes(error.message) ? error.message : error.name === 'PasswordException' ? 'PDF_PASSWORD' : undefined }); });
    });
  `;
  return new Promise((resolve, reject) => {
    const worker = spawn(
      process.execPath,
      ['--max-old-space-size=128', '-e', code],
      {
        stdio: ['ignore', 'ignore', 'ignore', 'ipc'],
        windowsHide: true,
        env: {
          SystemRoot: process.env.SystemRoot,
          PATH: process.env.PATH,
          TEMP: process.env.TEMP,
        },
      },
    );
    worker.send({
      bytes: buffer.toString('base64'),
      format,
      pdfUrl,
      maxPdfPages: MAX_PDF_PAGES,
      excelUrl,
      zipUrl,
    });
    const finish = (error?: Error, rows?: unknown[][]) => {
      clearTimeout(timer);
      worker.kill();
      error ? reject(error) : resolve(rows!);
    };
    const timer = setTimeout(
      () =>
        finish(
          new Error(
            'Statement processing timed out. Try again or use a CSV export.',
          ),
        ),
      format === 'PDF' ? 60000 : 15000,
    );
    worker.once('exit', (code) => {
      if (code !== null && code !== 0)
        finish(
          new Error('Unable to process statement within resource limits.'),
        );
    });
    worker.once('error', () =>
      finish(new Error('Unable to process statement within resource limits.')),
    );
    worker.once(
      'message',
      (message: {
        error?: boolean;
        reason?: string;
        pages?: PdfPage[];
        rows?: unknown[][];
      }) => {
        if (message.error)
          finish(
            new Error(
              message.reason === 'PDF_PAGE_LIMIT'
                ? `This PDF exceeds the ${MAX_PDF_PAGES}-page limit. Export a shorter date range or use CSV/XLSX.`
                : message.reason === 'PDF_TEXT_LIMIT'
                  ? 'This PDF contains too much text to process safely. Export a shorter date range or use CSV/XLSX.'
                  : message.reason === 'PDF_PASSWORD'
                    ? 'This PDF requires a password. Upload an unprotected statement or use CSV/XLSX.'
                    : 'Unsupported or malformed document. Use an unprotected single-sheet XLSX or a readable PDF table; CSV is recommended.',
            ),
          );
        else {
          try {
            finish(
              undefined,
              message.rows ?? pdfPositionTable(message.pages ?? []),
            );
          } catch (error) {
            finish(error as Error);
          }
        }
      },
    );
  });
}
