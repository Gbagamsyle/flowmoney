export type TransactionFilters = {
  search: string;
  category: string;
  direction: string;
  start: string;
  end: string;
  minimum: string;
  maximum: string;
  uncertain: boolean;
  includeUnselected: boolean;
};
export const emptyFilters: TransactionFilters = {
  search: "",
  category: "",
  direction: "",
  start: "",
  end: "",
  minimum: "",
  maximum: "",
  uncertain: false,
  includeUnselected: false,
};
type FilterRow = {
  date: string;
  description: string;
  category: string;
  direction: string;
  amountMinor: number;
  confidence: number;
  approved: boolean;
  counterparty?: { name: string } | null;
};
// Compare integer minor units; amount bounds refer to absolute transaction amounts.
export function filterTransactions<T extends FilterRow>(
  rows: T[],
  filters: TransactionFilters,
  imported: boolean,
): T[] {
  const query = filters.search.trim().toLocaleLowerCase();
  const lower =
    filters.minimum === "" ? null : Math.round(Number(filters.minimum) * 100);
  const upper =
    filters.maximum === "" ? null : Math.round(Number(filters.maximum) * 100);
  return rows.filter((row) => {
    const date = row.date.slice(0, 10);
    return (
      (!imported || filters.includeUnselected || row.approved) &&
      (!query ||
        [row.description, row.counterparty?.name ?? ""].some((text) =>
          text.toLocaleLowerCase().includes(query),
        )) &&
      (!filters.category || row.category === filters.category) &&
      (!filters.direction || row.direction === filters.direction) &&
      (!filters.start || date >= filters.start) &&
      (!filters.end || date <= filters.end) &&
      (lower === null || Number(row.amountMinor) >= lower) &&
      (upper === null || Number(row.amountMinor) <= upper) &&
      (!filters.uncertain || row.confidence < 0.8 || row.category === "Unknown")
    );
  });
}
export function transactionTotals(
  rows: { amountMinor: number; direction: string }[],
) {
  return rows.reduce(
    (totals, row) => {
      totals[row.direction === "IN" ? "received" : "sent"] += Number(
        row.amountMinor,
      );
      return totals;
    },
    { received: 0, sent: 0 },
  );
}
