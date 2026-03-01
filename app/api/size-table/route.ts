import { NextResponse } from "next/server";

import { POST as postProductMetadata } from "@/app/api/product-metadata/route";

export async function POST(request: Request) {
  let body: unknown = null;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request body." }, { status: 400 });
  }

  const payload =
    body && typeof body === "object"
      ? { ...(body as Record<string, unknown>), __route: "/api/size-table" }
      : { __route: "/api/size-table" };

  const forwardRequest = new Request(new URL("/api/product-metadata", request.url), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  return postProductMetadata(forwardRequest);
}

