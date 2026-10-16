"use client";

import { useEffect, useState } from "react";
import { Button } from "@flowmoney/ui/components/button";
import { CURRENCIES, type CurrencyCode } from "@/lib/currencies";
import { usePreferredCurrency } from "@/components/settings/preferred-currency-provider";

export function CurrencyPreferenceSection() {
  const { currency, currencyLoading, currencyError, reloadCurrency, updateCurrency } = usePreferredCurrency();
  const [selection, setSelection] = useState<CurrencyCode>(currency);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => setSelection(currency), [currency]);

  const save = async () => {
    setSaving(true);
    setMessage("");
    setError("");
    try {
      await updateCurrency(selection);
      setMessage("Your preferred currency has been updated.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not save your currency preference.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="space-y-4 rounded-2xl border bg-card p-5 sm:p-6" aria-labelledby="currency-preference-title">
      <div className="space-y-2">
        <h2 id="currency-preference-title" className="text-lg font-semibold">Primary currency</h2>
        <p className="text-sm leading-6 text-muted-foreground">
          This is the default currency label for your FlowMoney amounts. Changing it does not convert any saved values; it changes the currency those numbers are interpreted and displayed in.
        </p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <label className="flex-1 space-y-2 text-sm font-medium" htmlFor="settings-currency">
          Currency
          <select
            id="settings-currency"
            className="w-full rounded-lg border bg-background px-3 py-2.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            value={selection}
            disabled={currencyLoading || saving}
            onChange={(event) => setSelection(event.target.value as CurrencyCode)}
          >
            {CURRENCIES.map((item) => <option key={item.code} value={item.code}>{item.name} ({item.code})</option>)}
          </select>
        </label>
        <Button type="button" className="px-5" style={{ height: 42, minHeight: 42 }} onClick={() => void save()} disabled={saving || currencyLoading || selection === currency}>
          {saving ? "Saving…" : "Save currency"}
        </Button>
      </div>

      {currencyLoading && <p className="text-sm text-muted-foreground" role="status">Loading your saved currency preference…</p>}
      {currencyError && <div className="flex flex-wrap items-center gap-3" role="alert"><p className="text-sm text-destructive">{currencyError}</p><Button type="button" variant="outline" size="sm" onClick={() => void reloadCurrency()} disabled={currencyLoading}>Retry</Button></div>}
      {message && <p className="text-sm text-emerald-700 dark:text-emerald-400" role="status">{message}</p>}
      {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
    </section>
  );
}
