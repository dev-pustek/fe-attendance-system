interface NumberInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  value: string | number;
  onChange: (value: string) => void;
  label?: string;
  labelClassName?: string;
  error?: string;
  className?: string; // Additional classes for the container
  inputClassName?: string; // Additional classes for the input
}

const NumberInput: React.FC<NumberInputProps> = ({
  value,
  onChange,
  label,
  labelClassName = "",
  error,
  className = "",
  inputClassName = "",
  placeholder,
  required,
  ...props
}) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    // Regex for integer or float: allows digits, one optional decimal point, and digits after it.
    // Also allows empty string.
    if (/^\d*\.?\d*$/.test(val)) {
        onChange(val);
    }
  };

  return (
    <div className={`space-y-1.5 ${className}`}>
      {label && (
        <label className={labelClassName || "text-sm font-medium text-gray-700 dark:text-gray-300"}>
          {label} {required && <span className="text-error-500">*</span>}
        </label>
      )}
      <div className="relative">
        <input
          type="text" // Keep as text to strictly control regex, but allow decimal input
          inputMode="decimal" // Mobile keyboard for decimals
          value={value}
          onChange={handleChange}
          placeholder={placeholder}
          className={`w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm outline-none transition-all focus:border-brand-500 focus:ring-1 focus:ring-brand-500/10 disabled:bg-gray-50 disabled:text-gray-400 dark:border-white/[0.08] dark:bg-white/[0.03] dark:text-white ${
            error ? "border-error-500 focus:border-error-500" : ""
          } ${inputClassName}`}
          {...props}
        />
      </div>
      {error && <p className="text-xs text-error-500">{error}</p>}
    </div>
  );
};

export default NumberInput;
