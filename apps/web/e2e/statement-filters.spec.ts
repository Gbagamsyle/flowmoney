import { expect, test } from "@playwright/test";
import {
  emptyFilters,
  filterTransactions,
  transactionTotals,
} from "../lib/statement-filters";
import { categoryMovements } from "../lib/statement-labels";

const rows = [
  {
    id: "a",
    date: "2026-02-01",
    description: "POS CORNER SHOP",
    counterparty: { name: "Corner Shop" },
    category: "Purchase",
    direction: "OUT",
    amountMinor: 12505,
    confidence: 0.95,
    approved: true,
  },
  {
    id: "b",
    date: "2026-02-28T00:00:00Z",
    description: "Transfer received",
    category: "Unknown",
    direction: "IN",
    amountMinor: 20000,
    confidence: 0.6,
    approved: true,
  },
  {
    id: "c",
    date: "2026-03-01",
    description: "Airtime",
    category: "Airtime/Data",
    direction: "OUT",
    amountMinor: 5000,
    confidence: 0.95,
    approved: false,
  },
  {
    id: "d",
    date: "2026-02-01",
    description: "Reversal",
    category: "Purchase",
    direction: "IN",
    amountMinor: 12505,
    confidence: 0.95,
    approved: true,
  },
];
test("combined search, date, direction, category and decimal amount boundaries", () => {
  const found = filterTransactions(
    rows,
    {
      ...emptyFilters,
      search: "  corner SHOP ",
      category: "Purchase",
      direction: "OUT",
      start: "2026-02-01",
      end: "2026-02-01",
      minimum: "125.05",
      maximum: "125.05",
    },
    false,
  );
  expect(found.map((row) => row.id)).toEqual(["a"]);
  expect(transactionTotals(found)).toEqual({ received: 0, sent: 12505 });
  expect(
    filterTransactions(
      rows,
      { ...emptyFilters, minimum: "125.06", maximum: "125.04" },
      false,
    ),
  ).toEqual([]);
});
test("search also matches counterparty and inclusive end date handles timestamps", () => {
  expect(
    filterTransactions(
      [{ ...rows[0], description: "POS payment" }],
      { ...emptyFilters, search: "corner" },
      false,
    ),
  ).toHaveLength(1);
  expect(
    filterTransactions(
      rows,
      { ...emptyFilters, start: "2026-02-28", end: "2026-02-28" },
      false,
    ).map((row) => row.id),
  ).toEqual(["b"]);
});
test("history defaults to approved rows; excluded reference entries require opt-in", () => {
  expect(
    filterTransactions(rows, emptyFilters, true).map((row) => row.id),
  ).toEqual(["a", "b", "d"]);
  expect(
    filterTransactions(
      rows,
      { ...emptyFilters, includeUnselected: true },
      true,
    ),
  ).toHaveLength(4);
  expect(filterTransactions(rows, emptyFilters, false)).toHaveLength(4);
});
test("uncertain filter and clearing filters do not modify source or selection", () => {
  const before = JSON.stringify(rows);
  expect(
    filterTransactions(rows, { ...emptyFilters, uncertain: true }, false).map(
      (row) => row.id,
    ),
  ).toEqual(["b"]);
  expect(
    filterTransactions(rows, { ...emptyFilters, search: "absent" }, false),
  ).toEqual([]);
  expect(
    transactionTotals(filterTransactions(rows, emptyFilters, false)),
  ).toEqual({ received: 32505, sent: 17505 });
  expect(JSON.stringify(rows)).toBe(before);
});
test("each category movement drills down to its exact integer total", () => {
  for (const movement of categoryMovements("Purchase", {
    inflow: 125.05,
    outflow: 125.05,
  })) {
    const found = filterTransactions(
      rows,
      { ...emptyFilters, category: "Purchase", direction: movement.direction },
      true,
    );
    expect(found.reduce((sum, row) => sum + row.amountMinor, 0)).toBe(
      Math.round(movement.amount * 100),
    );
    expect(found).toHaveLength(1);
  }
});
