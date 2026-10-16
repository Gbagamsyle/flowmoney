"use client";

import { useAuth, useUser } from "@clerk/nextjs";
import { AlertTriangle, ArrowRight, CalendarDays, CircleDollarSign, Clock3, ListChecks } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Button } from "@flowmoney/ui/components/button";
import { FinancialSummaryCard } from "@/components/dashboard/financial-summary-card";
import { usePreferredCurrency } from "@/components/settings/preferred-currency-provider";
import { formatMoney } from "@/lib/format-money";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

type DashboardSummary = {
  userId: string;
  preferredCurrency: string;
  currentFunds: number;
  pendingIncome: number;
  projectedIncome: number;
  expectedIncomeByConfidence: { CONFIRMED: number; LIKELY: number; UNCERTAIN: number };
  protectedObligations: number;
  minimumBuffer: number;
  safeToSpend: number;
  projectedPosition: number;
  riskLevel: "LOW" | "MEDIUM" | "HIGH";
  warnings: Array<{
    code: string;
    message: string;
    severity: "LOW" | "MEDIUM" | "HIGH";
    amount?: number;
    obligationId?: string;
    title?: string;
    daysLate?: number;
  }>;
  accounts: Array<{ id: string; name: string; balance: number | string }>;
  expectedIncome: Array<{ id: string; title: string; amount: number | string; expectedDate: string; confidence: string; status: string }>;
  obligations: Array<{ id: string; title: string; amount: number | string; dueDate: string; priority: string; status: string }>;
};

