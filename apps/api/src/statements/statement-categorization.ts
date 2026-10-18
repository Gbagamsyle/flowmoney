import type { Category, ParsedRow } from './statement.logic.js';

export const CLASSIFIER_VERSION = 'rules-v2-direction-and-merchants';
export type Counterparty = { key: string; name: string };
export type SavedCategoryRule = {
  id: string;
  counterpartyKey: string;
  direction: string;
  currency: string;
  category: string;
};

const normalize = (value: string) =>
  value
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()
    .replace(/\s+/g, ' ');

export function counterpartyFor(
  description: string,
  direction: string,
): Counterparty | null {
  const transfer =
    /^(?:(?:nip|nibss)\s*[-:/]?\s*)?(?:transfer|trf)\s+(to|from)\s+(.+)$/i.exec(
      description.trim(),
    );
  const merchant =
    /^(?:pos(?:\s+(?:purchase|payment))?|card\s+(?:payment|purchase)|merchant(?:\s+payment)?)\s+(?:(?:at|to)\s+)?(.+)$/i.exec(
      description.trim(),
    );
  let name: string, kind: string;
  if (transfer) {
    if ((transfer[1].toLowerCase() === 'to') !== (direction === 'OUT'))
      return null;
    name = transfer[2];
    kind = 'transfer';
  } else if (merchant) {
    name = merchant[1];
    kind = 'merchant';
  } else return null;
  // Only remove explicitly marked metadata, never arbitrary account/name digits.
  name = name
    .split(/\s+(?:ref(?:erence)?|session(?:\s+id)?|via|on)\s*[:#-]?\s+/i)[0]
    .trim()
    .replace(/^[-:/]+\s*/, '');
  const normalized = normalize(name);
  if (
    normalized.length < 3 ||
    name.length > 120 ||
    ['someone', 'unknown', 'merchant', 'account'].includes(normalized)
  )
    return null;
  return { key: `${kind}:${normalized}`, name };
}

export function categoryAllowed(category: string, direction: string) {
  const outgoingOnly = [
    'Purchase',
    'Bill',
    'Airtime/Data',
    'Bank Fee',
    'Cash Withdrawal',
    'Subscription',
    'Betting',
    'Food & Dining',
    'Transport',
  ];
  if (direction === 'IN' && outgoingOnly.includes(category)) return false;
  if (
    direction === 'OUT' &&
    ['Income', 'Betting Payout', 'Merchant Credit'].includes(category)
  )
    return false;
  return true;
}

export function applySavedCategory<
  T extends Pick<
    ParsedRow,
    'description' | 'direction' | 'category' | 'confidence' | 'reason'
  >,
>(
  row: T,
  currency: string,
  rules: SavedCategoryRule[],
): T & { counterparty: Counterparty | null; categorySource: string } {
  const counterparty = counterpartyFor(row.description, row.direction);
  // An ordinary merchant preference must not swallow explicit refunds or fees.
  const rule =
    !['Refund', 'Bank Fee'].includes(row.category) && counterparty
      ? rules.find(
          (r) =>
            r.counterpartyKey === counterparty.key &&
            r.direction === row.direction &&
            r.currency === currency &&
            categoryAllowed(r.category, row.direction),
        )
      : undefined;
  return rule
    ? {
        ...row,
        category: rule.category as Category,
        confidence: 1,
        reason: `Your saved category preference (${rule.id}) for this counterparty, direction and currency.`,
        counterparty,
        categorySource: 'saved-preference',
      }
    : { ...row, counterparty, categorySource: 'statement-description' };
}

export function groupCounterparties(
  rows: {
    id: string;
    description: string;
    direction: string;
    amountMinor: number;
    category: string;
  }[],
) {
  const groups = new Map<
    string,
    {
      key: string;
      name: string;
      direction: string;
      count: number;
      total: number;
      transactionIds: string[];
      categories: string[];
    }
  >();
  for (const row of rows) {
    const party = counterpartyFor(row.description, row.direction);
    if (!party) continue;
    const key = `${row.direction}:${party.key}`;
    const group = groups.get(key) ?? {
      key,
      name: party.name,
      direction: row.direction,
      count: 0,
      total: 0,
      transactionIds: [],
      categories: [],
    };
    group.count++;
    group.total += row.amountMinor;
    group.transactionIds.push(row.id);
    if (!group.categories.includes(row.category))
      group.categories.push(row.category);
    groups.set(key, group);
  }
  return [...groups.values()]
    .filter((g) => g.count > 1)
    .map((g) => ({ ...g, total: g.total / 100 }))
    .sort((a, b) => b.count - a.count);
}
