import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth";
import { createServiceRoleSupabaseClient } from "@/lib/supabase/server";
import { normalizeProductSearchRows, toText } from "@/lib/wardrobe";

export async function GET(request: Request) {
  const authUser = await getCurrentUser();
  if (!authUser) {
    return NextResponse.json({ ok: false, error: "인증이 필요합니다." }, { status: 401 });
  }

  try {
    const url = new URL(request.url);
    const q = toText(url.searchParams.get("q"));
    if (!q) return NextResponse.json({ ok: true, items: [] });
    const escaped = q.replace(/,/g, "\\,");
    const match = `%${escaped}%`;

    const admin = createServiceRoleSupabaseClient();
    const { data, error } = await admin
      .from("products")
      .select("brand,name,category,size_table,image_path")
      .or(`brand.ilike.${match},name.ilike.${match}`)
      .order("brand")
      .order("name")
      .limit(12);
    if (error) {
      return NextResponse.json({ ok: false, error: "상품 검색에 실패했어요." }, { status: 500 });
    }

    return NextResponse.json({ ok: true, items: normalizeProductSearchRows(data || []) });
  } catch {
    return NextResponse.json({ ok: false, error: "상품 검색에 실패했어요." }, { status: 500 });
  }
}
