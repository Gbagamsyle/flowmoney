"use client";

import { useState, type KeyboardEvent } from "react";
import { ArrowUpRight, Delete, History, Calculator } from "lucide-react";
import { usePreferredCurrency } from "@/components/settings/preferred-currency-provider";
import { formatMoney } from "@/lib/format-money";
import { calculate } from "@/lib/calculator";

const keys = [
  ["AC", "Clear calculation"],
  ["⌫", "Delete last character"],
  ["%", "Percent"],
  ["÷", "Divide"],
  ["7", "7"],
  ["8", "8"],
  ["9", "9"],
  ["×", "Multiply"],
  ["4", "4"],
  ["5", "5"],
  ["6", "6"],
  ["−", "Subtract"],
  ["1", "1"],
  ["2", "2"],
  ["3", "3"],
  ["+", "Add"],
  ["( )", "Insert brackets"],
  ["0", "0"],
  [".", "Decimal point"],
  ["=", "Calculate result"],
];
type Calculation = { expression: string; result: string; currency: string };

export default function CalculatorPage() {
  const { currency } = usePreferredCurrency();
  const [expression, setExpression] = useState("");
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [history, setHistory] = useState<Calculation[]>([]);
  const [finished, setFinished] = useState(false);
  function evaluate() {
    try {
      const answer = calculate(expression);
      setResult(answer);
      setError("");
      setFinished(true);
      setHistory((current) =>
        [{ expression, result: answer, currency }, ...current].slice(0, 10),
      );
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Check your calculation.",
      );
      setResult(null);
    }
  }
  function press(key: string) {
    setError("");
    if (key === "=") {
      evaluate();
      return;
    }
    if (key === "AC") {
      setExpression("");
      setResult(null);
      setFinished(false);
      return;
    }
    setExpression((current) => {
      if (key === "⌫") return current.slice(0, -1);
      if (key === "( )") {
        const opened = (current.match(/\(/g) ?? []).length;
        const closed = (current.match(/\)/g) ?? []).length;
        return (
          (finished ? "" : current) +
          (!finished && opened > closed && /[\d)%]$/.test(current) ? ")" : "(")
        );
      }
      const isOperator = ["+", "−", "×", "÷", "%"].includes(key);
      return (
        (finished ? (isOperator ? (result ?? current) : "") : current) + key
      ).slice(0, 200);
    });
    setResult(null);
    setFinished(false);
  }
  function keyboard(event: KeyboardEvent<HTMLDivElement>) {
    if (event.ctrlKey || event.metaKey || event.altKey) return;
    if (event.key === "Escape") {
      event.preventDefault();
      press("AC");
      return;
    }
    if (event.target instanceof HTMLInputElement) {
      if (event.key === "Enter" || event.key === "=") {
        event.preventDefault();
        evaluate();
      }
      return;
    }
    const mapped =
      (
        { Enter: "=", Backspace: "⌫", "*": "×", "/": "÷", "-": "−" } as Record<
          string,
          string
        >
      )[event.key] ?? event.key;
    if (/^[0-9.+%()=]$/.test(mapped) || ["×", "÷", "−", "⌫"].includes(mapped)) {
      event.preventDefault();
      press(mapped);
    }
  }
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Calculator</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          A little room to work the numbers out.
        </p>
      </div>
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
        <section
          aria-label="FlowMoney calculator"
          onKeyDown={keyboard}
          tabIndex={0}
          className="overflow-hidden rounded-2xl border bg-card shadow-sm focus-visible:outline focus-visible:outline-ring"
        >
          <div className="flex items-center justify-between border-b px-5 py-4">
            <span className="flex items-center gap-2 text-sm font-medium">
              <Calculator className="size-4" />
              FlowMoney
            </span>
            <span className="rounded-md border px-2 py-1 text-xs text-muted-foreground">
              {currency}
            </span>
          </div>
          <div className="space-y-3 px-5 pb-6 pt-8 sm:px-6">
            <label
              htmlFor="calculation"
              className="text-xs text-muted-foreground"
            >
              Your calculation
            </label>
            <input
              id="calculation"
              autoComplete="off"
              spellCheck={false}
              maxLength={200}
              placeholder="0"
              value={expression}
              onChange={(event) => {
                setExpression(event.target.value);
                setResult(null);
                setError("");
                setFinished(false);
              }}
              className="w-full min-w-0 rounded-lg border-0 bg-transparent py-2 text-right text-3xl font-medium tabular-nums outline-none focus-visible:ring-2 focus-visible:ring-ring sm:text-4xl"
              aria-describedby="calculator-help"
            />
            <div
              className="min-h-16 border-t pt-4 text-right"
              aria-live="polite"
              aria-atomic="true"
            >
              {error ? (
                <p role="alert" className="text-sm">
                  {error}
                </p>
              ) : result !== null ? (
                <>
                  <p className="break-all text-2xl font-semibold tabular-nums">
                    {formatMoney(Number(result), currency, undefined, 2)}
                  </p>
                  <p className="mt-1 break-all text-xs text-muted-foreground">
                    = {result}
                  </p>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Ready when you are
                </p>
              )}
            </div>
          </div>
          <div className="grid grid-cols-4 gap-2 border-t bg-muted/20 p-3 sm:gap-3 sm:p-4">
            {keys.map(([key, label]) => (
              <button
                type="button"
                key={key}
                aria-label={label}
                onClick={() => press(key)}
                className={
                  "flex h-14 items-center justify-center rounded-xl text-xl font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring active:scale-[0.97] sm:h-16 " +
                  (key === "="
                    ? "bg-primary text-primary-foreground hover:bg-primary/90"
                    : /^[0-9.]$/.test(key)
                      ? "border bg-background hover:bg-muted"
                      : "bg-muted text-foreground hover:bg-accent")
                }
              >
                {key === "⌫" ? <Delete className="size-5" /> : key}
              </button>
            ))}
          </div>
          <p
            id="calculator-help"
            className="px-5 py-4 text-xs leading-relaxed text-muted-foreground"
          >
            Use your keyboard or the keypad. Enter calculates; Esc clears. %
            divides a number by 100. Results show up to 12 decimal places, with
            money rounded to 2.
          </p>
        </section>
        <div className="space-y-5">
          <section className="rounded-xl border bg-card p-5">
            <div className="flex items-center justify-between gap-3">
              <h2 className="flex items-center gap-2 font-medium">
                <History className="size-4" />
                Recent calculations
              </h2>
              {!!history.length && (
                <button
                  type="button"
                  onClick={() => setHistory([])}
                  className="text-xs text-muted-foreground underline"
                >
                  Clear history
                </button>
              )}
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              This session only. Select a result to use it again.
            </p>
            {!history.length ? (
              <p className="py-10 text-center text-sm text-muted-foreground">
                Your working starts here.
              </p>
            ) : (
              <div className="mt-4 space-y-1">
                {history.map((entry, index) => (
                  <button
                    type="button"
                    key={index}
                    onClick={() => {
                      setExpression(entry.result);
                      setResult(null);
                      setError("");
                      setFinished(false);
                    }}
                    className="flex w-full items-center justify-between gap-3 rounded-lg px-2 py-3 text-left hover:bg-muted focus-visible:outline focus-visible:outline-ring"
                  >
                    <span className="min-w-0">
                      <span className="block break-all text-xs text-muted-foreground">
                        {entry.expression}
                      </span>
                      <span className="mt-1 block break-all text-sm font-medium tabular-nums">
                        {formatMoney(
                          Number(entry.result),
                          entry.currency,
                          undefined,
                          2,
                        )}
                      </span>
                    </span>
                    <ArrowUpRight className="size-4 shrink-0 text-muted-foreground" />
                  </button>
                ))}
              </div>
            )}
          </section>
          <section className="rounded-xl border bg-card p-5">
            <h2 className="font-medium">Everyday number checks</h2>
            <div className="mt-4 space-y-4 text-sm">
              <div>
                <p className="font-medium">Find a percentage</p>
                <p className="mt-1 text-muted-foreground">
                  15% of 20,000 → 20000 × 15%
                </p>
              </div>
              <div>
                <p className="font-medium">Split a bill</p>
                <p className="mt-1 text-muted-foreground">
                  Share 30,000 between 4 → 30000 ÷ 4
                </p>
              </div>
              <div>
                <p className="font-medium">Take off a discount</p>
                <p className="mt-1 text-muted-foreground">
                  20,000 less 10% → 20000 × (1 − 10%)
                </p>
              </div>
            </div>
            <p className="mt-5 border-t pt-4 text-xs leading-relaxed text-muted-foreground">
              Calculations stay on this page. Your balances, statements and
              plans stay unchanged. Currency labels follow your preference; no
              conversion is performed.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
