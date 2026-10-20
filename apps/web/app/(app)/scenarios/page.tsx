"use client";

import { useAuth } from "@clerk/nextjs";
import { AlertTriangle, ArrowRight, GitBranch, RotateCcw } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Button } from "@flowmoney/ui/components/button";
import { usePreferredCurrency } from "@/components/settings/preferred-currency-provider";
import { formatMoney } from "@/lib/format-money";
import { trackProductEventOnce } from "@/lib/analytics";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";
const inputClass = "w-full rounded-lg border bg-background px-3 py-2.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring";

type ScenarioChanges = {
  expectedIncomeDelayDays: number;
  expectedIncomeReduction: number;
  addedExpense: number;
  bufferOverride?: number;
};

type ScenarioEvaluation = {
  preferredCurrency: string;
  baseline: {
    currentFunds: number;
    protectedObligations: number;
    safetyBuffer: number;
    pendingIncome: number;
    safeToSpend: number;
    projectedPosition: number;
  };
  scenario: {
    currentFunds: number;
    protectedObligations: number;
    safetyBuffer: number;
    pendingIncome: number;
    delayedIncome: number;
    incomeReduction: number;
    addedExpense: number;
    safeToSpend: number;
    projectedPosition: number;
    shortfall: number;
    shortfallRisk: "LOW" | "MEDIUM" | "HIGH";
    upcomingObligationsAtRisk: number;
  };
  changes: ScenarioChanges;
  warnings: string[];
};

type Inputs = {
  expectedIncomeDelayDays: string;
  expectedIncomeReduction: string;
  addedExpense: string;
  bufferOverride: string;
};

const initialInputs: Inputs = {
  expectedIncomeDelayDays: "0",
  expectedIncomeReduction: "0",
  addedExpense: "0",
  bufferOverride: "",
};

