export const CURRENCIES = [
  { code: "USD", name: "US Dollar" },
  { code: "GBP", name: "British Pound" },
  { code: "EUR", name: "Euro" },
  { code: "NGN", name: "Nigerian Naira" },
  { code: "CAD", name: "Canadian Dollar" },
  { code: "AUD", name: "Australian Dollar" },
  { code: "GHS", name: "Ghanaian Cedi" },
  { code: "KES", name: "Kenyan Shilling" },
  { code: "ZAR", name: "South African Rand" },
  { code: "TZS", name: "Tanzanian Shilling" },
  { code: "UGX", name: "Ugandan Shilling" },
  { code: "RWF", name: "Rwandan Franc" },
  { code: "XOF", name: "West African CFA Franc" },
  { code: "XAF", name: "Central African CFA Franc" },
  { code: "INR", name: "Indian Rupee" },
  { code: "JPY", name: "Japanese Yen" },
  { code: "CNY", name: "Chinese Yuan" },
  { code: "SGD", name: "Singapore Dollar" },
  { code: "NZD", name: "New Zealand Dollar" },
  { code: "CHF", name: "Swiss Franc" },
  { code: "SEK", name: "Swedish Krona" },
  { code: "NOK", name: "Norwegian Krone" },
  { code: "DKK", name: "Danish Krone" },
  { code: "PLN", name: "Polish Złoty" },
  { code: "BRL", name: "Brazilian Real" },
  { code: "MXN", name: "Mexican Peso" },
  { code: "AED", name: "UAE Dirham" },
  { code: "SAR", name: "Saudi Riyal" },
  { code: "TRY", name: "Turkish Lira" },
  { code: "EGP", name: "Egyptian Pound" },
] as const;

export type CurrencyCode = (typeof CURRENCIES)[number]["code"];

const REGION_CURRENCY: Record<string, CurrencyCode> = {
  AE: "AED", AU: "AUD", BR: "BRL", CA: "CAD", CH: "CHF", CN: "CNY",
  DE: "EUR", DK: "DKK", EG: "EGP", ES: "EUR", FR: "EUR", GB: "GBP",
  GH: "GHS", IE: "EUR", IN: "INR", IT: "EUR", JP: "JPY", KE: "KES",
  MX: "MXN", NG: "NGN", NL: "EUR", NO: "NOK", NZ: "NZD", PL: "PLN",
  PT: "EUR", RW: "RWF", SA: "SAR", SE: "SEK", SG: "SGD", TR: "TRY",
  TZ: "TZS", UG: "UGX", US: "USD", ZA: "ZAR",
};

export function suggestCurrency(locale: string | undefined): CurrencyCode {
  if (!locale) return "USD";

  try {
    const region = new Intl.Locale(locale).region;
    return REGION_CURRENCY[region ?? ""] ?? "USD";
  } catch {
    return "USD";
  }
}
