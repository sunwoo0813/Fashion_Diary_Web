import Link from "next/link";

import { PlusIcon } from "@/components/common/icons";
import { WardrobeGrid } from "@/components/wardrobe/wardrobe-grid";
import { WardrobeSearchBar } from "@/components/wardrobe/wardrobe-search-bar";
import { requireAppUserContext } from "@/lib/app-user";
import { getWardrobePageData } from "@/lib/queries/wardrobe";

type WardrobeCategoryFilter = {
  label: string;
  value: string;
  aliases?: string[];
};

const CATEGORY_FILTERS: WardrobeCategoryFilter[] = [
  { label: "전체", value: "" },
  { label: "아우터", value: "Outerwear" },
  { label: "상의", value: "Top", aliases: ["Tops"] },
  { label: "하의", value: "Bottom", aliases: ["Bottoms"] },
  { label: "신발", value: "Footwear" },
  { label: "액세서리", value: "Accessories" },
];

function readParam(value: string | string[] | undefined): string {
  if (!value) return "";
  if (Array.isArray(value)) return value[0] || "";
  return value;
}

function isCategoryActive(currentCategory: string, filter: WardrobeCategoryFilter): boolean {
  if (!filter.value) return !currentCategory;
  return currentCategory === filter.value || (filter.aliases || []).includes(currentCategory);
}

function buildWardrobeFilterHref(query: string, categoryValue: string): string {
  const params = new URLSearchParams();
  if (query) params.set("q", query);
  if (categoryValue) params.set("category", categoryValue);
  const queryString = params.toString();
  return queryString ? `/wardrobe?${queryString}` : "/wardrobe";
}

type WardrobePageProps = {
  searchParams?: Record<string, string | string[] | undefined>;
};

export default async function WardrobePage({ searchParams }: WardrobePageProps) {
  const q = readParam(searchParams?.q).trim();
  const category = readParam(searchParams?.category).trim();
  const error = readParam(searchParams?.error).trim();

  const { appUserId } = await requireAppUserContext();
  const data = await getWardrobePageData({
    appUserId,
    query: q,
    category,
  });

  return (
    <section className="wardrobe-page">
      <header className="wardrobe-header">
        <div>
          <p className="wardrobe-kicker">디지털 아카이브</p>
          <h1>내 옷장</h1>
        </div>
        <div className="wardrobe-header-actions">
          <WardrobeSearchBar initialQuery={q} category={category} items={data.items} />
          <Link href="/wardrobe/new" className="solid-button diary-icon-button" aria-label="새 아이템 추가">
            <PlusIcon size={18} />
          </Link>
        </div>
      </header>

      <nav className="wardrobe-filter-form" aria-label="옷장 카테고리">
        {CATEGORY_FILTERS.map((filter) => {
          const active = isCategoryActive(category, filter);
          return (
            <Link
              key={filter.label}
              href={buildWardrobeFilterHref(q, filter.value)}
              replace
              className={`filter-chip${active ? " is-active" : ""}`}
              aria-current={active ? "page" : undefined}
            >
              {filter.label}
            </Link>
          );
        })}
      </nav>

      {error ? <p className="form-error">{error}</p> : null}

      <WardrobeGrid
        items={data.items}
        wearCounts={data.wearCounts}
        favoriteIds={data.favoriteIds}
        hasFilters={data.hasFilters}
      />
    </section>
  );
}
