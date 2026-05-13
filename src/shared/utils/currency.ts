const defaultCountry = "United States";
const defaultCurrencyCode = "USD";

const countryCurrencyCodes: Record<string, string> = {
  australia: "AUD",
  au: "AUD",
  canada: "CAD",
  ca: "CAD",
  china: "CNY",
  cn: "CNY",
  england: "GBP",
  france: "EUR",
  germany: "EUR",
  gb: "GBP",
  india: "INR",
  in: "INR",
  ireland: "EUR",
  italy: "EUR",
  japan: "JPY",
  jp: "JPY",
  netherlands: "EUR",
  singapore: "SGD",
  sg: "SGD",
  spain: "EUR",
  uae: "AED",
  "united arab emirates": "AED",
  "united kingdom": "GBP",
  uk: "GBP",
  "united states": "USD",
  "united states of america": "USD",
  us: "USD",
  usa: "USD",
};

const currencySymbols: Record<string, string> = {
  AED: "AED",
  AUD: "A$",
  CAD: "C$",
  CNY: "¥",
  EUR: "€",
  GBP: "£",
  INR: "₹",
  JPY: "¥",
  SGD: "S$",
  USD: "$",
};

function normalizeCountry(country?: string | null) {
  return country?.trim().toLowerCase() || defaultCountry.toLowerCase();
}

export function getCurrencyCodeForCountry(country?: string | null) {
  return countryCurrencyCodes[normalizeCountry(country)] || defaultCurrencyCode;
}

export function getCurrencySymbolForCountry(country?: string | null) {
  return currencySymbols[getCurrencyCodeForCountry(country)] || currencySymbols[defaultCurrencyCode];
}

export function formatCurrencyAmount(value: number | string, country?: string | null) {
  const amount = typeof value === "number" ? value : Number(String(value).replace(/,/g, ""));

  if (!Number.isFinite(amount)) {
    return `${getCurrencySymbolForCountry(country)}${value}`;
  }

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: getCurrencyCodeForCountry(country),
    maximumFractionDigits: Number.isInteger(amount) ? 0 : 2,
  }).format(amount);
}

export function replaceDollarCurrency(value: string, country?: string | null) {
  return value.replace(/\$/g, getCurrencySymbolForCountry(country));
}

export function labelWithCountryCurrency(label: string, country?: string | null) {
  const symbol = getCurrencySymbolForCountry(country);
  const requiredSuffix = label.endsWith("*") ? "*" : "";
  const baseLabel = label
    .replace(/\*$/, "")
    .replace(/\s*\((USD|INR|EUR|GBP|CAD|AUD|JPY|CNY|SGD|AED|[$₹€£¥]|A\$|C\$|S\$)\)\s*$/i, "")
    .trim();

  if (!isAmountLabel(baseLabel)) {
    return label;
  }

  return `${baseLabel} (${symbol})${requiredSuffix}`;
}

function isAmountLabel(label: string) {
  const normalized = label.toLowerCase();

  if (/\b(type|negotiable|label)\b/.test(normalized)) {
    return false;
  }

  return /\b(price|cost|rent|salary|fee|deposit|charge|value|amount)\b/.test(normalized);
}
