/**
 * Backend health + authenticated-ping endpoints. Used by the Phase 0 home screen
 * to prove the app can reach and authenticate against the backend.
 */
import { apiFetch } from "@/api/client";

export interface HealthResponse {
  status: "ok";
  service: string;
  version: string;
}

export interface MeResponse {
  user_id: string;
  email: string | null;
}

/** Unauthenticated liveness check. */
export function getHealth(): Promise<HealthResponse> {
  return apiFetch<HealthResponse>("/health");
}

/** Authenticated ping — validates the Supabase JWT round-trips to the backend. */
export function getMe(): Promise<MeResponse> {
  return apiFetch<MeResponse>("/me");
}
