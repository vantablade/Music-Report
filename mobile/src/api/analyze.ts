/**
 * Performance-analysis API client.
 *   POST /analyze         multipart {audio, musicxml} -> { job_id }
 *   GET  /analyze/{id}                                 -> { status, report?, error? }
 */
import { getBackendUrl } from "@/config/backend";

export type AnalysisStatus = "processing" | "ready" | "failed";

export interface AnalysisNote {
  index: number;
  expected_midi: number;
  played_midi: number | null;
  pitch: "correct" | "wrong" | "missed";
  cents: number | null;
  timing: "on" | "early" | "late" | null;
  timing_ms: number | null;
  loudness: number | null;
}

export interface AnalysisReport {
  overall: number;
  pitch: { accuracy: number; correct: number; wrong: number; missed: number; extra: number };
  rhythm: { graded: boolean; accuracy: number; tempo_bpm: number | null; on_time: number; off: number };
  dynamics: { graded: boolean; score: number | null; accents: number[] };
  notes: AnalysisNote[];
  extras: { played_midi: number; time_s: number }[];
}

export interface AnalysisJob {
  status: AnalysisStatus;
  report: AnalysisReport | null;
  error: string | null;
}

export interface AudioFile {
  uri: string;
  name: string;
  type: string;
}

export async function createAnalysis(
  file: AudioFile,
  musicxml: string,
  transposition = 0,
): Promise<{ job_id: string }> {
  const base = await getBackendUrl();
  const form = new FormData();
  form.append("audio", { uri: file.uri, name: file.name, type: file.type } as unknown as Blob);
  form.append("musicxml", musicxml);
  form.append("transposition", String(transposition));

  const res = await fetch(`${base}/analyze`, { method: "POST", body: form });
  if (!res.ok) {
    throw new Error(`Upload failed (${res.status}): ${await res.text().catch(() => "")}`);
  }
  return res.json();
}

export async function getAnalysis(jobId: string): Promise<AnalysisJob> {
  const base = await getBackendUrl();
  const res = await fetch(`${base}/analyze/${jobId}`);
  if (!res.ok) throw new Error(`Poll failed (${res.status})`);
  return res.json();
}
