"use client";

import { useAuth } from "@clerk/nextjs";
import { useEffect, useMemo, useState } from "react";
import { usePreferredCurrency } from "@/components/settings/preferred-currency-provider";
import { formatMoney } from "@/lib/format-money";
import { trackProductEventOnce } from "@/lib/analytics";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

type CurrentFund = {
  id: string;
  name: string;
  balance: number;
  currency: string;
  createdAt?: string;
  updatedAt?: string;
};

type FormState = {
  name: string;
  balance: string;
};

export default function AccountsPage() {
  const { getToken, isLoaded, isSignedIn, userId } = useAuth();
  const { currency } = usePreferredCurrency();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>({ name: "", balance: "" });
  const [funds, setFunds] = useState<CurrentFund[]>([]);
  const [fundsLoaded, setFundsLoaded] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const totalFunds = useMemo(
    () => funds.reduce((sum, fund) => sum + Number(fund.balance ?? 0), 0),
    [funds],
  );

  const loadFunds = async () => {
    if (!isLoaded || !isSignedIn) {
      return;
    }

    const token = await getToken();
    if (!token) {
      throw new Error("Please sign in again to load your current funds.");
    }

    const response = await fetch(`${API_BASE_URL}/accounts`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error("Unable to load current funds");
    }

    const data = (await response.json()) as CurrentFund[];
    setFunds(
      data.map((fund) => ({
        ...fund,
        balance: Number(fund.balance ?? 0),
      })),
    );
    setFundsLoaded(true);
    setError(null);
  };

  useEffect(() => {
    if (!isLoaded || !isSignedIn) {
      setLoading(false);
      return;
    }

    setLoading(true);

    void loadFunds()
      .catch(() => setError("Could not load your current funds."))
      .finally(() => setLoading(false));
  }, [getToken, isLoaded, isSignedIn]);

  useEffect(() => {
    const onAccountsChanged = () => {
      void loadFunds().catch(() => setError("Could not refresh your current funds."));
    };

    window.addEventListener("flowmoney:accounts-changed", onAccountsChanged);
    return () => window.removeEventListener("flowmoney:accounts-changed", onAccountsChanged);
  }, [getToken, isLoaded, isSignedIn]);

  const resetForm = () => {
    setForm({ name: "", balance: "" });
    setEditingId(null);
    setShowForm(false);
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const parsedBalance = Number(form.balance);
    if (!form.name.trim() || Number.isNaN(parsedBalance) || parsedBalance <= 0) {
      setError("Enter a fund name and an amount greater than zero.");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const token = await getToken();
      if (!token) throw new Error("Please sign in again to save this fund.");

      const method = editingId ? "PATCH" : "POST";
      const url = editingId
        ? `${API_BASE_URL}/accounts/${editingId}`
        : `${API_BASE_URL}/accounts`;

      const response = await fetch(url, {
        method,
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: form.name.trim(),
          balance: parsedBalance,
          ...(!editingId ? { currency } : {}),
        }),
      });

      if (!response.ok) throw new Error(`The fund could not be saved (HTTP ${response.status}).`);

      if (!editingId && fundsLoaded && funds.length === 0) void trackProductEventOnce("first_fund_created", userId ?? undefined);
      resetForm();
      window.dispatchEvent(new CustomEvent("flowmoney:accounts-changed"));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The fund could not be saved.");
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (fund: CurrentFund) => {
    setEditingId(fund.id);
    setForm({
      name: fund.name,
      balance: String(fund.balance),
    });
    setShowForm(true);
  };

  const handleDelete = async (fundId: string) => {
    const confirmed = window.confirm("Delete this fund?");
    if (!confirmed) {
      return;
    }

    setDeletingId(fundId);
    setError(null);
    try {
      const token = await getToken();
      if (!token) throw new Error("Please sign in again to delete this fund.");

      const response = await fetch(`${API_BASE_URL}/accounts/${fundId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) throw new Error(`The fund could not be deleted (HTTP ${response.status}).`);

      setFunds((current) => current.filter((fund) => fund.id !== fundId));
      window.dispatchEvent(new CustomEvent("flowmoney:accounts-changed"));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The fund could not be deleted.");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Current Funds</h1>

          <p className="mt-1 text-sm text-muted-foreground">
            Money you already have available across your accounts and wallets.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            if (showForm) {
              resetForm();
              return;
            }

            setShowForm(true);
          }}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          {showForm ? "Close" : "Add funds"}
        </button>
      </div>

      {error && (
        <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
          <span>{error}</span>
          {funds.length === 0 && !showForm && <button type="button" onClick={() => {
            setLoading(true);
            void loadFunds().catch(() => setError("Could not load your current funds. Please try again."))
              .finally(() => setLoading(false));
          }} disabled={loading} className="min-h-11 rounded-md border border-destructive/30 px-3 font-medium disabled:opacity-60">{loading ? "Retrying…" : "Try again"}</button>}
        </div>
      )}

      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="space-y-4 rounded-xl border bg-card p-4 shadow-sm"
        >
          <div className="grid gap-4 md:grid-cols-3">
            <label className="space-y-2 text-sm font-medium md:col-span-2">
              <span>Fund name</span>
              <input
                value={form.name}
                onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                placeholder="Main account"
                className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none ring-0 placeholder:text-muted-foreground focus:border-primary"
              />
            </label>

            <label className="space-y-2 text-sm font-medium">
              <span>Primary currency</span>
              <div className="rounded-md border bg-muted/40 px-3 py-2 text-sm">{currency}</div>
            </label>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-2 text-sm font-medium">
              <span>Amount ({currency})</span>
              <input
                type="number"
                min="0"
                step="1000"
                value={form.balance}
                onChange={(event) =>
                  setForm((current) => ({ ...current, balance: event.target.value }))
                }
                placeholder="400000"
                className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none ring-0 placeholder:text-muted-foreground focus:border-primary"
              />
            </label>
          </div>

          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={resetForm}
              className="rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={saving}
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? "Saving…" : editingId ? "Save changes" : "Save fund"}
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="rounded-2xl border border-dashed bg-card/40 p-10 text-center text-sm text-muted-foreground">
          Loading your funds…
        </div>
      ) : error && funds.length === 0 ? null : funds.length === 0 ? (
        <div className="rounded-2xl border border-dashed bg-card/40 p-10 text-center">
          <p className="text-lg font-medium">No current funds yet</p>
          <p className="mt-2 text-sm text-muted-foreground">
            Add your first amount to start building a realistic picture of your
            available cash.
          </p>
          <button type="button" onClick={() => setShowForm(true)} className="mt-5 min-h-11 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90">Add your first funds</button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="rounded-xl border bg-card p-4">
            <p className="text-sm text-muted-foreground">Total current funds</p>
            <p className="mt-2 text-3xl font-semibold tracking-tight">
              {formatMoney(totalFunds, currency)}
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {funds.map((fund) => (
              <div key={fund.id} className="min-w-0 rounded-xl border bg-card p-4">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0 flex-1 basis-40"><p className="break-words text-sm text-muted-foreground">{fund.name}</p>
                    <p className="mt-2 break-all text-2xl font-semibold tracking-tight tabular-nums">
                      {formatMoney(Number(fund.balance ?? 0), currency)}
                    </p>
                  </div>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => handleEdit(fund)}
                      className="rounded-md border px-2 py-1 text-xs font-medium hover:bg-muted"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleDelete(fund.id)}
                      disabled={deletingId === fund.id}
                      className="rounded-md border border-destructive/30 px-2 py-1 text-xs font-medium text-destructive hover:bg-destructive/5 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {deletingId === fund.id ? "Deleting…" : "Delete"}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