export default function ScenariosPage() {
  const { getToken, isLoaded, isSignedIn, userId } = useAuth();
  const { currency: preferenceCurrency } = usePreferredCurrency();
  const [inputs, setInputs] = useState<Inputs>(initialInputs);
  const [evaluation, setEvaluation] = useState<ScenarioEvaluation | null>(null);
  const [loading, setLoading] = useState(true);
  const [evaluating, setEvaluating] = useState(false);
  const [error, setError] = useState("");

  const evaluate = useCallback(async (changes: ScenarioChanges, signal?: AbortSignal) => {
    const token = await getToken();
    if (!token) throw new Error("Please sign in again to evaluate this scenario.");
    const response = await fetch(`${API_BASE_URL}/scenarios/evaluate`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ changes }),
      signal,
    });
    if (!response.ok) { const failure = await response.json().catch(() => ({})); throw new Error(failure.message ?? `Scenario evaluation failed (HTTP ${response.status}).`); }
    return await response.json() as ScenarioEvaluation;
  }, [getToken]);

  const toChanges = (value: Inputs): ScenarioChanges => ({
    expectedIncomeDelayDays: Number(value.expectedIncomeDelayDays) || 0,
    expectedIncomeReduction: Number(value.expectedIncomeReduction) || 0,
    addedExpense: Number(value.addedExpense) || 0,
    ...(value.bufferOverride.trim() ? { bufferOverride: Number(value.bufferOverride) } : {}),
  });

  useEffect(() => {
    if (!isLoaded) return;
    if (!isSignedIn) {
      setLoading(false);
      return;
    }

    setInputs(initialInputs); setEvaluation(null); setLoading(true);
    let active = true;
    const controller = new AbortController();
    void evaluate(toChanges(initialInputs), controller.signal)
      .then((result) => { if (active) { setEvaluation(result); setError(""); } })
      .catch((cause) => { if (active && cause?.name !== "AbortError") setError(cause instanceof Error ? cause.message : "Could not load scenario baseline."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; controller.abort(); };
  }, [evaluate, isLoaded, isSignedIn, preferenceCurrency, userId]);

  useEffect(() => {
    if (!evaluation || loading) return;
    const controller = new AbortController();
    const timeout = window.setTimeout(() => {
      setEvaluating(true);
      const changes = toChanges(inputs);
      void evaluate(changes, controller.signal)
        .then((result) => {
          setEvaluation(result);
          setError("");
          if (Object.values(changes).some((value) => Number(value) !== 0)) {
            void trackProductEventOnce("scenario_used", userId ?? undefined);
          }
        })
        .catch((cause) => { if (cause?.name !== "AbortError") setError(cause instanceof Error ? cause.message : "Could not evaluate this scenario."); })
        .finally(() => { if (!controller.signal.aborted) setEvaluating(false); });
    }, 250);
    return () => { window.clearTimeout(timeout); controller.abort(); };
  }, [evaluate, inputs, loading, userId]);

  const currency = evaluation?.preferredCurrency ?? preferenceCurrency;
  const update = (key: keyof Inputs, value: string) => setInputs((current) => ({ ...current, [key]: value }));
  const reset = () => setInputs(initialInputs);

  const retry = async () => {
    setLoading(true);
    setError("");
    try {
      setEvaluation(await evaluate(toChanges(inputs)));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not load scenario baseline.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-7">
      <header>
        <p className="text-sm font-medium text-muted-foreground">Plan before it happens</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">Scenario planning</h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">Test hypothetical changes against your real financial position. Evaluations are never saved to or applied to your accounts, income, or obligations.</p>
      </header>

      {error && <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive" role="alert"><span>{error}</span><Button variant="outline" size="sm" onClick={() => void retry()}>Try again</Button></div>}

      {loading ? (
        <div className="grid gap-5 lg:grid-cols-2" role="status" aria-label="Loading scenario baseline"><div className="h-96 animate-pulse rounded-2xl border bg-muted/40" /><div className="h-96 animate-pulse rounded-2xl border bg-muted/40" /></div>
      ) : evaluation ? (
        <div className="grid items-start gap-5 xl:grid-cols-[0.9fr_1.1fr]">
          <section className="space-y-5 rounded-2xl border bg-card p-5 shadow-sm sm:p-6" aria-labelledby="scenario-input-title">
            <div className="flex items-start justify-between gap-3">
              <div><div className="flex items-center gap-2"><GitBranch className="size-4 text-primary" /><h2 id="scenario-input-title" className="text-lg font-semibold">Build a scenario</h2></div><p className="mt-1 text-sm text-muted-foreground">Change one or more assumptions; results recalculate from backend data.</p></div>
              <Button type="button" variant="ghost" size="sm" onClick={reset} disabled={Object.entries(inputs).every(([key, value]) => value === initialInputs[key as keyof Inputs])}><RotateCcw className="mr-1 size-3.5" />Discard</Button>
            </div>

            <label className="block space-y-2 text-sm font-medium" htmlFor="scenario-delay">Delay expected income
              <div className="flex items-center gap-2"><input id="scenario-delay" className={inputClass} type="number" min="0" max="365" step="1" value={inputs.expectedIncomeDelayDays} onChange={(event) => update("expectedIncomeDelayDays", event.target.value)} /><span className="shrink-0 text-sm text-muted-foreground">days</span></div>
              <span className="block text-xs font-normal text-muted-foreground">Income due within this window is excluded from the scenario projection.</span>
            </label>

            <label className="block space-y-2 text-sm font-medium" htmlFor="scenario-income-reduction">Reduce expected income ({currency})
              <input id="scenario-income-reduction" className={inputClass} type="number" min="0" step="0.01" inputMode="decimal" value={inputs.expectedIncomeReduction} onChange={(event) => update("expectedIncomeReduction", event.target.value)} />
              <span className="block text-xs font-normal text-muted-foreground">Projection only; saved expected-income entries are unchanged.</span>
            </label>

            <label className="block space-y-2 text-sm font-medium" htmlFor="scenario-expense">Add a one-off expense ({currency})
              <input id="scenario-expense" className={inputClass} type="number" min="0" step="0.01" inputMode="decimal" value={inputs.addedExpense} onChange={(event) => update("addedExpense", event.target.value)} placeholder="250000" />
              <span className="block text-xs font-normal text-muted-foreground">For example, a purchase or unexpected bill.</span>
            </label>

            <label className="block space-y-2 text-sm font-medium" htmlFor="scenario-buffer">Change safety buffer ({currency})
              <input id="scenario-buffer" className={inputClass} type="number" min="0" step="0.01" inputMode="decimal" value={inputs.bufferOverride} onChange={(event) => update("bufferOverride", event.target.value)} placeholder={`Current: ${formatMoney(evaluation.baseline.safetyBuffer, currency)}`} />
              <span className="block text-xs font-normal text-muted-foreground">Leave blank to keep the current buffer.</span>
            </label>
          </section>

          <section className="space-y-5 rounded-2xl border bg-card p-5 shadow-sm sm:p-6" aria-labelledby="scenario-results-title" aria-live="polite">
            <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-sm font-medium text-primary">{evaluating ? "Updating…" : "Compared with current position"}</p><h2 id="scenario-results-title" className="mt-1 text-xl font-semibold">Scenario result</h2></div><RiskBadge risk={evaluation.scenario.shortfallRisk} /></div>

            <div className="grid gap-3 sm:grid-cols-2">
              <ResultCard label="Safe to spend" baseline={evaluation.baseline.safeToSpend} scenario={evaluation.scenario.safeToSpend} currency={currency} emphasis />
              <ResultCard label="Projected position" baseline={evaluation.baseline.projectedPosition} scenario={evaluation.scenario.projectedPosition} currency={currency} />
              <ResultCard label="Safety buffer" baseline={evaluation.baseline.safetyBuffer} scenario={evaluation.scenario.safetyBuffer} currency={currency} />
              <ResultCard label="Expected income in projection" baseline={evaluation.baseline.pendingIncome} scenario={evaluation.scenario.pendingIncome} currency={currency} />
            </div>

            {evaluation.scenario.shortfall > 0 && <div className="flex gap-3 rounded-xl border border-amber-500/30 bg-amber-500/[0.06] p-4 text-sm" role="status"><AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-700" /><div><p className="font-medium">Upcoming obligations may not be fully covered.</p><p className="mt-1 text-muted-foreground">Shortfall / obligations at risk: {formatMoney(evaluation.scenario.upcomingObligationsAtRisk, currency)}</p></div></div>}
            {evaluation.warnings.map((warning) => <p key={warning} className="text-sm text-muted-foreground">{warning}</p>)}

            <div className="rounded-xl bg-muted/50 p-4 text-sm leading-6 text-muted-foreground">Expected income never increases safe-to-spend now. Delays and reductions only change the scenario projection. No FX conversion is applied and no scenario values are persisted.</div>
          </section>

          <section className="rounded-xl border border-dashed p-5 text-sm text-muted-foreground xl:col-span-2">
            Baseline: {formatMoney(evaluation.baseline.currentFunds, currency)} funds, {formatMoney(evaluation.baseline.protectedObligations, currency)} protected obligations, {formatMoney(evaluation.baseline.safetyBuffer, currency)} safety buffer, {formatMoney(evaluation.baseline.pendingIncome, currency)} expected income.
            <Link href="/dashboard" className="ml-1 inline-flex items-center gap-1 font-medium text-foreground underline underline-offset-4">View dashboard<ArrowRight className="size-3.5" /></Link>
          </section>
        </div>
      ) : error ? (
        <section role="status" className="rounded-xl border border-dashed bg-card px-6 py-12 text-center"><div className="mx-auto flex size-12 items-center justify-center rounded-xl bg-muted text-muted-foreground"><GitBranch className="size-6" /></div><h2 className="mt-4 text-lg font-semibold">Scenario planning is temporarily unavailable</h2><p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">We couldn’t load your current financial position. Your saved data has not been changed; retry when the API is available.</p></section>
      ) : (
        <section className="rounded-xl border border-dashed bg-card px-6 py-12 text-center"><div className="mx-auto flex size-12 items-center justify-center rounded-xl bg-muted text-muted-foreground"><GitBranch className="size-6" /></div><h2 className="mt-4 text-lg font-semibold">Could not load your starting position</h2><p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">Start by adding funds, expected income, or an obligation, then return here to test a what-if change.</p><div className="mt-5 flex flex-wrap justify-center gap-3"><Link href="/accounts"><Button variant="outline">Add funds</Button></Link><Link href="/obligations"><Button variant="outline">Add obligation</Button></Link></div></section>
      )}
    </div>
  );
}

function ResultCard({ label, baseline, scenario, currency, emphasis = false }: { label: string; baseline: number; scenario: number; currency: string; emphasis?: boolean }) {
  return <article className={`rounded-xl border p-4 ${emphasis ? "border-primary/20 bg-primary/[0.04]" : ""}`}><p className="text-sm text-muted-foreground">{label}</p><p className="mt-2 text-2xl font-semibold tracking-tight">{formatMoney(scenario, currency)}</p><p className="mt-1 text-xs text-muted-foreground">Baseline {formatMoney(baseline, currency)}</p></article>;
}

function RiskBadge({ risk }: { risk: ScenarioEvaluation["scenario"]["shortfallRisk"] }) {
  const styles = risk === "HIGH" ? "border-destructive/30 bg-destructive/10 text-destructive" : risk === "MEDIUM" ? "border-amber-500/30 bg-amber-500/10 text-amber-800 dark:text-amber-300" : "border-emerald-500/30 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300";
  return <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${styles}`}>{risk} RISK</span>;
}
