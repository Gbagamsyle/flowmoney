"use client";

import { useAuth } from "@clerk/nextjs";
import { ArrowRight, CalendarDays, ListChecks, Pencil, Plus, Trash2 } from "lucide-react";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Button } from "@flowmoney/ui/components/button";
import { usePreferredCurrency } from "@/components/settings/preferred-currency-provider";
import { formatMoney } from "@/lib/format-money";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";
const inputClass = "w-full rounded-lg border bg-background px-3 py-2.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring";
const priorities = ["ESSENTIAL", "IMPORTANT", "FLEXIBLE", "OPTIONAL"] as const;
const statuses = ["PENDING", "FUNDED", "PAID", "SKIPPED"] as const;
type Priority = (typeof priorities)[number];
type Status = (typeof statuses)[number];
type Obligation = { id: string; title: string; amount: number | string; dueDate: string; priority: Priority; status: Status };
type FormState = { title: string; amount: string; dueDate: string; priority: Priority };

function nextWeek() {
  const date = new Date();
  date.setDate(date.getDate() + 7);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function emptyForm(): FormState {
  return { title: "", amount: "", dueDate: nextWeek(), priority: "ESSENTIAL" };
}

function formatDate(value: string) {
  const date = value.length === 10 ? new Date(`${value}T12:00:00`) : new Date(value);
  return new Intl.DateTimeFormat(undefined, { day: "numeric", month: "short", year: "numeric" }).format(date);
}

function statusLabel(status: Status) {
  return status === "PENDING" ? "Pending" : status[0] + status.slice(1).toLowerCase();
}

export default function ObligationsPage() {
  const { getToken, isLoaded, isSignedIn } = useAuth();
  const { currency } = usePreferredCurrency();
  const [items, setItems] = useState<Obligation[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const loadItems = useCallback(async () => {
    const token = await getToken();
    if (!token) throw new Error("Please sign in again to load your obligations.");
    const response = await fetch(`${API_BASE_URL}/obligations`, { headers: { Authorization: `Bearer ${token}` } });
    if (!response.ok) throw new Error(`Could not load obligations (HTTP ${response.status}).`);
    setItems((await response.json()) as Obligation[]);
  }, [getToken]);

  useEffect(() => {
    if (!isLoaded) return;
    if (!isSignedIn) {
      setLoading(false);
      return;
    }
    let active = true;
    void loadItems()
      .catch((cause) => { if (active) setError(cause instanceof Error ? cause.message : "Could not load obligations."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [isLoaded, isSignedIn, loadItems]);

  const notifyDashboard = () => window.dispatchEvent(new CustomEvent("flowmoney:financial-data-changed"));

  const resetForm = () => {
    setForm(emptyForm());
    setEditingId(null);
    setShowForm(false);
  };

  const startEdit = (item: Obligation) => {
    setEditingId(item.id);
    setForm({
      title: item.title,
      amount: String(item.amount),
      dueDate: item.dueDate.slice(0, 10),
      priority: item.priority,
    });
    setShowForm(true);
    setError("");
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const amount = Number(form.amount);
    if (!form.title.trim() || !Number.isFinite(amount) || amount <= 0 || !form.dueDate) {
      setError("Enter a name, an amount greater than zero, and a due date.");
      return;
    }

    setSaving(true);
    setError("");
    try {
      const token = await getToken();
      if (!token) throw new Error("Please sign in again to save this obligation.");
      const response = await fetch(editingId ? `${API_BASE_URL}/obligations/${editingId}` : `${API_BASE_URL}/obligations`, {
        method: editingId ? "PATCH" : "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, title: form.title.trim(), amount }),
      });
      if (!response.ok) throw new Error(`Could not save obligation (HTTP ${response.status}).`);
      resetForm();
      await loadItems();
      notifyDashboard();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not save this obligation.");
    } finally {
      setSaving(false);
    }
  };

  const updateStatus = async (item: Obligation, status: Status) => {
    setBusyId(item.id);
    setError("");
    try {
      const token = await getToken();
      if (!token) throw new Error("Please sign in again to update this obligation.");
      const response = await fetch(`${API_BASE_URL}/obligations/${item.id}`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!response.ok) throw new Error(`Could not update obligation status (HTTP ${response.status}).`);
      setItems((current) => current.map((entry) => entry.id === item.id ? { ...entry, status } : entry));
      notifyDashboard();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not update obligation status.");
    } finally {
      setBusyId(null);
    }
  };

  const remove = async (item: Obligation) => {
    if (!window.confirm(`Delete “${item.title}”? This cannot be undone.`)) return;
    setBusyId(item.id);
    setError("");
    try {
      const token = await getToken();
      if (!token) throw new Error("Please sign in again to delete this obligation.");
      const response = await fetch(`${API_BASE_URL}/obligations/${item.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error(`Could not delete obligation (HTTP ${response.status}).`);
      setItems((current) => current.filter((entry) => entry.id !== item.id));
      notifyDashboard();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not delete this obligation.");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-muted-foreground">Plan what needs protecting</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">Payments & commitments</h1>
          <p className="mt-2 text-muted-foreground">Keep upcoming bills and priorities visible as you plan.</p>
        </div>
        <Button type="button" onClick={() => showForm ? resetForm() : (setShowForm(true), setError(""))}>
          <Plus className="mr-2 size-4" />{showForm ? "Close" : "Add obligation"}
        </Button>
      </header>

      {error && <p role="alert" className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">{error}</p>}

      {showForm && <form onSubmit={submit} className="grid gap-4 rounded-xl border bg-card p-5 shadow-sm sm:grid-cols-2">
        <label className="space-y-2 text-sm font-medium sm:col-span-2">
          Name
          <input className={inputClass} value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} placeholder="Rent" required maxLength={120} />
        </label>
        <label className="space-y-2 text-sm font-medium">
          Amount ({currency})
          <input className={inputClass} type="number" min="0.01" step="0.01" inputMode="decimal" value={form.amount} onChange={(event) => setForm({ ...form, amount: event.target.value })} placeholder="120000" required />
        </label>
        <label className="space-y-2 text-sm font-medium">
          Due date
          <input className={inputClass} type="date" value={form.dueDate} onChange={(event) => setForm({ ...form, dueDate: event.target.value })} required />
        </label>
        <label className="space-y-2 text-sm font-medium sm:col-span-2">
          Priority
          <select className={inputClass} value={form.priority} onChange={(event) => setForm({ ...form, priority: event.target.value as Priority })}>
            <option value="ESSENTIAL">Essential</option><option value="IMPORTANT">Important</option><option value="FLEXIBLE">Flexible</option><option value="OPTIONAL">Optional</option>
          </select>
        </label>
        <div className="flex justify-end gap-3 sm:col-span-2">
          <Button type="button" variant="outline" onClick={resetForm} disabled={saving}>Cancel</Button>
          <Button type="submit" disabled={saving}>{saving ? "Saving…" : editingId ? "Save changes" : "Save obligation"}<ArrowRight className="ml-2 size-4" /></Button>
        </div>
      </form>}

      {loading ? <div className="h-32 animate-pulse rounded-xl border bg-muted/40" role="status" aria-label="Loading obligations" /> : items.length === 0 ? (
        <section className="rounded-xl border border-dashed bg-card px-6 py-12 text-center">
          <div className="mx-auto flex size-12 items-center justify-center rounded-xl bg-muted text-muted-foreground"><ListChecks className="size-6" /></div>
          <h2 className="mt-4 text-lg font-semibold">No obligations added yet</h2>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">Add bills and commitments you want to account for before deciding what’s safe to spend.</p>
          <Button className="mt-5" onClick={() => setShowForm(true)}><Plus className="mr-2 size-4" />Add an obligation</Button>
        </section>
      ) : (
        <section className="space-y-3" aria-label="Your obligations">
          {items.map((item) => <article key={item.id} className="flex flex-col gap-4 rounded-xl border bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <h2 className="truncate font-semibold">{item.title}</h2>
              <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                <CalendarDays className="size-3.5" />Due {formatDate(item.dueDate)}<span>·</span>{item.priority.toLowerCase()}
              </p>
              <p className="mt-2 text-xl font-semibold tabular-nums">{formatMoney(Number(item.amount), currency)}</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <label className="sr-only" htmlFor={`status-${item.id}`}>Status for {item.title}</label>
              <select id={`status-${item.id}`} className="h-9 rounded-lg border bg-background px-2 text-sm" value={item.status} disabled={busyId === item.id} onChange={(event) => void updateStatus(item, event.target.value as Status)}>
                {statuses.map((status) => <option key={status} value={status}>{statusLabel(status)}</option>)}
              </select>
              <Button type="button" variant="outline" size="sm" onClick={() => startEdit(item)} disabled={busyId === item.id} aria-label={`Edit ${item.title}`}><Pencil className="mr-1 size-3.5" />Edit</Button>
              <Button type="button" variant="destructive" size="sm" onClick={() => void remove(item)} disabled={busyId === item.id} aria-label={`Delete ${item.title}`}><Trash2 className="mr-1 size-3.5" />{busyId === item.id ? "Working…" : "Delete"}</Button>
            </div>
          </article>)}
        </section>
      )}
    </div>
  );
}
