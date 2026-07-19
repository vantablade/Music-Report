"""Smoke tests: app boots and the scan routes are wired."""
from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_health_ok():
    res = client.get("/health")
    assert res.status_code == 200
    assert res.json()["status"] == "ok"


def test_scan_routes_registered():
    paths = client.get("/openapi.json").json()["paths"]
    assert "/scan" in paths
    assert "/scan/{job_id}" in paths


def test_scan_requires_file():
    # Missing multipart file -> 422 from FastAPI validation.
    assert client.post("/scan").status_code == 422
