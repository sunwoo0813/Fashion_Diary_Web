import { ItemCreateForm } from "@/components/wardrobe/item-create-form";
import { requireUser } from "@/lib/auth";

function readParam(value: string | string[] | undefined): string {
  if (!value) return "";
  if (Array.isArray(value)) return value[0] || "";
  return value;
}

type WardrobeNewPageProps = {
  searchParams?: Record<string, string | string[] | undefined>;
};

export default async function WardrobeNewPage({ searchParams }: WardrobeNewPageProps) {
  await requireUser();
  const error = readParam(searchParams?.error);

  return (
    <ItemCreateForm initialError={error} />
  );
}
