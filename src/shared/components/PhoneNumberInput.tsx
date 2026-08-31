import "./PhoneNumberInput.css";

export const phoneCountryOptions = [
  { code: "+1", label: "+1 US" },
  { code: "+91", label: "+91 IN" },
  { code: "+44", label: "+44 UK" },
  { code: "+61", label: "+61 AU" },
  { code: "+971", label: "+971 AE" },
  { code: "+65", label: "+65 SG" },
  { code: "+60", label: "+60 MY" },
  { code: "+974", label: "+974 QA" },
  { code: "+966", label: "+966 SA" },
  { code: "+49", label: "+49 DE" },
];

type PhoneNumberInputProps = {
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  disabled?: boolean;
  readOnly?: boolean;
  placeholder?: string;
  className?: string;
  selectClassName?: string;
  inputClassName?: string;
  name?: string;
};

export default function PhoneNumberInput({
  value,
  onChange,
  required = false,
  disabled = false,
  readOnly = false,
  placeholder = "Phone number",
  className = "",
  selectClassName = "form-control",
  inputClassName = "form-control",
  name,
}: PhoneNumberInputProps) {
  const { code, number } = splitPhoneValue(value);
  const fullValue = `${code} ${number}`.trim();

  const updateValue = (nextCode: string, nextNumber: string) => {
    onChange(`${nextCode} ${nextNumber}`.trim());
  };

  return (
    <div className={`phone-number-input ${className}`.trim()}>
      {name ? <input type="hidden" name={name} value={fullValue} /> : null}
      <select
        className={selectClassName}
        value={code}
        disabled={disabled || readOnly}
        onChange={(event) => updateValue(event.target.value, number)}
        aria-label="Country code"
      >
        {phoneCountryOptions.map((option) => (
          <option key={option.code} value={option.code}>{option.label}</option>
        ))}
      </select>
      <input
        className={inputClassName}
        type="tel"
        value={number}
        placeholder={placeholder}
        required={required}
        disabled={disabled}
        readOnly={readOnly}
        inputMode="tel"
        autoComplete="tel-national"
        onChange={(event) => updateValue(code, event.target.value)}
      />
    </div>
  );
}

export function splitPhoneValue(value: string, fallbackCode = "+1") {
  const trimmedValue = value.trim();
  const matchedCode = phoneCountryOptions
    .map((option) => option.code)
    .sort((left, right) => right.length - left.length)
    .find((countryCode) => trimmedValue.startsWith(countryCode));
  const code = matchedCode || fallbackCode;
  const number = matchedCode
    ? trimmedValue.slice(matchedCode.length).trimStart()
    : trimmedValue.replace(/^\+\d{1,4}\s*/, "");

  return {
    code,
    number,
  };
}

const phoneRules: Record<string, { pattern: RegExp; example: string }> = {
  "+1": { pattern: /^[2-9]\d{2}[2-9]\d{6}$/, example: "10 digits, for example 2125550123" },
  "+91": { pattern: /^[6-9]\d{9}$/, example: "10 digits starting with 6, 7, 8, or 9" },
  "+44": { pattern: /^\d{10}$/, example: "10 digits without the leading 0" },
  "+61": { pattern: /^[23478]\d{8}$/, example: "9 digits without the leading 0" },
  "+971": { pattern: /^[2-9]\d{8}$/, example: "9 digits without the leading 0" },
  "+65": { pattern: /^[3689]\d{7}$/, example: "8 digits" },
  "+60": { pattern: /^\d{8,10}$/, example: "8 to 10 digits without the leading 0" },
  "+974": { pattern: /^[3-7]\d{7}$/, example: "8 digits" },
  "+966": { pattern: /^[1-9]\d{8}$/, example: "9 digits without the leading 0" },
  "+49": { pattern: /^\d{7,12}$/, example: "7 to 12 digits without the leading 0" },
};

export function getPhoneNumberValidationError(value: string) {
  const { code, number } = splitPhoneValue(value);
  const digits = number.replace(/[\s().-]/g, "");

  if (!digits) {
    return "Phone Number is required.";
  }

  if (!/^\d+$/.test(digits)) {
    return "Phone Number can contain digits, spaces, parentheses, and hyphens only.";
  }

  const rule = phoneRules[code];
  return rule && !rule.pattern.test(digits)
    ? `Enter a valid ${code} phone number (${rule.example}).`
    : "";
}
