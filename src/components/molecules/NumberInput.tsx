import React, { useState, useEffect } from "react";
import Label from "../atoms/Label";

interface NumberInputProps {
  label: string;
  value: number | null | undefined;
  onChange: (value: number) => void;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  id?: string;
  labelClassName?: string;
}

const NumberInput: React.FC<NumberInputProps> = ({
  label,
  value,
  onChange,
  placeholder,
  required,
  disabled,
  className = "",
  labelClassName = "",
  id,
}) => {
  const [displayValue, setDisplayValue] = useState("");

  const formatNumber = (val: number | null | undefined) => {
    if (val === undefined || val === null || isNaN(val)) return "";
    return new Intl.NumberFormat("id-ID").format(val);
  };

  useEffect(() => {
    setDisplayValue(formatNumber(value));
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value.replace(/\./g, "");
    if (rawValue === "") {
      setDisplayValue("");
      onChange(0);
      return;
    }

    const numericValue = parseInt(rawValue, 10);
    if (!isNaN(numericValue)) {
      setDisplayValue(formatNumber(numericValue));
      onChange(numericValue);
    }
  };

  return (
    <div className={`space-y-1.5 ${className}`}>
      <Label htmlFor={id} className={labelClassName}>
        {label} {required && <span className="text-error-500">*</span>}
      </Label>
      <input
        id={id}
        type="text"
        value={displayValue}
        onChange={handleChange}
        placeholder={placeholder}
        disabled={disabled}
        required={required}
        className="w-full h-11 rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm outline-none transition-all focus:border-brand-500 focus:ring-3 focus:ring-brand-500/20 dark:border-gray-700 dark:text-white/90"
      />
    </div>
  );
};

export default NumberInput;
