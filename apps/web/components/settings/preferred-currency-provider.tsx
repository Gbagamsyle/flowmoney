"use client";

import { useAuth } from "@clerk/nextjs";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { CURRENCIES, type CurrencyCode } from "@/lib/currencies";
const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";
export type DisplayEstimates = {
  currency: string;
  estimated: boolean;
  asOf: string | null;
  stale: boolean;
  unverifiedCount: number;
  currentFunds: number;
  amounts: {
    kind: string;
    id: string;
    amount: string;
    currency: string;
    converted: number;
  }[];
};
type CurrencyContextValue = {
  currency: CurrencyCode;
  currencyLoading: boolean;
  currencyError: string;
  display: DisplayEstimates | null;
  displayError: string;
  displayLoading: boolean;
  reloadDisplay: () => Promise<void>;
  reloadCurrency: () => Promise<void>;
  updateCurrency: (next: CurrencyCode) => Promise<void>;
};
const CurrencyContext = createContext<CurrencyContextValue | null>(null);
export function PreferredCurrencyProvider({
  children,
}: {
  children: ReactNode;
}) {
  const { getToken, isLoaded, isSignedIn, userId } = useAuth();
  const [currency, setCurrency] = useState<CurrencyCode>("NGN");
  const [currencyLoading, setCurrencyLoading] = useState(true);
  const [currencyError, setCurrencyError] = useState("");
  const [display, setDisplay] = useState<DisplayEstimates | null>(null);
  const [displayError, setDisplayError] = useState("");
  const [displayLoading, setDisplayLoading] = useState(false);
  const owner = useRef(userId);
  owner.current = userId;
  const requestId = useRef(0);
  const preferenceRequest = useRef(0);
  const reloadDisplay = useCallback(async () => {
    if (!isLoaded || !isSignedIn) return;
    const subject = userId;
    const id = ++requestId.current;
    setDisplayLoading(true);
    try {
      const token = await getToken();
      const res = await fetch(`${API}/currencies/display`, {
        cache: "no-store",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok)
        throw new Error(data.message ?? "Currency estimates are unavailable.");
      if (owner.current === subject && requestId.current === id) {
        setDisplay(data);
        setDisplayError("");
      }
    } catch (e) {
      if (owner.current === subject && requestId.current === id) {
        setDisplay(null);
        setDisplayError(
          e instanceof Error
            ? e.message
            : "Currency estimates are unavailable.",
        );
      }
    } finally {
      if (owner.current === subject && requestId.current === id)
        setDisplayLoading(false);
    }
  }, [getToken, isLoaded, isSignedIn, userId]);
  const reloadCurrency = useCallback(async () => {
    if (!isLoaded || !isSignedIn) {
      setCurrencyLoading(false);
      return;
    }
    const subject = userId;
    const sequence = ++preferenceRequest.current;
    setCurrencyLoading(true);
    setCurrencyError("");
    try {
      const token = await getToken();
      if (!token) throw new Error("Please sign in again.");
      const response = await fetch(`${API}/users/me`, {
        cache: "no-store",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok)
        throw new Error("Could not load your display currency.");
      const user = await response.json();
      if (!CURRENCIES.some((item) => item.code === user.preferredCurrency)) throw new Error("Could not load a supported display currency. Please retry.");
      if (owner.current !== subject || preferenceRequest.current !== sequence)
        return;
      setCurrency(user.preferredCurrency);
      await reloadDisplay();
    } catch (e) {
      if (owner.current === subject && preferenceRequest.current === sequence)
        setCurrencyError(
          e instanceof Error ? e.message : "Could not load currency.",
        );
    } finally {
      if (owner.current === subject && preferenceRequest.current === sequence)
        setCurrencyLoading(false);
    }
  }, [getToken, isLoaded, isSignedIn, userId, reloadDisplay]);
  useEffect(() => {
    setDisplay(null);
    setCurrency("NGN");
    setDisplayError("");
    void reloadCurrency();
  }, [reloadCurrency]);
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const refresh = () => {
      clearTimeout(timer);
      timer = setTimeout(() => void reloadDisplay(), 150);
    };
    window.addEventListener("flowmoney:accounts-changed", refresh);
    window.addEventListener("flowmoney:financial-data-changed", refresh);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("flowmoney:accounts-changed", refresh);
      window.removeEventListener("flowmoney:financial-data-changed", refresh);
    };
  }, [reloadDisplay]);
  const updateCurrency = useCallback(
    async (next: CurrencyCode) => {
      const subject = userId;
      ++preferenceRequest.current;
      const token = await getToken();
      if (!token) throw new Error("Please sign in again.");
      const response = await fetch(`${API}/users/me/currency`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ currency: next }),
      });
      if (!response.ok)
        throw new Error("Could not save your display currency.");
      if (owner.current !== subject) return;
      setDisplay(null);
      setCurrency(next);
      setCurrencyLoading(false);
      setCurrencyError("");
      await reloadDisplay();
      window.dispatchEvent(
        new CustomEvent("flowmoney:currency-changed", { detail: next }),
      );
    },
    [getToken, userId, reloadDisplay],
  );
  return (
    <CurrencyContext.Provider
      value={{
        currency,
        currencyLoading,
        currencyError,
        display,
        displayError,
        displayLoading,
        reloadDisplay,
        reloadCurrency,
        updateCurrency,
      }}
    >
      {children}
    </CurrencyContext.Provider>
  );
}
export function usePreferredCurrency() {
  const context = useContext(CurrencyContext);
  if (!context)
    throw new Error(
      "usePreferredCurrency must be used inside PreferredCurrencyProvider.",
    );
  return context;
}