export default function DashboardPage() {
  const { getToken, isLoaded, isSignedIn } = useAuth();
  const { currency } = usePreferredCurrency();
  const { user } = useUser();
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadDashboard = async () => {
    if (!isLoaded || !isSignedIn) {
      return;
    }

    const token = await getToken();
    if (!token) {
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/dashboard`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error(`Dashboard request failed (HTTP ${response.status}).`);
      const data = (await response.json()) as DashboardSummary;
      setSummary(data);
      setError(null);
    } catch {
      setError("Could not load your dashboard right now. Check that the API is running.");
    }
  };

  useEffect(() => {
    if (!isLoaded || !isSignedIn) {
      setLoading(false);
      return;
    }

    setLoading(true);

    void loadDashboard().finally(() => setLoading(false));

    const refreshDashboard = () => {
      void loadDashboard();
    };

    window.addEventListener("flowmoney:accounts-changed", refreshDashboard);
    window.addEventListener("flowmoney:financial-data-changed", refreshDashboard);
    return () => {
      window.removeEventListener("flowmoney:accounts-changed", refreshDashboard);
      window.removeEventListener("flowmoney:financial-data-changed", refreshDashboard);
    };
  }, [getToken, isLoaded, isSignedIn]);

  const displayName = user?.firstName || user?.username || "there";
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  const obligations = (summary?.obligations ?? []).filter((item) => item.status !== "PAID" && item.status !== "SKIPPED").slice(0, 4);
  const expectedIncome = (summary?.expectedIncome ?? []).filter((item) => ["EXPECTED", "PARTIAL", "DELAYED"].includes(item.status)).slice(0, 4);
  const noFinancialData = Boolean(summary && summary.accounts.length === 0 && summary.expectedIncome.length === 0 && summary.obligations.length === 0);
  const dashboardCurrency = summary?.preferredCurrency ?? currency;

  return (
    <div className="space-y-8">
      {error && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <section>
        <p className="text-sm font-medium text-muted-foreground">Your money, in perspective</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">{greeting}, {displayName}.</h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">Here’s where your money stands today.</p>
      </section>

      {loading && !summary ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4" aria-label="Loading dashboard">
          {Array.from({ length: 4 }, (_, index) => <div key={index} className="h-36 animate-pulse rounded-xl border bg-muted/40" />)}
        </div>
      ) : noFinancialData ? (
        <section className="rounded-2xl border bg-card p-6 shadow-sm sm:p-10">
          <div className="mx-auto max-w-xl text-center">
            <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary"><CircleDollarSign className="size-7" /></div>
            <h2 className="mt-5 text-2xl font-semibold tracking-tight">Your money picture starts here</h2>
            <p className="mt-3 leading-6 text-muted-foreground">Add the money you have, what you expect, or a commitment you need to cover. FlowMoney will bring it together without moving or holding your money.</p>
            <Link href="/accounts" className="mt-6 inline-block"><Button>Add current funds <ArrowRight className="ml-2 size-4" /></Button></Link>
            <div className="mt-7 flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm">
              <Link href="/income" className="text-muted-foreground underline underline-offset-4 hover:text-foreground">Add expected income</Link>
              <Link href="/obligations" className="text-muted-foreground underline underline-offset-4 hover:text-foreground">Add an obligation</Link>
            </div>
          </div>
        </section>
      ) : summary ? (
        <>
          {(summary.warnings.length > 0 || summary.riskLevel !== "LOW") && (
            <section className="space-y-3" aria-label="Money plan alerts">
              {summary.riskLevel !== "LOW" && (
                <div className={`flex flex-wrap items-start justify-between gap-3 rounded-xl border p-4 ${summary.riskLevel === "HIGH" ? "border-destructive/25 bg-destructive/[0.04]" : "border-amber-500/25 bg-amber-500/[0.04]"}`} role="status">
                  <div className="flex gap-3">
                    <AlertTriangle className={`mt-0.5 size-4 shrink-0 ${summary.riskLevel === "HIGH" ? "text-destructive" : "text-amber-700 dark:text-amber-300"}`} />
                    <div>
                      <p className="font-medium">{summary.riskLevel === "HIGH" ? "Some commitments may need attention" : "Your plan has a coverage gap to review"}</p>
                      <p className="mt-1 text-sm text-muted-foreground">{summary.riskLevel} risk · Safe to spend is separate from projected income.</p>
                    </div>
                  </div>
                  <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${summary.riskLevel === "HIGH" ? "border-destructive/25 text-destructive" : "border-amber-500/25 text-amber-800 dark:text-amber-300"}`}>{summary.riskLevel} RISK</span>
                </div>
              )}
              {summary.warnings.filter((warning) => warning.code !== "protected_obligations_shortfall").map((warning) => {
                const delayed = warning.code === "expected_income_delayed";
                return (
                  <article key={`${warning.code}-${warning.obligationId ?? warning.title ?? "warning"}`} className="flex gap-3 rounded-xl border border-border bg-card p-4" role="status">
                    {delayed ? <Clock3 className="mt-0.5 size-4 shrink-0 text-amber-700 dark:text-amber-300" /> : <AlertTriangle className="mt-0.5 size-4 shrink-0 text-muted-foreground" />}
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-medium">{delayed ? "Expected income delayed" : warning.code === "obligation_at_risk" ? "Upcoming obligation risk" : "Currency note"}</p>
                        <span className="rounded-full border px-2 py-0.5 text-[11px] font-medium text-muted-foreground">{warning.severity.toLowerCase()} risk</span>
                      </div>
                      <p className="mt-1 text-sm leading-6 text-muted-foreground">{warning.message}</p>
                      {warning.amount !== undefined && <p className="mt-1 text-sm font-medium">{delayed ? "Excluded from projection:" : warning.code === "obligation_at_risk" ? "Not covered:" : "Amount:"} {formatMoney(warning.amount, dashboardCurrency)}</p>}
                    </div>
                  </article>
                );
              })}
            </section>
          )}

          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <FinancialSummaryCard label="Safe to spend now" value={formatMoney(Number(summary.safeToSpend), dashboardCurrency)} description="Current funds − protected obligations − 10% safety buffer" emphasis />
            <FinancialSummaryCard label="Current funds" value={formatMoney(Number(summary.currentFunds), dashboardCurrency)} description="Money available right now" />
            <FinancialSummaryCard label="Protected obligations" value={formatMoney(Number(summary.protectedObligations), dashboardCurrency)} description="Unpaid obligations, including funded and overdue items" />
            <FinancialSummaryCard label="Safety buffer" value={formatMoney(Number(summary.minimumBuffer), dashboardCurrency)} description="MVP reserve: 10% of current funds" />
            <FinancialSummaryCard label="Expected income" value={formatMoney(Number(summary.pendingIncome), dashboardCurrency)} description="Not counted toward safe-to-spend now" />
            <FinancialSummaryCard label="Projected position" value={formatMoney(Number(summary.projectedPosition), dashboardCurrency)} description="Funds − obligations − buffer + expected income" />
          </section>

          <section className="grid gap-5 xl:grid-cols-2">
            <DashboardList title="Upcoming" description="Commitments in date order" icon={<ListChecks className="size-4" />} emptyText="Add bills or commitments you want to keep in view." emptyHref="/obligations" emptyAction="Add an obligation">
              {obligations.map((item) => <div key={item.id} className="flex items-center justify-between gap-4 border-t py-4 first:border-0 first:pt-0 last:pb-0"><div className="min-w-0"><p className="truncate font-medium">{item.title}</p><p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground"><CalendarDays className="size-3.5" />{formatDate(item.dueDate)}<span className="mx-1">·</span>{item.priority.toLowerCase()}<span className="mx-1">·</span>{item.status.toLowerCase()}</p></div><p className="shrink-0 font-semibold tabular-nums">{formatMoney(Number(item.amount), dashboardCurrency)}</p></div>)}
            </DashboardList>
            <DashboardList title="Expected" description="Money you anticipate receiving" icon={<CircleDollarSign className="size-4" />} emptyText="Add payments you expect to receive so you can plan ahead." emptyHref="/income" emptyAction="Add expected income">
              {expectedIncome.map((item) => <div key={item.id} className="flex items-center justify-between gap-4 border-t py-4 first:border-0 first:pt-0 last:pb-0"><div className="min-w-0"><p className="truncate font-medium">{item.title}</p><p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground"><CalendarDays className="size-3.5" />{formatDate(item.expectedDate)}<span className="mx-1">·</span>{item.confidence.toLowerCase()}</p></div><p className="shrink-0 font-semibold tabular-nums">{formatMoney(Number(item.amount), dashboardCurrency)}</p></div>)}
            </DashboardList>
          </section>
        </>
      ) : null}
    </div>
  );
}

