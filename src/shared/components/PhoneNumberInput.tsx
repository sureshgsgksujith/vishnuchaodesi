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
  const matched = trimmedValue.match(/^(\+\d{1,4})\s*(.*)$/);
  const matchedCode = matched?.[1] || fallbackCode;
  const code = phoneCountryOptions.some((option) => option.code === matchedCode) ? matchedCode : fallbackCode;

  return {
    code,
    number: matched ? matched[2] || "" : trimmedValue,
  };
}
