"use client";

import { useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { ArrowRightIcon } from "@/components/common/icons";
import type { WardrobeItem } from "@/lib/queries/wardrobe";

type WardrobeSearchBarProps = {
  initialQuery: string;
  category: string;
  items: WardrobeItem[];
};

type SuggestionItem = {
  itemId: number | null;
  value: string;
  brand: string | null;
  label: string;
};

function buildSearchHref(query: string, category: string, itemId?: number | null): string {
  const params = new URLSearchParams();
  if (query) params.set("q", query);
  if (category) params.set("category", category);
  if (itemId) params.set("itemId", String(itemId));
  const queryString = params.toString();
  return queryString ? `/wardrobe?${queryString}` : "/wardrobe";
}

function normalizeTerm(term: string | null | undefined): string {
  return (term || "").trim();
}

function splitSuggestionLabel(item: WardrobeItem) {
  const brand = normalizeTerm(item.brand);
  const name = normalizeTerm(item.name);
  if (!brand) {
    return { brand: null, label: name };
  }

  const escapedBrand = brand.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const label = name.replace(new RegExp(`^${escapedBrand}\\s*`, "i"), "").trim() || name;

  return { brand, label };
}

export function WardrobeSearchBar({ initialQuery, category, items }: WardrobeSearchBarProps) {
  const router = useRouter();
  const [query, setQuery] = useState(initialQuery);
  const [isSuggestionOpen, setIsSuggestionOpen] = useState(false);
  const searchShellRef = useRef<HTMLDivElement>(null);
  const deferredQuery = useDeferredValue(query);
  const normalizedQuery = deferredQuery.trim().toLowerCase();

  const suggestions = useMemo(() => {
    if (!normalizedQuery) return [];

    const uniqueSuggestions = new Map<string, SuggestionItem>();

    items.forEach((item) => {
      const name = normalizeTerm(item.name);

      if (name.toLowerCase().includes(normalizedQuery)) {
        const suggestion = splitSuggestionLabel(item);
        uniqueSuggestions.set(name, {
          itemId: item.id,
          value: name,
          brand: suggestion.brand,
          label: suggestion.label,
        });
      }
    });

    return Array.from(uniqueSuggestions.values()).slice(0, 6);
  }, [items, normalizedQuery]);

  const showSubmit = query.trim().length > 0;
  const showSuggestions = query.trim().length > 0 && isSuggestionOpen;

  useEffect(() => {
    if (!query.trim()) {
      setIsSuggestionOpen(false);
      return;
    }

    setIsSuggestionOpen(true);
  }, [query]);

  useEffect(() => {
    function handleOutsideClick(event: MouseEvent) {
      if (!searchShellRef.current?.contains(event.target as Node)) {
        setIsSuggestionOpen(false);
      }
    }

    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  function submitSearch(nextQuery: string, itemId?: number | null) {
    router.push(buildSearchHref(nextQuery.trim(), category, itemId));
  }

  return (
    <div ref={searchShellRef} className="wardrobe-search-shell">
      <form
        className="wardrobe-search-form"
        onSubmit={(event) => {
          event.preventDefault();
          submitSearch(query);
        }}
      >
        <input type="hidden" name="category" value={category} />
        <div className="wardrobe-search-input-wrap">
          <input
            name="q"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onFocus={() => {
              if (query.trim()) setIsSuggestionOpen(true);
            }}
            placeholder="search..."
            autoComplete="off"
            aria-label="Search"
            aria-controls="wardrobe-search-suggestions"
          />
          {showSubmit ? (
            <button type="submit" className="wardrobe-search-submit" aria-label="Search">
              <ArrowRightIcon size={16} />
            </button>
          ) : null}
        </div>
      </form>

      {showSuggestions ? (
        <div className="wardrobe-search-suggestions" id="wardrobe-search-suggestions">
          {suggestions.length > 0 ? (
            suggestions.map((suggestion) => (
              <button
                key={suggestion.value}
                type="button"
                className="wardrobe-search-suggestion"
                onClick={() => {
                  setQuery("");
                  setIsSuggestionOpen(false);
                  submitSearch(suggestion.itemId ? "" : suggestion.value, suggestion.itemId);
                }}
              >
                {suggestion.brand ? (
                  <span className="wardrobe-search-suggestion-copy">
                    <strong>{suggestion.brand}</strong>
                    <span>{suggestion.label}</span>
                  </span>
                ) : (
                  suggestion.label
                )}
              </button>
            ))
          ) : (
            <p className="wardrobe-search-empty">No matches found.</p>
          )}
        </div>
      ) : null}
    </div>
  );
}
