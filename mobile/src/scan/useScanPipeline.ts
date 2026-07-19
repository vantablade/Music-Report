/**
 * Orchestrates one scan against the homr backend: upload image+title -> poll until the
 * MusicXML is ready. The screen then saves the result into the local library.
 */
import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";

import { createScan, getScanJob, type ScanStatus } from "@/api/scan";

export type ScanPhase = "idle" | "uploading" | "processing" | "ready" | "failed";

export function useScanPipeline() {
  const [jobId, setJobId] = useState<string | null>(null);
  const [phase, setPhase] = useState<ScanPhase>("idle");
  const [error, setError] = useState<string | null>(null);

  const submit = useMutation({
    mutationFn: async (input: { uri: string; title: string }) => {
      setError(null);
      setPhase("uploading");
      const { job_id } = await createScan(input.uri, input.title);
      setJobId(job_id);
      setPhase("processing");
      return job_id;
    },
    onError: (e) => {
      setError((e as Error).message);
      setPhase("failed");
    },
  });

  const job = useQuery({
    queryKey: ["scan", jobId],
    queryFn: () => getScanJob(jobId as string),
    enabled: phase === "processing" && !!jobId,
    refetchInterval: (query) => {
      const status = query.state.data?.status as ScanStatus | undefined;
      return status === "ready" || status === "failed" ? false : 2500;
    },
  });

  const status = job.data?.status;
  const resolvedPhase: ScanPhase =
    status === "ready" ? "ready" : status === "failed" ? "failed" : phase;

  function reset() {
    setJobId(null);
    setPhase("idle");
    setError(null);
  }

  return {
    phase: resolvedPhase,
    error: error ?? job.data?.error ?? null,
    musicxml: job.data?.musicxml ?? null,
    start: submit.mutate,
    reset,
  };
}
