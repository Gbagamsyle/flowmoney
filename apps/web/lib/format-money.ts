export function formatMoney(
  value: number,
  currency = "NGN",
  locale?: string,
  fractionDigits?: number,
) {
  const isoDigits = new Intl.NumberFormat("en", {
    style: "currency",
    currency,
  }).resolvedOptions().maximumFractionDigits!;
  const digits =
    fractionDigits === undefined
      ? isoDigits
      : Math.min(fractionDigits, isoDigits);
  return new Intl.NumberFormat(locale ?? "en-NG", {
    style: "currency",
    currency,
    currencyDisplay: "narrowSymbol",
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(value);
}
