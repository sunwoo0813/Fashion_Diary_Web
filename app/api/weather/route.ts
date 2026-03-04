import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth";
import { hasWeatherApiKey } from "@/lib/env";
import { getTodayWeatherSummary } from "@/lib/weather";

function readCity(request: Request): string {
  const url = new URL(request.url);
  const city = (url.searchParams.get("city") || "").trim();
  return city || "서울";
}

export async function GET(request: Request) {
  const authUser = await getCurrentUser();
  if (!authUser) {
    return NextResponse.json({ ok: false, error: "인증이 필요합니다." }, { status: 401 });
  }

  if (!hasWeatherApiKey()) {
    return NextResponse.json({ ok: false, error: "날씨 API 키가 설정되지 않았어요." }, { status: 500 });
  }

  const city = readCity(request);
  const weather = await getTodayWeatherSummary(city);
  if (!weather) {
    return NextResponse.json({ ok: false, error: "날씨 정보를 찾을 수 없어요." }, { status: 404 });
  }

  return NextResponse.json({ ok: true, data: weather });
}
