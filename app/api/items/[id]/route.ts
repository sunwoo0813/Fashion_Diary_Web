import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth";
import { getOrCreateAppUserId } from "@/lib/app-user";
import { createServiceRoleSupabaseClient } from "@/lib/supabase/server";
import { makeDisplayName, toText } from "@/lib/wardrobe";

type UpdateBody = {
  brand?: unknown;
  product?: unknown;
  category?: unknown;
  size?: unknown;
  color?: unknown;
  stylingIdea?: unknown;
};

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } },
) {
  const authUser = await getCurrentUser();
  if (!authUser?.email) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const itemId = Number(params.id);
  if (!Number.isInteger(itemId) || itemId <= 0) {
    return NextResponse.json({ ok: false, error: "Invalid item id" }, { status: 400 });
  }

  try {
    const body = (await request.json()) as UpdateBody;
    const brand = toText(body.brand);
    const product = toText(body.product);
    const category = toText(body.category);
    const size = toText(body.size);
    const color = toText(body.color);
    const stylingIdea = toText(body.stylingIdea);

    const appUserId = await getOrCreateAppUserId(authUser.email);
    const admin = createServiceRoleSupabaseClient();

    const sizeDetail =
      color || stylingIdea
        ? {
            pairs: {
              ...(color ? { color } : {}),
              ...(stylingIdea ? { styling: stylingIdea } : {}),
            },
          }
        : null;

    const payload = {
      name: makeDisplayName(brand, product),
      category: category || null,
      size: size || null,
      size_detail: sizeDetail,
    };

    const { data, error } = await admin
      .from("item")
      .update(payload)
      .eq("id", itemId)
      .eq("user_id", appUserId)
      .select("id,name,category,size,size_detail")
      .maybeSingle();

    if (error) {
      return NextResponse.json({ ok: false, error: "Item update failed" }, { status: 500 });
    }
    if (!data) {
      return NextResponse.json({ ok: false, error: "Item not found" }, { status: 404 });
    }

    return NextResponse.json({ ok: true, item: data });
  } catch {
    return NextResponse.json({ ok: false, error: "Item update failed" }, { status: 500 });
  }
}
