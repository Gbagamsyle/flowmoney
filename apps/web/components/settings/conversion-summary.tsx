"use client";
import { useAuth } from "@clerk/nextjs";
import { useEffect, useState } from "react";
import { usePreferredCurrency } from "./preferred-currency-provider";
import { formatMoney } from "@/lib/format-money";
const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";
type Summary = {
  source: string;
  currency: string;
  estimated: boolean;
  asOf: string | null;
  stale: boolean;
  values: { label: string; amount: number }[];
};
export function ConversionSummary({
  kind,
  id,
  source,
  revision,
}: {
  kind: "plan" | "statement";
  id: string | null;
  source: string;
  revision?: string | number;
}) {
  const { getToken } = useAuth();
  const { currency } = usePreferredCurrency();
  const [summary, setSummary] = useState<Summary | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    setSummary(null);
    setError("");
    if (!id || source === currency) return;
    let active = true;
    void (async () => {
      try {
        const token = await getToken();
        const res = await fetch(`${API}/currencies/summary/${kind}/${id}`, {
          cache: "no-store",
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message ?? "Conversion unavailable.");
        if (active) setSummary(data);
      } catch (e) {
        if (active)
          setError(e instanceof Error ? e.message : "Conversion unavailable.");
      }
    })();
    return () => {
      active = false;
    };
  }, [currency, getToken, id, kind, source, revision]);
  if (!id || source === currency) return null;
  return (
    <aside
      aria-label="Converted summary"
      className="space-y-3 rounded-lg border bg-muted/20 p-4"
    >
      <p className="text-sm font-medium">Estimated summary in {currency}</p>
      <p className="text-xs leading-5 text-muted-foreground">
        {kind === "plan"
          ? "This plan and its edit amounts stay"
          : "Statement transactions and analysis stay"}{" "}
        in {source}. These are current-rate estimates, not historical exchange
        values or bank quotes.
      </p>
      {error ? (
        <p role="status" className="text-xs text-muted-foreground">
          {error} Original values remain available below.
        </p>
      ) : summary?.currency === currency ? (
        <>
          <div className="flex flex-wrap gap-x-8 gap-y-3">
            {summary.values.map((v) => (
              <div key={v.label}>
                <p className="text-xs text-muted-foreground">{v.label}</p>
                <p className="mt-1 text-sm font-medium tabular-nums">
                  ≈ {formatMoney(v.amount, currency, undefined, 2)}
                </p>
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">
            {summary.stale ? "Cached rates · " : ""}Updated{" "}
            {summary.asOf ? new Date(summary.asOf).toLocaleString() : "—"} ·{" "}
            <a
              href="https://www.exchangerate-api.com"
              target="_blank"
              rel="noreferrer"
              className="underline"
            >
              Rates By Exchange Rate API
            </a>
          </p>
        </>
      ) : (
        <p role="status" className="text-xs text-muted-foreground">
          Loading conversion…
        </p>
      )}
    </aside>
  );
}
