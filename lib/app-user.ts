import { createServiceRoleSupabaseClient } from "@/lib/supabase/server";

import { requireUser } from "./auth";

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
    return Number(existing.id);
  }

  const { data: created, error: insertError } = await admin
    .from("user")
    .insert({ email })
    .select("id,email")
    .single();
  if (insertError || !created?.id) {
    throw new Error(`App user create failed: ${insertError?.message || "unknown error"}`);
  }

  return Number(created.id);
}
