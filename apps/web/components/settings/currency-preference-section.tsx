"use client";

import { useEffect, useState } from "react";
import { Button } from "@flowmoney/ui/components/button";
import { CURRENCIES, type CurrencyCode } from "@/lib/currencies";
import { usePreferredCurrency } from "@/components/settings/preferred-currency-provider";

export function CurrencyPreferenceSection() {
  const {
    currency,
    currencyLoading,
    currencyError,
    reloadCurrency,
    updateCurrency,
  } = usePreferredCurrency();
  const [selection, setSelection] = useState<CurrencyCode>(currency);
  const [saving, setSaving] = useState(false);
  const [reviewing, setReviewing] = useState(false);
  const [acknowledged, setAcknowledged] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    setSelection(currency);
    setReviewing(false);
    setAcknowledged(false);
  }, [currency]);

  const save = async () => {
    if (
      !reviewing ||
      !acknowledged ||
      saving ||
      currencyLoading ||
      currencyError ||
      selection === currency
    )
      return;
    setSaving(true);
    setMessage("");
    setError("");
    try {
      await updateCurrency(selection);
      setMessage("Your display currency has been updated.");
      setReviewing(false);
      setAcknowledged(false);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Could not save your currency preference.",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <section
      className="space-y-4 rounded-xl border bg-card p-5 sm:p-6"
      aria-labelledby="currency-preference-title"
    >
      <div className="space-y-2">
        <h2 id="currency-preference-title" className="text-lg font-semibold">
          Display currency
        </h2>
        <p className="text-sm leading-6 text-muted-foreground">
          Shows supported amounts in your chosen currency using exchange-rate estimates. Original currencies and saved values stay unchanged. New entries start with this currency; you can choose another when adding them.
        </p>
      </div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="flex-1 space-y-2 text-sm font-medium">
          <label htmlFor="settings-currency">Currency</label>
          <select
            id="settings-currency"
            className="w-full rounded-lg border bg-background px-3 py-2.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            value={selection}
            disabled={currencyLoading || saving || !!currencyError}
            onChange={(event) => {
              setSelection(event.target.value as CurrencyCode);
              setReviewing(false);
              setAcknowledged(false);
              setMessage("");
              setError("");
            }}
          >
            {CURRENCIES.map((item) => (
              <option key={item.code} value={item.code}>
                {item.name} ({item.code})
              </option>
            ))}
          </select>
        </div>
        <Button
          type="button"
          variant="outline"
          className="min-h-11 px-5"
          onClick={() => {
            setReviewing(true);
            setAcknowledged(false);
            setError("");
          }}
          disabled={
            saving ||
            currencyLoading ||
            !!currencyError ||
            selection === currency ||
            reviewing
          }
        >
          Review change
        </Button>
      </div>
      {reviewing && selection !== currency && (
        <fieldset
          className="space-y-4 rounded-lg border bg-muted/30 p-4"
          disabled={saving}
        >
          <legend className="px-1 text-sm font-medium">
            Change {currency} to {selection}?
          </legend>
          <p className="text-sm leading-6 text-muted-foreground">
            Saved amounts keep their original currency. FlowMoney converts supported totals for display using the latest available daily rates. Statements and saved plans keep their original values, with estimates shown separately. Rates can differ from bank quotes.
          </p>
          <label className="flex items-start gap-3 text-sm leading-6">
            <input
              type="checkbox"
              checked={acknowledged}
              onChange={(event) => setAcknowledged(event.target.checked)}
              className="mt-1 size-4 shrink-0 accent-foreground"
            />
            I understand that conversions are estimates and original records stay unchanged.
          </label>
          <div className="flex flex-wrap gap-3">
            <Button
              type="button"
              onClick={() => void save()}
              disabled={
                !acknowledged || saving || currencyLoading || !!currencyError
              }
            >
              {saving ? "Saving…" : "Confirm currency change"}
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={saving}
              onClick={() => {
                setReviewing(false);
                setAcknowledged(false);
                setSelection(currency);
                setError("");
              }}
            >
              Cancel
            </Button>
          </div>
        </fieldset>
      )}
      {currencyLoading && (
        <p className="text-sm text-muted-foreground" role="status">
          Loading your saved currency preference…
        </p>
      )}
      {currencyError && (
        <div className="flex flex-wrap items-center gap-3" role="alert">
          <p className="text-sm text-destructive">{currencyError}</p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => void reloadCurrency()}
            disabled={currencyLoading}
          >
            Retry
          </Button>
        </div>
      )}
      {message && (
        <p className="text-sm" role="status">
          {message}
        </p>
      )}
      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}
    </section>
  );
}
