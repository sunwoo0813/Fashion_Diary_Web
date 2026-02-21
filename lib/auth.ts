import { redirect } from "next/navigation";
import { headers } from "next/headers";
import type { User } from "@supabase/supabase-js";

import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function getCurrentUser() {
  const requestHeaders = headers();
  const authChecked = requestHeaders.get("x-auth-checked") === "1";
  const headerUserId = requestHeaders.get("x-auth-user-id");
  const headerEmail = requestHeaders.get("x-auth-user-email");

  if (authChecked) {
    if (headerUserId && headerEmail) {
      return {
        id: headerUserId,
        email: headerEmail,
      } as User;
    }
    return null;
  }

  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase.auth.getUser();

  if (error) return null;
  return data.user;
}

export async function requireUser(redirectTo = "/login") {
  const user = await getCurrentUser();
  if (!user) redirect(redirectTo);
  return user;
}
