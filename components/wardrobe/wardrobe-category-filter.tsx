"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

import { CountFilterDropdown } from "@/components/ui/count-filter-dropdown";
import {
  buildWardrobeFilterHref,
  CATEGORY_FILTERS,
  isCategoryActive,
} from "@/lib/wardrobe-filters";

type WardrobeCategoryFilterProps = {
  query: string;
  category: string;
  counts: Record<string, number>;
  desktopOnly?: boolean;
  mobileOnly?: boolean;
};

export function WardrobeCategoryFilter({
  query,
  category,
  counts,
  desktopOnly = false,
  mobileOnly = false,
}: WardrobeCategoryFilterProps) {
  const router = useRouter();
  const selectedValue = CATEGORY_FILTERS.find((filter) => isCategoryActive(category, filter))?.value ?? "";

  return (
    <>
      {!mobileOnly ? (
        <nav className="wardrobe-filter-form wardrobe-filter-form-desktop" aria-label="옷장 카테고리">
          {CATEGORY_FILTERS.map((filter) => {
            const active = isCategoryActive(category, filter);
            return (
              <Link
                key={filter.label}
                href={buildWardrobeFilterHref(query, filter.value)}
                replace
                className={`filter-chip${active ? " is-active" : ""}`}
                aria-current={active ? "page" : undefined}
              >
                {filter.label}
              </Link>
            );
          })}
        </nav>
      ) : null}

      {!desktopOnly ? (
        <div className="wardrobe-filter-dropdown-mobile">
          <CountFilterDropdown
            ariaLabel="옷장 카테고리 필터"
            options={CATEGORY_FILTERS.filter((filter) => filter.value).map((filter) => ({
              label: filter.label,
              value: filter.value,
            }))}
            value={selectedValue}
            counts={counts}
            totalLabel="Total"
            placeholder="Total"
            onChange={(nextValue) => {
              router.push(buildWardrobeFilterHref(query, nextValue));
            }}
          />
        </div>
      ) : null}
    </>
  );
}
