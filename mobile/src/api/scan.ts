/**
 * Scan API client for the homr OMR backend.
 *   POST /scan       multipart {file, title} -> { job_id }
 *   GET  /scan/{id}                          -> { status, title, musicxml?, error? }
 */
import { getBackendUrl } from "@/config/backend";

export type ScanStatus = "processing" | "ready" | "failed";

export interface ScanJob {
  status: ScanStatus;
  title: string | null;
  musicxml: string | null;
  error: string | null;
}

export async function createScan(imageUri: string, title: string): Promise<{ job_id: string }> {
  const base = await getBackendUrl();
  const form = new FormData();
  // React Native FormData file shape.
  form.append("file", { uri: imageUri, name: "scan.jpg", type: "image/jpeg" } as unknown as Blob);
  form.append("title", title);

  const res = await fetch(`${base}/scan`, { method: "POST", body: form });
  if (!res.ok) {
    throw new Error(`Upload failed (${res.status}): ${await res.text().catch(() => "")}`);
  }
  return res.json();
}

export async function getScanJob(jobId: string): Promise<ScanJob> {
  const base = await getBackendUrl();
  const res = await fetch(`${base}/scan/${jobId}`);
  if (!res.ok) throw new Error(`Poll failed (${res.status})`);
  return res.json();
}

/** Quick reachability check for the Settings screen. */
export async function pingBackend(): Promise<{ ok: boolean; detail: string }> {
  try {
    const base = await getBackendUrl();
    const res = await fetch(`${base}/health`);
    if (!res.ok) return { ok: false, detail: `HTTP ${res.status}` };
    const body = await res.json();
    return { ok: true, detail: `${body.service} v${body.version}` };
  } catch (e) {
    return { ok: false, detail: (e as Error).message };
  }
}
