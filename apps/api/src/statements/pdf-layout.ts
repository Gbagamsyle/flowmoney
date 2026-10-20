export type PdfPage = {
  items: { text: string; x: number; y: number; width: number }[];
};
const key = (text: string) => text.toLowerCase().replace(/[^a-z]/g, '');

const aliases: Record<string, string[]> = {
  date: ['date', 'transactiondate', 'valuedate', 'postingdate'],
  description: [
    'description',
    'narration',
    'details',
    'transactiondetails',
    'remarks',
  ],
  debit: ['debit', 'withdrawal', 'withdrawals', 'debitamount'],
  credit: ['credit', 'deposit', 'deposits', 'creditamount'],
  amount: ['amount', 'transactionamount'],
  direction: ['direction', 'type', 'drcr'],
  currency: ['currency', 'ccy'],
};

type Column = { label: string | null; center: number };
type Layout = { columns: Column[]; boundaries: number[] };

function findHeader(line: PdfPage['items']): Layout | undefined {
  // Currency units rendered as separate text items belong to the preceding
  // heading; treating them as columns can misplace right-aligned amounts.
  const headingItems = line.filter(
    (item) =>
      !/^\(?\s*(?:₦|NGN|USD|GBP|EUR|\$|£|€)\s*\)?$/i.test(item.text.trim()) &&
      !/^[()\s]+$/.test(item.text),
  );
  const columns = headingItems.map((item) => {
    const normalized = key(item.text);
    const label =
      Object.entries(aliases).find(([, names]) =>
        names.includes(normalized),
      )?.[0] ?? null;
    return { label, center: item.x + item.width / 2 };
  });
  const labels = new Set(columns.map((column) => column.label));
  if (
    !labels.has('date') ||
    !labels.has('description') ||
    (!(labels.has('debit') && labels.has('credit')) && !labels.has('amount'))
  ) {
    return undefined;
  }

  const sorted = [...columns].sort((a, b) => a.center - b.center);
  return {
    columns: sorted,
    boundaries: sorted
      .slice(1)
      .map((column, index) => (sorted[index].center + column.center) / 2),
  };
}

