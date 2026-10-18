"use client";

import { useAuth } from "@clerk/nextjs";
import { useEffect, useState } from "react";
import { usePreferredCurrency } from "@/components/settings/preferred-currency-provider";
import { CURRENCIES } from "@/lib/currencies";
import { formatMoney } from "@/lib/format-money";
import {
  categoryName,
  categoryMovements,
  movementLabel,
} from "@/lib/statement-labels";

import {
  emptyFilters,
  filterTransactions,
  transactionTotals,
  type TransactionFilters,
} from "@/lib/statement-filters";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";
type Row = {
  id: string;
  sourceRow: number;
  date: string;
  description: string;
  amountMinor: number;
  direction: string;
  category: string;
  parsedCategory: string;
  suggestedCategory?: string;
  categorySource?: string;
  counterparty?: { key: string; name: string } | null;
  confidence: number;
  reason: string;
  approved: boolean;
};
type History = {
  id: string;
  currency: string;
  format: string;
  status: string;
  createdAt: string;
};
type CounterpartyGroup = {
  key: string;
  name: string;
  direction: string;
  count: number;
  total: number;
  transactionIds: string[];
  categories: string[];
};
type CategoryPreference = {
  id: string;
  counterpartyName: string;
  direction: string;
  currency: string;
  category: string;
};
type Statement = History & {
  groups?: CounterpartyGroup[];
  allowedCategories?: Record<string, string[]>;
  transactions: Row[];
  categories: string[];
  summary: {
    start: string;
    end: string;
    months: number;
    totalInflow: number;
    totalOutflow: number;
    netCashFlow: number;
    averageMonthlyInflow: number;
    averageMonthlyOutflow: number;
    classifiedSpending: number;
    transfersOut: number;
    categoryTotals: Record<string, { inflow: number; outflow: number }>;
    incomeSources: {
      description: string;
      count: number;
      total: number;
      activeMonths: number;
      likelyRecurring: boolean;
    }[];
  };
};
const button =
  "rounded-lg border px-4 py-2 text-sm font-medium disabled:opacity-50";

