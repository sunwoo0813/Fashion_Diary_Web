function getEnv(...keys: string[]): string | undefined {
  for (const key of keys) {
    const value = process.env[key];
    if (value && value.trim()) return value.trim();
  }
  return undefined;
}

function requireEnv(name: string, ...keys: string[]): string {
  const value = getEnv(...keys);
  if (!value) {
    throw new Error(`Missing environment variable for ${name}: tried ${keys.join(", ")}`);
  }
  return value;
}

export function getSupabaseUrl(): string {
  return requireEnv("Supabase URL", "NEXT_PUBLIC_SUPABASE_URL");
}

export function getSupabaseAnonKey(): string {
  return requireEnv("Supabase anon key", "NEXT_PUBLIC_SUPABASE_ANON_KEY");
}

export function getSupabaseServiceRoleKey(): string {
  return requireEnv("Supabase service role key", "SUPABASE_SERVICE_ROLE_KEY");
}

export function getSupabaseBucket(): string {
  return getEnv("SUPABASE_BUCKET") ?? "uploads";
}

export function getAppBaseUrl(): string {
  return getEnv("APP_BASE_URL") ?? "http://localhost:3000";
}

export function getWeatherApiKey(): string {
  return requireEnv("Weather API key", "WEATHER_API_KEY", "KMA_API_KEY");
}

export function hasWeatherApiKey(): boolean {
  return Boolean(getEnv("WEATHER_API_KEY", "KMA_API_KEY"));
}

export function isAuthEmailConfirmDisabled(): boolean {
  const raw = getEnv("AUTH_DISABLE_EMAIL_CONFIRM");
  if (!raw) return false;
  return ["1", "true", "yes", "on"].includes(raw.toLowerCase());
}
