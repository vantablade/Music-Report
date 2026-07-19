"""Scan endpoints: upload an image, poll for the recognized (beamed) MusicXML.

    POST /scan            multipart {file, title?}  -> {job_id, status}
    GET  /scan/{job_id}                              -> {status, title, musicxml?, error?}
"""
from __future__ import annotations

from fastapi import APIRouter, File, Form, HTTPException, UploadFile

from app import jobs
from app.omr.pipeline import scan_image

router = APIRouter(tags=["scan"])

MAX_BYTES = 25 * 1024 * 1024  # 25 MB — phone photos are a few MB; guard against huge uploads.


@router.post("/scan")
async def create_scan(
    file: UploadFile = File(...),
    title: str | None = Form(None),
) -> dict:
    data = await file.read()
    if not data:
        raise HTTPException(400, "Empty upload")
    if len(data) > MAX_BYTES:
        raise HTTPException(413, "Image too large")

    job_id = jobs.create_job(title)
    jobs.submit(job_id, lambda: scan_image(data))
    return {"job_id": job_id, "status": "processing"}


@router.get("/scan/{job_id}")
def get_scan(job_id: str) -> dict:
    job = jobs.get_job(job_id)
    if job is None:
        raise HTTPException(404, "Job not found")
    return {
        "status": job["status"],
        "title": job["title"],
        "musicxml": job["musicxml"],
        "error": job["error"],
    }
