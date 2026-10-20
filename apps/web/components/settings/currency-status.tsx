"use client";
import Link from "next/link";
import { usePreferredCurrency } from "./preferred-currency-provider";
import { formatMoney } from "@/lib/format-money";
export function CurrencyStatus() {
  const { currency, display, displayError, displayLoading, reloadDisplay } =
    usePreferredCurrency();
  const current = display?.currency === currency ? display : null;
  if (!displayError && !current?.estimated && !current?.unverifiedCount)
    return null;
  return (
    <aside
      aria-label="Currency information"
      className="mb-6 space-y-2 rounded-lg border bg-muted/30 p-3 text-xs leading-5 text-muted-foreground"
    >
      {current?.estimated && (
        <p>
          {current.stale ? "Cached rates · " : "Estimated conversion · "}
          {currency} · Updated{" "}
          {current.asOf ? new Date(current.asOf).toLocaleString() : "—"}.{" "}
          <a
            href="https://www.exchangerate-api.com"
            target="_blank"
            rel="noreferrer"
            className="underline underline-offset-2"
          >
            Rates By Exchange Rate API
          </a>
          . Reference estimates, not bank exchange quotes.
        </p>
      )}
      {!!current?.unverifiedCount && (
        <p>
          {current.unverifiedCount} older records need their original currency
          confirmed.{" "}
          <Link
            href="/settings#currency-review"
            className="font-medium text-foreground underline"
          >
            Review currencies in Settings
          </Link>
          .
        </p>
      )}
      {displayError && (
        <p role="status">
          {displayError} Original amounts are unchanged.{" "}
          <button
            type="button"
            disabled={displayLoading}
            onClick={() => void reloadDisplay()}
            className="min-h-8 font-medium text-foreground underline disabled:opacity-50"
          >
            {displayLoading ? "Retrying…" : "Retry conversion"}
          </button>
        </p>
      )}
    </aside>
  );
}
export function MoneyAmount({
  kind,
  id,
  value,
  source,
}: {
  kind: string;
  id: string;
  value: number | string;
  source: string | null | undefined;
}) {
  const { currency, display } = usePreferredCurrency();
  if (!source)
    return (
      <span>
        {String(value)}{" "}
        <span className="text-xs font-normal text-muted-foreground">
          · Confirm currency in Settings
        </span>
      </span>
    );
  if (source === currency)
    return <span>{formatMoney(Number(value), source, undefined, 2)}</span>;
  const estimate =
    display?.currency === currency
      ? display.amounts.find(
          (r) =>
            r.kind === kind &&
            r.id === id &&
            r.currency === source &&
            Number(r.amount) === Number(value),
        )
      : null;
  return (
    <span className="inline-flex flex-col gap-1">
      {estimate ? (
        <span>≈ {formatMoney(estimate.converted, currency, undefined, 2)}</span>
      ) : (
        <span>{formatMoney(Number(value), source, undefined, 2)}</span>
      )}
      <span className="text-xs font-normal text-muted-foreground">
        {estimate
          ? `${formatMoney(Number(value), source, undefined, 2)} original`
          : `Conversion to ${currency} unavailable`}
      </span>
    </span>
  );
}
