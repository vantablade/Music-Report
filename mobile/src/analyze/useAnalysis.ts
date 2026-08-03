/**
 * Orchestrates one performance analysis: upload audio + reference MusicXML -> poll until the
 * feedback report is ready. Mirrors useScanPipeline; the screen renders the report.
 */
import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";

import { createAnalysis, getAnalysis, type AnalysisStatus, type AudioFile } from "@/api/analyze";

export type AnalysisPhase = "idle" | "uploading" | "analyzing" | "ready" | "failed";

export function useAnalysis() {
  const [jobId, setJobId] = useState<string | null>(null);
  const [phase, setPhase] = useState<AnalysisPhase>("idle");
  const [error, setError] = useState<string | null>(null);

  const submit = useMutation({
    mutationFn: async (input: { file: AudioFile; musicxml: string }) => {
      setError(null);
      setPhase("uploading");
      const { job_id } = await createAnalysis(input.file, input.musicxml);
      setJobId(job_id);
      setPhase("analyzing");
      return job_id;
    },
    onError: (e) => {
      setError((e as Error).message);
      setPhase("failed");
    },
  });

  const job = useQuery({
    queryKey: ["analysis", jobId],
    queryFn: () => getAnalysis(jobId as string),
    enabled: phase === "analyzing" && !!jobId,
    refetchInterval: (query) => {
      const status = query.state.data?.status as AnalysisStatus | undefined;
      return status === "ready" || status === "failed" ? false : 2000;
    },
  });

  const status = job.data?.status;
  const resolvedPhase: AnalysisPhase =
    status === "ready" ? "ready" : status === "failed" ? "failed" : phase;

  function reset() {
    setJobId(null);
    setPhase("idle");
    setError(null);
  }

  return {
    phase: resolvedPhase,
    error: error ?? job.data?.error ?? null,
    report: job.data?.report ?? null,
    start: submit.mutate,
    reset,
  };
}
