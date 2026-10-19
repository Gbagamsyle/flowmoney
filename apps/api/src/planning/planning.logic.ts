export const GROUPS = [
  'Essentials',
  'Everyday spending',
  'Goals',
  'Other',
] as const;
export const EXPENSE_MATCHES = [
  'Purchase',
  'Bill',
  'Airtime/Data',
  'Bank Fee',
  'Subscription',
  'Betting',
  'Food & Dining',
  'Transport',
  'Contribution',
  'Gift',
] as const;
export type PlanCategory = {
  id: string;
  name: string;
  group: string;
  kind: string;
  allocatedMinor: number;
  targetMinor: number;
  savedMinor: number;
  targetDate: string | null;
  matches: string[];
};
export type PlanTransaction = {
  id: string;
  date: string;
  description: string;
  amountMinor: number;
  direction: string;
  category: string;
  importId: string;
};
export type PlanLink = {
  transactionId: string;
  categoryId: string | null;
  obligationId: string | null;
  ignored: boolean;
};
export type Commitment = {
  id: string;
  title: string;
  amountMinor: number;
  date: string;
  status: string;
};
export type PendingIncome = Commitment & { confidence: string };
export function add(...values: number[]) {
  const total = values.reduce((a, b) => a + b, 0);
  if (!Number.isSafeInteger(total))
    throw new Error('These amounts exceed the supported planning range.');
  return total;
}
export function monthRange(month: string) {
  if (!/^20\d{2}-(0[1-9]|1[0-2])$/.test(month))
    throw new Error('Choose a month between 2000 and 2099.');
  const start = new Date(month + '-01T00:00:00Z');
  const end = new Date(start);
  end.setUTCMonth(end.getUTCMonth() + 1);
  return { start, end };
}
export function summarizePlan(input: {
  month: string;
  today: string;
  fundsMinor: number;
  bufferMinor: number;
  categories: PlanCategory[];
  transactions: PlanTransaction[];
  links: PlanLink[];
  obligations: Commitment[];
  income: PendingIncome[];
}) {
  const { categories, transactions, links, obligations, income, today } = input;
  const linkMap = new Map(links.map((link) => [link.transactionId, link]));
  const categoryIds = new Set(
    categories.filter((c) => c.kind === 'EXPENSE').map((c) => c.id),
  );
  const obligationIds = new Set(obligations.map((o) => o.id));
  const spending = new Map<string, number>();
  const payments = new Map<string, number>();
  const rows = transactions.map((row) => {
    const link = linkMap.get(row.id);
    const categoryId =
      link?.categoryId && categoryIds.has(link.categoryId)
        ? link.categoryId
        : null;
    const obligationId =
      link?.obligationId && obligationIds.has(link.obligationId)
        ? link.obligationId
        : null;
    const automatic =
      !link && row.direction === 'OUT'
        ? (categories.find(
            (c) => c.kind === 'EXPENSE' && c.matches.includes(row.category),
          )?.id ?? null)
        : null;
    const destination = categoryId ?? automatic;
    if (row.direction === 'OUT' && !link?.ignored) {
      if (destination)
        spending.set(
          destination,
          add(spending.get(destination) ?? 0, row.amountMinor),
        );
      if (obligationId)
        payments.set(
          obligationId,
          add(payments.get(obligationId) ?? 0, row.amountMinor),
        );
    }
    return {
      ...row,
      categoryId: destination,
      obligationId,
      ignored: link?.ignored ?? false,
      manual: !!link,
    };
  });
  const categoryRows = categories.map((category) => {
    const spentMinor = spending.get(category.id) ?? 0;
    const remainingMinor =
      category.kind === 'SAVINGS'
        ? add(category.savedMinor, category.allocatedMinor)
        : Math.max(0, category.allocatedMinor - spentMinor);
    return {
      ...category,
      spentMinor,
      remainingMinor,
      overspentMinor:
        category.kind === 'EXPENSE'
          ? Math.max(0, spentMinor - category.allocatedMinor)
          : 0,
      stillNeededMinor:
        category.kind === 'SAVINGS'
          ? Math.max(0, category.targetMinor - remainingMinor)
          : 0,
    };
  });
  const commitmentRows = obligations.map((item) => {
    const paidMinor = payments.get(item.id) ?? 0;
    return {
      ...item,
      paidMinor,
      outstandingMinor: ['PAID', 'SKIPPED'].includes(item.status)
        ? 0
        : Math.max(0, item.amountMinor - paidMinor),
    };
  });
  const protectedMinor = add(...commitmentRows.map((o) => o.outstandingMinor));
  const reservedMinor = add(...categoryRows.map((c) => c.remainingMinor));
  const unallocatedMinor = add(
    input.fundsMinor,
    -input.bufferMinor,
    -protectedMinor,
    -reservedMinor,
  );
  const { end } = monthRange(input.month);
  const endDate = end.toISOString().slice(0, 10);
  const pending = income.filter((i) =>
    ['EXPECTED', 'DELAYED'].includes(i.status),
  );
  const outsideMonth = add(
    ...commitmentRows
      .filter((o) => o.date >= endDate)
      .map((o) => o.outstandingMinor),
  );
  let currentOnly = add(
    input.fundsMinor,
    -input.bufferMinor,
    -reservedMinor,
    -outsideMonth,
  );
  let projected = currentOnly;
  const events = [
    ...commitmentRows
      .filter((o) => o.outstandingMinor && o.date < endDate)
      .map((o) => ({
        id: o.id,
        title: o.title,
        date: o.date < today ? today : o.date,
        sourceDate: o.date,
        kind: 'OBLIGATION',
        amountMinor: -o.outstandingMinor,
        projectedMinor: -o.outstandingMinor,
        overdue: o.date < today,
      })),
    ...pending
      .filter((i) => i.date < endDate)
      .map((i) => ({
        id: i.id,
        title: i.title,
        date: i.date < today ? today : i.date,
        sourceDate: i.date,
        kind: 'INCOME',
        amountMinor: i.amountMinor,
        projectedMinor:
          i.date >= today &&
          i.status === 'EXPECTED' &&
          i.confidence === 'CONFIRMED'
            ? i.amountMinor
            : 0,
        overdue: i.date < today || i.status === 'DELAYED',
      })),
  ].sort(
    (a, b) =>
      a.date.localeCompare(b.date) ||
      a.amountMinor - b.amountMinor ||
      a.id.localeCompare(b.id),
  );
  const timeline =
    endDate <= today
      ? []
      : events.map((event) => {
          if (event.kind === 'OBLIGATION')
            currentOnly = add(currentOnly, event.amountMinor);
          projected = add(projected, event.projectedMinor);
          return {
            ...event,
            currentOnlyMinor: currentOnly,
            projectedBalanceMinor: projected,
          };
        });
  const dates = transactions.map((t) => t.date).sort();
  const remainingDays =
    today.slice(0, 7) === input.month
      ? Math.max(
          1,
          Math.round(
            (end.getTime() - new Date(today + 'T00:00:00Z').getTime()) /
              86400000,
          ),
        )
      : today < input.month + '-01'
        ? Math.round(
            (end.getTime() - monthRange(input.month).start.getTime()) /
              86400000,
          )
        : 0;
  const everydayRemaining = add(
    ...categoryRows
      .filter((c) => c.kind === 'EXPENSE' && c.group === 'Everyday spending')
      .map((c) => c.remainingMinor),
  );
  return {
    categories: categoryRows,
    transactions: rows,
    obligations: commitmentRows,
    timeline,
    fundsMinor: input.fundsMinor,
    bufferMinor: input.bufferMinor,
    protectedMinor,
    reservedMinor,
    unallocatedMinor,
    expectedMinor: add(
      ...pending
        .filter((i) => i.date >= today && i.date < endDate)
        .map((i) => i.amountMinor),
    ),
    weeklyGuideMinor: remainingDays
      ? Math.floor(
          (everydayRemaining * Math.min(7, remainingDays)) / remainingDays,
        )
      : 0,
    recordedThrough: dates.at(-1) ?? null,
    recordedFrom: dates[0] ?? null,
    unmappedCount: rows.filter(
      (r) =>
        r.direction === 'OUT' && !r.categoryId && !r.obligationId && !r.ignored,
    ).length,
  };
}
export const DEFAULT_CATEGORIES = [
  {
    name: 'Food & groceries',
    group: 'Everyday spending',
    kind: 'EXPENSE',
    matches: ['Food & Dining'],
  },
  {
    name: 'Transport',
    group: 'Everyday spending',
    kind: 'EXPENSE',
    matches: ['Transport'],
  },
  {
    name: 'Airtime & data',
    group: 'Everyday spending',
    kind: 'EXPENSE',
    matches: ['Airtime/Data'],
  },
  {
    name: 'Bills & subscriptions',
    group: 'Essentials',
    kind: 'EXPENSE',
    matches: ['Bill', 'Subscription'],
  },
  {
    name: 'Shopping & purchases',
    group: 'Other',
    kind: 'EXPENSE',
    matches: ['Purchase'],
  },
  {
    name: 'Bank fees',
    group: 'Essentials',
    kind: 'EXPENSE',
    matches: ['Bank Fee'],
  },
  {
    name: 'Betting payments',
    group: 'Other',
    kind: 'EXPENSE',
    matches: ['Betting'],
  },
  { name: 'Savings goal', group: 'Goals', kind: 'SAVINGS', matches: [] },
];
