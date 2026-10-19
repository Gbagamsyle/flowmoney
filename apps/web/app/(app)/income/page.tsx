"use client";

import { useAuth } from "@clerk/nextjs";
import { ArrowRight, CalendarDays, CircleDollarSign, Plus } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Button } from "@flowmoney/ui/components/button";
import { formatMoney } from "@/lib/format-money";
import { usePreferredCurrency } from "@/components/settings/preferred-currency-provider";
import { trackProductEventOnce } from "@/lib/analytics";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";
const inputClass = "w-full rounded-lg border bg-background px-3 py-2.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring";
type IncomeItem = { id: string; title: string; amount: number | string; expectedDate: string; confidence: string; status: string };

function nextWeek() {
  const date = new Date();
  date.setDate(date.getDate() + 7);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export default function IncomePage() {
  const { getToken, isLoaded, isSignedIn, userId } = useAuth();
  const { currency } = usePreferredCurrency();
  const [items, setItems] = useState<IncomeItem[]>([]);
  const [itemsLoaded, setItemsLoaded] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ title: "", amount: "", expectedDate: nextWeek(), confidence: "LIKELY" });

  const loadItems = useCallback(async () => {
    const token = await getToken();
    if (!token) throw new Error("Please sign in again to load expected income.");
    const response = await fetch(`${API_BASE_URL}/expected-income`, { headers: { Authorization: `Bearer ${token}` } });
    if (!response.ok) throw new Error("Could not load expected income.");
    setItems((await response.json()) as IncomeItem[]);
    setItemsLoaded(true);
    setError("");
  }, [getToken]);

  useEffect(() => {
    if (!isLoaded) return;
    if (!isSignedIn) {
      setLoading(false);
      return;
    }
    let active = true;
    void loadItems().catch((cause) => {
      if (active) setError(cause instanceof Error ? cause.message : "Could not load expected income.");
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [isLoaded, isSignedIn, loadItems]);

  const retryLoad = async () => {
    setLoading(true);
    setError("");
    try {
      await loadItems();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not load expected income.");
    } finally {
      setLoading(false);
    }
  };

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!form.title.trim() || Number(form.amount) <= 0 || !form.expectedDate) {
      setError("Enter a title, positive amount, and expected date.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const token = await getToken();
      if (!token) throw new Error("Please sign in again.");
      const response = await fetch(`${API_BASE_URL}/expected-income`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, title: form.title.trim(), amount: Number(form.amount) }),
      });
      if (!response.ok) throw new Error("Could not save this income. Please try again.");
      if (itemsLoaded && items.length === 0) void trackProductEventOnce("first_expected_income_created", userId ?? undefined);
      setForm({ title: "", amount: "", expectedDate: nextWeek(), confidence: "LIKELY" });
      setShowForm(false);
      await loadItems();
      window.dispatchEvent(new CustomEvent("flowmoney:financial-data-changed"));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not save expected income.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div><p className="text-sm font-medium text-muted-foreground">Plan ahead</p><h1 className="mt-1 text-3xl font-semibold tracking-tight">Expected income</h1><p className="mt-2 text-muted-foreground">Money you expect to receive, kept separate from funds you have now.</p></div>
        <Button onClick={() => setShowForm((value) => !value)}><Plus className="mr-2 size-4" />{showForm ? "Close" : "Add income"}</Button>
      </div>

      {error && <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive"><span>{error}</span>{items.length === 0 && !showForm && <Button variant="outline" onClick={() => void retryLoad()} disabled={loading}>{loading ? "Retrying…" : "Try again"}</Button>}</div>}

      {showForm && <form onSubmit={submit} className="grid gap-4 rounded-xl border bg-card p-5 shadow-sm sm:grid-cols-2">
        <label className="space-y-2 text-sm font-medium sm:col-span-2">Source or title<input className={inputClass} value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} placeholder="Client website project" /></label>
        <label className="space-y-2 text-sm font-medium">Amount ({currency})<input className={inputClass} type="number" min="0.01" step="0.01" inputMode="decimal" value={form.amount} onChange={(event) => setForm({ ...form, amount: event.target.value })} placeholder="250000" /></label>
        <label className="space-y-2 text-sm font-medium">Expected date<input className={inputClass} type="date" value={form.expectedDate} onChange={(event) => setForm({ ...form, expectedDate: event.target.value })} /></label>
        <label className="space-y-2 text-sm font-medium sm:col-span-2">Confidence<select className={inputClass} value={form.confidence} onChange={(event) => setForm({ ...form, confidence: event.target.value })}><option value="CONFIRMED">Confirmed</option><option value="LIKELY">Likely</option><option value="UNCERTAIN">Uncertain</option></select></label>
        <div className="flex justify-end sm:col-span-2"><Button type="submit" disabled={saving}>{saving ? "Saving…" : "Save expected income"}<ArrowRight className="ml-2 size-4" /></Button></div>
      </form>}

      {loading ? <div className="h-32 animate-pulse rounded-xl border bg-muted/40" role="status" /> : error && items.length === 0 ? null : items.length === 0 ? (
        <section className="rounded-xl border border-dashed bg-card px-6 py-12 text-center">
          <div className="mx-auto flex size-12 items-center justify-center rounded-xl bg-muted text-muted-foreground"><CircleDollarSign className="size-6" /></div>
          <h2 className="mt-4 text-lg font-semibold">No expected income yet</h2>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">Add payments you expect to receive so FlowMoney can help you plan ahead. Expected money won’t be treated as cash you already have.</p>
          <Button className="mt-5" onClick={() => setShowForm(true)}><Plus className="mr-2 size-4" />Add expected income</Button>
        </section>
      ) : <section className="divide-y rounded-xl border bg-card px-5 shadow-sm">
        {items.map((item) => <article key={item.id} className="flex flex-wrap items-center justify-between gap-4 py-5">
          <div className="min-w-0 flex-1 basis-48"><h2 className="break-words font-medium">{item.title}</h2><p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground"><CalendarDays className="size-3.5" />{new Intl.DateTimeFormat("en-NG", { day: "numeric", month: "short", year: "numeric" }).format(new Date(item.expectedDate))}<span>·</span>{item.confidence.toLowerCase()}<span>·</span>{item.status.toLowerCase()}</p></div>
          <p className="max-w-full break-all text-lg font-semibold tabular-nums">{formatMoney(Number(item.amount), currency)}</p>
        </article>)}
      </section>}
    </div>
  );
}
