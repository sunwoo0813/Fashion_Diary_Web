import Link from "next/link";

import { WardrobeGrid } from "@/components/wardrobe/wardrobe-grid";
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

      <form method="get" action="/wardrobe" className="wardrobe-filter-form">
        <input type="hidden" name="q" value={q} />
        <button type="submit" name="category" value="" className={!category ? "is-active" : ""}>
          All pieces
        </button>
        <button type="submit" name="category" value="Outerwear" className={category === "Outerwear" ? "is-active" : ""}>
          Outerwear
        </button>
        <button
          type="submit"
          name="category"
          value="Top"
          className={category === "Top" || category === "Tops" ? "is-active" : ""}
        >
          Top
        </button>
        <button
          type="submit"
          name="category"
          value="Bottom"
          className={category === "Bottom" || category === "Bottoms" ? "is-active" : ""}
        >
          Bottom
        </button>
        <button type="submit" name="category" value="Footwear" className={category === "Footwear" ? "is-active" : ""}>
          Footwear
        </button>
        <button
          type="submit"
          name="category"
          value="Accessories"
          className={category === "Accessories" ? "is-active" : ""}
        >
          Accessories
        </button>
      </form>

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
