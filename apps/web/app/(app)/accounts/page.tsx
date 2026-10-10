"use client";

import { useAuth } from "@clerk/nextjs";
import { useEffect, useMemo, useState } from "react";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

const formatMoney = (value: number) =>
  new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(value);

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
  currency: string;
};

export default function AccountsPage() {
  const { getToken, isLoaded, isSignedIn } = useAuth();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>({ name: "", balance: "", currency: "NGN" });
  const [funds, setFunds] = useState<CurrentFund[]>([]);
  const [loading, setLoading] = useState(true);
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
      return;
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
    setForm({ name: "", balance: "", currency: "NGN" });
    setEditingId(null);
    setShowForm(false);
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const parsedBalance = Number(form.balance);
    if (!form.name.trim() || Number.isNaN(parsedBalance) || parsedBalance <= 0) {
      return;
    }

    const token = await getToken();
    if (!token) {
      return;
    }

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
        currency: form.currency,
      }),
    });

    if (!response.ok) {
      setError("The fund could not be saved.");
      return;
    }

    resetForm();
    window.dispatchEvent(new CustomEvent("flowmoney:accounts-changed"));
  };

  const handleEdit = (fund: CurrentFund) => {
    setEditingId(fund.id);
    setForm({
      name: fund.name,
      balance: String(fund.balance),
      currency: fund.currency ?? "NGN",
    });
    setShowForm(true);
  };

  const handleDelete = async (fundId: string) => {
    const confirmed = window.confirm("Delete this fund?");
    if (!confirmed) {
      return;
    }

    const token = await getToken();
    if (!token) {
      return;
    }

    const response = await fetch(`${API_BASE_URL}/accounts/${fundId}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      setError("The fund could not be deleted.");
      return;
    }

    setFunds((current) => current.filter((fund) => fund.id !== fundId));
    window.dispatchEvent(new CustomEvent("flowmoney:accounts-changed"));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
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
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
          {error}
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
              <span>Currency</span>
              <select
                value={form.currency}
                onChange={(event) =>
                  setForm((current) => ({ ...current, currency: event.target.value }))
                }
                className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
              >
                <option value="NGN">NGN</option>
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
              </select>
            </label>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-2 text-sm font-medium">
              <span>Amount</span>
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
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              {editingId ? "Save changes" : "Save fund"}
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="rounded-2xl border border-dashed bg-card/40 p-10 text-center text-sm text-muted-foreground">
          Loading your funds…
        </div>
      ) : funds.length === 0 ? (
        <div className="rounded-2xl border border-dashed bg-card/40 p-10 text-center">
          <p className="text-lg font-medium">No current funds yet</p>
          <p className="mt-2 text-sm text-muted-foreground">
            Add your first amount to start building a realistic picture of your
            available cash.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="rounded-xl border bg-card p-4">
            <p className="text-sm text-muted-foreground">Total current funds</p>
            <p className="mt-2 text-3xl font-semibold tracking-tight">
              {formatMoney(totalFunds)}
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {funds.map((fund) => (
              <div key={fund.id} className="rounded-xl border bg-card p-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">{fund.name}</p>
                    <p className="mt-2 text-2xl font-semibold tracking-tight">
                      {formatMoney(Number(fund.balance ?? 0))}
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
                      className="rounded-md border border-destructive/30 px-2 py-1 text-xs font-medium text-destructive hover:bg-destructive/5"
                    >
                      Delete
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
