"use client";

import { useAuth } from "@clerk/nextjs";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowLeftRight,
  CalendarDays,
  ChevronRight,
  Plus,
  ShieldCheck,
  X,
} from "lucide-react";
import { usePreferredCurrency } from "@/components/settings/preferred-currency-provider";
import { formatMoney } from "@/lib/format-money";
import { categoryName } from "@/lib/statement-labels";
import { moveAllocation, planningMinor } from "@/lib/planning-inputs";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";
const input =
  "mt-1 block w-full min-w-0 rounded-lg border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring";
const button =
  "inline-flex items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium disabled:opacity-50";
const groups = ["Essentials", "Everyday spending", "Goals", "Other"];
const matches = [
  "Purchase",
  "Bill",
  "Airtime/Data",
  "Bank Fee",
  "Subscription",
  "Betting",
  "Food & Dining",
  "Transport",
  "Contribution",
  "Gift",
];
type Category = {
  id: string;
  name: string;
  group: string;
  kind: string;
  allocatedMinor: number;
  targetMinor: number;
  savedMinor: number;
  targetDate: string | null;
  matches: string[];
  spentMinor?: number;
  remainingMinor?: number;
  stillNeededMinor?: number;
  overspentMinor?: number;
};
type Transaction = {
  id: string;
  date: string;
  description: string;
  category: string;
  amountMinor: number;
  direction: string;
  categoryId: string | null;
  obligationId: string | null;
  ignored: boolean;
  manual: boolean;
};
type Commitment = {
  id: string;
  title: string;
  amountMinor: number;
  paidMinor: number;
  outstandingMinor: number;
  date: string;
  status: string;
};
type Timeline = {
  id: string;
  title: string;
  date: string;
  sourceDate: string;
  overdue: boolean;
  kind: string;
  amountMinor: number;
  projectedMinor: number;
  currentOnlyMinor: number;
  projectedBalanceMinor: number;
};
type Plan = {
  mode: "LINKED" | "STANDALONE";
  startingFundsMinor: number;
  id: string | null;
  month: string;
  currency: string;
  revision: number;
  today: string;
  categories: Category[];
  transactions: Transaction[];
  obligations: Commitment[];
  timeline: Timeline[];
  fundsMinor: number;
  bufferMinor: number;
  reservedMinor: number;
  protectedMinor: number;
  unallocatedMinor: number;
  weeklyGuideMinor: number;
  expectedMinor: number;
  recordedThrough: string | null;
  recordedFrom: string | null;
  unmappedCount: number;
  overlapWarning: boolean;
  currencyMismatch: boolean;
  excludedCurrencies: string[];
  accountCount: number;
  actions: { transactionId: string; kind: string }[];
};
type Suggestion = {
  transactionId: string;
  kind: string;
  title: string;
  amount: string;
  date: string;
};

