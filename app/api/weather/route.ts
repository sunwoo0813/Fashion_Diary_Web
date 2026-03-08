import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth";
import { hasWeatherApiKey } from "@/lib/env";
import { getTodayWeatherSummary } from "@/lib/weather";

function readCity(request: Request): string {
  const url = new URL(request.url);
  const city = (url.searchParams.get("city") || "").trim();
  return city || "Seoul";
}

function readLocation(
  request: Request,
): { lat: number; lon: number; displayName?: string } | undefined {
  const url = new URL(request.url);
  const lat = Number(url.searchParams.get("lat"));
  const lon = Number(url.searchParams.get("lon"));
  const displayName = (url.searchParams.get("displayName") || "").trim();

  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return undefined;
  return { lat, lon, displayName: displayName || undefined };
}

export async function GET(request: Request) {
  const authUser = await getCurrentUser();
  if (!authUser) {
    return NextResponse.json(
      { ok: false, error: "Authentication is required." },
      { status: 401 },
    );
  }

  if (!hasWeatherApiKey()) {
    return NextResponse.json(
      { ok: false, error: "Weather API key is not configured." },
      { status: 500 },
    );
  }

  const city = readCity(request);
  const location = readLocation(request);
  const weather = await getTodayWeatherSummary(city, location);
  if (!weather) {
    return NextResponse.json(
      { ok: false, error: "Weather information was not found." },
      { status: 404 },
    );
  }

  return NextResponse.json({ ok: true, data: weather });
}
