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

      flatpickrRef.current = flatpickr(inputRef.current, config);
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
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          placeholder={placeholder}
          required={required}
          className="w-full h-11 rounded-xl border border-gray-200 bg-white py-2.5 pl-10 pr-10 text-sm outline-none transition-all hover:border-brand-300 focus:border-brand-500 dark:border-white/[0.08] dark:bg-white/[0.03] dark:text-white"
        />
        <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none z-10">
          {type === "time" ? (
            <TimeIcon className="size-4" />
          ) : (
            <CalenderIcon className="size-4" />
          )}
        </div>
        {value && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 z-10"
          >
            <CloseIcon className="size-3.5" />
          </button>
        )}
      </div>
    </div>
  );
};

export default DatePicker;
