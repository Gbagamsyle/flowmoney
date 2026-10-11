"use client";

import { useAuth } from "@clerk/nextjs";
import { ArrowRight, CalendarDays, ListChecks, Plus } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@flowmoney/ui/components/button";
import { formatMoney } from "@/lib/format-money";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";
const inputClass = "w-full rounded-lg border bg-background px-3 py-2.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring";
type Obligation = { id: string; title: string; amount: number | string; dueDate: string; priority: string; status: string };

function nextWeek() {
  const date = new Date();
  date.setDate(date.getDate() + 7);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export default function ObligationsPage() {
  const { getToken, isLoaded, isSignedIn } = useAuth();
  const [items, setItems] = useState<Obligation[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ title: "", amount: "", dueDate: nextWeek(), priority: "ESSENTIAL" });

  const loadItems = async () => {
    const token = await getToken();
    if (!token) return;
    const response = await fetch(`${API_BASE_URL}/obligations`, { headers: { Authorization: `Bearer ${token}` } });
    if (!response.ok) throw new Error("Could not load your obligations.");
    setItems((await response.json()) as Obligation[]);
  };

  useEffect(() => {
    if (!isLoaded || !isSignedIn) return;
    void loadItems().catch((cause) => setError(cause instanceof Error ? cause.message : "Could not load your obligations.")).finally(() => setLoading(false));
  }, [getToken, isLoaded, isSignedIn]);

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!form.title.trim() || Number(form.amount) <= 0 || !form.dueDate) {
      setError("Enter a name, positive amount, and due date.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const token = await getToken();
      if (!token) throw new Error("Please sign in again.");
      const response = await fetch(`${API_BASE_URL}/obligations`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, title: form.title.trim(), amount: Number(form.amount) }),
      });
      if (!response.ok) throw new Error("Could not save this obligation. Please try again.");
      setForm({ title: "", amount: "", dueDate: nextWeek(), priority: "ESSENTIAL" });
      setShowForm(false);
      await loadItems();
      window.dispatchEvent(new CustomEvent("flowmoney:financial-data-changed"));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not save your obligation.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div><p className="text-sm font-medium text-muted-foreground">Plan what needs protecting</p><h1 className="mt-1 text-3xl font-semibold tracking-tight">Payments & commitments</h1><p className="mt-2 text-muted-foreground">Keep upcoming bills and priorities visible as you plan.</p></div>
        <Button onClick={() => setShowForm((value) => !value)}><Plus className="mr-2 size-4" />{showForm ? "Close" : "Add obligation"}</Button>
      </div>

      {error && <p role="alert" className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">{error}</p>}

      {showForm && <form onSubmit={submit} className="grid gap-4 rounded-xl border bg-card p-5 shadow-sm sm:grid-cols-2">
        <label className="space-y-2 text-sm font-medium sm:col-span-2">Name<input className={inputClass} value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} placeholder="Rent" /></label>
        <label className="space-y-2 text-sm font-medium">Amount (NGN)<input className={inputClass} type="number" min="0.01" step="0.01" inputMode="decimal" value={form.amount} onChange={(event) => setForm({ ...form, amount: event.target.value })} placeholder="120000" /></label>
        <label className="space-y-2 text-sm font-medium">Due date<input className={inputClass} type="date" value={form.dueDate} onChange={(event) => setForm({ ...form, dueDate: event.target.value })} /></label>
        <label className="space-y-2 text-sm font-medium sm:col-span-2">Priority<select className={inputClass} value={form.priority} onChange={(event) => setForm({ ...form, priority: event.target.value })}><option value="ESSENTIAL">Essential</option><option value="IMPORTANT">Important</option><option value="FLEXIBLE">Flexible</option><option value="OPTIONAL">Optional</option></select></label>
        <div className="flex justify-end sm:col-span-2"><Button type="submit" disabled={saving}>{saving ? "Saving…" : "Save obligation"}<ArrowRight className="ml-2 size-4" /></Button></div>
      </form>}

      {loading ? <div className="h-32 animate-pulse rounded-xl border bg-muted/40" role="status" /> : items.length === 0 ? (
        <section className="rounded-xl border border-dashed bg-card px-6 py-12 text-center">
          <div className="mx-auto flex size-12 items-center justify-center rounded-xl bg-muted text-muted-foreground"><ListChecks className="size-6" /></div>
          <h2 className="mt-4 text-lg font-semibold">No obligations added yet</h2>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">Add bills and commitments you want to account for before deciding what’s safe to spend.</p>
          <Button className="mt-5" onClick={() => setShowForm(true)}><Plus className="mr-2 size-4" />Add an obligation</Button>
        </section>
      ) : <section className="divide-y rounded-xl border bg-card px-5 shadow-sm">
        {items.map((item) => <article key={item.id} className="flex flex-wrap items-center justify-between gap-4 py-5">
          <div><h2 className="font-medium">{item.title}</h2><p className="mt-1 flex items-center gap-2 text-sm text-muted-foreground"><CalendarDays className="size-3.5" />{new Intl.DateTimeFormat("en-NG", { day: "numeric", month: "short", year: "numeric" }).format(new Date(item.dueDate))}<span>·</span>{item.priority.toLowerCase()}<span>·</span>{item.status.toLowerCase()}</p></div>
          <p className="text-lg font-semibold tabular-nums">{formatMoney(Number(item.amount))}</p>
        </article>)}
      </section>}
    </div>
  );
}
