import Link from "next/link";

import { WardrobeGrid } from "@/components/wardrobe/wardrobe-grid";
import { requireAppUserContext } from "@/lib/app-user";
import { getWardrobePageData } from "@/lib/queries/wardrobe";

type WardrobeCategoryFilter = {
  label: string;
  value: string;
  aliases?: string[];
};

const CATEGORY_FILTERS: WardrobeCategoryFilter[] = [
  { label: "All pieces", value: "" },
  { label: "Outerwear", value: "Outerwear" },
  { label: "Top", value: "Top", aliases: ["Tops"] },
  { label: "Bottom", value: "Bottom", aliases: ["Bottoms"] },
  { label: "Footwear", value: "Footwear" },
  { label: "Accessories", value: "Accessories" },
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
          <p className="wardrobe-kicker">Digital Archive</p>
          <h1>Curated Collection</h1>
        </div>
        <div className="wardrobe-header-actions">
          <form method="get" action="/wardrobe" className="wardrobe-search-form">
            <input type="hidden" name="category" value={category} />
            <input name="q" defaultValue={q} placeholder="Search collection" />
            <button type="submit" className="ghost-button">
              Search
            </button>
          </form>
          <Link href="/wardrobe/new" className="solid-button">
            Add New
          </Link>
        </div>
      </header>

      <nav className="wardrobe-filter-form" aria-label="Wardrobe categories">
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
