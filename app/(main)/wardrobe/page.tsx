import { WardrobeCategoryFilter } from "@/components/wardrobe/wardrobe-category-filter";
import { WardrobeDeleteProvider } from "@/components/wardrobe/wardrobe-delete-context";
import { WardrobeDesktopActions } from "@/components/wardrobe/wardrobe-desktop-actions";
import { WardrobeGrid } from "@/components/wardrobe/wardrobe-grid";
import { WardrobeSearchBar } from "@/components/wardrobe/wardrobe-search-bar";
import { requireAppUserContext } from "@/lib/app-user";
import { getWardrobePageData } from "@/lib/queries/wardrobe";

function readParam(value: string | string[] | undefined): string {
  if (!value) return "";
  if (Array.isArray(value)) return value[0] || "";
  return value;
}

type WardrobePageProps = {
  searchParams?: Record<string, string | string[] | undefined>;
};

export default async function WardrobePage({ searchParams }: WardrobePageProps) {
  const q = readParam(searchParams?.q).trim();
  const category = readParam(searchParams?.category).trim();
  const itemIdValue = readParam(searchParams?.itemId).trim();
  const error = readParam(searchParams?.error).trim();
  const itemId = /^\d+$/.test(itemIdValue) ? Number(itemIdValue) : null;

  const { appUserId } = await requireAppUserContext();
  const data = await getWardrobePageData({
    appUserId,
    query: q,
    category,
    itemId,
  });

  return (
    <WardrobeDeleteProvider>
      <section className="wardrobe-page">
        <header className="wardrobe-header">
          <div>
            <h1>옷장</h1>
          </div>
          <div className="wardrobe-header-actions">
            <WardrobeSearchBar initialQuery={q} category={category} items={data.items} />
            <WardrobeDesktopActions />
          </div>
        </header>

        <WardrobeCategoryFilter query={q} category={category} counts={data.categoryCounts} desktopOnly />

        {error ? <p className="form-error">{error}</p> : null}

        <WardrobeGrid
          query={q}
          category={category}
          categoryCounts={data.categoryCounts}
          items={data.items}
          wearCounts={data.wearCounts}
          recentWearDates={data.recentWearDates}
          hasFilters={data.hasFilters}
        />
      </section>
    </WardrobeDeleteProvider>
  );
}
