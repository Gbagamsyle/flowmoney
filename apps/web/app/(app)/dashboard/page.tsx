"use client";

import { useAuth } from "@clerk/nextjs";
import { useEffect, useState } from "react";
import { FinancialSummaryCard } from "@/components/dashboard/financial-summary-card";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

const formatMoney = (value: number) =>
  new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(value);

type DashboardSummary = {
  userId: string;
  currentFunds: number;
  pendingIncome: number;
  protectedObligations: number;
  minimumBuffer: number;
  safeToSpend: number;
};

export default function DashboardPage() {
  const { getToken, isLoaded, isSignedIn } = useAuth();
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
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Unable to load dashboard");
      }

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

    const handleAccountsChanged = () => {
      void loadDashboard();
    };

    window.addEventListener("flowmoney:accounts-changed", handleAccountsChanged);
    return () => window.removeEventListener("flowmoney:accounts-changed", handleAccountsChanged);
  }, [getToken, isLoaded, isSignedIn]);

  const currentFunds = Number(summary?.currentFunds ?? 0);
  const pendingIncome = Number(summary?.pendingIncome ?? 0);
  const protectedObligations = Number(summary?.protectedObligations ?? 0);
  const safeToSpend = Number(summary?.safeToSpend ?? 0);

  return (
    <div className="space-y-8">
      {error && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <section>
        <p className="text-sm font-medium text-muted-foreground">Overview</p>

        <h1 className="mt-1 text-3xl font-semibold tracking-tight">
          Know where you stand.
        </h1>

        <p className="mt-2 max-w-2xl text-muted-foreground">
          See what you have, what&apos;s coming in, and what needs to be protected
          before you spend.
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <FinancialSummaryCard
          label="Safe to spend"
          value={loading ? "—" : formatMoney(safeToSpend)}
          description="Available after protected obligations"
          emphasis
        />

        <FinancialSummaryCard
          label="Current funds"
          value={loading ? "—" : formatMoney(currentFunds)}
          description="Money available right now"
        />

        <FinancialSummaryCard
          label="Upcoming obligations"
          value={loading ? "—" : formatMoney(protectedObligations)}
          description="Protected commitments ahead"
        />

        <FinancialSummaryCard
          label="Expected income"
          value={loading ? "—" : formatMoney(pendingIncome)}
          description="Money you expect to receive"
        />
      </section>
    </div>
  );
}
