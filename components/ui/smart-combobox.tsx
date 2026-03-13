"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

type Option = {
  id: string;
  label: string;
  group?: string;
  disabled?: boolean;
  icon?: React.ReactNode;
  meta?: string;
};

type BaseProps = {
  id?: string;
  className?: string;
  label?: string;
  placeholder?: string;
  disabled?: boolean;
  clearable?: boolean;
  multiple?: boolean;
  onValueChange: (value: string[] | string | null) => void;
  options?: Option[];
  value?: string[] | string | null;
};

function normalize(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "");
}

export function SmartCombobox({
  id,
  className,
  label,
  placeholder = "검색",
  disabled,
  clearable = true,
  multiple = false,
  onValueChange,
  options = [],
  value: valueProp = multiple ? [] : null,
}: BaseProps) {
  const inputId = React.useId();
  const listboxId = React.useId();
  const containerRef = React.useRef<HTMLDivElement>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);

  const isMultiple = Boolean(multiple);
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const [activeIndex, setActiveIndex] = React.useState(0);
  const [multiValue, setMultiValue] = React.useState<string[]>(
    isMultiple && Array.isArray(valueProp) ? valueProp : [],
  );

  const singleValue = !isMultiple && typeof valueProp === "string" ? valueProp : null;

  React.useEffect(() => {
    if (isMultiple && Array.isArray(valueProp)) {
      setMultiValue(valueProp);
    }
  }, [isMultiple, valueProp]);

  React.useEffect(() => {
    function handleOutsideClick(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  const filteredOptions = React.useMemo(() => {
    const keyword = normalize(query.trim());
    if (!keyword) return options;
    return options.filter((option) => {
      return normalize(option.label).includes(keyword) || normalize(option.meta || "").includes(keyword);
    });
  }, [options, query]);

  React.useEffect(() => {
    setActiveIndex((current) => Math.min(current, Math.max(filteredOptions.length - 1, 0)));
  }, [filteredOptions.length]);

  const isSelected = React.useCallback(
    (id: string) => {
      if (isMultiple) return multiValue.includes(id);
      return singleValue === id;
    },
    [isMultiple, multiValue, singleValue],
  );

  function commitValue(next: string[] | string | null) {
    onValueChange(next);
  }

  function toggleOption(option: Option) {
    if (option.disabled) return;

    if (isMultiple) {
      const next = isSelected(option.id)
        ? multiValue.filter((itemId) => itemId !== option.id)
        : [...multiValue, option.id];
      setMultiValue(next);
      commitValue(next);
      setQuery("");
      return;
    }

    commitValue(isSelected(option.id) ? null : option.id);
    setOpen(false);
  }

  function clearAll() {
    if (disabled) return;
    if (isMultiple) {
      setMultiValue([]);
      commitValue([]);
    } else {
      commitValue(null);
    }
    setQuery("");
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (!open && ["ArrowDown", "ArrowUp", "Enter"].includes(event.key)) {
      event.preventDefault();
      setOpen(true);
      return;
    }

    if (!open) return;

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((current) => Math.min(current + 1, Math.max(filteredOptions.length - 1, 0)));
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((current) => Math.max(current - 1, 0));
      return;
    }

    if (event.key === "Enter") {
      event.preventDefault();
      const target = filteredOptions[activeIndex];
      if (target) toggleOption(target);
      return;
    }

    if (event.key === "Escape") {
      event.preventDefault();
      setOpen(false);
    }
  }

  return (
    <div ref={containerRef} id={id} className={cn("smart-combobox", className)}>
      {label ? (
        <label htmlFor={inputId} className="smart-combobox-label">
          {label}
        </label>
      ) : null}

      <div
        className={cn("smart-combobox-control", disabled && "is-disabled")}
        onClick={() => {
          if (disabled) return;
          setOpen(true);
          inputRef.current?.focus();
        }}
      >
        <input
          ref={inputRef}
          id={inputId}
          role="combobox"
          aria-expanded={open}
          aria-controls={listboxId}
          aria-autocomplete="list"
          disabled={disabled}
          className="smart-combobox-input"
          value={query}
          placeholder={placeholder}
          onChange={(event) => {
            setQuery(event.target.value);
            if (!open) setOpen(true);
          }}
          onKeyDown={handleKeyDown}
        />

        <div className="smart-combobox-actions">
          {clearable && ((isMultiple && multiValue.length > 0) || (!isMultiple && singleValue)) ? (
            <button
              type="button"
              className="smart-combobox-clear"
              onClick={(event) => {
                event.stopPropagation();
                clearAll();
              }}
              aria-label="선택 해제"
            >
              ×
            </button>
          ) : null}
          <button
            type="button"
            className={cn("smart-combobox-toggle", open && "is-open")}
            onClick={(event) => {
              event.stopPropagation();
              if (disabled) return;
              setOpen((current) => !current);
            }}
            aria-label={open ? "닫기" : "열기"}
          >
            <svg viewBox="0 0 20 20" aria-hidden="true">
              <path d="M6 8l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
        </div>
      </div>

      {open ? (
        <div className="smart-combobox-popup">
          <div id={listboxId} role="listbox" aria-multiselectable={isMultiple || undefined} className="smart-combobox-list">
            {filteredOptions.length === 0 ? (
              <div className="smart-combobox-empty">검색 결과가 없습니다.</div>
            ) : (
              filteredOptions.map((option, index) => {
                const selected = isSelected(option.id);

                return (
                  <button
                    key={option.id}
                    type="button"
                    role="option"
                    aria-selected={selected}
                    className={cn(
                      "smart-combobox-option",
                      index === activeIndex && "is-active",
                      selected && "is-selected",
                    )}
                    onMouseEnter={() => setActiveIndex(index)}
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => toggleOption(option)}
                  >
                    <div className="smart-combobox-option-copy">
                      <span>{option.label}</span>
                      {option.meta ? <small>{option.meta}</small> : null}
                    </div>
                    {selected ? <span className="smart-combobox-option-check">✓</span> : null}
                  </button>
                );
              })
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
