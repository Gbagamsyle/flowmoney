export function formatMoney(
  value: number,
  currency = "NGN",
  locale?: string,
  fractionDigits = 0,
) {
  return new Intl.NumberFormat(locale ?? "en-NG", {
    style: "currency",
    currency,
    currencyDisplay: "narrowSymbol",
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(value);
}
