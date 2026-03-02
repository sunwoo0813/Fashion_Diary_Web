"use server";

import { redirect } from "next/navigation";

import { getAppBaseUrl, isAuthEmailConfirmDisabled } from "@/lib/env";
import {
  createServerSupabaseClient,
  createServiceRoleSupabaseClient,
} from "@/lib/supabase/server";

function normalizeField(value: FormDataEntryValue | null): string {
  if (typeof value !== "string") return "";
  return value.trim();
}

function withQuery(path: string, query: Record<string, string | undefined>): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value) params.set(key, value);
  }
  const queryString = params.toString();
  return queryString ? `${path}?${queryString}` : path;
}

function buildRedirect(path: string, key: "error" | "message", text: string): never {
  const params = new URLSearchParams({ [key]: text });
  return redirect(`${path}?${params.toString()}`);
}

export async function loginAction(formData: FormData) {
  const email = normalizeField(formData.get("email")).toLowerCase();
  const password = normalizeField(formData.get("password"));

  if (!email || !password) {
    buildRedirect("/login", "error", "Email and password are required.");
  }

  const supabase = createServerSupabaseClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    buildRedirect("/login", "error", error.message || "Login failed.");
  }

  redirect("/dashboard");
}

export async function signupAction(formData: FormData) {
  const email = normalizeField(formData.get("email")).toLowerCase();
  const password = normalizeField(formData.get("password"));
  const confirmPassword = normalizeField(formData.get("confirm_password"));
  const signupPath = withQuery("/login", { mode: "signup" });

  if (!email || !password) {
    buildRedirect(signupPath, "error", "Email and password are required.");
  }
  if (confirmPassword && password !== confirmPassword) {
    buildRedirect(signupPath, "error", "Password confirmation does not match.");
  }

  const supabase = createServerSupabaseClient();

  if (isAuthEmailConfirmDisabled()) {
    const admin = createServiceRoleSupabaseClient();
    const { error: createError } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    if (createError && !/already|exists|registered/i.test(createError.message || "")) {
      buildRedirect(signupPath, "error", createError.message || "Signup failed.");
    }

    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
    if (signInError) {
      buildRedirect(signupPath, "error", signInError.message || "Signup failed.");
    }

    redirect("/dashboard");
  }

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { emailRedirectTo: getAppBaseUrl() },
  });

  if (error) {
    buildRedirect(signupPath, "error", error.message || "Signup failed.");
  }

  if (data.session) {
    redirect("/dashboard");
  }

  buildRedirect("/login", "message", "Signup complete. Verify your email then log in.");
}

export async function logoutAction() {
  const supabase = createServerSupabaseClient();
  await supabase.auth.signOut();
  redirect("/");
}
