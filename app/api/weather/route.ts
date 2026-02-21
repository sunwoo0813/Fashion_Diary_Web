import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth";
import { hasWeatherApiKey } from "@/lib/env";
import { getTodayWeatherSummary } from "@/lib/weather";

function readCity(request: Request): string {
  const url = new URL(request.url);
  const city = (url.searchParams.get("city") || "").trim();
  return city || "Seoul";
}

export async function GET(request: Request) {
  const authUser = await getCurrentUser();
  if (!authUser) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  if (!hasWeatherApiKey()) {
    return NextResponse.json({ ok: false, error: "weather api key not set" }, { status: 500 });
  }

  const city = readCity(request);
  const weather = await getTodayWeatherSummary(city);
  if (!weather) {
    return NextResponse.json({ ok: false, error: "weather not available" }, { status: 404 });
  }

  return NextResponse.json({ ok: true, data: weather });
}
