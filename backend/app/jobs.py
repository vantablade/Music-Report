"""In-process async job store for OMR scans.

OMR takes ~30-60s, so scans run in a background thread and the client polls. This deliberately
avoids Celery/Redis — a single local backend doesn't need them. Jobs live in memory (lost on
restart), which is fine: the mobile app persists the resulting MusicXML in its own library.
"""
from __future__ import annotations

import threading
import uuid
from concurrent.futures import ThreadPoolExecutor
from typing import Any, Callable

# Cap concurrent OMR runs (each loads ONNX models + is CPU-heavy).
_executor = ThreadPoolExecutor(max_workers=2)
_jobs: dict[str, dict[str, Any]] = {}
_lock = threading.Lock()


def create_job(title: str | None) -> str:
    job_id = uuid.uuid4().hex
    with _lock:
        _jobs[job_id] = {"status": "processing", "title": title, "musicxml": None, "error": None}
    return job_id


def submit(job_id: str, work: Callable[[], bytes]) -> None:
    """Run `work` (returns MusicXML bytes) in the background and record the outcome."""

    def _run() -> None:
        try:
            musicxml = work()
            with _lock:
                _jobs[job_id].update(status="ready", musicxml=musicxml.decode("utf-8"))
        except Exception as exc:  # noqa: BLE001 - surface any failure to the client
            with _lock:
                _jobs[job_id].update(status="failed", error=str(exc))

    _executor.submit(_run)


def get_job(job_id: str) -> dict[str, Any] | None:
    with _lock:
        job = _jobs.get(job_id)
        return dict(job) if job is not None else None
