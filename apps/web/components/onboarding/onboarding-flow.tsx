"use client";

import { useAuth } from "@clerk/nextjs";
import { ArrowLeft, ArrowRight, Check, CircleDollarSign, Plus, ShieldCheck, WalletCards } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@flowmoney/ui/components/button";
import flowIllustration from "@/assets/flow.png";
import { formatMoney } from "@/lib/format-money";
import { CURRENCIES, suggestCurrency, type CurrencyCode } from "@/lib/currencies";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";
const API_UNAVAILABLE_MESSAGE = `FlowMoney’s API at ${API_BASE_URL} isn’t reachable. Start the API and check DATABASE_URL and CLERK_SECRET_KEY in apps/api/.env.`;
const stepNames = ["Currency", "Funds", "Income", "Obligations", "Review"];
const inputClass = "w-full rounded-lg border bg-background px-3 py-2.5 text-sm shadow-sm outline-none transition focus-visible:ring-2 focus-visible:ring-ring";

type FundDraft = { name: string; amount: string };
type Snapshot = {
  currentFunds: number;
  pendingIncome: number;
  protectedObligations: number;
  safeToSpend: number;
};

function localDateAfter(days: number) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function OnboardingFlow() {
  const { getToken, isLoaded, isSignedIn } = useAuth();
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [currency, setCurrency] = useState<CurrencyCode>("NGN");
  const [ready, setReady] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [funds, setFunds] = useState<FundDraft[]>([{ name: "Main account", amount: "" }]);
  const [income, setIncome] = useState({ title: "", amount: "", expectedDate: localDateAfter(7), confidence: "LIKELY" });
  const [obligations, setObligations] = useState([{ title: "", amount: "", dueDate: localDateAfter(7), priority: "ESSENTIAL" }]);
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);

  const enteredFunds = useMemo(
    () => funds.reduce((sum, fund) => sum + (Number(fund.amount) || 0), 0),
    [funds],
  );

  useEffect(() => {
    if (!isLoaded) return;
    if (!isSignedIn) {
      router.replace("/sign-in");
      return;
    }

    let active = true;
    const initialize = async () => {
      try {
        const token = await getToken();
        if (!token) throw new Error("Please sign in again to continue.");
        const response = await fetch(`${API_BASE_URL}/users/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (response.status === 401) {
          router.replace("/sign-in");
          return;
        }

        if (!response.ok) {
          throw new Error(
            `Setup request failed with HTTP ${response.status}. The API is responding; check the API terminal for the server error.`,
          );
        }
        const user = (await response.json()) as {
          onboardingCompletedAt: string | null;
          preferredCurrency?: CurrencyCode;
          currencyConfirmedAt?: string | null;
        };
        if (!active) return;
        if (user.onboardingCompletedAt) {
          router.replace("/dashboard");
          return;
        }

        const suggestedCurrency = suggestCurrency(navigator.language);
        setCurrency(user.currencyConfirmedAt && user.preferredCurrency ? user.preferredCurrency : suggestedCurrency);
        const savedStep = Number(window.localStorage.getItem("flowmoney:onboarding-step-v2") ?? "0");
        setStep(Number.isInteger(savedStep) && savedStep >= 0 && savedStep <= 5 ? savedStep : 0);
        setReady(true);
      } catch (cause) {
        if (active) {
          setError(cause instanceof TypeError ? API_UNAVAILABLE_MESSAGE : cause instanceof Error ? cause.message : "Could not load onboarding.");
          setReady(true);
        }
      }
    };

    void initialize();
    return () => {
      active = false;
    };
  }, [getToken, isLoaded, isSignedIn, router]);

  const request = async (path: string, init: RequestInit = {}) => {
    const token = await getToken();
    if (!token) throw new Error("Your session has expired. Please sign in again.");
    const response = await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${token}`,
        ...(init.body ? { "Content-Type": "application/json" } : {}),
        ...init.headers,
      },
    });
    if (!response.ok) throw new Error("We couldn’t save that just now. Please try again.");
    return response;
  };

  const advance = (nextStep: number) => {
    window.localStorage.setItem("flowmoney:onboarding-step-v2", String(nextStep));
    setError("");
    setStep(nextStep);
  };

  const complete = async () => {
    setSaving(true);
    setError("");
    try {
      await request("/users/me/onboarding", { method: "PATCH" });
      window.localStorage.removeItem("flowmoney:onboarding-step-v2");
      window.dispatchEvent(new CustomEvent("flowmoney:financial-data-changed"));
      router.replace("/dashboard");
      router.refresh();
    } catch (cause) {
      setError(cause instanceof TypeError ? API_UNAVAILABLE_MESSAGE : cause instanceof Error ? cause.message : "Could not complete setup.");
    } finally {
      setSaving(false);
    }
  };

  const saveFunds = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const validFunds = funds.filter((fund) => fund.name.trim() && Number(fund.amount) > 0);
    if (validFunds.length === 0) {
      setError("Add at least one fund, or skip this step for now.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      for (const fund of validFunds) {
        await request("/accounts", {
          method: "POST",
          body: JSON.stringify({ name: fund.name.trim(), balance: Number(fund.amount), currency }),
        });
      }
      window.dispatchEvent(new CustomEvent("flowmoney:financial-data-changed"));
      advance(3);
    } catch (cause) {
      setError(cause instanceof TypeError ? API_UNAVAILABLE_MESSAGE : cause instanceof Error ? cause.message : "Could not save your funds.");
    } finally {
      setSaving(false);
    }
  };

  const saveIncome = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!income.title.trim() || Number(income.amount) <= 0 || !income.expectedDate) {
      setError("Enter a title, a positive amount, and an expected date.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await request("/expected-income", {
        method: "POST",
        body: JSON.stringify({ ...income, title: income.title.trim(), amount: Number(income.amount) }),
      });
      window.dispatchEvent(new CustomEvent("flowmoney:financial-data-changed"));
      advance(4);
    } catch (cause) {
      setError(cause instanceof TypeError ? API_UNAVAILABLE_MESSAGE : cause instanceof Error ? cause.message : "Could not save expected income.");
    } finally {
      setSaving(false);
    }
  };

  const saveObligation = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const validObligations = obligations.filter((item) => item.title.trim() && Number(item.amount) > 0 && item.dueDate);
    if (validObligations.length === 0) {
      setError("Add at least one obligation, or skip this step for now.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      for (const item of validObligations) {
        await request("/obligations", {
          method: "POST",
          body: JSON.stringify({ ...item, title: item.title.trim(), amount: Number(item.amount) }),
        });
      }
      window.dispatchEvent(new CustomEvent("flowmoney:financial-data-changed"));
      await loadSnapshot();
      advance(5);
    } catch (cause) {
      setError(cause instanceof TypeError ? API_UNAVAILABLE_MESSAGE : cause instanceof Error ? cause.message : "Could not save your obligation.");
    } finally {
      setSaving(false);
    }
  };

  const loadSnapshot = async () => {
    const response = await request("/dashboard");
    const data = (await response.json()) as Snapshot;
    setSnapshot(data);
  };

  const skipTo = async (nextStep: number) => {
    setSaving(true);
    setError("");
    try {
      if (nextStep === 5) await loadSnapshot();
      advance(nextStep);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not prepare your review.");
    } finally {
      setSaving(false);
    }
  };

  const back = () => advance(Math.max(0, step - 1));

  if (!ready) {
    return <div className="flex min-h-svh items-center justify-center text-sm text-muted-foreground" role="status">Getting your setup ready…</div>;
  }

  return (
    <main className="min-h-svh bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.12),_transparent_35%),linear-gradient(180deg,#f8fafc_0%,#eef2ff_100%)] px-4 py-5 sm:px-6 sm:py-9">
      <div className="mx-auto w-full max-w-6xl">
        <header className="mb-8 flex items-center justify-between border-b border-border/70 pb-5">
          <a href="/" className="flex items-center gap-2.5 text-lg font-semibold tracking-tight text-foreground">
            <span className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm shadow-primary/20"><CircleDollarSign className="size-5" /></span>
            FlowMoney
          </a>
        </header>

        {step > 0 && step < 5 && (
          <div className="mb-6 flex items-center justify-between text-sm text-muted-foreground">
            <span>Set up your money picture</span>
            <span>Step {step} of 5</span>
          </div>
        )}

        {step > 0 && (
          <div className="mb-8" aria-label={`Step ${step} of 5`}>
            <div className="mb-3 flex justify-between gap-2">
              {stepNames.map((name, index) => {
                const active = index + 1 <= step;
                return (
                  <div key={name} className={`flex items-center gap-2 text-xs font-medium sm:text-sm ${active ? "text-foreground" : "text-muted-foreground"}`}>
                    <span className={`flex size-7 items-center justify-center rounded-full border ${index + 1 < step ? "border-foreground bg-foreground text-background" : active ? "border-foreground/80 bg-zinc-900 text-background" : "border-border bg-background"}`}>
                      {index + 1 < step ? <Check className="size-3.5" /> : index + 1}
                    </span>
                    <span className="hidden sm:inline">{name}</span>
                  </div>
                );
              })}
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
              <div className="h-full rounded-full bg-gradient-to-r from-zinc-500 via-zinc-700 to-black transition-all dark:from-zinc-400 dark:via-zinc-600 dark:to-white" style={{ width: `${Math.min(step, 5) * 20}%` }} />
            </div>
          </div>
        )}

        <section className="rounded-[28px] border border-border/70 bg-card/85 p-5 shadow-[0_24px_100px_rgba(15,23,42,0.08)] backdrop-blur-sm sm:p-8 lg:p-10">
          {error && <div className="mb-6 rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive" role="alert">{error}</div>}

          {step === 0 && (
            <div className="grid items-center gap-8 lg:grid-cols-[1.1fr_0.9fr]">
              <div className="space-y-4">
                <div className="text-xs font-medium uppercase tracking-[0.18em] text-primary [font-family:var(--font-geist-mono),ui-monospace,Sans-serif]">Financial clarity for real life</div>
                <div>
                  <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">See your money clearly.</h1>
                  <p className="mt-4 max-w-xl text-base leading-7 text-muted-foreground sm:text-lg">FlowMoney helps you track what’s available now, what’s coming in, and what needs covering—without the spreadsheet chaos.</p>
                </div>

                <div className="flex flex-wrap gap-3 pt-1">
                  <Button className="h-11 px-5 text-sm shadow-lg shadow-primary/20" onClick={() => advance(1)}>Start my setup <ArrowRight className="ml-2 size-4" /></Button>
                  <Button variant="outline" className="h-11 px-5 text-sm" onClick={() => void complete()} disabled={saving}>I’ll do this later</Button>
                </div>

                <p className="text-xs text-muted-foreground">You can update everything later. FlowMoney never holds or moves your money.</p>
              </div>

              <div className="relative">
                <div className="absolute -right-6 -top-4 h-24 w-24 rounded-full bg-primary/20 blur-3xl" />
                <div className="absolute -bottom-6 -left-4 h-24 w-24 rounded-full bg-violet-500/20 blur-3xl" />
                <div className="relative overflow-hidden rounded-[30px] border border-white/10 bg-[#070b17] p-2 shadow-[0_26px_80px_rgba(15,23,42,0.45)] sm:p-3">
                  <img src={flowIllustration.src ?? flowIllustration} alt="FlowMoney onboarding illustration" className="h-full w-full rounded-[24px] object-cover" />
                </div>
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="max-w-2xl space-y-6">
              <div className="space-y-2">
                <p className="text-sm font-medium text-primary">Step 1 · Your preference</p>
                <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">What currency do you mainly use?</h1>
                <p className="text-muted-foreground">We suggested {currency} based on your browser region. Confirm it or choose another currency; you can change it later in Settings.</p>
              </div>
              <label className="block space-y-2 text-sm font-medium" htmlFor="preferred-currency">
                Primary currency
                <select id="preferred-currency" className={inputClass} value={currency} onChange={(event) => setCurrency(event.target.value as CurrencyCode)}>
                  {CURRENCIES.map((item) => <option key={item.code} value={item.code}>{item.name} ({item.code})</option>)}
                </select>
              </label>
              <div className="rounded-xl border border-amber-500/30 bg-amber-500/[0.06] p-4 text-sm leading-6 text-muted-foreground">
                FlowMoney won’t convert amounts. Choosing a currency sets how amounts are labeled and interpreted; it does not change their numeric values.
              </div>
              <div className="flex justify-end">
                <Button type="button" onClick={async () => {
                  setSaving(true);
                  setError("");
                  try {
                    await request("/users/me/currency", { method: "PATCH", body: JSON.stringify({ currency }) });
                    advance(2);
                  } catch (cause) {
                    setError(cause instanceof Error ? cause.message : "Could not save your currency preference.");
                  } finally {
                    setSaving(false);
                  }
                }} disabled={saving}>
                  {saving ? "Saving preference…" : "Confirm currency & continue"}<ArrowRight className="ml-2 size-4" />
                </Button>
              </div>
            </div>
          )}

          {step === 2 && (
            <form onSubmit={saveFunds} className="space-y-7">
              <div className="space-y-2">
                <p className="text-sm font-medium text-primary">Step 1 · Cash on hand</p>
                <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">How much is available right now?</h1>
                <p className="text-muted-foreground">This is the cash you can access immediately, separate from future income.</p>
              </div>

              <div className="space-y-3">
                {funds.map((fund, index) => (
                  <div key={index} className="grid gap-3 rounded-2xl border border-border bg-background/80 p-4 sm:grid-cols-[1fr_1fr]">
                    <label className="space-y-2 text-sm font-medium">Fund name
                      <input className={inputClass} value={fund.name} onChange={(event) => setFunds((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, name: event.target.value } : item))} placeholder="Main account" autoComplete="off" />
                    </label>
                    <label className="space-y-2 text-sm font-medium">Amount ({currency})
                      <input className={inputClass} type="number" min="0.01" step="0.01" inputMode="decimal" value={fund.amount} onChange={(event) => setFunds((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, amount: event.target.value } : item))} placeholder="300000" />
                    </label>
                  </div>
                ))}
              </div>

              <button type="button" onClick={() => setFunds((current) => [...current, { name: "", amount: "" }])} className="inline-flex items-center gap-2 rounded-lg px-2 py-2 text-sm font-medium text-muted-foreground transition hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><Plus className="size-4" /> Add another source</button>

              <div className="rounded-2xl border border-primary/20 bg-primary/[0.04] p-5">
                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground"><WalletCards className="size-4" /> Current funds</div>
                <p className="mt-2 text-3xl font-semibold tracking-tight">{formatMoney(enteredFunds, currency)}</p>
                <p className="mt-1 text-xs text-muted-foreground">Preview only; saved funds stay separate from expected income.</p>
              </div>

              <div className="mt-8 flex flex-col-reverse justify-between gap-3 sm:flex-row">
                <Button type="button" variant="outline" onClick={back}><ArrowLeft className="mr-2 size-4" /> Back</Button>
                <div className="flex flex-col-reverse gap-3 sm:flex-row">
                  <Button type="button" variant="ghost" onClick={() => void skipTo(3)} disabled={saving}>Skip for now</Button>
                  <Button type="submit" disabled={saving || enteredFunds <= 0}> {saving ? "Saving…" : "Save & continue"}<ArrowRight className="ml-2 size-4" /></Button>
                </div>
              </div>
            </form>
          )}

          {step === 3 && (
            <form onSubmit={saveIncome} className="space-y-7">
              <div className="space-y-2">
                <p className="text-sm font-medium text-primary">Step 2 · Future inflow</p>
                <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">What cash is coming soon?</h1>
                <p className="text-muted-foreground">Expected income stays separate from the money you already have available.</p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="space-y-2 text-sm font-medium sm:col-span-2">Income source or title<input className={inputClass} value={income.title} onChange={(event) => setIncome({ ...income, title: event.target.value })} placeholder="Client website project" /></label>
                <label className="space-y-2 text-sm font-medium">Amount ({currency})<input className={inputClass} type="number" min="0.01" step="0.01" inputMode="decimal" value={income.amount} onChange={(event) => setIncome({ ...income, amount: event.target.value })} placeholder="250000" /></label>
                <label className="space-y-2 text-sm font-medium">Expected date<input className={inputClass} type="date" value={income.expectedDate} onChange={(event) => setIncome({ ...income, expectedDate: event.target.value })} /></label>
                <label className="space-y-2 text-sm font-medium sm:col-span-2">How certain is it?
                  <select className={inputClass} value={income.confidence} onChange={(event) => setIncome({ ...income, confidence: event.target.value })}>
                    <option value="CONFIRMED">Confirmed</option><option value="LIKELY">Likely</option><option value="UNCERTAIN">Uncertain</option>
                  </select>
                </label>
              </div>

              <div className="rounded-xl border border-border bg-muted/50 p-3 text-sm text-muted-foreground">This income will not be added to your current available funds.</div>

              <div className="mt-8 flex flex-col-reverse justify-between gap-3 sm:flex-row"><Button type="button" variant="outline" onClick={back}><ArrowLeft className="mr-2 size-4" /> Back</Button><div className="flex flex-col-reverse gap-3 sm:flex-row"><Button type="button" variant="ghost" onClick={() => void skipTo(4)} disabled={saving}>Nothing expected yet</Button><Button type="submit" disabled={saving}>{saving ? "Saving…" : "Save & continue"}<ArrowRight className="ml-2 size-4" /></Button></div></div>
            </form>
          )}

          {step === 4 && (
            <form onSubmit={saveObligation} className="space-y-7">
              <div className="space-y-2">
                <p className="text-sm font-medium text-primary">Step 3 · What’s due</p>
                <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">What needs to be covered next?</h1>
                <p className="text-muted-foreground">Add bills, essentials, or commitments that should stay visible in your plan.</p>
              </div>

              <div className="space-y-3">
                {obligations.map((item, index) => (
                  <div key={index} className="grid gap-4 rounded-2xl border border-border bg-background/80 p-4 sm:grid-cols-2">
                    <label className="space-y-2 text-sm font-medium sm:col-span-2">Name<input className={inputClass} value={item.title} onChange={(event) => setObligations((current) => current.map((entry, entryIndex) => entryIndex === index ? { ...entry, title: event.target.value } : entry))} placeholder="Rent" /></label>
                    <label className="space-y-2 text-sm font-medium">Amount ({currency})<input className={inputClass} type="number" min="0.01" step="0.01" inputMode="decimal" value={item.amount} onChange={(event) => setObligations((current) => current.map((entry, entryIndex) => entryIndex === index ? { ...entry, amount: event.target.value } : entry))} placeholder="120000" /></label>
                    <label className="space-y-2 text-sm font-medium">Due date<input className={inputClass} type="date" value={item.dueDate} onChange={(event) => setObligations((current) => current.map((entry, entryIndex) => entryIndex === index ? { ...entry, dueDate: event.target.value } : entry))} /></label>
                    <label className="space-y-2 text-sm font-medium sm:col-span-2">Priority
                      <select className={inputClass} value={item.priority} onChange={(event) => setObligations((current) => current.map((entry, entryIndex) => entryIndex === index ? { ...entry, priority: event.target.value } : entry))}>
                        <option value="ESSENTIAL">Essential</option><option value="IMPORTANT">Important</option><option value="FLEXIBLE">Flexible</option><option value="OPTIONAL">Optional</option>
                      </select>
                    </label>
                  </div>
                ))}
              </div>

              <button type="button" onClick={() => setObligations((current) => [...current, { title: "", amount: "", dueDate: localDateAfter(7), priority: "ESSENTIAL" }])} className="inline-flex items-center gap-2 rounded-lg px-2 py-2 text-sm font-medium text-muted-foreground transition hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><Plus className="size-4" /> Add another commitment</button>

              <div className="mt-8 flex flex-col-reverse justify-between gap-3 sm:flex-row"><Button type="button" variant="outline" onClick={back}><ArrowLeft className="mr-2 size-4" /> Back</Button><div className="flex flex-col-reverse gap-3 sm:flex-row"><Button type="button" variant="ghost" onClick={() => void skipTo(5)} disabled={saving}>Nothing to add yet</Button><Button type="submit" disabled={saving}>{saving ? "Saving…" : "Save & review"}<ArrowRight className="ml-2 size-4" /></Button></div></div>
            </form>
          )}

          {step === 5 && (
            <div className="space-y-7">
              <div className="space-y-2">
                <p className="text-sm font-medium text-primary">Your starting picture</p>
                <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">A clearer cash view is ready.</h1>
                <p className="text-muted-foreground">Here’s the snapshot from the information you added.</p>
              </div>

              {!snapshot ? (
                <Button className="mt-2" onClick={() => void skipTo(5)} disabled={saving}>{saving ? "Loading snapshot…" : "Load snapshot"}</Button>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl border border-primary/20 bg-primary/[0.04] p-5 sm:col-span-2">
                    <p className="text-sm font-medium text-muted-foreground">Safe to spend</p>
                    <p className="mt-2 text-3xl font-semibold tracking-tight">{formatMoney(Number(snapshot.safeToSpend), currency)}</p>
                    <p className="mt-2 text-xs text-muted-foreground">Based on FlowMoney’s existing dashboard rules.</p>
                  </div>
                  <SnapshotCard label="Current funds" value={snapshot.currentFunds} currency={currency} />
                  <SnapshotCard label="Expected income" value={snapshot.pendingIncome} currency={currency} />
                  <SnapshotCard label="Upcoming obligations" value={snapshot.protectedObligations} currency={currency} />
                  <div className="rounded-2xl border border-border bg-background/80 p-5">
                    <p className="text-sm font-medium text-muted-foreground">A note on your buffer</p>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">The current dashboard keeps a reserve by default. A personal buffer setting can be added when it has a persistent product model.</p>
                  </div>
                </div>
              )}

              <div className="mt-8 flex flex-col-reverse justify-between gap-3 sm:flex-row"><Button variant="outline" onClick={back}><ArrowLeft className="mr-2 size-4" /> Back</Button><Button className="shadow-lg shadow-primary/20" onClick={() => void complete()} disabled={saving || !snapshot}>{saving ? "Finishing setup…" : "Go to my dashboard"}<ArrowRight className="ml-2 size-4" /></Button></div>
            </div>
          )}
        </section>
        <p className="mt-5 text-center text-xs text-muted-foreground">Your financial information stays private and scoped to your account.</p>
      </div>
    </main>
  );
}

function SnapshotCard({ label, value, currency }: { label: string; value: number; currency: CurrencyCode }) {
  return <div className="rounded-xl border p-5"><p className="text-sm font-medium text-muted-foreground">{label}</p><p className="mt-2 text-2xl font-semibold tracking-tight">{formatMoney(Number(value), currency)}</p></div>;
}