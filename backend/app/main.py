"""Sheet Music Trainer backend.

Two focused services, no auth/DB (the mobile app owns the library):
  - /scan     image -> EXIF-normalize -> homr -> auto-beam -> MusicXML
  - /analyze  recording + reference MusicXML -> pitch/rhythm/dynamics feedback report
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers import analyze, health, scan

app = FastAPI(title="Sheet Music Trainer API", version="0.2.0")

# Local dev: the phone connects from another device (LAN/tunnel), so allow all origins.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router)
app.include_router(scan.router)
app.include_router(analyze.router)
