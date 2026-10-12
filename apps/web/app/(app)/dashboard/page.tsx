"use client";

import { useAuth, useUser } from "@clerk/nextjs";
import { ArrowRight, CalendarDays, CircleDollarSign, ListChecks } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Button } from "@flowmoney/ui/components/button";
import { FinancialSummaryCard } from "@/components/dashboard/financial-summary-card";
import { formatMoney } from "@/lib/format-money";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

type DashboardSummary = {
  userId: string;
  currentFunds: number;
  pendingIncome: number;
  protectedObligations: number;
  minimumBuffer: number;
  safeToSpend: number;
  accounts: Array<{ id: string; name: string; balance: number | string }>;
  expectedIncome: Array<{ id: string; title: string; amount: number | string; expectedDate: string; confidence: string; status: string }>;
  obligations: Array<{ id: string; title: string; amount: number | string; dueDate: string; priority: string; status: string }>;
};

export default function DashboardPage() {
  const { getToken, isLoaded, isSignedIn } = useAuth();
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
      try {
        const response = await fetch(`${API_BASE_URL}/dashboard`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!response.ok) throw new Error("Unable to load dashboard");
        const data = (await response.json()) as DashboardSummary;
        setSummary(data);
        setError(null);
      } catch {
        setError("Could not load your dashboard right now. Check that the API is running.");
      }
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
          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <FinancialSummaryCard label="Safe to spend" value={formatMoney(Number(summary.safeToSpend))} description="After obligations and the existing reserve" emphasis />
            <FinancialSummaryCard label="Current funds" value={formatMoney(Number(summary.currentFunds))} description="Money available right now" />
            <FinancialSummaryCard label="Upcoming obligations" value={formatMoney(Number(summary.protectedObligations))} description="Commitments not yet paid or skipped" />
            <FinancialSummaryCard label="Expected income" value={formatMoney(Number(summary.pendingIncome))} description="Expected income, not current funds" />
          </section>

          <section className="grid gap-5 xl:grid-cols-2">
            <DashboardList title="Upcoming" description="Commitments in date order" icon={<ListChecks className="size-4" />} emptyText="Add bills or commitments you want to keep in view." emptyHref="/obligations" emptyAction="Add an obligation">
              {obligations.map((item) => <div key={item.id} className="flex items-center justify-between gap-4 border-t py-4 first:border-0 first:pt-0 last:pb-0"><div className="min-w-0"><p className="truncate font-medium">{item.title}</p><p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground"><CalendarDays className="size-3.5" />{formatDate(item.dueDate)}<span className="mx-1">·</span>{item.priority.toLowerCase()}</p></div><p className="shrink-0 font-semibold tabular-nums">{formatMoney(Number(item.amount))}</p></div>)}
            </DashboardList>
            <DashboardList title="Expected" description="Money you anticipate receiving" icon={<CircleDollarSign className="size-4" />} emptyText="Add payments you expect to receive so you can plan ahead." emptyHref="/income" emptyAction="Add expected income">
              {expectedIncome.map((item) => <div key={item.id} className="flex items-center justify-between gap-4 border-t py-4 first:border-0 first:pt-0 last:pb-0"><div className="min-w-0"><p className="truncate font-medium">{item.title}</p><p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground"><CalendarDays className="size-3.5" />{formatDate(item.expectedDate)}<span className="mx-1">·</span>{item.confidence.toLowerCase()}</p></div><p className="shrink-0 font-semibold tabular-nums">{formatMoney(Number(item.amount))}</p></div>)}
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
