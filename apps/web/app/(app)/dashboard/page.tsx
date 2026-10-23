"use client";
import { FinancialNotice } from "@/components/legal/financial-notice";

import { useAuth, useUser } from "@clerk/nextjs";
import {
  AlertTriangle,
  ArrowRight,
  CalendarDays,
  CircleDollarSign,
  Clock3,
  ChartNoAxesCombined,
  ListChecks,
  ShieldCheck,
  TrendingUp,
  WalletCards,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@flowmoney/ui/components/button";
import { FinancialSummaryCard } from "@/components/dashboard/financial-summary-card";
import { useCallback, useEffect, useRef, useState } from "react";
import { usePreferredCurrency } from "@/components/settings/preferred-currency-provider";
import { formatMoney } from "@/lib/format-money";
import { trackDashboardReturn } from "@/lib/analytics";
import {
  calendarDay,
  dashboardView,
  type DashboardSummary,
} from "@/lib/dashboard-view";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

export default function DashboardPage() {
  const { getToken, isLoaded, isSignedIn, userId } = useAuth();
  const { currency } = usePreferredCurrency();
  const { user } = useUser();
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [loadedAt, setLoadedAt] = useState<Date | null>(null);
  const [now, setNow] = useState<Date | null>(null);
  const activeRequest = useRef<AbortController | null>(null);
  const loadDashboard = useCallback(async () => {
    if (!isLoaded || !isSignedIn) return false;
    activeRequest.current?.abort();
    const controller = new AbortController();
    activeRequest.current = controller;
    setLoading(true);
    try {
      const token = await getToken();
      if (!token) throw new Error("Session unavailable");
      if (controller.signal.aborted) return false;
      const response = await fetch(`${API}/dashboard`, {
        cache: "no-store",
        signal: controller.signal,
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) { const failure = await response.json().catch(() => ({})); throw new Error(failure.message ?? "Unable to load Overview"); }
      const data = (await response.json()) as DashboardSummary;
      if (controller.signal.aborted) return false;
      setSummary(data);
      setError("");
      setLoadedAt(new Date());
      setNow(new Date());
      return true;
    } catch (e) {
      if (!controller.signal.aborted)
        setError(e instanceof Error ? e.message : "We couldn’t refresh your money picture. Please try again.");
      return false;
    } finally {
      if (activeRequest.current === controller) setLoading(false);
    }
  }, [getToken, isLoaded, isSignedIn, userId]);
  useEffect(() => {
    setSummary(null);
    setLoadedAt(null);
    setError("");
    setNow(new Date());
    if (!isLoaded) return;
    if (!isSignedIn) {
      setLoading(false);
      return;
    }
    void loadDashboard().then((loaded) => {
      if (loaded) void trackDashboardReturn(userId ?? undefined);
    });
    const refresh = () => {
      void loadDashboard();
    };
    window.addEventListener("flowmoney:accounts-changed", refresh);
    window.addEventListener("flowmoney:financial-data-changed", refresh);
    return () => {
      activeRequest.current?.abort();
      window.removeEventListener("flowmoney:accounts-changed", refresh);
      window.removeEventListener("flowmoney:financial-data-changed", refresh);
    };
  }, [isLoaded, isSignedIn, userId, currency, loadDashboard]);

  const today = now ? calendarDay(now) : "";
  const view = summary ? dashboardView(summary, today) : null;
  const displayName = user?.firstName || user?.username || "there";
  const greeting = !now
    ? "Welcome back"
    : now.getHours() < 12
      ? "Good morning"
      : now.getHours() < 18
        ? "Good afternoon"
        : "Good evening";
  const obligations = view?.obligations.slice(0, 4) ?? [];
  const expectedIncome = view?.income.slice(0, 4) ?? [];
  const noFinancialData = view?.noFinancialData ?? false;
  const dashboardCurrency = summary?.preferredCurrency ?? currency;
  return (
    <div className="mx-auto max-w-7xl space-y-8 [overflow-wrap:anywhere]">
      <section>
        <p className="text-sm font-medium text-muted-foreground">
          Your money, in perspective
        </p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">
          {greeting}, {displayName}.
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
          Here’s where your money stands today.
        </p>
      </section>

      {error && (
        <div
          role="alert"
          className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-foreground/25 bg-muted/40 p-4"
        >
          <div className="flex min-w-0 items-start gap-3">
            <AlertTriangle
              aria-hidden="true"
              className="mt-0.5 size-4 shrink-0"
            />
            <div>
              <p className="text-sm font-medium">{error}</p><Link href="/settings#currency-review" className="mt-2 inline-block text-sm underline">Check original currencies in Settings</Link>
              {summary && (
                <p className="mt-1 text-sm text-muted-foreground">
                  Showing the last loaded figures. Recent changes may be
                  missing.
                </p>
              )}
            </div>
          </div>
          <Button
            variant="outline"
            disabled={loading}
            onClick={() => void loadDashboard()}
          >
            {loading ? "Retrying…" : "Try again"}
          </Button>
        </div>
      )}
      {loading && !summary ? (
        <div role="status" aria-label="Loading dashboard" className="space-y-4">
          <span className="sr-only">Loading your money picture…</span>
          <div
            aria-hidden="true"
            className="h-52 motion-safe:animate-pulse rounded-xl bg-muted"
          />
          <div aria-hidden="true" className="grid gap-5 md:grid-cols-3">
            {Array.from({ length: 3 }, (_, index) => (
              <div
                key={index}
                className="h-36 motion-safe:animate-pulse rounded-xl border bg-muted/40"
              />
            ))}
          </div>
        </div>
      ) : noFinancialData ? (
        <section className="rounded-2xl border bg-card p-6 shadow-sm sm:p-10">
          <div className="mx-auto max-w-xl text-center">
            <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary-ink">
              <CircleDollarSign className="size-7" />
            </div>
            <h2 className="mt-5 text-2xl font-semibold tracking-tight">
              Your money picture starts here
            </h2>
            <p className="mt-3 leading-6 text-muted-foreground">
              Add the money you have, what you expect, or a commitment you need
              to cover. FlowMoney will bring it together without moving or
              holding your money.
            </p>
            <Link
              href="/accounts"
              className="mt-6 inline-flex min-h-11 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/80"
            >
              Add current funds <ArrowRight className="size-4" />
            </Link>
            <div className="mt-7 flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm">
              <Link
                href="/income"
                className="text-muted-foreground underline underline-offset-4 hover:text-foreground"
              >
                Add expected income
              </Link>
              <Link
                href="/obligations"
                className="text-muted-foreground underline underline-offset-4 hover:text-foreground"
              >
                Add an obligation
              </Link>
            </div>
          </div>
        </section>
      ) : summary ? (
        <>
          {view?.mixedCurrency && (
            <div
              role="alert"
              className="rounded-xl border border-foreground/30 bg-muted/30 p-5"
            >
              <p className="text-sm font-medium">
                Review currencies before using these totals
              </p>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                These figures have not been normalized to one currency. Check the original currencies and refresh Overview before relying on a combined balance.
              </p>
              <Link
                href="/accounts"
                className="mt-3 inline-block text-sm underline underline-offset-4"
              >
                Review accounts
              </Link>
            </div>
          )}
          <section aria-label="Available to spend" className="space-y-5">
            <FinancialNotice />
            <FinancialSummaryCard
              label="Safe to spend now"
              value={formatMoney(summary.safeToSpend, dashboardCurrency)}
              description="After commitments and buffer. Excludes expected income and Planning allocations."
              emphasis
              icon={CircleDollarSign}
            />
            <div className="grid gap-4 md:grid-cols-3">
              <FinancialSummaryCard
                label="Current funds"
                value={formatMoney(summary.currentFunds, dashboardCurrency)}
                description="The balances you’ve recorded across your accounts."
                icon={WalletCards}
              />
              <FinancialSummaryCard
                label="Unpaid commitments"
                value={formatMoney(
                  summary.protectedObligations,
                  dashboardCurrency,
                )}
                description="All unpaid commitments, including overdue items. Deducted from the estimate above."
                icon={ListChecks}
              />
              <FinancialSummaryCard
                label="Safety buffer"
                value={formatMoney(summary.minimumBuffer, dashboardCurrency)}
                description="10% of current funds, reserved in this estimate for unexpected costs."
                icon={ShieldCheck}
              />
            </div>
          </section>
          <section className="space-y-3" aria-label="Money plan alerts">
            <div
              className={`flex flex-wrap items-start justify-between gap-3 rounded-xl border bg-muted/30 p-4 ${summary.riskLevel === "HIGH" ? "border-foreground/40 border-l-4" : "border-border"}`}
              role="status"
            >
              <div className="flex gap-3">
                {summary.riskLevel === "LOW" ? (
                  <ShieldCheck
                    aria-hidden="true"
                    className="mt-0.5 size-4 shrink-0 text-muted-foreground"
                  />
                ) : (
                  <AlertTriangle
                    aria-hidden="true"
                    className="mt-0.5 size-4 shrink-0 text-foreground"
                  />
                )}
                <div>
                  <p className="text-sm font-medium">
                    {summary.riskLevel === "HIGH"
                      ? "Your accounts need attention"
                      : summary.riskLevel === "MEDIUM"
                        ? "A few items to review"
                        : "Your accounts at a glance"}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {summary.riskLevel === "LOW"
                      ? "No major coverage or income-delay warnings in your recorded accounts."
                      : "Review the details below before making new commitments."}
                  </p>
                </div>
              </div>
              <span className="text-xs font-medium text-muted-foreground">
                {summary.riskLevel === "HIGH"
                  ? "High risk"
                  : summary.riskLevel === "MEDIUM"
                    ? "Medium risk"
                    : "Low risk"}
              </span>
            </div>
            {(view?.warnings ?? []).map((warning) => {
              const delayed = warning.code === "expected_income_delayed";
              return (
                <article
                  key={`${warning.code}-${warning.obligationId ?? warning.title ?? "warning"}`}
                  className="flex gap-3 rounded-xl border border-border bg-card p-4"
                  role="status"
                >
                  {delayed ? (
                    <Clock3 className="mt-0.5 size-4 shrink-0 text-foreground" />
                  ) : (
                    <AlertTriangle className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-medium">
                        {delayed
                          ? "Expected income delayed"
                          : warning.code === "obligation_at_risk"
                            ? "Upcoming obligation risk"
                            : warning.code === "protected_obligations_shortfall"
                              ? "Commitments and buffer shortfall"
                              : warning.code === "currency_mismatch"
                                ? "Currency note"
                                : "Plan note"}
                      </p>
                      <span className="text-xs text-muted-foreground">
                        {warning.severity.toLowerCase()} risk
                      </span>
                    </div>
                    <p className="mt-1 text-sm leading-6 text-muted-foreground">
                      {warning.message}
                    </p>
                    {warning.amount !== undefined && (
                      <p className="mt-1 text-sm font-medium">
                        {delayed
                          ? "Excluded from projection:"
                          : warning.code === "obligation_at_risk"
                            ? "Not covered:"
                            : "Amount:"}{" "}
                        {formatMoney(warning.amount, dashboardCurrency)}
                      </p>
                    )}
                  </div>
                </article>
              );
            })}
          </section>

          <section aria-labelledby="projection-heading" className="space-y-4">
            <div>
              <h2
                id="projection-heading"
                className="text-lg font-semibold tracking-tight"
              >
                Looking ahead
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Expected income can change. These figures aren’t available to
                spend today.
              </p>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <FinancialSummaryCard
                label="Projected income"
                value={formatMoney(summary.projectedIncome, dashboardCurrency)}
                description="Expected payments excluding late or delayed income. Payment isn’t guaranteed."
                icon={TrendingUp}
              />
              <FinancialSummaryCard
                label="Projected position"
                value={formatMoney(
                  summary.projectedPosition,
                  dashboardCurrency,
                )}
                description="Current funds − protected obligations − safety buffer + projected income. Excludes Planning category allocations. A negative amount means a gap remains."
                icon={ChartNoAxesCombined}
              />
            </div>
            <p className="text-sm text-muted-foreground">
              Total pending income:{" "}
              <span className="font-medium text-foreground">
                {formatMoney(summary.pendingIncome, dashboardCurrency)}
              </span>
              , including late or delayed payments.
            </p>
          </section>
          <section className="grid gap-5 xl:grid-cols-2">
            <DashboardList
              title="Upcoming obligations"
              description="Next unpaid commitments, earliest first"
              icon={<ListChecks className="size-4 text-primary-ink" />}
              emptyText="Add bills or commitments you want to keep in view."
              emptyHref="/obligations"
              emptyAction="Add an obligation"
            >
              {obligations.map((item) => (
                <div
                  key={item.id}
                  className="flex flex-col items-start justify-between gap-2 border-t py-4 sm:flex-row sm:items-center sm:gap-4 first:border-0 first:pt-0 last:pb-0"
                >
                  <div className="min-w-0 w-full sm:w-auto sm:flex-1">
                    <p className="break-words font-medium">{item.title}</p>
                    <p className="mt-1 flex flex-wrap items-center gap-1.5 text-sm text-muted-foreground">
                      <CalendarDays className="size-3.5" />
                      {formatDate(item.dueDate)}
                      <span className="mx-1">·</span>
                      {item.priority.toLowerCase()}
                      <span className="mx-1">·</span>
                      {item.status.toLowerCase()}
                    </p>
                  </div>
                  <p className="max-w-full break-all font-semibold tabular-nums">
                    {formatMoney(Number(item.amount), dashboardCurrency)}
                  </p>
                </div>
              ))}
            </DashboardList>
            <DashboardList
              title="Expected income"
              description="Pending payments, including late or delayed items"
              icon={<CircleDollarSign className="size-4 text-primary-ink" />}
              emptyText="Add payments you expect to receive so you can plan ahead."
              emptyHref="/income"
              emptyAction="Add expected income"
            >
              {expectedIncome.map((item) => (
                <div
                  key={item.id}
                  className="flex flex-col items-start justify-between gap-2 border-t py-4 sm:flex-row sm:items-center sm:gap-4 first:border-0 first:pt-0 last:pb-0"
                >
                  <div className="min-w-0 w-full sm:w-auto sm:flex-1">
                    <p className="break-words font-medium">{item.title}</p>
                    <p className="mt-1 flex flex-wrap items-center gap-1.5 text-sm text-muted-foreground">
                      <CalendarDays className="size-3.5" />
                      {formatDate(item.expectedDate)}
                      <span className="mx-1">·</span>
                      {item.confidence.toLowerCase()}
                      <span className="mx-1">·</span>
                      {item.status.toLowerCase()}
                    </p>
                  </div>
                  <p className="max-w-full break-all font-semibold tabular-nums">
                    {formatMoney(Number(item.amount), dashboardCurrency)}
                  </p>
                </div>
              ))}
            </DashboardList>
          </section>
          <p className="text-xs leading-6 text-muted-foreground">
            Based on your recorded accounts. No money is moved or held.
            {loadedAt
              ? " Last loaded " +
                new Intl.DateTimeFormat(undefined, {
                  hour: "numeric",
                  minute: "2-digit",
                }).format(loadedAt) +
                "."
              : ""}
          </p>
        </>
      ) : null}
    </div>
  );
}

function DashboardList({
  title,
  description,
  icon,
  emptyText,
  emptyHref,
  emptyAction,
  children,
}: {
  title: string;
  description: string;
  icon: React.ReactNode;
  emptyText: string;
  emptyHref: string;
  emptyAction: string;
  children: React.ReactNode;
}) {
  const empty = !children || (Array.isArray(children) && children.length === 0);
  return (
    <section className="min-w-0 rounded-xl border bg-card p-6 shadow-none sm:p-7">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h2 className="flex items-center gap-2 font-semibold">
            {icon}
            {title}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        </div>
        <Link
          href={emptyHref}
          aria-label={`View all ${title.toLowerCase()}`}
          className="inline-flex min-h-9 shrink-0 items-center justify-center gap-1.5 rounded-md px-2 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-primary-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring"
        >
          View all <ArrowRight aria-hidden="true" className="size-3.5" />
        </Link>
      </div>
      {empty ? (
        <div className="rounded-lg border border-dashed p-5 text-sm text-muted-foreground">
          <p>{emptyText}</p>
          <Link
            href={emptyHref}
            className="mt-3 inline-flex items-center gap-1 font-medium text-foreground hover:text-primary-ink"
          >
            {emptyAction}
            <ArrowRight className="size-3.5" />
          </Link>
        </div>
      ) : (
        <div>{children}</div>
      )}
    </section>
  );
}

function formatDate(value: string) {
  const date =
    value.length === 10 ? new Date(`${value}T12:00:00`) : new Date(value);
  return new Intl.DateTimeFormat("en-NG", {
    day: "numeric",
    month: "short",
  }).format(date);
}
