import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth";
import { createServiceRoleSupabaseClient } from "@/lib/supabase/server";
import { normalizeProductSearchRows, toText } from "@/lib/wardrobe";

export async function GET(request: Request) {
  const authUser = await getCurrentUser();
  if (!authUser) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const url = new URL(request.url);
    const q = toText(url.searchParams.get("q"));
    if (!q) return NextResponse.json({ ok: true, items: [] });

    const admin = createServiceRoleSupabaseClient();
    const { data, error } = await admin
      .from("products")
      .select("brand,name,category,size_table,image_path")
      .ilike("brand", `%${q}%`)
      .order("brand")
      .limit(12);
    if (error) {
      return NextResponse.json({ ok: false, error: "Product search failed" }, { status: 500 });
    }

    return NextResponse.json({ ok: true, items: normalizeProductSearchRows(data || []) });
  } catch {
    return NextResponse.json({ ok: false, error: "Product search failed" }, { status: 500 });
  }
}