export default function StatementsPage() {
  const { getToken, isLoaded, isSignedIn, userId } = useAuth();
  const { currency } = usePreferredCurrency();
  const [statementCurrency, setStatementCurrency] = useState<string>(currency);
  const [file, setFile] = useState<File | null>(null);
  const [history, setHistory] = useState<History[]>([]);
  const [statement, setStatement] = useState<Statement | null>(null);
  const [choices, setChoices] = useState<
    Record<string, { category: string; reviewed: boolean }>
  >({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<TransactionFilters>({
    ...emptyFilters,
  });
  const [visibleRows, setVisibleRows] = useState(50);
  function updateFilters(next: Partial<TransactionFilters>) {
    setFilters((current) => ({ ...current, ...next }));
    setVisibleRows(50);
  }
  function drilldown(category: string, direction: string) {
    setFilters({ ...emptyFilters, category, direction });
    setVisibleRows(50);
    setShowIndividualRows(true);
    requestAnimationFrame(() =>
      document
        .getElementById("statement-transactions")
        ?.scrollIntoView({ behavior: "smooth", block: "start" }),
    );
  }
  const [showIndividualRows, setShowIndividualRows] = useState(false);
  const [groupCategories, setGroupCategories] = useState<
    Record<string, string>
  >({});
  const [rememberGroups, setRememberGroups] = useState<Record<string, boolean>>(
    {},
  );
  const [savedPreferences, setSavedPreferences] = useState<
    CategoryPreference[]
  >([]);
  const [visibleGroups, setVisibleGroups] = useState(10);
  useEffect(() => {
    setStatementCurrency(currency);
  }, [currency]);
  async function request(path = "", init?: RequestInit) {
    const token = await getToken();
    if (!token) throw new Error("Please sign in again.");
    const response = await fetch(`${API}/statements${path}`, {
      ...init,
      cache: "no-store",
      headers: { ...init?.headers, Authorization: `Bearer ${token}` },
    });
    if (!response.ok) {
      const body = await response.json().catch(() => null);
      throw new Error(
        typeof body?.message === "string"
          ? body.message
          : "Unable to complete the request. Please retry.",
      );
    }
    return response.json();
  }
  useEffect(() => {
    let active = true;
    setStatement(null);
    setChoices({});
    setHistory([]);
    setFile(null);
    setSavedPreferences([]);
    if (isLoaded && isSignedIn)
      void Promise.all([request(), request("/category-rules")])
        .then(([data, preferences]) => {
          if (active) {
            setHistory(data);
            setSavedPreferences(preferences);
          }
        })
        .catch((e) => {
          if (active) setError(e.message);
        });
    return () => {
      active = false;
    };
  }, [isLoaded, isSignedIn, userId, getToken]);
  async function run(action: () => Promise<void>) {
    setBusy(true);
    setError(null);
    try {
      await action();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to process statement.");
    } finally {
      setBusy(false);
    }
  }
  function show(data: Statement) {
    setStatement(data);
    setFilters({ ...emptyFilters });
    setVisibleRows(50);
    setGroupCategories({});
    setRememberGroups({});
    setVisibleGroups(10);
    setShowIndividualRows(false);
    setChoices(
      Object.fromEntries(
        data.transactions.map((r) => [
          r.id,
          { category: r.category, reviewed: data.status === "REVIEW" },
        ]),
      ),
    );
  }
  function categorizeGroup(group: CounterpartyGroup, category: string) {
    setGroupCategories((current) => ({ ...current, [group.key]: category }));
    setRememberGroups((current) => ({ ...current, [group.key]: false }));
    const original = new Map(
      statement?.transactions.map((row) => [row.id, row.category]),
    );
    setChoices((current) => {
      const next = { ...current };
      for (const id of group.transactionIds)
        next[id] = {
          category: category || original.get(id) || "Unknown",
          reviewed: current[id]?.reviewed ?? true,
        };
      return next;
    });
  }
  const selected = Object.entries(choices).filter(([, c]) => c.reviewed);
  const transactionsById = new Map(
    statement?.transactions.map((row) => [row.id, row]),
  );
  const selectedIds = new Set(selected.map(([id]) => id));
  const selectedTotals = (statement?.transactions ?? []).reduce(
    (totals, row) => {
      if (selectedIds.has(row.id))
        totals[row.direction === "IN" ? "received" : "sent"] += Number(
          row.amountMinor,
        );
      return totals;
    },
    { received: 0, sent: 0 },
  );
  const effectiveRows = (statement?.transactions ?? []).map((row) => ({
    ...row,
    category:
      statement?.status === "REVIEW"
        ? (choices[row.id]?.category ?? row.category)
        : row.category,
  }));
  const filteredRows = filterTransactions(
    effectiveRows,
    filters,
    statement?.status === "IMPORTED",
  );
  const categoryTotalsMinor: Record<
    string,
    { inflow: number; outflow: number }
  > = {};
  for (const row of effectiveRows) {
    if (statement?.status === "IMPORTED" && !row.approved) continue;
    const totals = (categoryTotalsMinor[row.category] ??= {
      inflow: 0,
      outflow: 0,
    });
    totals[row.direction === "IN" ? "inflow" : "outflow"] += Number(
      row.amountMinor,
    );
  }
  const filteredTotals = transactionTotals(filteredRows);
  const summary = statement?.summary;
  const money = (n: number) =>
    formatMoney(n, statement?.currency ?? statementCurrency, undefined, 2);
  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Statement Insights
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Understand your financial history. Review it before importing.
        </p>
      </div>
      <section className="space-y-4 rounded-xl border bg-card p-5">
        <h2 className="font-medium">Upload a digital statement</h2>
        <p className="text-sm text-muted-foreground">
          PDF, CSV or XLSX · up to 5 MB and 5,000 transactions. Scans and
          password-protected files are unsupported. We never request banking
          credentials. Raw files are processed temporarily in memory.
        </p>
        <p className="text-sm text-muted-foreground">
          Use Date, Description, Debit and Credit columns, or a signed Amount
          (negative = money out). Numeric dates use day/month/year. PDF tables
          need clearly separated columns. CSV is the most reliable option.
        </p>
        <form
          className="flex flex-wrap items-end gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (!file) return;
            void run(async () => {
              const data = new FormData();
              data.append("file", file);
              data.append("currency", statementCurrency);
              show(await request("", { method: "POST", body: data }));
              setFile(null);
              setHistory(await request());
            });
          }}
        >
          <label className="min-w-0 text-sm">
            Statement file
            <input
              required
              disabled={busy}
              type="file"
              accept=".pdf,.csv,.xlsx"
              className="mt-2 block w-full max-w-sm text-sm"
              onChange={(e) => {
                const next = e.target.files?.[0] ?? null;
                if (next && next.size > 5 * 1024 * 1024) {
                  setError("Maximum file size is 5 MB.");
                  setFile(null);
                  e.target.value = "";
                } else setFile(next);
              }}
            />
          </label>
          <label className="text-sm">
            Statement currency
            <select
              className="mt-2 block rounded-lg border bg-background p-2"
              disabled={busy}
              value={statementCurrency}
              onChange={(e) => setStatementCurrency(e.target.value)}
            >
              {CURRENCIES.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.code}
                </option>
              ))}
            </select>
          </label>
          <button
            className={`${button} bg-primary text-primary-foreground`}
            disabled={busy || !file || !isSignedIn}
          >
            {busy ? "Processing…" : "Analyze statement"}
          </button>
        </form>
        <p className="text-xs text-muted-foreground">
          Confirm the currency printed on your statement. Values use your
          preferred money formatting; no currency conversion is performed.
        </p>
      </section>
      {error && (
        <div role="alert" className="rounded-lg border p-4 text-sm">
          {error}{" "}
          <button
            className="underline"
            disabled={busy}
            onClick={() => void run(async () => setHistory(await request()))}
          >
            Refresh history
          </button>
        </div>
      )}
      {statement && summary && (
        <>
          <section className="space-y-4 rounded-xl border bg-card p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="font-semibold">
                {statement.status === "IMPORTED"
                  ? "Imported history"
                  : "Analysis preview"}{" "}
                · {summary.start} – {summary.end}
              </h2>
              <button
                className={button}
                disabled={busy}
                onClick={() =>
                  void run(async () => {
                    await request(`/${statement.id}`, { method: "DELETE" });
                    setStatement(null);
                    setChoices({});
                    setHistory(await request());
                  })
                }
              >
                Delete statement data
              </button>
            </div>
            <p className="text-sm text-muted-foreground">
              {statement.status === "IMPORTED"
                ? "Totals include only the transactions you approved."
                : "This preview includes all extracted transactions. Category totals follow your current purpose choices; only selected entries are saved when you import."}{" "}
              Current Funds, Expected Income and Obligations stay unchanged.
            </p>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {[
                ["Money entering this account", summary.totalInflow],
                ["Money leaving this account", summary.totalOutflow],
                ["Net change from transactions", summary.netCashFlow],
                ["Average received each month", summary.averageMonthlyInflow],
                ["Average leaving each month", summary.averageMonthlyOutflow],
                ["Transfers sent and savings deposits", summary.transfersOut],
              ].map(([label, value]) => (
                <div key={label} className="rounded-lg border p-4">
                  <p className="text-xs text-muted-foreground">{label}</p>
                  <p className="mt-1 text-xl font-semibold">
                    {money(Number(value))}
                  </p>
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              Monthly averages cover {summary.months} calendar month(s),
              including partial and empty months. Money leaving this account
              includes purchases, transfers and cash withdrawals. The net change
              is money received minus money that left; it is not your current
              balance.
            </p>
            <div className="grid gap-6 md:grid-cols-2">
              <div>
                <h3 className="mb-2 text-sm font-medium">
                  Transaction breakdown
                </h3>
                <p className="mb-2 text-xs text-muted-foreground">
                  Select a total to see its transactions.
                </p>
                <p className="mb-3 text-xs text-muted-foreground">
                  {statement.status === "REVIEW"
                    ? "These are suggested categories. Check that savings, transfers and loan entries describe what actually happened."
                    : "These totals follow your reviewed categories. Savings movements and transfers are separate from purchases and bills."}
                </p>
                {Object.entries(categoryTotalsMinor).map(
                  ([category, totals]) => {
                    const movements = categoryMovements(category, {
                      inflow: totals.inflow / 100,
                      outflow: totals.outflow / 100,
                    });
                    if (!movements.length) return null;
                    return (
                      <div
                        key={category}
                        className="space-y-2 border-b py-3 text-sm"
                      >
                        {movements.length > 1 && (
                          <h4 className="font-medium">
                            {categoryName(category)}
                          </h4>
                        )}
                        {movements.map((movement) => (
                          <button
                            type="button"
                            key={movement.direction}
                            onClick={() =>
                              drilldown(category, movement.direction)
                            }
                            aria-label={`View transactions: ${movement.label}`}
                            className="flex w-full items-baseline justify-between gap-4 text-left hover:underline focus-visible:outline focus-visible:outline-offset-4"
                          >
                            <span
                              className={
                                movements.length > 1
                                  ? "text-muted-foreground"
                                  : undefined
                              }
                            >
                              {movement.label}
                            </span>
                            <span className="shrink-0 font-medium tabular-nums">
                              {money(movement.amount)}
                            </span>
                          </button>
                        ))}
                      </div>
                    );
                  },
                )}
              </div>
              <div>
                <h3 className="mb-2 text-sm font-medium">
                  Possible regular income
                </h3>
                {summary.incomeSources.length ? (
                  summary.incomeSources.map((s, i) => (
                    <p key={i} className="border-b py-2 text-sm">
                      {s.description} · {money(s.total)} · {s.count} payment(s)
                      in {s.activeMonths} month(s)
                      {s.likelyRecurring ? " · may repeat regularly" : ""}
                    </p>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No regular income pattern identified yet. Transfers, refunds
                    and savings withdrawals are not automatically counted as
                    earnings.
                  </p>
                )}
              </div>
            </div>
          </section>
          <section className="space-y-4 rounded-xl border bg-card p-5">
            <h2
              id="statement-transactions"
              className="scroll-mt-6 font-semibold"
            >
              Review transactions
            </h2>
            <p className="text-sm text-muted-foreground">
              {statement.status === "REVIEW"
                ? "All extracted transactions are selected. Import them together, exclude any you do not want, or adjust purposes first. Transfer purposes can stay unspecified. Incorrect dates or amounts require a corrected statement."
                : "Only the transactions you selected were saved to history. You can view unselected entries for reference."}
            </p>
            {statement.status === "REVIEW" && (
              <>
                <div className="flex flex-wrap items-center gap-4 text-sm">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      disabled={busy}
                      checked={
                        selected.length === statement.transactions.length
                      }
                      onChange={(e) => {
                        const included = e.target.checked;
                        setChoices((current) =>
                          Object.fromEntries(
                            statement.transactions.map((row) => [
                              row.id,
                              {
                                category:
                                  current[row.id]?.category ?? row.category,
                                reviewed: included,
                              },
                            ]),
                          ),
                        );
                      }}
                    />
                    Include all {statement.transactions.length} transactions
                  </label>
                  <span className="text-muted-foreground">
                    {selected.length} selected ·{" "}
                    {money(selectedTotals.received / 100)} received ·{" "}
                    {money(selectedTotals.sent / 100)} left this account
                  </span>
                </div>
                {!!statement.groups?.length && (
                  <details className="space-y-3">
                    <summary className="cursor-pointer text-sm font-medium">
                      Categorize repeated senders or merchants (optional)
                    </summary>
                    <p className="text-xs text-muted-foreground">
                      A transfer tells us money moved, not why. Choose a purpose
                      only when you know it. A group may contain different
                      purposes; use individual transactions when needed.
                    </p>
                    {statement.groups.slice(0, visibleGroups).map((group) => (
                      <div
                        key={group.key}
                        className="space-y-2 rounded-lg border p-3 text-sm"
                      >
                        <p className="break-words font-medium">{group.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {group.count} transactions ·{" "}
                          {group.direction === "IN" ? "Received" : "Sent"}{" "}
                          {money(group.total)}
                        </p>
                        <select
                          aria-label={`Purpose for ${group.name}, ${group.direction === "IN" ? "received" : "sent"}`}
                          disabled={busy}
                          className="max-w-full rounded border bg-background p-2"
                          value={groupCategories[group.key] ?? ""}
                          onChange={(e) =>
                            categorizeGroup(group, e.target.value)
                          }
                        >
                          <option value="">Keep current suggestions</option>
                          {(
                            statement.allowedCategories?.[group.direction] ??
                            statement.categories
                          ).map((category) => (
                            <option key={category} value={category}>
                              {categoryName(category)}
                            </option>
                          ))}
                        </select>
                        <label className="flex items-start gap-2 text-xs text-muted-foreground">
                          <input
                            className="mt-0.5"
                            type="checkbox"
                            disabled={busy || !groupCategories[group.key]}
                            checked={rememberGroups[group.key] ?? false}
                            onChange={(e) =>
                              setRememberGroups((current) => ({
                                ...current,
                                [group.key]: e.target.checked,
                              }))
                            }
                          />
                          Use this purpose for future matching transactions in
                          the same direction and currency. Saved only when you
                          import.
                        </label>
                      </div>
                    ))}
                    {statement.groups.length > visibleGroups && (
                      <button
                        className={button}
                        type="button"
                        onClick={() =>
                          setVisibleGroups((current) => current + 10)
                        }
                      >
                        Show more groups
                      </button>
                    )}
                  </details>
                )}
              </>
            )}
            <button
              className={button}
              type="button"
              onClick={() => setShowIndividualRows((value) => !value)}
            >
              {showIndividualRows
                ? "Hide individual transactions"
                : `${statement.status === "REVIEW" ? "View or edit" : "View"} individual transactions (${statement.transactions.length})`}
            </button>
            {showIndividualRows && (
              <div className="space-y-3">
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <label className="text-sm sm:col-span-2">
                    Search description or merchant
                    <input
                      type="search"
                      value={filters.search}
                      onChange={(e) =>
                        updateFilters({ search: e.target.value })
                      }
                      className="mt-1 block w-full rounded-lg border bg-background p-2"
                    />
                  </label>
                  <label className="text-sm">
                    Category
                    <select
                      value={filters.category}
                      onChange={(e) =>
                        updateFilters({ category: e.target.value })
                      }
                      className="mt-1 block w-full rounded-lg border bg-background p-2"
                    >
                      <option value="">All categories</option>
                      {statement.categories.map((category) => (
                        <option key={category} value={category}>
                          {categoryName(category)}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="text-sm">
                    Account movement
                    <select
                      value={filters.direction}
                      onChange={(e) =>
                        updateFilters({ direction: e.target.value })
                      }
                      className="mt-1 block w-full rounded-lg border bg-background p-2"
                    >
                      <option value="">All movements</option>
                      <option value="IN">Money received</option>
                      <option value="OUT">Money leaving</option>
                    </select>
                  </label>
                  {(
                    [
                      { key: "start", label: "From date", type: "date" },
                      { key: "end", label: "To date", type: "date" },
                      {
                        key: "minimum",
                        label: "Minimum amount",
                        type: "number",
                      },
                      {
                        key: "maximum",
                        label: "Maximum amount",
                        type: "number",
                      },
                    ] as const
                  ).map((field) => (
                    <label key={field.key} className="text-sm">
                      {field.label}
                      <input
                        type={field.type}
                        min={field.type === "number" ? "0" : undefined}
                        step={field.type === "number" ? "0.01" : undefined}
                        value={filters[field.key]}
                        onChange={(e) =>
                          updateFilters({ [field.key]: e.target.value })
                        }
                        className="mt-1 block w-full min-w-0 rounded-lg border bg-background p-2"
                      />
                    </label>
                  ))}
                </div>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={filters.uncertain}
                    onChange={(e) =>
                      updateFilters({ uncertain: e.target.checked })
                    }
                  />
                  Show only transactions with an unspecified or uncertain
                  purpose
                </label>
                {statement.status === "IMPORTED" && (
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={filters.includeUnselected}
                      onChange={(e) =>
                        updateFilters({ includeUnselected: e.target.checked })
                      }
                    />
                    Include entries not saved to history
                  </label>
                )}
                <button
                  className={button}
                  type="button"
                  onClick={() => updateFilters({ ...emptyFilters })}
                >
                  Clear filters
                </button>
                <p role="status" className="text-sm">
                  {filteredRows.length} matching transactions ·{" "}
                  {statement.currency} · {money(filteredTotals.received / 100)}{" "}
                  received · {money(filteredTotals.sent / 100)} left this
                  account
                </p>
                <p className="text-xs text-muted-foreground">
                  Amounts are per transaction, without a minus sign. Filters
                  only change what you see; your import selection and the
                  statement totals above stay unchanged.{" "}
                  {statement.status === "REVIEW"
                    ? "Matches use your current category choices, including entries you exclude."
                    : filters.includeUnselected
                      ? "Matching totals include entries not saved to history."
                      : "Matches include only entries saved to history."}
                </p>
                {!filteredRows.length && (
                  <p className="text-sm text-muted-foreground">
                    No transactions match these filters. Clear filters or widen
                    your search.
                  </p>
                )}
              </div>
            )}
            {showIndividualRows && (
              <div className="max-h-[36rem] space-y-3 overflow-auto">
                {filteredRows.slice(0, visibleRows).map((r) => (
                  <article key={r.id} className="rounded-lg border p-4 text-sm">
                    <div className="flex flex-wrap justify-between gap-2">
                      <span>
                        {r.date} · statement row {r.sourceRow}
                      </span>
                      <strong>
                        {r.direction === "IN" ? "+" : "−"}
                        {money(Number(r.amountMinor) / 100)}
                      </strong>
                    </div>
                    <p className="mt-2 text-xs text-muted-foreground">
                      {movementLabel(
                        statement.status === "REVIEW"
                          ? (choices[r.id]?.category ?? r.category)
                          : r.category,
                        r.direction,
                      )}
                    </p>
                    <p className="my-2 break-words">{r.description}</p>
                    <p className="mb-3 text-xs text-muted-foreground">
                      Suggested category:{" "}
                      {categoryName(r.suggestedCategory ?? r.parsedCategory)}.
                      {r.categorySource === "saved-preference" &&
                        " Uses your saved preference."}
                      {(r.confidence < 0.8 || r.category === "Unknown") &&
                        " You may leave its purpose unspecified."}
                    </p>
                    {statement.status === "REVIEW" ? (
                      <div className="flex flex-wrap items-center gap-4">
                        <label>
                          Category{" "}
                          <select
                            disabled={busy}
                            className="rounded border bg-background p-2"
                            value={choices[r.id]?.category ?? r.category}
                            onChange={(e) =>
                              setChoices((c) => ({
                                ...c,
                                [r.id]: {
                                  category: e.target.value,
                                  reviewed: c[r.id]?.reviewed ?? true,
                                },
                              }))
                            }
                          >
                            {(
                              statement.allowedCategories?.[r.direction] ??
                              statement.categories
                            ).map((c) => (
                              <option key={c} value={c}>
                                {categoryName(c)}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label className="flex items-center gap-2">
                          <input
                            disabled={busy}
                            type="checkbox"
                            checked={choices[r.id]?.reviewed ?? false}
                            onChange={(e) =>
                              setChoices((c) => ({
                                ...c,
                                [r.id]: {
                                  category: c[r.id]?.category ?? r.category,
                                  reviewed: e.target.checked,
                                },
                              }))
                            }
                          />{" "}
                          Include this transaction
                        </label>
                        {r.counterparty && (
                          <label className="flex items-start gap-2 text-xs text-muted-foreground">
                            <input
                              className="mt-0.5"
                              disabled={busy}
                              type="checkbox"
                              checked={
                                rememberGroups[
                                  `${r.direction}:${r.counterparty.key}`
                                ] ?? false
                              }
                              onChange={(e) => {
                                const key = `${r.direction}:${r.counterparty!.key}`;
                                setRememberGroups((current) => ({
                                  ...current,
                                  [key]: e.target.checked,
                                }));
                              }}
                            />
                            Remember this purpose for future matches to this
                            counterparty, direction and currency.
                          </label>
                        )}
                      </div>
                    ) : (
                      <p>
                        {categoryName(r.category)} ·{" "}
                        {r.approved ? "Saved to history" : "Not selected"}
                      </p>
                    )}
                  </article>
                ))}
              </div>
            )}
            {showIndividualRows && filteredRows.length > visibleRows && (
              <button
                className={button}
                type="button"
                onClick={() => setVisibleRows((current) => current + 50)}
              >
                Show more transactions (
                {Math.min(visibleRows, filteredRows.length)} of{" "}
                {filteredRows.length})
              </button>
            )}
            {statement.status === "REVIEW" && (
              <button
                className={`${button} bg-primary text-primary-foreground`}
                disabled={busy || !selected.length}
                onClick={() =>
                  void run(async () => {
                    show(
                      await request(`/${statement.id}/approve`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                          transactions: selected.map(([id, c]) => {
                            const row = transactionsById.get(id);
                            const key = row?.counterparty
                              ? `${row.direction}:${row.counterparty.key}`
                              : "";
                            return {
                              id,
                              ...c,
                              remember: Boolean(key && rememberGroups[key]),
                            };
                          }),
                        }),
                      }),
                    );
                    setHistory(await request());
                    setSavedPreferences(await request("/category-rules"));
                  })
                }
              >
                Import {selected.length} selected transaction(s)
              </button>
            )}
          </section>
        </>
      )}
      <section className="rounded-xl border bg-card p-5">
        <h2 className="mb-3 font-medium">Recent statements</h2>
        {!!savedPreferences.length && (
          <details className="mb-4 space-y-2 text-sm">
            <summary className="cursor-pointer text-muted-foreground">
              Saved categorization preferences ({savedPreferences.length})
            </summary>
            {savedPreferences.map((preference) => (
              <div
                key={preference.id}
                className="flex flex-wrap items-center justify-between gap-2 border-b py-2"
              >
                <span>
                  {preference.counterpartyName} ·{" "}
                  {preference.direction === "IN" ? "Received" : "Sent"} ·{" "}
                  {preference.currency} · {categoryName(preference.category)}
                </span>
                <button
                  disabled={busy}
                  className="underline"
                  onClick={() =>
                    void run(async () => {
                      await request(`/category-rules/${preference.id}`, {
                        method: "DELETE",
                      });
                      setSavedPreferences(await request("/category-rules"));
                    })
                  }
                >
                  Forget preference
                </button>
              </div>
            ))}
          </details>
        )}
        {!history.length && (
          <p className="text-sm text-muted-foreground">
            Your statements will appear here after analysis.
          </p>
        )}
        {history.map((h) => (
          <button
            key={h.id}
            disabled={busy}
            className="block w-full border-b py-3 text-left text-sm"
            onClick={() =>
              void run(async () => show(await request(`/${h.id}`)))
            }
          >
            {new Date(h.createdAt).toLocaleDateString()} · {h.format} ·{" "}
            {h.currency} ·{" "}
            {h.status === "IMPORTED" ? "Saved to history" : "Needs review"}
          </button>
        ))}
      </section>
    </div>
  );
}
