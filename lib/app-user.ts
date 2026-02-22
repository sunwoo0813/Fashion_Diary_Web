import { createServiceRoleSupabaseClient } from "@/lib/supabase/server";

import { requireUser } from "./auth";

const APP_USER_CACHE_TTL_MS = 5 * 60 * 1000;

type AppUserCacheEntry = {
  appUserId: number;
  expiresAt: number;
};

const appUserCacheByEmail = new Map<string, AppUserCacheEntry>();

function cleanupExpiredAppUserCache(now: number) {
  for (const [key, entry] of appUserCacheByEmail.entries()) {
    if (entry.expiresAt <= now) {
      appUserCacheByEmail.delete(key);
    }
  }
}

function readCachedAppUserId(email: string, now: number): number | null {
  const cached = appUserCacheByEmail.get(email);
  if (!cached) return null;
  if (cached.expiresAt <= now) {
    appUserCacheByEmail.delete(email);
    return null;
  }
  return cached.appUserId;
}

function writeCachedAppUserId(email: string, appUserId: number, now: number) {
  appUserCacheByEmail.set(email, {
    appUserId,
    expiresAt: now + APP_USER_CACHE_TTL_MS,
  });
}

export type AppUserContext = {
  appUserId: number;
  email: string;
  authUserId: string;
};

export async function requireAppUserContext(): Promise<AppUserContext> {
  const authUser = await requireUser();
  const email = (authUser.email || "").trim().toLowerCase();
  if (!email) {
    throw new Error("Authenticated user email is missing.");
  }

  const appUserId = await getOrCreateAppUserId(email);
  return {
    appUserId,
    email,
    authUserId: authUser.id,
  };
}

export async function getOrCreateAppUserId(emailInput: string): Promise<number> {
  const email = emailInput.trim().toLowerCase();
  if (!email) {
    throw new Error("Email is required to resolve app user.");
  }

  const now = Date.now();
  cleanupExpiredAppUserCache(now);
  const cachedAppUserId = readCachedAppUserId(email, now);
  if (cachedAppUserId) {
    return cachedAppUserId;
  }

  const admin = createServiceRoleSupabaseClient();

  const { data: existing, error: lookupError } = await admin
    .from("user")
    .select("id,email")
    .eq("email", email)
    .maybeSingle();
  if (lookupError) {
    throw new Error(`App user lookup failed: ${lookupError.message}`);
  }

  if (existing?.id) {
    const appUserId = Number(existing.id);
    writeCachedAppUserId(email, appUserId, now);
    return appUserId;
  }

  const { data: created, error: insertError } = await admin
    .from("user")
    .insert({ email })
    .select("id,email")
    .single();
  if (insertError || !created?.id) {
    throw new Error(`App user create failed: ${insertError?.message || "unknown error"}`);
  }

  const appUserId = Number(created.id);
  writeCachedAppUserId(email, appUserId, now);
  return appUserId;
}