function DashboardList({ title, description, icon, emptyText, emptyHref, emptyAction, children }: { title: string; description: string; icon: React.ReactNode; emptyText: string; emptyHref: string; emptyAction: string; children: React.ReactNode }) {
  const empty = !children || (Array.isArray(children) && children.length === 0);
  return (
    <section className="rounded-xl border bg-card p-5 shadow-sm sm:p-6">
      <div className="mb-5 flex items-start justify-between gap-4"><div><div className="flex items-center gap-2 font-semibold">{icon}{title}</div><p className="mt-1 text-sm text-muted-foreground">{description}</p></div><Link href={emptyHref} aria-label={emptyAction} className="rounded-md p-2 text-muted-foreground hover:bg-muted hover:text-foreground"><ArrowRight className="size-4" /></Link></div>
      {empty ? <div className="rounded-lg border border-dashed p-5 text-sm text-muted-foreground"><p>{emptyText}</p><Link href={emptyHref} className="mt-3 inline-flex items-center gap-1 font-medium text-foreground">{emptyAction}<ArrowRight className="size-3.5" /></Link></div> : <div>{children}</div>}
    </section>
  );
}

function formatDate(value: string) {
  const date = value.length === 10 ? new Date(`${value}T12:00:00`) : new Date(value);
  return new Intl.DateTimeFormat("en-NG", { day: "numeric", month: "short" }).format(date);
}
