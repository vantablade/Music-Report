/**
 * Supabase client for the mobile app. Auth session is persisted in AsyncStorage and
 * auto-refreshed. The access token is attached to backend requests via api/client.
 *
 * NOTE: AsyncStorage is unencrypted. This follows Supabase's documented Expo pattern; for
 * production, wrap it in a SecureStore-encrypted adapter (a "LargeSecureStore").
 */
import "react-native-url-polyfill/auto";

import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";

import { env } from "@/config/env";

// Fall back to harmless placeholders so createClient never throws when running with the
// dev auth bypass (no Supabase configured). Auth calls simply do nothing in that mode.
const url = env.supabaseUrl || "https://placeholder.supabase.co";
const anonKey = env.supabaseAnonKey || "public-anon-placeholder";

export const supabase = createClient(url, anonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
