export type PostingFieldKind = "text" | "number" | "date" | "time" | "checkbox" | "textarea" | "file" | "dropdown";

type PostingFieldDescriptor = {
  key: string;
  label: string;
  type?: PostingFieldKind | string;
};

export type PostingInputKind = "text" | "number" | "email" | "tel" | "url" | "date" | "time";

export function getPostingInputKind(field: PostingFieldDescriptor): PostingInputKind {
  const fieldType = field.type?.toLowerCase();
  if (fieldType === "number" || fieldType === "date" || fieldType === "time") {
    return fieldType;
  }

  const identity = `${field.key} ${field.label}`.toLowerCase();
  if (/\b(e[-_ ]?mail|email)\b/.test(identity)) return "email";
  if (/\b(phone|mobile|telephone|whatsapp|contact[_ -]?number)\b/.test(identity)) return "tel";
  if (/\b(website|web[_ -]?site|url|link)\b/.test(identity)) return "url";
  return "text";
}

export function sanitizePostingFieldValue(field: PostingFieldDescriptor, value: string) {
  const kind = getPostingInputKind(field);

  if (kind === "number") {
    return sanitizeDecimal(value);
  }

  if (kind === "tel") {
    const hasLeadingPlus = value.trimStart().startsWith("+");
    const digits = value.replace(/\D/g, "").slice(0, 15);
    return `${hasLeadingPlus ? "+" : ""}${digits}`;
  }

  return value;
}

export function getPostingFieldValidationError(field: PostingFieldDescriptor, value?: string) {
  const normalizedValue = String(value ?? "").trim();
  if (!normalizedValue) return "";

  switch (getPostingInputKind(field)) {
    case "number":
      return /^-?(?:\d+|\d*\.\d+)$/.test(normalizedValue)
        ? ""
        : `${field.label} must contain numbers only.`;
    case "email":
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedValue)
        ? ""
        : `${field.label} must be a valid email address.`;
    case "tel": {
      const digits = normalizedValue.replace(/\D/g, "");
      return digits.length >= 7 && digits.length <= 15
        ? ""
        : `${field.label} must contain 7 to 15 digits.`;
    }
    case "url": {
      try {
        const candidate = /^[a-z][a-z\d+.-]*:\/\//i.test(normalizedValue)
          ? normalizedValue
          : `https://${normalizedValue}`;
        const url = new URL(candidate);
        return url.hostname.includes(".") ? "" : `${field.label} must be a valid website URL.`;
      } catch {
        return `${field.label} must be a valid website URL.`;
      }
    }
    case "date":
      return /^\d{4}-\d{2}-\d{2}$/.test(normalizedValue)
        ? ""
        : `${field.label} must be a valid date.`;
    case "time":
      return /^([01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/.test(normalizedValue)
        ? ""
        : `${field.label} must be a valid time.`;
    default:
      return "";
  }
}

function sanitizeDecimal(value: string) {
  const isNegative = value.trimStart().startsWith("-");
  const unsigned = value.replace(/[^\d.]/g, "");
  const decimalIndex = unsigned.indexOf(".");
  const normalized = decimalIndex < 0
    ? unsigned
    : `${unsigned.slice(0, decimalIndex + 1)}${unsigned.slice(decimalIndex + 1).replace(/\./g, "")}`;
  return `${isNegative ? "-" : ""}${normalized}`;
}
