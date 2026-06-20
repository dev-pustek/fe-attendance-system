import { createPortal } from "react-dom";
import React, { useState, useRef, useEffect } from "react";
import { ChevronDownIcon, ChevronUpIcon, GridIcon, CloseLineIcon } from "../atoms/Icons";
import { useDebounce } from "../../hooks/useDebounce";

export interface SelectOption {
  label: string;
  value: string | number;
  subLabel?: string;
  isDisabled?: boolean;
}

interface SearchableAsyncSelectProps {
  label?: string;
  value: string | number;
  onChange: (value: string | number, label: string, option?: SelectOption) => void;
  onSearch: (term: string) => void;
  options: SelectOption[];
  isLoading?: boolean;
  placeholder?: string;
  className?: string;
  noResultsText?: string;
  closeOnSelect?: boolean;
  selectedValues?: (string | number)[];
  initialLabel?: string;
  labelClassName?: string;
  disabled?: boolean;
  onClear?: () => void;
  multiple?: boolean;
}

export const SearchableAsyncSelect: React.FC<SearchableAsyncSelectProps> = ({
  label,
  value,
  onChange,
  onSearch,
  options,
  isLoading = false,
  placeholder = "Search and select...",
  className = "",
  noResultsText = "No results found.",
  closeOnSelect = true,
  selectedValues = [],
  initialLabel,
  labelClassName = "",
  disabled = false,
  onClear,
  multiple = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const debouncedSearch = useDebounce(searchTerm, 300);

  // Find the selected option to display its label even when not open
  const selectedOption = options.find((opt) => opt.value === value);
  const [displayLabel, setDisplayLabel] = useState(initialLabel || "");

  useEffect(() => {
    if (selectedOption) {
      setDisplayLabel(selectedOption.label);
    } else if (value === "" || value === null || value === undefined) {
      setDisplayLabel("");
    } else if (initialLabel && !displayLabel) {
       // If no option found but we have initialLabel (e.g. on first load for edit), keep/set it
       setDisplayLabel(initialLabel);
    }
  }, [selectedOption, value, initialLabel, displayLabel]);

  useEffect(() => {
    if (isOpen) {
      onSearch(debouncedSearch);
    }
  }, [debouncedSearch, isOpen, onSearch]);

  const [coords, setCoords] = useState({ top: 0, left: 0, width: 0 });

  const calculateCoords = () => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setCoords({
        top: rect.bottom + 4,
        left: rect.left,
        width: rect.width,
      });
    }
  };

  useEffect(() => {
    if (isOpen) {
      // Recalculate on scroll/resize to keep attached or close
       const handleScroll = (e: Event) => {
         // If the scroll event came from inside the dropdown, ignore it
         if (dropdownRef.current && dropdownRef.current.contains(e.target as Node)) {
           return;
         }
         calculateCoords();
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
        (!dropdownRef.current || !dropdownRef.current.contains(target))
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleToggle = () => {
    if (disabled) return;
    if (!isOpen) {
        calculateCoords();
        setSearchTerm(""); // Reset search when opening
    }
    setIsOpen(!isOpen);
  };

  return (
    <div className={`relative space-y-1.5 ${className}`} ref={containerRef}>
      {label && (
        <label className={`text-xs font-medium text-gray-500 dark:text-gray-400 ${labelClassName}`}>
          {label}
        </label>
      )}
      
      <div
        onClick={handleToggle}
        className={`flex items-center justify-between gap-2 overflow-hidden rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm transition-all dark:border-white/[0.08] dark:bg-white/[0.03] dark:text-white ${
            disabled 
                ? "cursor-not-allowed border-gray-100 bg-gray-50/50 text-gray-400 dark:border-white/5 dark:bg-white/[0.01]" 
                : "cursor-pointer border-gray-200 bg-white hover:border-brand-300 focus:border-brand-500"
        } ${
          isOpen ? "border-brand-500 ring-4 ring-brand-500/5 shadow-sm" : ""
        }`}
      >
        <span className={`truncate min-w-0 flex-1 ${
          disabled 
            ? "text-gray-400" 
            : (multiple ? selectedValues && selectedValues.length > 0 : displayLabel)
              ? "text-gray-900 dark:text-white font-medium" 
              : "text-gray-400"
        }`}>
          {multiple 
            ? (selectedValues && selectedValues.length > 0 ? `${selectedValues.length} selected` : placeholder)
            : (displayLabel || placeholder)}
        </span>
        <div className="flex items-center gap-2">
            {(multiple ? (selectedValues && selectedValues.length > 0) : value) && !disabled && (
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        if (onClear) {
                            onClear();
                        } else {
                            onChange("", "");
                        }
                        setDisplayLabel("");
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

      {isOpen && typeof document !== 'undefined' && createPortal(
        <div 
            className="fixed z-[99999] mt-1 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xl shadow-gray-200/40 animate-in fade-in zoom-in duration-200 dark:border-white/[0.08] dark:bg-[#1E1E1E] dark:shadow-none"
            style={{
                top: coords.top,
                left: coords.left,
                width: coords.width,
            }}
            ref={dropdownRef}
        >
          <div className="p-2 border-b border-gray-100 dark:border-white/[0.05]">
            <div className="relative">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                <svg className="size-3.5 fill-current" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                  <path clipRule="evenodd" fillRule="evenodd" d="M9 3.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM2 9a7 7 0 1112.452 4.391l3.328 3.329a.75.75 0 11-1.06 1.06l-3.329-3.328A7 7 0 012 9z" />
                </svg>
              </div>
              <input
                autoFocus
                type="text"
                className="w-full rounded-lg bg-gray-50 py-2 pl-9 pr-3 text-sm border-none outline-none focus:ring-1 focus:ring-brand-500/50 dark:bg-white/5 dark:text-white"
                placeholder="Type to search..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          </div>

          <div className="max-h-60 overflow-y-auto py-1">
            {isLoading ? (
              <div className="flex items-center justify-center gap-2 py-8 text-gray-400">
                <div className="size-4 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
                <span className="text-xs font-medium">Searching...</span>
              </div>
            ) : options.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center text-gray-400">
                <GridIcon className="size-6 opacity-20 mb-2" />
                <p className="text-xs font-medium">{noResultsText}</p>
                <p className="text-[10px] opacity-60">Try a different search term</p>
              </div>
            ) : (
              options.map((option) => (
                <div
                  key={option.value}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (option.isDisabled) return;
                    onChange(option.value, option.label, option);
                    setDisplayLabel(option.label);
                    if (closeOnSelect && !multiple) {
                        setIsOpen(false);
                    }
                  }}
                  className={`group cursor-pointer px-4 py-2.5 transition-colors ${
                    option.isDisabled 
                      ? "opacity-50 cursor-not-allowed bg-gray-50/50 dark:bg-white/[0.02]" 
                      : "hover:bg-brand-50 dark:hover:bg-brand-500/5"
                  } ${
                    (option.value === value || selectedValues.includes(option.value)) && !option.isDisabled
                      ? "bg-brand-50/50 dark:bg-brand-500/10"
                      : ""
                  }`}
                >
                  <div className="flex flex-col">
                    <span className={`text-sm ${
                      option.value === value || selectedValues.includes(option.value)
                        ? "font-semibold text-brand-600 dark:text-brand-400" 
                        : "text-gray-700 dark:text-gray-200"
                    }`}>
                      {option.label}
                      {selectedValues.includes(option.value) && !option.isDisabled && (
                        <span className="ml-2 text-xs text-brand-500 font-normal">(Selected)</span>
                      )}
                      {option.isDisabled && (
                        <span className="ml-2 text-xs text-gray-400 font-normal">(Already Assigned)</span>
                      )}
                    </span>
                    {option.subLabel && (
                      <span className="text-[11px] text-gray-400 group-hover:text-gray-500 dark:group-hover:text-gray-300">
                        {option.subLabel}
                      </span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default SearchableAsyncSelect;
