# Start the OMR backend locally using the omr-eval venv (which has homr + music21).
# Binds 0.0.0.0 so a phone can reach it over the LAN / an ngrok tunnel.
#
# NOTE: uses .venv-signed, a venv built on a SAC-trusted signed python.org 3.12.
# The old uv-managed .venv is blocked by Smart App Control (unsigned _ssl.pyd etc.),
# so uvicorn/homr won't start there. See ../CLAUDE.md "Gotchas".
$ErrorActionPreference = "Stop"
$venv = Join-Path $PSScriptRoot "..\omr-eval\.venv-signed\Scripts"
$env:HOMR_BIN = (Resolve-Path (Join-Path $venv "homr.exe")).Path
Write-Host "HOMR_BIN = $env:HOMR_BIN"
Write-Host "Starting OMR backend on http://0.0.0.0:8000 (docs at /docs)"
& (Join-Path $venv "python.exe") -m uvicorn app.main:app --host 0.0.0.0 --port 8000
