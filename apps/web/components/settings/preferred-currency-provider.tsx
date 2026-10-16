"use client";

import { useAuth } from "@clerk/nextjs";
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import type { CurrencyCode } from "@/lib/currencies";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

type CurrencyContextValue = {
  currency: CurrencyCode;
  updateCurrency: (nextCurrency: CurrencyCode) => Promise<void>;
};

const CurrencyContext = createContext<CurrencyContextValue | null>(null);

export function PreferredCurrencyProvider({ children }: { children: ReactNode }) {
  const { getToken, isLoaded, isSignedIn } = useAuth();
  const [currency, setCurrency] = useState<CurrencyCode>("NGN");

  useEffect(() => {
    if (!isLoaded || !isSignedIn) return;
    let active = true;

    void (async () => {
      try {
        const token = await getToken();
        if (!token) return;
        const response = await fetch(`${API_BASE_URL}/users/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!response.ok) return;
        const user = (await response.json()) as { preferredCurrency?: CurrencyCode };
        if (active && user.preferredCurrency) setCurrency(user.preferredCurrency);
      } catch {
        // Keep the legacy currency fallback if the preference cannot be loaded.
      }
    })();

    return () => {
      active = false;
    };
  }, [getToken, isLoaded, isSignedIn]);

  const updateCurrency = useCallback(async (nextCurrency: CurrencyCode) => {
    const token = await getToken();
    if (!token) throw new Error("Please sign in again to update your currency.");

    const response = await fetch(`${API_BASE_URL}/users/me/currency`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ currency: nextCurrency }),
    });

    if (!response.ok) throw new Error("Could not save your preferred currency.");
    setCurrency(nextCurrency);
    window.dispatchEvent(new CustomEvent("flowmoney:currency-changed", { detail: nextCurrency }));
  }, [getToken]);

  return <CurrencyContext.Provider value={{ currency, updateCurrency }}>{children}</CurrencyContext.Provider>;
}

export function usePreferredCurrency() {
  const context = useContext(CurrencyContext);
  if (!context) throw new Error("usePreferredCurrency must be used inside PreferredCurrencyProvider.");
  return context;
}
