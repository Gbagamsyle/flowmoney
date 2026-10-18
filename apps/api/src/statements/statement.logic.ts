import { parse } from 'csv-parse/sync';
import {
  categoryAllowed,
  counterpartyFor,
} from './statement-categorization.js';

export const CATEGORIES = [
  'Income',
  'Purchase',
  'Bill',
  'Airtime/Data',
  'Bank Fee',
  'Cash Withdrawal',
  'Savings',
  'Own-account Transfer',
  'External Transfer',
  'Loan',
  'Subscription',
  'Refund',
  'Betting',
  'Betting Payout',
  'Merchant Credit',
  'Food & Dining',
  'Transport',
  'Contribution',
  'Gift',
  'Unknown',
] as const;
export type Category = (typeof CATEGORIES)[number];
export const isTransfer = (category: string) =>
  ['Savings', 'Own-account Transfer', 'External Transfer'].includes(category);
export type ParsedRow = {
  sourceRow: number;
  date: string;
  description: string;
  amountMinor: number;
  direction: 'IN' | 'OUT';
  category: Category;
  confidence: number;
  reason: string;
};
export function classify(
  description: string,
  direction: 'IN' | 'OUT',
): Pick<ParsedRow, 'category' | 'confidence' | 'reason'> {
  const match = (category: Category, confidence: number, reason: string) => ({
    category,
    confidence,
    reason,
  });
  if (/\b(refund|reversal|reversed)\b/i.test(description))
    return match(
      'Refund',
      0.95,
      'The statement explicitly mentions a refund or reversal.',
    );
  if (
    direction === 'OUT' &&
    /\b(charge|charges|fee|levy|stamp duty|vat)\b/i.test(description)
  )
    return match('Bank Fee', 0.9, 'The statement identifies a fee or charge.');
  const party = counterpartyFor(description, direction);
  const isTransferNarrative = /\b(transfer|trf|nip|nibss)\b/i.test(description);
  const operator =
    /\b(?:sporty\s*bet|bet9ja|betking|1x\s*bet|betway|betano|nairabet|merrybet|betwinner|betpawa|paripesa|22bet|melbet|msport)\b/i;
  const operatorCounterparty = party?.name
    .replace(/\s+(?:limited|ltd|payments?)$/i, '')
    .trim();
  // Personal transfers that merely mention an operator in a remark remain transfers.
  const recognizedOperator = isTransferNarrative
    ? !!operatorCounterparty &&
      /^(?:sporty\s*bet|bet9ja|betking|1x\s*bet|betway|betano|nairabet|merrybet|betwinner|betpawa|paripesa|22bet|melbet|msport)$/i.test(
        operatorCounterparty,
      )
    : operator.test(description);
  if (recognizedOperator)
    return match(
      direction === 'OUT' ? 'Betting' : 'Betting Payout',
      0.9,
      'Recognized betting operator. A bank payment is not proof of a wager, and money returned is not assumed to be winnings.',
    );
  if (operatorCounterparty && /^(?:kfc|chicken republic)$/i.test(operatorCounterparty)) {
    return match(direction === 'OUT' ? 'Food & Dining' : 'Merchant Credit', .85, 'Recognized food merchant; incoming money is not assumed to be earnings.');
  }
  const rules: [Category, RegExp, number][] = [
    [
      'Own-account Transfer',
      /\b(own account|self transfer|between my accounts)\b/i,
      0.9,
    ],
    ['Savings', /\b(piggyvest|cowrywise|savings deposit|save to)\b/i, 0.85],
    [
      'Bill',
      /\b(?:bill payment|utility bill|electricity|electric bill|power bill|power utility|phcn|ikedc|ekedc|aedc|eedc|bedc|ibedc|jedc|kano electric|port harcourt electric|water bill|water utility|waste bill|waste collection|internet bill|broadband bill|airtel\s+(?:wifi|broadband)|mtn\s+(?:fibre|broadband)|spectranet|smile\s+(?:communications|internet)|dstv|gotv|startimes|showmax|rent|tenancy|service charge|estate dues|school fees|tuition)\b/i,
      0.9,
    ],
    ['Airtime/Data', /\b(airtime|data bundle|mtn|airtel|glo|9mobile)\b/i, 0.9],
    ['Cash Withdrawal', /\b(atm|cash withdrawal)\b/i, 0.9],
    ['Loan', /\b(loan|credit facility|repayment)\b/i, 0.8],
    ['Subscription', /\b(netflix|spotify|subscription|apple music)\b/i, 0.9],
    ['Income', /\b(salary|payroll|wages|invoice payment)\b/i, 0.9],
    [
      'Contribution',
      /\b(contribution for|contribution payment|group collection|aso ebi|ajo contribution|esusu contribution)\b/i,
      0.85,
    ],
    [
      'Gift',
      /\b(birthday gift|birthday present|gift payment|gift received|gift for)\b/i,
      0.85,
    ],
  ];
  for (const [category, pattern, confidence] of rules) {
    if (categoryAllowed(category, direction) && pattern.test(description))
      return match(
        category,
        confidence,
        'The statement explicitly identifies this purpose.',
      );
  }
  // Use purpose words only in merchant/payment narratives, not another person's remark.
  const merchantNarrative =
    /\b(pos|purchase|merchant|card payment|card purchase)\b/i.test(description);
  const merchantPurpose =
    !isTransferNarrative || party?.key.startsWith('merchant:');
  if (
    direction === 'OUT' &&
    merchantPurpose &&
    /\b(restaurant|cafe|bakery|food delivery|kfc|chicken republic)\b/i.test(
      description,
    )
  )
    return match(
      'Food & Dining',
      0.85,
      'Recognized food merchant or explicit food purchase.',
    );
  if (
    direction === 'OUT' &&
    merchantPurpose &&
    /\b(uber trip|bolt ride|taxi fare|bus fare|train ticket|transport fare)\b/i.test(
      description,
    )
  )
    return match(
      'Transport',
      0.85,
      'The description explicitly identifies transport.',
    );
  if (
    (merchantNarrative && merchantPurpose) ||
    (!isTransferNarrative &&
      /\b(supermarket|shop purchase)\b/i.test(description))
  )
    return match(
      direction === 'OUT' ? 'Purchase' : 'Merchant Credit',
      0.9,
      'Merchant/card activity identified. The item bought or reason for a credit is not assumed.',
    );
  if (isTransferNarrative)
    return match(
      'External Transfer',
      0.95,
      'Transfer direction is known; its purpose and account ownership can remain unspecified.',
    );
  return match(
    'Unknown',
    0.2,
    'Purpose not identified. You can import this transaction without assigning a purpose.',
  );
}

