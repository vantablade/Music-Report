/**
 * Access token accessor for the API client. Sources the current Supabase access token
 * (auto-refreshed by supabase-js); returns null when signed out.
 */
import { supabase } from "@/lib/supabase";

export async function getAccessToken(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}
