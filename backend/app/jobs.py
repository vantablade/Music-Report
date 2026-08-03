"""In-process async job store for slow work (OMR scans, performance analysis).

Work runs in a background thread; the client polls. Deliberately no Celery/Redis — a single
local backend doesn't need them. Jobs live in memory (lost on restart), which is fine: the
mobile app persists the meaningful results in its own library.
"""
from __future__ import annotations

import threading
import uuid
from concurrent.futures import ThreadPoolExecutor
from typing import Any, Callable

# Cap concurrent runs (OMR loads ONNX models; pyin is CPU-heavy).
_executor = ThreadPoolExecutor(max_workers=2)
_jobs: dict[str, dict[str, Any]] = {}
_lock = threading.Lock()


def create_job(meta: dict[str, Any] | None = None) -> str:
    job_id = uuid.uuid4().hex
    with _lock:
        _jobs[job_id] = {"status": "processing", "result": None, "error": None, "meta": meta or {}}
    return job_id


def submit(job_id: str, work: Callable[[], Any]) -> None:
    """Run `work` (returns a JSON-serialisable result) in the background; record the outcome."""

    def _run() -> None:
        try:
            result = work()
            with _lock:
                _jobs[job_id].update(status="ready", result=result)
        except Exception as exc:  # noqa: BLE001 - surface any failure to the client
            with _lock:
                _jobs[job_id].update(status="failed", error=str(exc))

    _executor.submit(_run)


def get_job(job_id: str) -> dict[str, Any] | None:
    with _lock:
        job = _jobs.get(job_id)
        return dict(job) if job is not None else None
