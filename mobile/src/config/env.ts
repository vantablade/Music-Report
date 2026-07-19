/**
 * Typed access to public runtime config. Values come from EXPO_PUBLIC_* env vars
 * (see .env.example). These are embedded in the client bundle — never secrets.
 */

function required(name: string, value: string | undefined): string {
  if (!value) {
    // Fail loud in dev; a missing API URL is a misconfiguration, not a runtime edge case.
    console.warn(`[config] Missing env var ${name}. Falling back to a placeholder.`);
    return "";
  }
  return value;
}

export const env = {
  apiUrl: required("EXPO_PUBLIC_API_URL", process.env.EXPO_PUBLIC_API_URL) || "http://localhost:8000",
  supabaseUrl: required("EXPO_PUBLIC_SUPABASE_URL", process.env.EXPO_PUBLIC_SUPABASE_URL),
  supabaseAnonKey: required("EXPO_PUBLIC_SUPABASE_ANON_KEY", process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY),
  /** Dev-only: skip the Supabase sign-in gate so the app runs with no backend. */
  devNoAuth: process.env.EXPO_PUBLIC_DEV_NO_AUTH === "true",
} as const;
