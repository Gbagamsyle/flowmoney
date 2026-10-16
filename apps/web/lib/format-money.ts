export function formatMoney(value: number, currency = "NGN", locale?: string) {
  return new Intl.NumberFormat(locale ?? "en-NG", {
    style: "currency",
    currency,
    currencyDisplay: "narrowSymbol",
    maximumFractionDigits: 0,
  }).format(value);
}