const defaultCurrencyCode = "USD";

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

export function getCurrencyCodeForCountry(country?: string | null) {
  void country;
  return defaultCurrencyCode;
}

export function getCurrencySymbolForCountry(country?: string | null) {
  void country;
  return currencySymbols[defaultCurrencyCode];
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
  void country;
  const currencyCode = defaultCurrencyCode;
  const requiredSuffix = label.endsWith("*") ? "*" : "";
  const baseLabel = label
    .replace(/\*$/, "")
    .replace(/\s*\((USD|INR|EUR|GBP|CAD|AUD|JPY|CNY|SGD|AED|[$₹€£¥]|A\$|C\$|S\$)\)\s*$/i, "")
    .trim();

  if (!isAmountLabel(baseLabel)) {
    return label;
  }

  return `${baseLabel} (${currencyCode})${requiredSuffix}`;
}

function isAmountLabel(label: string) {
  const normalized = label.toLowerCase();

  if (/\b(type|negotiable|label)\b/.test(normalized)) {
    return false;
  }

  return /\b(price|cost|rent|salary|fee|deposit|charge|value|amount)\b/.test(normalized);
}
