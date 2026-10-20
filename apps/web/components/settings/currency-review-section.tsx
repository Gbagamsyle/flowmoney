"use client";
import { useAuth } from "@clerk/nextjs";
import { useCallback, useEffect, useState } from "react";
import { CURRENCIES } from "@/lib/currencies";
import { usePreferredCurrency } from "./preferred-currency-provider";
const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";
type RecordRow = { kind: string; id: string; title: string; amount: string };
export function CurrencyReviewSection() {
  const { getToken } = useAuth();
  const { reloadDisplay } = usePreferredCurrency();
  const [rows, setRows] = useState<RecordRow[]>([]);
  const [choices, setChoices] = useState<Record<string, string>>({});
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [visible, setVisible] = useState(25);
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const token = await getToken();
      const response = await fetch(`${API}/currencies/review`, {
        cache: "no-store",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error("Could not load currency review.");
      setRows(await response.json());
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load review.");
    } finally {
      setLoading(false);
    }
  }, [getToken]);
  useEffect(() => {
    void load();
  }, [load]);
  const confirm = async (row: RecordRow) => {
    const key = `${row.kind}:${row.id}`;
    setBusy(key);
    setError("");
    try {
      const token = await getToken();
      const response = await fetch(`${API}/currencies/review`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ ...row, currency: choices[key] }),
      });
      const data = await response.json();
      if (!response.ok)
        throw new Error(data.message ?? "Could not confirm currency.");
      setRows((current) =>
        current.filter((r) => !(r.id === row.id && r.kind === row.kind)),
      );
      await reloadDisplay();
      window.dispatchEvent(new Event("flowmoney:financial-data-changed"));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not confirm currency.");
    } finally {
      setBusy("");
    }
  };
  return (
    <section
      id="currency-review"
      aria-labelledby="currency-review-title"
      className="scroll-mt-24 space-y-4 rounded-xl border bg-card p-5 sm:p-6"
    >
      <h2 id="currency-review-title" className="text-lg font-semibold">
        Confirm original currencies
      </h2>
      <p className="text-sm leading-6 text-muted-foreground">
        Older income and obligations did not save a currency. Choose the
        currency used when each amount was recorded. This confirms its meaning
        without converting or changing the saved amount. Combined totals stay
        unavailable until these records are confirmed.
      </p>
      {error && (
        <div role="alert" className="text-sm text-destructive">
          {error}{" "}
          <button
            type="button"
            onClick={() => void load()}
            className="min-h-10 underline"
          >
            Refresh review
          </button>
        </div>
      )}
      {loading ? (
        <p role="status" className="text-sm text-muted-foreground">
          Loading records…
        </p>
      ) : !rows.length && !error ? (
        <p className="text-sm text-muted-foreground">
          All saved records have an original currency.
        </p>
      ) : (
        <div className="divide-y">
          {rows.slice(0, visible).map((row) => {
            const key = `${row.kind}:${row.id}`;
            return (
              <div key={key} className="flex flex-wrap items-end gap-4 py-4">
                <div className="min-w-0 flex-1 basis-48">
                  <p className="break-words text-sm font-medium">{row.title}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {row.kind === "INCOME" ? "Expected income" : "Obligation"} ·
                    Recorded amount: {row.amount}
                  </p>
                </div>
                <label className="space-y-2 text-sm">
                  Original currency for {row.title}
                  <select
                    className="block min-h-10 w-full rounded-lg border bg-background px-3"
                    value={choices[key] ?? ""}
                    disabled={!!busy}
                    onChange={(e) =>
                      setChoices((c) => ({ ...c, [key]: e.target.value }))
                    }
                  >
                    <option value="" disabled>
                      Choose original currency
                    </option>
                    {CURRENCIES.map((c) => (
                      <option key={c.code} value={c.code}>
                        {c.code}
                      </option>
                    ))}
                  </select>
                </label>
                <button
                  type="button"
                  disabled={!choices[key] || !!busy}
                  onClick={() => void confirm(row)}
                  className="min-h-10 rounded-lg border px-3 text-sm font-medium disabled:opacity-50"
                >
                  {busy === key ? "Confirming…" : "Confirm original currency"}
                </button>
              </div>
            );
          })}
        </div>
      )}
      {rows.length > visible && (
        <button
          type="button"
          onClick={() => setVisible((n) => n + 25)}
          className="min-h-10 rounded-lg border px-3 text-sm"
        >
          Show more records
        </button>
      )}
    </section>
  );
}