const normal = (s: unknown) =>
  String(s ?? '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z]/g, '');
const aliases = {
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
export function dateValue(value: unknown): string {
  if (value instanceof Date && Number.isFinite(value.getTime()))
    return value.toISOString().slice(0, 10);
  const s = String(value ?? '').trim();
  let y: number, m: number, d: number;
  let match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (match) [, y, m, d] = match.map(Number);
  else {
    match = /^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/.exec(s);
    if (match) [, d, m, y] = match.map(Number);
    else {
      const named = /^(\d{1,2})(?:\s+|-)([a-z]+)(?:\s+|-)(\d{4})$/i.exec(s);
      const monthNames = [
        'january',
        'february',
        'march',
        'april',
        'may',
        'june',
        'july',
        'august',
        'september',
        'october',
        'november',
        'december',
      ];
      const name = named?.[2].toLowerCase();
      const monthIndex = name
        ? monthNames.findIndex(
            (month) => name === month || name === month.slice(0, 3),
          )
        : -1;
      if (!named || monthIndex < 0)
        throw new Error(
          'Use YYYY-MM-DD, DD/MM/YYYY or DD Mon YYYY dates (for example, 10 Jan 2026).',
        );
      d = Number(named[1]);
      m = monthIndex + 1;
      y = Number(named[3]);
    }
  }
  const date = new Date(Date.UTC(y!, m! - 1, d!));
  if (
    y! < 1900 ||
    y! > 2100 ||
    date.getUTCFullYear() !== y! ||
    date.getUTCMonth() !== m! - 1 ||
    date.getUTCDate() !== d!
  )
    throw new Error('Invalid transaction date.');
  return date.toISOString().slice(0, 10);
}
export function minor(value: unknown): number {
  let s = String(value ?? '').trim();
  if (!s || s === '-' || s === '--') return 0;
  s = s.replace(/^(NGN|USD|GBP|EUR|₦|\$|£|€)\s*/i, '');
  if (!/^-?(?:\d+|\d{1,3}(?:,\d{3})+)(?:\.\d{1,2})?$/.test(s))
    throw new Error(
      'Invalid amount; use decimal amounts with at most two decimal places.',
    );
  const negative = s.startsWith('-');
  const [whole, fraction = ''] = s.replace(/[-,]/g, '').split('.');
  const result = Number(whole) * 100 + Number(fraction.padEnd(2, '0'));
  if (!Number.isSafeInteger(result) || result > 1_000_000_000_000)
    throw new Error('Amount exceeds supported limit.');
  return negative ? -result : result;
}
export function parseTable(table: unknown[][], currency: string): ParsedRow[] {
  if (table.length > 5100)
    throw new Error('Maximum 5,000 transactions per statement.');
  let columns: Record<string, number> = {},
    header = -1;
  for (let i = 0; i < Math.min(30, table.length); i++) {
    const values = table[i].map(normal);
    columns = Object.fromEntries(
      Object.entries(aliases).map(([key, names]) => [
        key,
        values.findIndex((v) => names.includes(v)),
      ]),
    );
    if (
      columns.date >= 0 &&
      columns.description >= 0 &&
      ((columns.debit >= 0 && columns.credit >= 0) || columns.amount >= 0)
    ) {
      header = i;
      break;
    }
  }
  if (header < 0)
    throw new Error(
      'No supported transaction table. Export Date, Description, Debit and Credit (or signed Amount) columns.',
    );
  const result: ParsedRow[] = [];
  for (let i = header + 1; i < table.length; i++) {
    const row = table[i];
    if (row.every((v) => v === '' || v === null || v === undefined)) continue;
    if (normal(row[columns.date]) === normal(table[header][columns.date]))
      continue;
    try {
      const date = dateValue(row[columns.date]);
      const description = String(row[columns.description] ?? '').trim();
      if (!description || description.length > 500)
        throw new Error('Description is missing or exceeds 500 characters.');
      if (
        columns.currency >= 0 &&
        String(row[columns.currency] ?? '')
          .trim()
          .toUpperCase() !== currency
      )
        throw new Error(
          'Statement currency differs from selected currency. Split mixed currency statements.',
        );
      let amount: number, direction: 'IN' | 'OUT';
      if (columns.debit >= 0 && columns.credit >= 0) {
        const debit = minor(row[columns.debit]),
          credit = minor(row[columns.credit]);
        if (
          debit < 0 ||
          credit < 0 ||
          (debit > 0 && credit > 0) ||
          (!debit && !credit)
        )
          throw new Error('Exactly one positive debit or credit is required.');
        amount = debit || credit;
        direction = debit ? 'OUT' : 'IN';
      } else {
        const signed = minor(row[columns.amount]);
        const type = String(row[columns.direction] ?? '')
          .trim()
          .toUpperCase();
        if (
          columns.direction >= 0 &&
          !['DR', 'CR', 'DEBIT', 'CREDIT', 'IN', 'OUT'].includes(type)
        )
          throw new Error('Unrecognized debit/credit direction.');
        direction =
          columns.direction >= 0
            ? ['DR', 'DEBIT', 'OUT'].includes(type)
              ? 'OUT'
              : 'IN'
            : signed < 0
              ? 'OUT'
              : 'IN';
        if (signed < 0 && direction === 'IN')
          throw new Error('Amount sign conflicts with credit direction.');
        amount = Math.abs(signed);
        if (!amount) throw new Error('Zero amount is not a transaction.');
      }
      result.push({
        sourceRow: i + 1,
        date,
        description,
        amountMinor: amount,
        direction,
        ...classify(description, direction),
      });
    } catch (error) {
      throw new Error(`Row ${i + 1}: ${(error as Error).message}`);
    }
  }
  if (!result.length || result.length > 5000)
    throw new Error('Statement must contain 1–5,000 transactions.');
  return result;
}
export function csvTable(text: string): unknown[][] {
  if (text.includes('\0')) throw new Error('CSV must be UTF-8 text.');
  return parse(text, {
    bom: true,
    skip_empty_lines: true,
    relax_column_count: true,
    max_record_size: 8192,
    to: 5101,
  }) as unknown[][];
}
export function pdfTable(text: string): unknown[][] {
  // Only explicit column boundaries are accepted. Wrapped / collapsed rows fail closed.
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  return lines
    .filter((line) => !/^--\s*\d+\s+of\s+\d+\s*--$/.test(line))
    .map((line) => line.split(/\t+|\s{2,}/));
}
export function summarize(
  rows: Pick<
    ParsedRow,
    'date' | 'description' | 'amountMinor' | 'direction' | 'category'
  >[],
) {
  const dates = rows.map((r) => r.date).sort();
  const start = dates[0] ?? null,
    end = dates.at(-1) ?? null;
  const months =
    start && end
      ? (Number(end.slice(0, 4)) - Number(start.slice(0, 4))) * 12 +
        Number(end.slice(5, 7)) -
        Number(start.slice(5, 7)) +
        1
      : 0;
  let inflow = 0,
    outflow = 0,
    spending = 0,
    transfersOut = 0;
  const categories: Record<string, { inflow: number; outflow: number }> = {};
  const sources: Record<
    string,
    { count: number; total: number; months: Set<string> }
  > = Object.create(null);
  for (const r of rows) {
    const bucket = (categories[r.category] ??= { inflow: 0, outflow: 0 });
    if (r.direction === 'IN') {
      inflow += r.amountMinor;
      bucket.inflow += r.amountMinor;
    } else {
      outflow += r.amountMinor;
      bucket.outflow += r.amountMinor;
      if (isTransfer(r.category)) transfersOut += r.amountMinor;
      else if (r.category !== 'Unknown') spending += r.amountMinor;
    }
    if (r.direction === 'IN' && r.category === 'Income') {
      const key = r.description
        .toLowerCase()
        .replace(/\b\d+\b/g, '')
        .replace(/\s+/g, ' ')
        .trim();
      const source = (sources[key] ??= {
        count: 0,
        total: 0,
        months: new Set(),
      });
      source.count++;
      source.total += r.amountMinor;
      source.months.add(r.date.slice(0, 7));
    }
  }
  return {
    start,
    end,
    months,
    totalInflow: inflow / 100,
    totalOutflow: outflow / 100,
    netCashFlow: (inflow - outflow) / 100,
    averageMonthlyInflow: months ? inflow / 100 / months : 0,
    averageMonthlyOutflow: months ? outflow / 100 / months : 0,
    classifiedSpending: spending / 100,
    transfersOut: transfersOut / 100,
    categoryTotals: Object.fromEntries(
      Object.entries(categories).map(([key, v]) => [
        key,
        { inflow: v.inflow / 100, outflow: v.outflow / 100 },
      ]),
    ),
    incomeSources: Object.entries(sources).map(([description, s]) => ({
      description,
      count: s.count,
      total: s.total / 100,
      activeMonths: s.months.size,
      likelyRecurring: s.months.size >= 2,
    })),
  };
}
