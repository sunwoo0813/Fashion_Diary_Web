"use client";

import { useDeferredValue, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { ArrowRightIcon } from "@/components/common/icons";
import type { WardrobeItem } from "@/lib/queries/wardrobe";

type WardrobeSearchBarProps = {
  initialQuery: string;
  category: string;
  items: WardrobeItem[];
};

function buildSearchHref(query: string, category: string): string {
  const params = new URLSearchParams();
  if (query) params.set("q", query);
  if (category) params.set("category", category);
  const queryString = params.toString();
  return queryString ? `/wardrobe?${queryString}` : "/wardrobe";
}

function normalizeTerm(term: string | null): string {
  return (term || "").trim();
}

export function WardrobeSearchBar({ initialQuery, category, items }: WardrobeSearchBarProps) {
  const router = useRouter();
  const [query, setQuery] = useState(initialQuery);
  const deferredQuery = useDeferredValue(query);
  const normalizedQuery = deferredQuery.trim().toLowerCase();

  const suggestions = useMemo(() => {
    if (!normalizedQuery) return [];

    const uniqueSuggestions = new Set<string>();

    items.forEach((item) => {
      const name = normalizeTerm(item.name);
      const itemCategory = normalizeTerm(item.category);

      if (name.toLowerCase().includes(normalizedQuery)) {
        uniqueSuggestions.add(name);
      }
      if (itemCategory && itemCategory.toLowerCase().includes(normalizedQuery)) {
        uniqueSuggestions.add(itemCategory);
      }
    });

    return Array.from(uniqueSuggestions).slice(0, 6);
  }, [items, normalizedQuery]);

  const showSubmit = query.trim().length > 0;
  const showSuggestions = query.trim().length > 0;

  function submitSearch(nextQuery: string) {
    router.push(buildSearchHref(nextQuery.trim(), category));
  }

  return (
    <div className="wardrobe-search-shell">
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
            placeholder="검색..."
            autoComplete="off"
            aria-label="검색"
            aria-controls="wardrobe-search-suggestions"
          />
          {showSubmit ? (
            <button type="submit" className="wardrobe-search-submit" aria-label="검색">
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
                key={suggestion}
                type="button"
                className="wardrobe-search-suggestion"
                onClick={() => {
                  setQuery(suggestion);
                  submitSearch(suggestion);
                }}
              >
                {suggestion}
              </button>
            ))
          ) : (
            <p className="wardrobe-search-empty">관련 검색어가 없어요.</p>
          )}
        </div>
      ) : null}
    </div>
  );
}
