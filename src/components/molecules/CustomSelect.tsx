import React, { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { ChevronDownIcon, ChevronUpIcon, CloseLineIcon } from "../atoms/Icons";

export interface SelectOption {
  label: string;
  value: string | number;
}

interface CustomSelectProps {
  label?: string;
  options: SelectOption[];
  value: string | number | (string | number)[];
  onChange: (value: any) => void;
  className?: string;
  placeholder?: string;
  labelClassName?: string;
  disabled?: boolean;
  multiple?: boolean;
  onClear?: () => void;
}

export const CustomSelect: React.FC<CustomSelectProps> = ({
  label,
  options,
  value,
  onChange,
  className = "",
  placeholder = "Select option",
  labelClassName = "",
  disabled = false,
  multiple = false,
  onClear,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const isSelected = (val: string | number) => {
    if (multiple && Array.isArray(value)) {
      return value.includes(val);
    }
    return value === val;
  };

  const selectedOption = !multiple ? options.find((opt) => opt.value === value) : null;
  const selectedOptions = multiple && Array.isArray(value) ? options.filter((opt) => value.includes(opt.value)) : [];

  const [coords, setCoords] = useState({ top: 0, left: 0, width: 0 });

  const calculateCoords = () => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setCoords({
        top: rect.bottom + 4, // 4px gap, viewport relative
        left: rect.left,      // viewport relative
        width: rect.width,
      });
    }
  };

  useEffect(() => {
    if (isOpen) {
      // Recalculate on scroll/resize to keep attached or close
       const handleScroll = (e: Event) => {
         if (dropdownRef.current && dropdownRef.current.contains(e.target as Node)) {
             return;
         }
         // If scrolling happens outside the dropdown (e.g. main page), close it for simplicity
         // or we could recalculate coords, but closing is safer to avoid detachment.
         setIsOpen(false);
       }; 
      window.addEventListener("scroll", handleScroll, true);
      window.addEventListener("resize", handleScroll);
      return () => {
        window.removeEventListener("scroll", handleScroll, true);
        window.removeEventListener("resize", handleScroll);
      };
    }
  }, [isOpen]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        containerRef.current &&
        !containerRef.current.contains(target) &&
        dropdownRef.current &&
        !dropdownRef.current.contains(target)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className={`relative space-y-1.5 ${className}`} ref={containerRef}>
      {label && (
        <label className={`text-xs font-medium text-gray-500 dark:text-gray-400 ${labelClassName}`}>
          {label}
        </label>
      )}
      <div
        onClick={() => {
            if (disabled) return;
            if (!isOpen) calculateCoords();
            setIsOpen(!isOpen);
        }}
        className={`flex h-11 items-center justify-between rounded-xl border px-3.5 py-2.5 text-sm transition-all dark:text-white ${
            disabled 
                ? "cursor-not-allowed border-gray-100 bg-gray-50/50 text-gray-400 dark:border-white/5 dark:bg-white/[0.01]" 
                : "cursor-pointer border-gray-200 bg-white hover:border-brand-300 focus:border-brand-500 dark:border-white/[0.08] dark:bg-white/[0.03]"
        }`}
      >
        <span className={(selectedOption || selectedOptions.length > 0) ? "text-gray-900 dark:text-white" : "text-gray-400"}>
          {multiple 
            ? selectedOptions.length > 0 
                ? `${selectedOptions.length} selected` 
                : placeholder
            : selectedOption ? selectedOption.label : placeholder}
        </span>
        <div className="flex items-center gap-2">
            {(multiple ? selectedOptions.length > 0 : value) && !disabled && (
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        if (onClear) {
                            onClear();
                        } else {
                            onChange(multiple ? [] : "");
                        }
                    }}
                    className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-white/10 text-gray-400 hover:text-gray-600 dark:hover:text-white transition-colors"
                >
                    <CloseLineIcon className="size-3.5" />
                </button>
            )}
            {isOpen ? (
            <ChevronUpIcon className="size-4 text-gray-400" />
            ) : (
            <ChevronDownIcon className="size-4 text-gray-400" />
            )}
        </div>
      </div>

      {isOpen && createPortal(
        <div 
            className="fixed z-[999999] overflow-hidden rounded-xl border border-gray-200 bg-white py-1.5 shadow-xl shadow-gray-200/20 animate-in fade-in zoom-in duration-200 dark:border-white/[0.08] dark:bg-[#1E1E1E] dark:shadow-none"
            style={{
                top: coords.top,
                left: coords.left,
                width: coords.width,
            }}
            ref={dropdownRef}
            onMouseDown={(e) => e.stopPropagation()}
        >
          {options.map((option) => (
            <div
              key={option.value}
              onClick={(e) => {
                e.stopPropagation();
                if (multiple) {
                    const currentValues = Array.isArray(value) ? value : [];
                    if (currentValues.includes(option.value)) {
                        onChange(currentValues.filter(v => v !== option.value));
                    } else {
                        onChange([...currentValues, option.value]);
                    }
                } else {
                    onChange(option.value);
                    setIsOpen(false);
                }
              }}
              className={`flex items-center justify-between cursor-pointer px-4 py-2 text-sm transition-colors hover:bg-gray-50 dark:hover:bg-white/[0.03] ${
                isSelected(option.value)
                  ? "bg-brand-50 font-medium text-brand-600 dark:bg-brand-500/10 dark:text-brand-400"
                  : "text-gray-700 dark:text-gray-300"
              }`}
            >
              <span>{option.label}</span>
              {isSelected(option.value) && (
                  <div className="size-4 rounded-full bg-brand-500 flex items-center justify-center">
                      <svg className="size-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={4} d="M5 13l4 4L19 7" />
                      </svg>
                  </div>
              )}
            </div>
          ))}
        </div>,
        document.body
      )}
    </div>
  );
};

export default CustomSelect;
