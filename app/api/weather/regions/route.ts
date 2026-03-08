import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth";
import { KOREA_REGION_COORDINATES } from "@/lib/korea-region-coordinates";

export async function GET() {
  const authUser = await getCurrentUser();
  if (!authUser) {
    return NextResponse.json(
      { ok: false, error: "Authentication is required." },
      { status: 401 },
    );
  }

  return NextResponse.json({ ok: true, data: KOREA_REGION_COORDINATES });
}