export default function PlanningPage() {
  const { getToken, userId, isLoaded, isSignedIn } = useAuth();
  const { currency } = usePreferredCurrency();
  const [month, setMonth] = useState(() =>
    new Date().toISOString().slice(0, 7),
  );
  const [mode, setMode] = useState<"LINKED" | "STANDALONE">("LINKED");
  const [startingAmount, setStartingAmount] = useState("");
  const [plan, setPlan] = useState<Plan | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<Category[]>([]);
  const [buffer, setBuffer] = useState("0");
  const [query, setQuery] = useState("");
  const [unassigned, setUnassigned] = useState(false);
  const [visible, setVisible] = useState(25);
  const [suggestion, setSuggestion] = useState<Suggestion | null>(null);
  const generation = useRef(0);
  const request = useCallback(
    async (path: string, init?: RequestInit) => {
      const token = await getToken();
      if (!token) throw new Error("Please sign in again.");
      const response = await fetch(API + "/planning" + path, {
        ...init,
        cache: "no-store",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await response.json().catch(() => null);
      if (!response.ok)
        throw new Error(
          typeof data?.message === "string"
            ? data.message
            : "Unable to load or save your plan. Please refresh before retrying.",
        );
      return data as Plan;
    },
    [getToken],
  );
  function show(data: Plan) {
    setPlan(data);
    setStartingAmount(
      data.id ? (data.startingFundsMinor / 100).toFixed(2) : "",
    );
    setDraft(data.categories);
    setBuffer((data.bufferMinor / 100).toFixed(2));
    setEditing(false);
    setSuggestion(null);
  }
  useEffect(() => {
    const current = ++generation.current;
    setPlan(null);
    setDraft([]);
    setEditing(false);
    setSuggestion(null);
    setError("");
    setLoading(true);
    setVisible(25);
    setQuery("");
    setUnassigned(false);
    if (!isLoaded || !isSignedIn) return;
    void request(`?month=${month}&mode=${mode}`)
      .then((data) => {
        if (current === generation.current) show(data);
      })
      .catch((cause) => {
        if (current === generation.current) setError(cause.message);
      })
      .finally(() => {
        if (current === generation.current) setLoading(false);
      });
    return () => {
      generation.current++;
    };
  }, [isLoaded, isSignedIn, userId, month, mode, currency, request]);
  async function run(action: () => Promise<Plan>) {
    const current = generation.current;
    setBusy(true);
    setError("");
    try {
      const data = await action();
      if (current === generation.current) show(data);
    } catch (cause) {
      if (current === generation.current)
        setError(
          cause instanceof Error ? cause.message : "Unable to save your plan.",
        );
    } finally {
      setBusy(false);
    }
  }
  function save(categories: Category[]) {
    return request(`/${plan!.id}`, {
      method: "PATCH",
      body: JSON.stringify({
        revision: plan!.revision,
        bufferMinor: planningMinor(buffer),
        ...(plan!.mode === "STANDALONE"
          ? { startingFundsMinor: planningMinor(startingAmount) }
          : {}),
        categories,
      }),
    });
  }
  const money = (minor: number) =>
    formatMoney(minor / 100, plan?.currency ?? currency, undefined, 2);
  const filtered = (plan?.transactions ?? []).filter(
    (t) =>
      (!query ||
        `${t.description} ${categoryName(t.category)}`
          .toLowerCase()
          .includes(query.toLowerCase())) &&
      (!unassigned ||
        (t.direction === "OUT" &&
          !t.categoryId &&
          !t.obligationId &&
          !t.ignored)),
  );
  function updateCategory(index: number, patch: Partial<Category>) {
    setDraft((current) =>
      current.map((c, i) => (i === index ? { ...c, ...patch } : c)),
    );
  }
  function assign(row: Transaction, value: string) {
    const [kind, destination] = value.includes(":")
      ? value.split(":")
      : ["", value];
    void run(() =>
      request(`/${plan!.id}/assign`, {
        method: "POST",
        body: JSON.stringify({
          revision: plan!.revision,
          transactionId: row.id,
          kind,
          destination,
        }),
      }),
    );
  }
  const dirty = editing;
  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Your monthly plan
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Give your money a purpose, with room for life to change.
          </p>
        </div>
        <label className="text-sm">
          Plan source
          <select
            aria-label="Plan source"
            disabled={busy || dirty}
            className={input}
            value={mode}
            onChange={(e) => setMode(e.target.value as "LINKED" | "STANDALONE")}
          >
            <option value="LINKED">Use my existing funds</option>
            <option value="STANDALONE">Create a standalone plan</option>
          </select>
        </label>
        <label className="text-sm">
          Plan month
          <input
            aria-label="Plan month"
            type="month"
            min="2000-01"
            max="2099-12"
            disabled={busy || dirty}
            value={month}
            onChange={(e) => {
              if (e.target.value) setMonth(e.target.value);
            }}
            className={input}
          />
        </label>
      </div>
      {error && (
        <div role="alert" className="rounded-xl border bg-card p-4 text-sm">
          {error}
          <button
            disabled={busy}
            type="button"
            className="ml-3 underline"
            onClick={() =>
              void run(() => request(`?month=${month}&mode=${mode}`))
            }
          >
            Refresh plan
          </button>
        </div>
      )}
      {loading && (
        <p
          role="status"
          className="py-12 text-center text-sm text-muted-foreground"
        >
          Preparing your plan…
        </p>
      )}
      {!loading && plan && (
        <>
          {!plan.id ? (
            <section className="rounded-xl border bg-card p-6">
              <h2 className="text-lg font-semibold">
                {mode === "STANDALONE"
                  ? "Start a fresh plan"
                  : "Start with your existing funds"}
              </h2>
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
                {mode === "STANDALONE"
                  ? "Enter an amount for this separate budget, then choose your categories and savings goals. Your existing accounts, obligations, expected income and statements are not linked."
                  : "Use your recorded accounts, protect existing obligations and track approved statement spending. Expected income stays separate until it arrives and your Current Funds are updated."}
              </p>
              <form
                className="mt-4 space-y-4"
                onSubmit={(e) => {
                  e.preventDefault();
                  void run(() =>
                    request("", {
                      method: "POST",
                      body: JSON.stringify({
                        month,
                        mode,
                        ...(mode === "STANDALONE"
                          ? {
                              startingFundsMinor: planningMinor(startingAmount),
                            }
                          : {}),
                      }),
                    }),
                  );
                }}
              >
                {mode === "STANDALONE" ? (
                  <label className="block max-w-xs text-sm">
                    Starting amount ({plan.currency})
                    <input
                      aria-label="Standalone starting amount"
                      required
                      type="number"
                      min="0"
                      step="0.01"
                      className={input}
                      value={startingAmount}
                      onChange={(e) => setStartingAmount(e.target.value)}
                      disabled={busy}
                    />
                  </label>
                ) : (
                  <p className="text-sm">
                    {money(plan.fundsMinor)} recorded in {plan.accountCount}{" "}
                    matching account(s).
                  </p>
                )}
                <button
                  disabled={busy}
                  className={button + " bg-primary text-primary-foreground"}
                >
                  {mode === "STANDALONE"
                    ? "Create standalone plan"
                    : "Create linked plan"}
                </button>
              </form>
              <p className="mt-3 text-xs text-muted-foreground">
                Starts with editable categories and a 10% buffer based on{" "}
                {mode === "STANDALONE"
                  ? "your starting amount"
                  : "recorded funds"}
                . Nothing is moved or locked. Both plan types can coexist for
                this month.
              </p>
            </section>
          ) : (
            <>
              <section className="space-y-4 rounded-xl border bg-card p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <span className="flex items-center gap-2 text-sm font-medium">
                    <ShieldCheck className="size-4" />
                    {plan.currency} ·{" "}
                    {plan.mode === "STANDALONE"
                      ? "standalone budget"
                      : "money available now"}
                  </span>
                  {plan.mode === "STANDALONE" ? (
                    <span className="text-xs text-muted-foreground">
                      Independent from your accounts
                    </span>
                  ) : (
                    <Link href="/accounts" className="text-xs underline">
                      Update Current Funds
                    </Link>
                  )}
                </div>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  {[
                    [
                      plan.mode === "STANDALONE"
                        ? "Starting amount"
                        : "Recorded funds",
                      plan.fundsMinor,
                    ],
                    ["Protected commitments", plan.protectedMinor],
                    ["Category & savings reserves", plan.reservedMinor],
                    [
                      plan.unallocatedMinor < 0
                        ? "Plan exceeds current funds by"
                        : "Still available to allocate",
                      Math.abs(plan.unallocatedMinor),
                    ],
                  ]
                    .filter(
                      ([label]) =>
                        plan.mode !== "STANDALONE" ||
                        label !== "Protected commitments",
                    )
                    .map(([label, value]) => (
                      <div key={label} className="rounded-lg border p-4">
                        <p className="text-xs text-muted-foreground">{label}</p>
                        <p className="mt-2 break-all text-xl font-semibold tabular-nums">
                          {money(Number(value))}
                        </p>
                      </div>
                    ))}
                </div>
                {plan.mode === "STANDALONE" ? (
                  <p className="text-xs leading-relaxed text-muted-foreground">
                    {money(plan.fundsMinor)} starting amount −{" "}
                    {money(plan.reservedMinor)} category and savings reserves −{" "}
                    {money(plan.bufferMinor)} buffer ={" "}
                    {money(plan.unallocatedMinor)} available to allocate. This
                    is a separate planning preview. No balances, spending or
                    commitments are pulled from your existing account setup.
                  </p>
                ) : (
                  <p className="text-xs leading-relaxed text-muted-foreground">
                    {money(plan.fundsMinor)} funds −{" "}
                    {money(plan.protectedMinor)} unpaid commitments −{" "}
                    {money(plan.reservedMinor)} remaining category and savings
                    reserves − {money(plan.bufferMinor)} buffer ={" "}
                    {money(plan.unallocatedMinor)}. Current Funds should reflect
                    spending already recorded; we reserve remaining allocations
                    rather than subtracting past spending again.
                  </p>
                )}
                <div className="flex flex-wrap gap-x-6 gap-y-2 border-t pt-3 text-sm">
                  <span>
                    {plan.mode === "STANDALONE" ? (
                      "Plan source: independent starting amount"
                    ) : (
                      <>
                        Expected, not available:{" "}
                        <strong>{money(plan.expectedMinor)}</strong>
                      </>
                    )}
                  </span>
                  <span>
                    Everyday spending guide:{" "}
                    <strong>{money(plan.weeklyGuideMinor)}</strong> for the next
                    7 days or remaining days this month
                  </span>
                </div>
                {plan.unallocatedMinor < 0 && (
                  <p role="status" className="text-sm font-medium">
                    {plan.mode === "STANDALONE"
                      ? "Reduce allocations or edit your starting amount."
                      : "Reduce allocations or update your funds. Expected income does not cover this gap yet."}
                  </p>
                )}
                {plan.mode !== "STANDALONE" &&
                  month !== plan.today.slice(0, 7) && (
                    <p className="text-xs text-muted-foreground">
                      This is a{" "}
                      {month < plan.today.slice(0, 7) ? "past" : "future"} plan
                      using today’s recorded funds, not a historical or
                      guaranteed future balance. Monthly plans do not reserve
                      money across one another.
                    </p>
                  )}
              </section>
              {(plan.currencyMismatch ||
                plan.excludedCurrencies.length > 0 ||
                plan.overlapWarning) && (
                <section className="space-y-2 rounded-xl border bg-card p-4 text-sm">
                  {plan.currencyMismatch && (
                    <p>
                      Your preferred currency has changed. This plan keeps{" "}
                      {plan.currency}; obligations and expected income are
                      hidden because their currency is no longer certain.
                    </p>
                  )}
                  {!!plan.excludedCurrencies.length && (
                    <p>
                      Accounts in {plan.excludedCurrencies.join(", ")} are
                      excluded. No currency conversion is performed.
                    </p>
                  )}
                  {plan.overlapWarning && (
                    <p>
                      Multiple imports cover overlapping recorded dates. They
                      may be separate accounts or duplicate exports. Check
                      Statements before relying on combined totals; no
                      transactions have been removed automatically.
                    </p>
                  )}
                </section>
              )}
              <section className="space-y-4 rounded-xl border bg-card p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="font-semibold">Categories & goals</h2>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {plan.mode === "STANDALONE"
                        ? "Independent allocations only. Account transactions and recorded spending are not linked."
                        : plan.recordedThrough
                          ? `Spending recorded ${plan.recordedFrom} through ${plan.recordedThrough}. Imported entries may not cover every day or account.`
                          : "No approved statement spending recorded for this month yet."}
                    </p>
                  </div>
                  <button
                    disabled={busy}
                    className={button}
                    onClick={() => {
                      if (editing) {
                        setDraft(plan.categories);
                        setBuffer((plan.bufferMinor / 100).toFixed(2));
                      }
                      setEditing(!editing);
                    }}
                  >
                    {editing ? "Cancel editing" : "Edit plan"}
                  </button>
                </div>
                {editing ? (
                  <form
                    className="space-y-4"
                    onSubmit={(e) => {
                      e.preventDefault();
                      void run(() => save(draft));
                    }}
                  >
                    {plan.mode === "STANDALONE" && (
                      <label className="block max-w-xs text-sm">
                        Starting amount ({plan.currency})
                        <input
                          aria-label="Standalone starting amount"
                          required
                          type="number"
                          min="0"
                          step="0.01"
                          className={input}
                          value={startingAmount}
                          onChange={(e) => setStartingAmount(e.target.value)}
                          disabled={busy}
                        />
                      </label>
                    )}
                    <label className="block max-w-xs text-sm">
                      Safety buffer
                      <input
                        className={input}
                        type="number"
                        min="0"
                        step="0.01"
                        required
                        value={buffer}
                        onChange={(e) => setBuffer(e.target.value)}
                        disabled={busy}
                      />
                    </label>
                    {draft.map((category, index) => (
                      <fieldset
                        disabled={busy}
                        key={category.id || `new-${index}`}
                        className="space-y-3 rounded-lg border p-4"
                      >
                        <legend className="px-1 text-xs text-muted-foreground">
                          {category.kind === "SAVINGS"
                            ? "Savings goal"
                            : "Spending category"}
                        </legend>
                        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                          <label className="text-sm">
                            Name
                            <input
                              maxLength={100}
                              required
                              className={input}
                              value={category.name}
                              onChange={(e) =>
                                updateCategory(index, { name: e.target.value })
                              }
                            />
                          </label>
                          <label className="text-sm">
                            Group
                            <select
                              className={input}
                              value={category.group}
                              onChange={(e) =>
                                updateCategory(index, { group: e.target.value })
                              }
                            >
                              {groups.map((g) => (
                                <option key={g}>{g}</option>
                              ))}
                            </select>
                          </label>
                          <label className="text-sm">
                            Type
                            <select
                              className={input}
                              value={category.kind}
                              onChange={(e) =>
                                updateCategory(index, {
                                  kind: e.target.value,
                                  matches: [],
                                })
                              }
                            >
                              <option value="EXPENSE">Spending</option>
                              <option value="SAVINGS">Savings goal</option>
                            </select>
                          </label>
                          <label className="text-sm">
                            {category.kind === "SAVINGS"
                              ? "Set aside this month"
                              : "Monthly allocation"}
                            <input
                              className={input}
                              type="number"
                              min="0"
                              step="0.01"
                              required
                              defaultValue={(
                                category.allocatedMinor / 100
                              ).toFixed(2)}
                              key={`amount-${category.id}-${editing}`}
                              onChange={(e) => {
                                try {
                                  updateCategory(index, {
                                    allocatedMinor: planningMinor(
                                      e.target.value,
                                    ),
                                  });
                                  e.target.setCustomValidity("");
                                } catch {
                                  e.target.setCustomValidity(
                                    "Enter an amount with up to two decimal places.",
                                  );
                                }
                              }}
                            />
                          </label>
                        </div>
                        {category.kind === "SAVINGS" ? (
                          <>
                            <div className="grid gap-3 sm:grid-cols-3">
                              <label className="text-sm">
                                Total goal
                                <input
                                  className={input}
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  required
                                  defaultValue={(
                                    category.targetMinor / 100
                                  ).toFixed(2)}
                                  onChange={(e) => {
                                    try {
                                      updateCategory(index, {
                                        targetMinor: planningMinor(
                                          e.target.value,
                                        ),
                                      });
                                      e.target.setCustomValidity("");
                                    } catch {
                                      e.target.setCustomValidity(
                                        "Enter an amount with up to two decimal places.",
                                      );
                                    }
                                  }}
                                />
                              </label>
                              <label className="text-sm">
                                Already set aside
                                <input
                                  className={input}
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  required
                                  defaultValue={(
                                    category.savedMinor / 100
                                  ).toFixed(2)}
                                  onChange={(e) => {
                                    try {
                                      updateCategory(index, {
                                        savedMinor: planningMinor(
                                          e.target.value,
                                        ),
                                      });
                                      e.target.setCustomValidity("");
                                    } catch {
                                      e.target.setCustomValidity(
                                        "Enter an amount with up to two decimal places.",
                                      );
                                    }
                                  }}
                                />
                              </label>
                              <label className="text-sm">
                                Goal date (optional)
                                <input
                                  className={input}
                                  type="date"
                                  value={category.targetDate ?? ""}
                                  onChange={(e) =>
                                    updateCategory(index, {
                                      targetDate: e.target.value || null,
                                    })
                                  }
                                />
                              </label>
                            </div>
                            <p className="text-xs text-muted-foreground">
                              Already-set-aside money must be included in
                              {plan.mode === "STANDALONE"
                                ? "your standalone starting amount"
                                : "Current Funds"}
                              . Both amounts are reserved in this plan; this
                              does not move money.
                            </p>
                          </>
                        ) : plan.mode === "STANDALONE" ? null : (
                          <details>
                            <summary className="cursor-pointer text-xs text-muted-foreground">
                              Match approved statement purposes (optional)
                            </summary>
                            <div className="mt-3 flex flex-wrap gap-3">
                              {matches.map((purpose) => (
                                <label
                                  key={purpose}
                                  className="flex items-center gap-2 text-xs"
                                >
                                  <input
                                    type="checkbox"
                                    checked={category.matches.includes(purpose)}
                                    onChange={(e) =>
                                      updateCategory(index, {
                                        matches: e.target.checked
                                          ? [...category.matches, purpose]
                                          : category.matches.filter(
                                              (p) => p !== purpose,
                                            ),
                                      })
                                    }
                                  />
                                  {categoryName(purpose)}
                                </label>
                              ))}
                            </div>
                          </details>
                        )}
                        <button
                          type="button"
                          className="text-xs underline"
                          onClick={() =>
                            setDraft((current) =>
                              current.filter((_, i) => i !== index),
                            )
                          }
                        >
                          Remove category
                        </button>
                      </fieldset>
                    ))}
                    <div className="flex flex-wrap gap-3">
                      <button
                        type="button"
                        disabled={busy || draft.length >= 50}
                        className={button}
                        onClick={() =>
                          setDraft((current) => [
                            ...current,
                            {
                              id: "",
                              name: "",
                              group: "Other",
                              kind: "EXPENSE",
                              allocatedMinor: 0,
                              targetMinor: 0,
                              savedMinor: 0,
                              targetDate: null,
                              matches: [],
                            },
                          ])
                        }
                      >
                        <Plus className="size-4" />
                        Add category
                      </button>
                      <button
                        disabled={busy}
                        className={`${button} bg-primary text-primary-foreground`}
                      >
                        {busy ? "Saving…" : "Save plan"}
                      </button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Deleting a category removes its planning links. Statement
                      transactions remain unchanged. Use distinct names and
                      assign each statement purpose to one category.
                    </p>
                  </form>
                ) : (
                  <>
                    {groups.map((group) => {
                      const categories = plan.categories.filter(
                        (c) => c.group === group,
                      );
                      return categories.length ? (
                        <div key={group}>
                          <h3 className="mb-2 mt-5 text-sm font-medium">
                            {group}
                          </h3>
                          <div className="space-y-2">
                            {categories.map((c) => (
                              <div
                                key={c.id}
                                className="grid gap-3 rounded-lg border p-4 sm:grid-cols-[minmax(0,1.5fr)_repeat(3,minmax(0,1fr))]"
                              >
                                <div className="min-w-0">
                                  <p className="break-words text-sm font-medium">
                                    {c.name}
                                  </p>
                                  <p className="mt-1 text-xs text-muted-foreground">
                                    {c.kind === "SAVINGS"
                                      ? c.targetDate
                                        ? `Goal by ${c.targetDate}`
                                        : "Savings goal"
                                      : c.matches.length
                                        ? c.matches.map(categoryName).join(", ")
                                        : plan.mode === "STANDALONE"
                                          ? "Independent allocation"
                                          : "Assign transactions below"}
                                  </p>
                                </div>
                                {(c.kind === "SAVINGS"
                                  ? [
                                      ["Target", c.targetMinor],
                                      [
                                        "Set aside in this plan",
                                        c.remainingMinor ?? 0,
                                      ],
                                      ["Still needed", c.stillNeededMinor ?? 0],
                                    ]
                                  : [
                                      ["Allocated", c.allocatedMinor],
                                      ["Recorded spending", c.spentMinor ?? 0],
                                      [
                                        c.overspentMinor
                                          ? "Over allocation"
                                          : "Remaining",
                                        c.overspentMinor ||
                                          c.remainingMinor ||
                                          0,
                                      ],
                                    ]
                                )
                                  .filter(
                                    ([label]) =>
                                      plan.mode !== "STANDALONE" ||
                                      label !== "Recorded spending",
                                  )
                                  .map(([label, value]) => (
                                    <div key={label}>
                                      <p className="text-xs text-muted-foreground">
                                        {label}
                                      </p>
                                      <p className="mt-1 break-all text-sm font-medium tabular-nums">
                                        {money(Number(value))}
                                      </p>
                                    </div>
                                  ))}
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : null;
                    })}
                    {!plan.categories.length && (
                      <p className="text-sm text-muted-foreground">
                        Add categories to begin allocating money.
                      </p>
                    )}
                    {plan.categories.length > 1 && (
                      <details className="border-t pt-4">
                        <summary className="flex cursor-pointer items-center gap-2 text-sm font-medium">
                          <ArrowLeftRight className="size-4" />
                          Move an allocation
                        </summary>
                        <form
                          className="mt-4 grid gap-3 sm:grid-cols-4"
                          onSubmit={(e) => {
                            e.preventDefault();
                            const form = new FormData(e.currentTarget);
                            void run(async () =>
                              save(
                                moveAllocation(
                                  plan.categories,
                                  String(form.get("from")),
                                  String(form.get("to")),
                                  planningMinor(String(form.get("amount"))),
                                ),
                              ),
                            );
                          }}
                        >
                          <label className="text-sm">
                            From
                            <select name="from" className={input}>
                              {plan.categories.map((c) => (
                                <option key={c.id} value={c.id}>
                                  {c.name}
                                </option>
                              ))}
                            </select>
                          </label>
                          <label className="text-sm">
                            To
                            <select
                              name="to"
                              defaultValue={plan.categories[1]?.id}
                              className={input}
                            >
                              {plan.categories.map((c) => (
                                <option key={c.id} value={c.id}>
                                  {c.name}
                                </option>
                              ))}
                            </select>
                          </label>
                          <label className="text-sm">
                            Amount
                            <input
                              name="amount"
                              className={input}
                              type="number"
                              min="0.01"
                              step="0.01"
                              required
                            />
                          </label>
                          <button
                            disabled={busy}
                            className={`${button} self-end`}
                          >
                            Move allocation
                          </button>
                        </form>
                        <p className="mt-2 text-xs text-muted-foreground">
                          Moves planned amounts, not bank funds. Check remaining
                          spending and any over-allocation afterward.
                        </p>
                      </details>
                    )}
                  </>
                )}
              </section>
              {plan.mode !== "STANDALONE" && (
                <>
                  <section className="space-y-3 rounded-xl border bg-card p-5">
                    <div className="flex items-center justify-between gap-3">
                      <h2 className="font-semibold">Protected commitments</h2>
                      <Link href="/obligations" className="text-xs underline">
                        Manage obligations
                      </Link>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Existing obligations appear here once. Link a recorded
                      payment below so it reduces the outstanding commitment
                      instead of also counting in a spending category. Linking
                      does not change its status in Obligations.
                    </p>
                    {plan.obligations
                      .filter((o) => o.status !== "SKIPPED")
                      .map((o) => (
                        <div
                          key={o.id}
                          className="flex flex-wrap items-center justify-between gap-2 border-b py-3 text-sm"
                        >
                          <div>
                            <p className="font-medium">{o.title}</p>
                            <p className="mt-1 text-xs text-muted-foreground">
                              Due {o.date} ·{" "}
                              {o.status === "PAID"
                                ? "Marked paid"
                                : money(o.paidMinor) + " linked payments"}
                            </p>
                          </div>
                          <span className="font-medium tabular-nums">
                            {money(o.outstandingMinor)} outstanding
                          </span>
                        </div>
                      ))}
                    {!plan.obligations.length && (
                      <p className="text-sm text-muted-foreground">
                        No commitments recorded in this currency.
                      </p>
                    )}
                  </section>
                  <section className="space-y-3 rounded-xl border bg-card p-5">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <h2 className="flex items-center gap-2 font-semibold">
                        <CalendarDays className="size-4" />
                        Cash-flow outlook
                      </h2>
                      <Link href="/scenarios" className={button}>
                        What if?
                        <ChevronRight className="size-4" />
                      </Link>
                    </div>
                    <p className="text-xs leading-relaxed text-muted-foreground">
                      From today through the plan month, after category
                      reserves, buffer and later commitments. Current-funds-only
                      assumes no income arrives. The alternative includes only
                      future, confirmed expected income; delayed, likely,
                      uncertain and partial income cannot fund it. Bills are
                      considered before income on the same day. Dates use UTC.
                    </p>
                    <div className="space-y-2">
                      {plan.timeline.map((event) => (
                        <div
                          key={`${event.kind}-${event.id}`}
                          className="grid gap-2 rounded-lg border p-3 text-sm sm:grid-cols-[minmax(0,1.4fr)_1fr_1fr]"
                        >
                          <div>
                            <p className="break-words font-medium">
                              {event.title}
                            </p>
                            <p className="mt-1 text-xs text-muted-foreground">
                              {event.sourceDate}
                              {event.overdue
                                ? " · overdue or delayed"
                                : ""} ·{" "}
                              {event.kind === "INCOME"
                                ? "Expected receipt"
                                : "Commitment"}{" "}
                              · {money(Math.abs(event.amountMinor))}
                              {event.kind === "INCOME" && !event.projectedMinor
                                ? " · excluded from projection"
                                : ""}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">
                              Current funds only
                            </p>
                            <p className="mt-1 tabular-nums">
                              {money(event.currentOnlyMinor)}
                              {event.currentOnlyMinor < 0 ? " · shortfall" : ""}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">
                              If confirmed income arrives
                            </p>
                            <p className="mt-1 tabular-nums">
                              {money(event.projectedBalanceMinor)}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                    {!plan.timeline.length && (
                      <p className="text-sm text-muted-foreground">
                        No upcoming entries in this view.
                      </p>
                    )}
                  </section>
                  <section className="space-y-4 rounded-xl border bg-card p-5">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <h2 className="font-semibold">
                          Connect your recorded spending
                        </h2>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {plan.transactions.length} approved transactions ·{" "}
                          {plan.unmappedCount} outgoing movements without a
                          planning purpose
                        </p>
                      </div>
                      <Link href="/statements" className="text-xs underline">
                        Open Statements
                      </Link>
                    </div>
                    <p className="text-xs leading-relaxed text-muted-foreground">
                      Transfers, cash withdrawals, loan movements and savings
                      stay separate unless you assign an outgoing entry
                      yourself. Refunds and other credits do not automatically
                      reduce spending. Future bill or income suggestions always
                      need a new date, amount and your confirmation.
                    </p>
                    <div className="flex flex-wrap items-end gap-4">
                      <label className="min-w-0 flex-1 text-sm">
                        Find a transaction
                        <input
                          type="search"
                          className={input}
                          value={query}
                          onChange={(e) => {
                            setQuery(e.target.value);
                            setVisible(25);
                          }}
                        />
                      </label>
                      <label className="flex items-center gap-2 pb-2 text-sm">
                        <input
                          type="checkbox"
                          checked={unassigned}
                          onChange={(e) => {
                            setUnassigned(e.target.checked);
                            setVisible(25);
                          }}
                        />
                        Without a planning purpose
                      </label>
                    </div>
                    {editing && (
                      <p className="text-xs text-muted-foreground">
                        Save or cancel your category edits before assigning
                        transactions or creating future records.
                      </p>
                    )}
                    <div className="max-h-[36rem] space-y-3 overflow-auto">
                      {filtered.slice(0, visible).map((row) => (
                        <article
                          key={row.id}
                          className="space-y-3 rounded-lg border p-4 text-sm"
                        >
                          <div className="flex justify-between gap-3">
                            <span className="text-xs text-muted-foreground">
                              {row.date} · {categoryName(row.category)}
                            </span>
                            <strong className="shrink-0 tabular-nums">
                              {row.direction === "IN" ? "+" : "−"}
                              {money(row.amountMinor)}
                            </strong>
                          </div>
                          <p className="break-words">{row.description}</p>
                          {row.direction === "OUT" && (
                            <label className="block text-xs">
                              Planning purpose
                              <select
                                className={input}
                                disabled={busy || editing}
                                value={
                                  row.ignored
                                    ? "ignore"
                                    : row.obligationId
                                      ? `OBLIGATION:${row.obligationId}`
                                      : row.categoryId && row.manual
                                        ? `CATEGORY:${row.categoryId}`
                                        : "auto"
                                }
                                onChange={(e) => assign(row, e.target.value)}
                              >
                                <option value="auto">
                                  {row.categoryId
                                    ? `Statement match: ${plan.categories.find((c) => c.id === row.categoryId)?.name ?? "category"}`
                                    : "Use statement matches, otherwise keep separate"}
                                </option>
                                <option value="ignore">
                                  Keep separate from spending
                                </option>
                                <optgroup label="Spending categories">
                                  {plan.categories
                                    .filter((c) => c.kind === "EXPENSE")
                                    .map((c) => (
                                      <option
                                        key={c.id}
                                        value={`CATEGORY:${c.id}`}
                                      >
                                        {c.name}
                                      </option>
                                    ))}
                                </optgroup>
                                <optgroup label="Commitment payment">
                                  {plan.obligations.map((o) => (
                                    <option
                                      key={o.id}
                                      value={`OBLIGATION:${o.id}`}
                                    >
                                      {o.title}
                                    </option>
                                  ))}
                                </optgroup>
                              </select>
                            </label>
                          )}
                          {!plan.currencyMismatch && (
                            <button
                              type="button"
                              disabled={
                                busy ||
                                editing ||
                                plan.actions.some(
                                  (a) =>
                                    a.transactionId === row.id &&
                                    a.kind ===
                                      (row.direction === "IN"
                                        ? "INCOME"
                                        : "OBLIGATION"),
                                )
                              }
                              className="text-xs underline disabled:opacity-50"
                              onClick={() =>
                                setSuggestion({
                                  transactionId: row.id,
                                  kind:
                                    row.direction === "IN"
                                      ? "INCOME"
                                      : "OBLIGATION",
                                  title: row.description.slice(0, 100),
                                  amount: (row.amountMinor / 100).toFixed(2),
                                  date: plan.today,
                                })
                              }
                            >
                              {plan.actions.some(
                                (a) =>
                                  a.transactionId === row.id &&
                                  a.kind ===
                                    (row.direction === "IN"
                                      ? "INCOME"
                                      : "OBLIGATION"),
                              )
                                ? "Future record created from this entry"
                                : row.direction === "IN"
                                  ? "Use as a starting point for expected income"
                                  : "Use as a starting point for a future obligation"}
                            </button>
                          )}
                        </article>
                      ))}
                    </div>
                    {!filtered.length && (
                      <p className="text-sm text-muted-foreground">
                        No matching approved entries. Import a statement or
                        widen your search.
                      </p>
                    )}
                    {filtered.length > visible && (
                      <button
                        className={button}
                        onClick={() => setVisible((v) => v + 25)}
                      >
                        Show more transactions (
                        {Math.min(visible, filtered.length)} of{" "}
                        {filtered.length})
                      </button>
                    )}
                    {suggestion && (
                      <form
                        aria-label="Confirm future record"
                        className="space-y-4 rounded-xl border p-4"
                        onSubmit={(e) => {
                          e.preventDefault();
                          void run(() =>
                            request(`/${plan.id}/from-statement`, {
                              method: "POST",
                              body: JSON.stringify({
                                revision: plan.revision,
                                transactionId: suggestion.transactionId,
                                kind: suggestion.kind,
                                title: suggestion.title,
                                amountMinor: planningMinor(suggestion.amount),
                                date: suggestion.date,
                              }),
                            }),
                          );
                        }}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <h3 className="font-medium">
                            Review a new{" "}
                            {suggestion.kind === "INCOME"
                              ? "expected income"
                              : "obligation"}
                          </h3>
                          <button
                            type="button"
                            aria-label="Cancel future record"
                            onClick={() => setSuggestion(null)}
                          >
                            <X className="size-4" />
                          </button>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          The past entry is only a starting point, not proof
                          this will repeat. This creates one separate future
                          record; it does not change the statement or your
                          account balance. New expected income starts as
                          uncertain.
                        </p>
                        <div className="grid gap-3 sm:grid-cols-3">
                          <label className="text-sm">
                            Name
                            <input
                              required
                              maxLength={100}
                              value={suggestion.title}
                              className={input}
                              onChange={(e) =>
                                setSuggestion({
                                  ...suggestion,
                                  title: e.target.value,
                                })
                              }
                            />
                          </label>
                          <label className="text-sm">
                            Amount
                            <input
                              required
                              type="number"
                              min="0.01"
                              step="0.01"
                              className={input}
                              value={suggestion.amount}
                              onChange={(e) =>
                                setSuggestion({
                                  ...suggestion,
                                  amount: e.target.value,
                                })
                              }
                            />
                          </label>
                          <label className="text-sm">
                            {suggestion.kind === "INCOME"
                              ? "Expected date"
                              : "Due date"}
                            <input
                              required
                              type="date"
                              min={plan.today}
                              className={input}
                              value={suggestion.date}
                              onChange={(e) =>
                                setSuggestion({
                                  ...suggestion,
                                  date: e.target.value,
                                })
                              }
                            />
                          </label>
                        </div>
                        <button
                          disabled={busy || editing}
                          className={`${button} bg-primary text-primary-foreground`}
                        >
                          Confirm and create{" "}
                          {suggestion.kind === "INCOME"
                            ? "expected income"
                            : "obligation"}
                        </button>
                      </form>
                    )}
                  </section>
                </>
              )}
              <p className="text-xs text-muted-foreground">
                Allocations are intentions, not bank transfers. No money is
                moved or locked. Plans do not change approved statement
                categories, account balances or obligation statuses. Savings and
                allocations do not roll over automatically.
              </p>
            </>
          )}
        </>
      )}
    </div>
  );
}
