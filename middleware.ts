import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { updateSupabaseSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  const purpose = request.headers.get("purpose");
  const isPrefetch =
    purpose === "prefetch" || request.headers.has("next-router-prefetch");
  if (isPrefetch) {
    return NextResponse.next();
  }

  return updateSupabaseSession(request);
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/wardrobe/:path*",
    "/diary/:path*",
    "/stats/:path*",
    "/account/:path*",
    "/outfits/:path*",
    "/login",
    "/signup",
    "/api/:path*",
  ],
};