// Moniepoint uses a centered, wrapped timestamp and separate narration baselines.
// Group by timestamp anchors instead of interpreting each text baseline as a row.
function wrappedTimestampTable(pages: PdfPage[]): string[][] | undefined {
  type Piece = { label: string; text: string; y: number };
  const rows: Piece[][] = [];
  let recognized = false;
  let layout: Layout | undefined;
  let dateLeft = 0;
  for (const [pageIndex, page] of pages.entries()) {
    const narration = page.items.find((i) => i.text.trim() === 'Narration');
    if (narration) {
      const band = page.items.filter(
        (i) => Math.abs(i.y - narration.y) < 2 && i.text.trim(),
      );
      if (
        !['Date', 'Narration', 'Reference', 'Debit', 'Credit', 'Balance'].every(
          (label) => band.some((i) => i.text.trim() === label),
        )
      )
        return undefined;
      layout = findHeader(band);
      dateLeft = band.find((i) => i.text.trim() === 'Date')!.x;
    }
    if (!layout) return undefined;
    const dateColumn = layout.columns.findIndex((c) => c.label === 'date');
    const columnOf = (i: PdfPage['items'][number]) => {
      const index = layout!.boundaries.findIndex((x) => i.x + i.width / 2 < x);
      return index < 0 ? layout!.columns.length - 1 : index;
    };
    const content = page.items.filter(
      (i) =>
        i.text.trim() &&
        i.y < (narration ? narration.y - 2 : Infinity) &&
        i.x >= dateLeft - 2,
    );
    const anchors = content
      .filter(
        (i) =>
          columnOf(i) === dateColumn &&
          /^\d{4}-\d{2}-\d{2}T\d{2}:/.test(i.text.trim()),
      )
      .sort((a, b) => b.y - a.y);
    if (!anchors.length) return undefined;
    recognized = true;
    const groups = anchors.map(() => [] as Piece[]);
    for (const item of content) {
      const label = layout.columns[columnOf(item)].label;
      if (!['date', 'description', 'debit', 'credit'].includes(label ?? ''))
        continue;
      const tagged = {
        label: label!,
        text: item.text,
        y: item.y - pageIndex * 10000,
      };
      if (item.y > anchors[0].y + 25) {
        if (!rows.length)
          throw new Error(
            'Unmatched transaction continuation in PDF. Use CSV/XLSX.',
          );
        rows.at(-1)!.push(tagged);
        continue;
      }
      let index = anchors
        .slice(1)
        .findIndex((anchor, n) => item.y > (anchors[n].y + anchor.y) / 2);
      if (index < 0) index = anchors.length - 1;
      groups[index].push(tagged);
    }
    // Store column labels independently of page coordinates.
    for (const group of groups) rows.push(group);
  }
  if (!recognized) return undefined;
  const table = [['Date', 'Description', 'Debit', 'Credit']];
  for (const row of rows) {
    const values: Record<string, string[]> = {};
    for (const item of row.sort((a, b) => b.y - a.y)) {
      const { label, text } = item;
      (values[label] ??= []).push(text.trim());
    }
    const date = (values.date ?? []).join('');
    if (
      !/^\d{4}-\d{2}-\d{2}T(?:[01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/.test(date)
    )
      throw new Error('Incomplete transaction timestamp in PDF. Use CSV/XLSX.');
    table.push([
      date.slice(0, 10),
      (values.description ?? []).join(' '),
      (values.debit ?? []).join(''),
      (values.credit ?? []).join(''),
    ]);
  }
  return table;
}

export function pdfPositionTable(pages: PdfPage[]): string[][] {
  const wrapped = wrappedTimestampTable(pages);
  if (wrapped) return wrapped;
  const transactions: {
    date: string;
    description: string;
    debit: string;
    credit: string;
    amount: string;
    direction: string;
    currency?: string;
  }[] = [];
  let layout: Layout | undefined;
  let previousTransaction: (typeof transactions)[number] | undefined;
  let sawCurrencyColumn = false;
  let hasDebitCreditLayout = false;
  let hasDirectionColumn = false;
  const layoutKinds = new Set<'amount' | 'debit-credit'>();

  for (const page of pages) {
    const lines: PdfPage['items'][] = [];
    for (const item of [...page.items]
      .filter((i) => i.text.trim())
      .sort((a, b) => b.y - a.y || a.x - b.x)) {
      const last = lines.at(-1);
      const line = last && Math.abs(last[0].y - item.y) < 2 ? last : undefined;
      if (line) line.push(item);
      else lines.push([item]);
    }
    for (const line of lines) line.sort((a, b) => a.x - b.x);
    let headerBottom = Infinity;
    for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
      const line = lines[lineIndex];
      if (line[0].y >= headerBottom) continue;
      const lineText = line.map((item) => item.text.trim()).join(' ');
      // A new account summary ends the preceding table. Ignore summary
      // material until the following explicit transaction header is found.
      if (
        /^(?:(?:savings|current) account\s+)?period\s*:\s*\d{1,2}\s+[a-z]{3,9}\s+\d{4}\s*-/i.test(
          lineText,
        )
      ) {
        layout = undefined;
        previousTransaction = undefined;
        continue;
      }
      // A header may span several baselines (for example Balance After / ₦).
      // Include the whole heading band so amounts cannot spill into a missing column.
      let firstHeaderLine = lineIndex;
      let lastHeaderLine = lineIndex;
      while (
        firstHeaderLine > 0 &&
        lines[firstHeaderLine - 1][0].y - line[0].y <= 14
      )
        firstHeaderLine--;
      while (
        lastHeaderLine + 1 < lines.length &&
        line[0].y - lines[lastHeaderLine + 1][0].y <= 14
      )
        lastHeaderLine++;
      const headerBand = lines
        .slice(firstHeaderLine, lastHeaderLine + 1)
        .flat();
      const detectedLayout = findHeader(headerBand);
      if (detectedLayout) {
        layout = detectedLayout;
        headerBottom = Math.min(...headerBand.map((item) => item.y));
        if (layout.columns.some((column) => column.label === 'currency')) {
          sawCurrencyColumn = true;
        }
        if (
          layout.columns.some(
            (column) => column.label === 'debit' || column.label === 'credit',
          )
        ) {
          hasDebitCreditLayout = true;
          layoutKinds.add('debit-credit');
        }
        if (layout.columns.some((column) => column.label === 'amount'))
          layoutKinds.add('amount');
        if (layout.columns.some((column) => column.label === 'direction'))
          hasDirectionColumn = true;
        continue;
      }
      // Ignore cover-page and account-summary material before the first table header.
      if (!layout) continue;

      const cells = layout.columns.map(() => [] as string[]);
      for (const item of line) {
        const position = item.x + item.width / 2;
        let column = layout.boundaries.findIndex((x) => position < x);
        if (column < 0) column = layout.columns.length - 1;
        cells[column].push(item.text.trim());
      }
      const physical = cells.map((parts) => parts.join(' ').trim());
      const values: Record<string, string> = {};
      layout.columns.forEach((column, index) => {
        if (!column.label) return;
        values[column.label] = physical[index];
      });

      const date = values.date ?? '';
      const description = values.description ?? '';
      const debit = values.debit ?? '';
      const credit = values.credit ?? '';
      const amount = values.amount ?? '';
      const hasAmount = Boolean(debit || credit || amount);
      if (!date) {
        const continuation = description;
        const summaryOrPageMarker =
          /^(?:page\s+\d+(?:\s+of\s+\d+)?|(?:opening|closing|available|ledger|running) balance|total(?:s)?|continued)$/i.test(
            continuation,
          );
        if (
          continuation &&
          !summaryOrPageMarker &&
          !hasAmount &&
          previousTransaction
        ) {
          previousTransaction.description =
            `${previousTransaction.description} ${continuation}`.trim();
        } else if (hasAmount) {
          // Keep malformed transaction-looking lines so the strict row parser rejects them.
          transactions.push({
            date,
            description,
            debit,
            credit,
            amount,
            direction: values.direction ?? '',
          });
          previousTransaction = transactions.at(-1);
        }
        continue;
      }

      const transaction = {
        date,
        description,
        debit,
        credit,
        amount,
        direction: values.direction ?? '',
        ...(values.currency !== undefined ? { currency: values.currency } : {}),
      };
      transactions.push(transaction);
      previousTransaction = transaction;
    }
  }

  if (transactions.length === 0)
    throw new Error(
      'No readable transaction table header was found. Scanned PDFs are unsupported.',
    );

  const useDebitCredit = layoutKinds.size > 1;
  const header = useDebitCredit
    ? ['Date', 'Description', 'Debit', 'Credit']
    : [
        'Date',
        'Description',
        ...(hasDebitCreditLayout ? ['Debit', 'Credit'] : ['Amount']),
        ...(hasDirectionColumn && !hasDebitCreditLayout ? ['Direction'] : []),
      ];
  if (sawCurrencyColumn) header.push('Currency');
  const table = [header];
  for (const transaction of transactions) {
    let row = useDebitCredit
      ? [
          transaction.date,
          transaction.description,
          transaction.debit,
          transaction.credit,
        ]
      : hasDebitCreditLayout
        ? [
            transaction.date,
            transaction.description,
            transaction.debit,
            transaction.credit,
          ]
        : [transaction.date, transaction.description, transaction.amount];
    if (!useDebitCredit && hasDirectionColumn && !hasDebitCreditLayout)
      row.push(transaction.direction);
    if (useDebitCredit && transaction.amount) {
      const direction = transaction.direction.trim().toUpperCase();
      if (
        direction &&
        !['DR', 'CR', 'DEBIT', 'CREDIT', 'IN', 'OUT'].includes(direction)
      )
        throw new Error('Unrecognized debit/credit direction in PDF.');
      const isDebit = direction
        ? ['DR', 'DEBIT', 'OUT'].includes(direction)
        : transaction.amount.trim().startsWith('-');
      if (transaction.amount.trim().startsWith('-') && !isDebit)
        throw new Error('Amount sign conflicts with credit direction in PDF.');
      row = [
        transaction.date,
        transaction.description,
        isDebit ? transaction.amount.replace(/^-/, '') : '',
        isDebit ? '' : transaction.amount.replace(/^-/, ''),
      ];
    }
    if (sawCurrencyColumn) row.push(transaction.currency ?? '');
    table.push(row);
  }
  return table;
}
