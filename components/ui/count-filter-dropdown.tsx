"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { ChevronDownIcon } from "@/components/common/icons";

export type CountFilterDropdownOption = {
  label: string;
  value: string;
};

type CountFilterDropdownProps = {
  options: CountFilterDropdownOption[];
  value: string;
  onChange: (value: string) => void;
  counts: Record<string, number>;
  totalLabel?: string;
  placeholder?: string;
  ariaLabel: string;
};

export function CountFilterDropdown({
  options,
  value,
  onChange,
  counts,
  totalLabel = "Total",
  placeholder = "Total",
  ariaLabel,
}: CountFilterDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selectedLabel = useMemo(() => {
    const match = options.find((option) => option.value === value);
    return match?.label || placeholder;
  }, [options, placeholder, value]);

  useEffect(() => {
    const handleOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <div ref={dropdownRef} className="count-filter-dropdown">
      <button
        type="button"
        className={`count-filter-dropdown-button${value ? " is-selected" : ""}`}
        onClick={() => setIsOpen((prev) => !prev)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label={ariaLabel}
      >
        <span className="count-filter-dropdown-label">{selectedLabel}</span>
        <ChevronDownIcon className={`count-filter-dropdown-chevron${isOpen ? " is-open" : ""}`} size={16} />
      </button>

      {isOpen ? (
        <div className="count-filter-dropdown-panel" role="listbox" aria-label={ariaLabel}>
          <button
            type="button"
            className="count-filter-dropdown-option"
            onClick={() => {
              onChange("");
              setIsOpen(false);
            }}
          >
            <span>{totalLabel}</span>
            <span className="count-filter-dropdown-count">{counts[""] ?? 0}</span>
          </button>

          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              className="count-filter-dropdown-option"
              onClick={() => {
                onChange(option.value);
                setIsOpen(false);
              }}
            >
              <span>{option.label}</span>
              <span className="count-filter-dropdown-count">{counts[option.value] ?? 0}</span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
