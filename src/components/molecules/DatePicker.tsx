import React, { useEffect, useRef } from "react";
import flatpickr from "flatpickr";
import "flatpickr/dist/flatpickr.css";
import { CalenderIcon, TimeIcon, CloseIcon } from "../atoms/Icons";

interface DatePickerProps {
  value: string | null;
  onChange: (date: string) => void;
  placeholder?: string;
  label?: string;
  type?: "date" | "time" | "datetime";
  className?: string;
  required?: boolean;
  labelClassName?: string;
  mode?: "single" | "multiple" | "range" | "time";
  disabled?: boolean;
}

const DatePicker: React.FC<DatePickerProps> = ({
  value,
  onChange,
  placeholder = "Select date",
  label,
  type = "date",
  className = "",
  required = false,
  labelClassName = "",
  mode = "single",
  disabled = false,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const flatpickrRef = useRef<flatpickr.Instance | null>(null);

  const onChangeRef = useRef(onChange);
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    if (inputRef.current) {
      const config: flatpickr.Options.Options = {
        dateFormat: type === "time" ? "H:i" : type === "datetime" ? "Y-m-d H:i" : "Y-m-d",
        enableTime: type === "time" || type === "datetime",
        noCalendar: type === "time",
        time_24hr: true,
        mode: mode as flatpickr.Options.Options["mode"],
        static: false,
        disableMobile: true,
        monthSelectorType: "static",
        position: "auto",
        onChange: (_, dateStr) => {
          onChangeRef.current(dateStr);
        },
        onOpen: [
          function(this: flatpickr.Instance) {
            this._positionCalendar();
          }
        ]
      };

      const fp = flatpickr(inputRef.current, config);
      flatpickrRef.current = (Array.isArray(fp) ? fp[0] : fp) as flatpickr.Instance;
    }

    return () => {
      if (flatpickrRef.current) {
        flatpickrRef.current.destroy();
      }
    };
  }, [type, mode]);

  useEffect(() => {
    if (flatpickrRef.current && value !== undefined) {
      flatpickrRef.current.setDate(value || "", false);
    }
  }, [value]);

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (flatpickrRef.current) {
      flatpickrRef.current.clear();
    }
    onChange("");
  };

  return (
    <div className={`space-y-1.5 ${className}`}>
        <style>{`
            .flatpickr-day.selected, .flatpickr-day.startRange, .flatpickr-day.endRange, .flatpickr-day.selected.inRange, .flatpickr-day.startRange.inRange, .flatpickr-day.endRange.inRange, .flatpickr-day.selected:focus, .flatpickr-day.startRange:focus, .flatpickr-day.endRange:focus, .flatpickr-day.selected:hover, .flatpickr-day.startRange:hover, .flatpickr-day.endRange:hover, .flatpickr-day.selected.prevMonthDay, .flatpickr-day.startRange.prevMonthDay, .flatpickr-day.endRange.prevMonthDay, .flatpickr-day.selected.nextMonthDay, .flatpickr-day.startRange.nextMonthDay, .flatpickr-day.endRange.nextMonthDay {
                background: #10B981 !important; /* emerald-500/brand-500 approx */
                border-color: #10B981 !important;
            }
            .flatpickr-day.inRange {
                box-shadow: -5px 0 0 #D1FAE5, 5px 0 0 #D1FAE5 !important;
                background: #D1FAE5 !important; /* emerald-100 */
                border-color: #D1FAE5 !important;
            }
            .dark .flatpickr-day.inRange {
                 box-shadow: -5px 0 0 #064E3B, 5px 0 0 #064E3B !important;
                 background: #064E3B !important; /* emerald-900 */
                 border-color: #064E3B !important;
            }
        `}</style>
      {label && (
        <label className={`text-xs font-medium text-gray-500 dark:text-gray-400 ${labelClassName}`}>
          {label}
        </label>
      )}
      <div className={`relative flex items-center w-full rounded-xl border border-gray-200 bg-white transition-all overflow-hidden dark:border-white/[0.08] dark:bg-white/[0.03] ${
        disabled ? "bg-gray-50/50 opacity-60 cursor-not-allowed dark:bg-white/[0.01]" : "hover:border-brand-300 focus-within:border-brand-500 focus-within:ring-4 focus-within:ring-brand-500/5"
      }`}>
        <div className="pl-3.5 pr-2 text-gray-400 shrink-0 flex items-center justify-center">
          {type === "time" ? <TimeIcon className="size-4" /> : <CalenderIcon className="size-4" />}
        </div>
        <input
          ref={inputRef}
          type="text"
          className={`w-full bg-transparent py-2.5 pr-3 text-sm text-gray-900 outline-none placeholder:text-gray-400 dark:text-white ${disabled ? 'cursor-not-allowed text-gray-400' : ''}`}
          placeholder={placeholder}
          required={required}
          disabled={disabled}
        />
        {value && !disabled && (
          <button
            type="button"
            onClick={handleClear}
            className="pr-3 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
          >
            <CloseIcon className="size-3.5" />
          </button>
        )}
      </div>
    </div>
  );
};

export default DatePicker;
