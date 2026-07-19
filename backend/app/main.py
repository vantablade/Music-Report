"""Sheet Music Trainer — OMR backend (homr).

A focused service: receive a sheet-music image, run EXIF-normalize -> homr -> auto-beam, and
return MusicXML. No auth/DB here — the mobile app persists results in its own local library;
auth/cloud storage come later.
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers import health, scan

app = FastAPI(title="Sheet Music Trainer OMR API", version="0.1.0")

# Local dev: the phone connects from another device (LAN/tunnel), so allow all origins.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router)
app.include_router(scan.router)
