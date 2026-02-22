import { NextResponse, type NextRequest } from "next/server";

import { createServerClient, type CookieOptions } from "@supabase/ssr";

import { getSupabaseAnonKey, getSupabaseUrl } from "@/lib/env";

const AUTH_CACHE_TTL_MS = 60_000;

type CachedAuthState = {
  userId: string | null;
  email: string | null;
  expiresAt: number;
};

const authHeaderCache = new Map<string, CachedAuthState>();

function buildAuthCookieCacheKey(request: NextRequest): string | null {
  const authCookies = request.cookies
    .getAll()
    .filter((cookie) => cookie.name.includes("sb-") && cookie.name.includes("-auth-token"))
    .sort((a, b) => a.name.localeCompare(b.name));

  if (authCookies.length === 0) return null;
  return authCookies.map((cookie) => `${cookie.name}=${cookie.value}`).join(";");
}

function cleanupAuthCache(now: number) {
  for (const [key, value] of authHeaderCache.entries()) {
    if (value.expiresAt <= now) {
      authHeaderCache.delete(key);
    }
  }
}

export async function updateSupabaseSession(request: NextRequest) {
  const requestHeaders = new Headers(request.headers);
  requestHeaders.delete("x-auth-user-id");
  requestHeaders.delete("x-auth-user-email");
  requestHeaders.set("x-auth-checked", "1");

  const now = Date.now();
  cleanupAuthCache(now);

  const cacheKey = buildAuthCookieCacheKey(request);
  if (!cacheKey) {
    return NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });
  }

  const cached = authHeaderCache.get(cacheKey);
  if (cached && cached.expiresAt > now) {
    if (cached.userId && cached.email) {
      requestHeaders.set("x-auth-user-id", cached.userId);
      requestHeaders.set("x-auth-user-email", cached.email);
    }

    return NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });
  }

  let response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });

  const supabase = createServerClient(getSupabaseUrl(), getSupabaseAnonKey(), {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(
        cookiesToSet: { name: string; value: string; options: CookieOptions }[],
      ) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));

        response = NextResponse.next({
          request: {
            headers: requestHeaders,
          },
        });

        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  const { data } = await supabase.auth.getUser();
  const userId = data.user?.id ?? null;
  const email = data.user?.email ?? null;

  authHeaderCache.set(cacheKey, {
    userId,
    email,
    expiresAt: now + AUTH_CACHE_TTL_MS,
  });

  if (data.user?.id && data.user?.email) {
    requestHeaders.set("x-auth-user-id", data.user.id);
    requestHeaders.set("x-auth-user-email", data.user.email);
  }

  const finalResponse = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
  response.cookies.getAll().forEach((cookie) => {
    finalResponse.cookies.set(cookie);
  });
  return finalResponse;
}
