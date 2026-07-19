/**
 * Backend base URL, configurable at runtime.
 *
 * The OMR backend runs on the dev's PC and is reached via an ngrok tunnel whose URL changes
 * each session (free tier). So instead of baking it into the build, we store it locally and
 * let the user paste the current URL in Settings. Falls back to the build-time EXPO_PUBLIC_API_URL.
 */
import AsyncStorage from "@react-native-async-storage/async-storage";

import { env } from "@/config/env";

const KEY = "smt.backend_url";

export async function getBackendUrl(): Promise<string> {
  const stored = await AsyncStorage.getItem(KEY);
  return (stored || env.apiUrl).replace(/\/+$/, "");
}

export async function setBackendUrl(url: string): Promise<void> {
  await AsyncStorage.setItem(KEY, url.trim());
}
