import { NextResponse } from "next/server";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import {
  mergePreferredRegionMetadata,
  readPreferredRegionFromMetadata,
  type PreferredRegion,
} from "@/lib/user-preferences";

function toText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

async function requireAuthUser() {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) {
    return { supabase, user: null };
  }
  return { supabase, user: data.user };
}

export async function GET() {
  const { user } = await requireAuthUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: "Authentication is required." }, { status: 401 });
  }

  const preferredRegion = readPreferredRegionFromMetadata(user.user_metadata);
  return NextResponse.json({ ok: true, data: preferredRegion });
}

export async function POST(request: Request) {
  const { supabase, user } = await requireAuthUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: "Authentication is required." }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as
    | { preferredRegion?: Partial<PreferredRegion> | null }
    | null;

  const preferredRegionInput = body?.preferredRegion;
  const sidoId = toText(preferredRegionInput?.sidoId);
  const sigunguId = toText(preferredRegionInput?.sigunguId);
  const nextPreferredRegion =
    sidoId && sigunguId ? { sidoId, sigunguId } : null;

  const nextMetadata = mergePreferredRegionMetadata(user.user_metadata, nextPreferredRegion);
  const { data, error } = await supabase.auth.updateUser({
    data: nextMetadata,
  });

  if (error || !data.user) {
    return NextResponse.json(
      { ok: false, error: "Failed to update preferred region." },
      { status: 500 },
    );
  }

  return NextResponse.json({
    ok: true,
    data: readPreferredRegionFromMetadata(data.user.user_metadata),
  });
}
