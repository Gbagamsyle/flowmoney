import { expect, test } from "@playwright/test";
import {
  dashboardView,
  daysBetween,
  timingLabel,
  type DashboardSummary,
} from "../lib/dashboard-view";
const summary: DashboardSummary = {
  userId: "synthetic",
  preferredCurrency: "NGN",
  currentFunds: 100000,
  pendingIncome: 60000,
  projectedIncome: 40000,
  protectedObligations: 40000,
  minimumBuffer: 10000,
  safeToSpend: 50000,
  projectedPosition: 90000,
  riskLevel: "LOW",
  expectedIncomeByConfidence: {
    CONFIRMED: 30000,
    LIKELY: 20000,
    UNCERTAIN: 10000,
  },
  warnings: [],
  accounts: [{ id: "a", name: "Synthetic funds", balance: 100000 }],
  obligations: [
    {
      id: "later",
      title: "Later",
      amount: 1000,
      dueDate: "2026-10-26",
      priority: "IMPORTANT",
      status: "PENDING",
    },
    {
      id: "old",
      title: "Overdue",
      amount: 2000,
      dueDate: "2026-10-18",
      priority: "ESSENTIAL",
      status: "FUNDED",
    },
    {
      id: "today",
      title: "Today",
      amount: 3000,
      dueDate: "2026-10-19",
      priority: "ESSENTIAL",
      status: "PENDING",
    },
    {
      id: "paid",
      title: "Paid",
      amount: 999,
      dueDate: "2026-10-19",
      priority: "ESSENTIAL",
      status: "PAID",
    },
    {
      id: "skip",
      title: "Skip",
      amount: 999,
      dueDate: "2026-10-19",
      priority: "OPTIONAL",
      status: "SKIPPED",
    },
  ],
  expectedIncome: [
    {
      id: "received",
      title: "Received",
      amount: 10,
      expectedDate: "2026-10-18",
      confidence: "CONFIRMED",
      status: "RECEIVED",
    },
    {
      id: "future",
      title: "Future",
      amount: 10,
      expectedDate: "2026-10-25",
      confidence: "LIKELY",
      status: "EXPECTED",
    },
    {
      id: "delayed",
      title: "Delayed",
      amount: 10,
      expectedDate: "2026-10-18",
      confidence: "CONFIRMED",
      status: "DELAYED",
    },
  ],
};
test("overview sorts active records, preserves source data and separates overdue from the next seven days", () => {
  const before = JSON.stringify(summary);
  const result = dashboardView(summary, "2026-10-19");
  expect(result.obligations.map((o) => o.id)).toEqual([
    "old",
    "today",
    "later",
  ]);
  expect(result.income.map((o) => o.id)).toEqual(["delayed", "future"]);
  expect(result.dueSoonTotal).toBe(3000);
  expect(result.overdueCount).toBe(1);
  expect(JSON.stringify(summary)).toBe(before);
});
test("coverage uses current funds only and bounds shortfall visuals", () => {
  expect(dashboardView(summary, "2026-10-19").coverage).toBe(100);
  const result = dashboardView(
    {
      ...summary,
      currentFunds: 12500,
      pendingIncome: 999999,
      projectedIncome: 999999,
    },
    "2026-10-19",
  );
  expect(result.coverage).toBe(25);
  expect(result.shortfall).toBe(37500);
  expect(
    dashboardView({ ...summary, currentFunds: -100 }, "2026-10-19").coverage,
  ).toBe(0);
  expect(
    dashboardView(
      { ...summary, protectedObligations: 0, minimumBuffer: 0 },
      "2026-10-19",
    ).coverage,
  ).toBeNull();
});
test("mixed currencies never produce a coverage claim; warnings retain severity order", () => {
  const result = dashboardView(
    {
      ...summary,
      warnings: [
        { code: "note", message: "low", severity: "LOW" },
        { code: "currency_mismatch", message: "currency", severity: "LOW" },
        { code: "gap", message: "high", severity: "HIGH" },
      ],
    },
    "2026-10-19",
  );
  expect(result.mixedCurrency).toBe(true);
  expect(result.coverage).toBeNull();
  expect(result.warnings.map((w) => w.code)).toEqual(["gap", "note"]);
});
test("calendar labels handle month boundaries and invalid dates", () => {
  expect(daysBetween("2028-03-01T00:00:00Z", "2028-02-29")).toBe(1);
  expect(timingLabel("2026-10-18", "2026-10-19")).toBe("1d overdue");
  expect(timingLabel("2026-10-19", "2026-10-19")).toBe("Today");
  expect(timingLabel("2026-10-20", "2026-10-19")).toBe("Tomorrow");
  expect(timingLabel("invalid", "2026-10-19")).toBe("Date unavailable");
});
