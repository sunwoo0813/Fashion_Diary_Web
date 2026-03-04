import { NextResponse } from "next/server";

import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function POST() {
  const supabase = createServerSupabaseClient();
  const { error } = await supabase.auth.signOut();

  if (error) {
    return NextResponse.json({ ok: false, error: error.message || "로그아웃에 실패했어요." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
