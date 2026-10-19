export type DashboardWarning = {
  code: string;
  message: string;
  severity: "LOW" | "MEDIUM" | "HIGH";
  amount?: number;
  obligationId?: string;
  title?: string;
  daysLate?: number;
};
export type DashboardSummary = {
  userId: string;
  preferredCurrency: string;
  currentFunds: number;
  pendingIncome: number;
  projectedIncome: number;
  protectedObligations: number;
  minimumBuffer: number;
  safeToSpend: number;
  projectedPosition: number;
  riskLevel: "LOW" | "MEDIUM" | "HIGH";
  expectedIncomeByConfidence: {
    CONFIRMED: number;
    LIKELY: number;
    UNCERTAIN: number;
  };
  warnings: DashboardWarning[];
  accounts: { id: string; name: string; balance: number | string }[];
  expectedIncome: {
    id: string;
    title: string;
    amount: number | string;
    expectedDate: string;
    confidence: string;
    status: string;
  }[];
  obligations: {
    id: string;
    title: string;
    amount: number | string;
    dueDate: string;
    priority: string;
    status: string;
  }[];
};
export function calendarDay(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
export function daysBetween(value: string, today: string) {
  const start = Date.parse(today + "T00:00:00Z");
  const end = Date.parse(value.slice(0, 10) + "T00:00:00Z");
  return Number.isFinite(start) && Number.isFinite(end)
    ? Math.round((end - start) / 86400000)
    : null;
}
export function timingLabel(value: string, today: string) {
  const days = daysBetween(value, today);
  if (days === null) return "Date unavailable";
  if (days < 0) return `${Math.abs(days)}d overdue`;
  if (days === 0) return "Today";
  if (days === 1) return "Tomorrow";
  return `In ${days} days`;
}
export function dashboardView(summary: DashboardSummary, today: string) {
  const obligations = summary.obligations
    .filter((item) => !["PAID", "SKIPPED"].includes(item.status))
    .sort(
      (a, b) => a.dueDate.localeCompare(b.dueDate) || a.id.localeCompare(b.id),
    );
  const income = summary.expectedIncome
    .filter((item) => ["EXPECTED", "PARTIAL", "DELAYED"].includes(item.status))
    .sort(
      (a, b) =>
        a.expectedDate.localeCompare(b.expectedDate) ||
        a.id.localeCompare(b.id),
    );
  const dueSoon = obligations.filter((item) => {
    const days = daysBetween(item.dueDate, today);
    return days !== null && days >= 0 && days < 7;
  });
  const reserves =
    Math.max(0, summary.protectedObligations) +
    Math.max(0, summary.minimumBuffer);
  const mixedCurrency = summary.warnings.some(
    (warning) => warning.code === "currency_mismatch",
  );
  const severity = { HIGH: 0, MEDIUM: 1, LOW: 2 };
  return {
    obligations,
    income,
    dueSoon,
    dueSoonTotal: dueSoon.reduce((sum, item) => sum + Number(item.amount), 0),
    overdueCount: obligations.filter(
      (item) => (daysBetween(item.dueDate, today) ?? 0) < 0,
    ).length,
    coverage:
      mixedCurrency || reserves === 0
        ? null
        : Math.min(
            100,
            Math.max(0, Math.floor((summary.currentFunds / reserves) * 100)),
          ),
    shortfall: Math.max(0, reserves - summary.currentFunds),
    mixedCurrency,
    warnings: summary.warnings
      .filter((w) => w.code !== "currency_mismatch")
      .slice()
      .sort((a, b) => severity[a.severity] - severity[b.severity]),
    noFinancialData:
      summary.accounts.length === 0 &&
      summary.expectedIncome.length === 0 &&
      summary.obligations.length === 0,
  };
}
