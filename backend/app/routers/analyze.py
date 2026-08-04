"""Performance-analysis endpoints: upload a recording + reference score, poll for a report.

    POST /analyze          multipart {audio, musicxml}  -> {job_id, status}
    GET  /analyze/{job_id}                               -> {status, report?, error?}

The reference MusicXML travels with the request (the backend is stateless — the mobile app
owns the library), so analysis needs no stored scores.
"""
from __future__ import annotations

import os
import tempfile

from fastapi import APIRouter, File, Form, HTTPException, UploadFile

from app import jobs
from app.analysis.pipeline import analyze_performance

router = APIRouter(tags=["analyze"])

MAX_BYTES = 40 * 1024 * 1024  # ~40 MB — a few minutes of mono WAV


@router.post("/analyze")
async def create_analysis(
    audio: UploadFile = File(...),
    musicxml: str = Form(...),
    transposition: int = Form(0),
) -> dict:
    data = await audio.read()
    if not data:
        raise HTTPException(400, "Empty audio upload")
    if len(data) > MAX_BYTES:
        raise HTTPException(413, "Recording too large")
    if not musicxml.strip():
        raise HTTPException(400, "Missing reference score")

    suffix = os.path.splitext(audio.filename or "")[1] or ".wav"
    fd, path = tempfile.mkstemp(suffix=suffix)
    with os.fdopen(fd, "wb") as f:
        f.write(data)

    ref_bytes = musicxml.encode("utf-8")

    def work() -> dict:
        try:
            return analyze_performance(path, ref_bytes, transposition)
        finally:
            try:
                os.unlink(path)
            except OSError:
                pass

    job_id = jobs.create_job()
    jobs.submit(job_id, work)
    return {"job_id": job_id, "status": "processing"}


@router.get("/analyze/{job_id}")
def get_analysis(job_id: str) -> dict:
    job = jobs.get_job(job_id)
    if job is None:
        raise HTTPException(404, "Job not found")
    return {"status": job["status"], "report": job["result"], "error": job["error"]}
