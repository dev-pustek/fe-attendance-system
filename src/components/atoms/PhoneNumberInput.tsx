import React, { useState, useEffect } from "react";

interface PhoneNumberInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  error?: string;
  className?: string;
  inputClassName?: string;
}

const PhoneNumberInput: React.FC<PhoneNumberInputProps> = ({
  value,
  onChange,
  label,
  error,
  className = "",
  inputClassName = "",
  placeholder = "8xx-xxxx-xxxx",
  required,
  ...props
}) => {
  const [displayValue, setDisplayValue] = useState("");

  // Format value for display (suffix only): 896-0148-9543
  const formatSufix = (val: string) => {
    if (!val) return "";
    
    // Clean non-digits
    let digits = val.replace(/\D/g, "");
    
    // Remove 62 prefix if present
    if (digits.startsWith("62")) {
      digits = digits.substring(2);
    } else if (digits.startsWith("0")) {
      // If user passed in local format 08..., strip 0
       digits = digits.substring(1);
    }

    // Now format the body
    let formatted = "";
    if (digits.length > 0) {
        formatted += digits.substring(0, 3);
    }
    if (digits.length > 3) {
        formatted += "-" + digits.substring(3, 7);
    }
    if (digits.length > 7) {
        formatted += "-" + digits.substring(7);
    }
    
    return formatted;
  };

  // Sync display value when external value changes
  useEffect(() => {
    setDisplayValue(formatSufix(value));
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputVal = e.target.value;
    
    // Extract digits
    let digits = inputVal.replace(/\D/g, "");

    // If starts with 0 or 62, strip it because the user is typing in the suffix box
    // But logically, if they pasted "+62...", we should handle it.
    if (digits.startsWith("62")) {
        digits = digits.substring(2);
    } else if (digits.startsWith("0")) {
        digits = digits.substring(1);
    }
    
    // Update parent with clean format: +62...
    const cleanValue = "+62" + digits;
    onChange(cleanValue);
  };

  return (
    <div className={`space-y-1.5 ${className}`}>
      {label && (
        <label className="mb-1.5 block text-xs font-bold uppercase text-gray-500">
          {label} {required && <span>*</span>}
        </label>
      )}
      <div className="relative flex items-center">
        {/* Prefix Decorator */}
        <div className="absolute left-0 z-10 flex h-full items-center justify-center border-r border-gray-200 bg-gray-50 px-3 text-sm font-semibold text-gray-500 dark:border-white/[0.08] dark:bg-white/5 dark:text-gray-400 rounded-l-xl">
            +62
        </div>
        
        <input
          type="text"
          value={displayValue}
          onChange={handleChange}
          placeholder={placeholder}
          required={required}
          className={`w-full rounded-xl border border-gray-200 bg-white py-2.5 pr-4 pl-[3.5rem] text-sm outline-none transition-all focus:border-brand-500 focus:ring-1 focus:ring-brand-500/10 disabled:bg-gray-50 disabled:text-gray-400 dark:border-white/[0.08] dark:bg-white/[0.03] dark:text-white ${
            error ? "border-error-500 focus:border-error-500" : ""
          } ${inputClassName}`}
          {...props}
        />
      </div>
      {error && <p className="text-xs text-error-500">{error}</p>}
    </div>
  );
};

export default PhoneNumberInput;
