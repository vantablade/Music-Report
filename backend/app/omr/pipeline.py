"""OMR pipeline: EXIF-normalize -> homr -> auto-beam -> MusicXML.

homr is invoked as a CLI (it writes `<name>.musicxml` next to its input). We shell out to it
in a temp dir, then post-process. The engine choice (homr over Audiveris) was validated by a
bake-off on real phone photos — homr wins on accuracy and handles photos/low-res directly.
"""
from __future__ import annotations

import io
import os
import subprocess
import tempfile
from pathlib import Path

from PIL import Image, ImageOps

from app.omr.beaming import auto_beam


class OmrError(RuntimeError):
    """Raised when the OMR engine fails or produces no output."""


def _homr_bin() -> str:
    # Overridable so local dev can point at a venv's homr.exe; Docker uses PATH.
    return os.environ.get("HOMR_BIN", "homr")


def exif_normalize(image_bytes: bytes) -> Image.Image:
    """Apply the JPEG EXIF orientation so the pixels are upright.

    Phone photos carry an orientation tag that raw-pixel readers (incl. homr's) ignore, which
    is why a sideways-looking photo can still be fine — or a fine-looking one can be sideways.
    Normalizing here makes OMR robust to how the photo was taken.
    """
    img = Image.open(io.BytesIO(image_bytes))
    img = ImageOps.exif_transpose(img)
    return img.convert("RGB")


def scan_image(image_bytes: bytes, *, timeout: int = 300) -> bytes:
    """Run the full pipeline on one image; returns beamed MusicXML bytes."""
    with tempfile.TemporaryDirectory() as tmp:
        tmp_dir = Path(tmp)
        src = tmp_dir / "input.png"
        exif_normalize(image_bytes).save(src)

        try:
            proc = subprocess.run(
                [_homr_bin(), str(src)],
                capture_output=True,
                text=True,
                timeout=timeout,
            )
        except FileNotFoundError as exc:
            raise OmrError(f"homr binary not found ({_homr_bin()})") from exc
        except subprocess.TimeoutExpired as exc:
            raise OmrError("homr timed out") from exc

        out = tmp_dir / "input.musicxml"
        if proc.returncode != 0 or not out.exists():
            raise OmrError(f"homr failed:\n{(proc.stderr or '')[-1500:]}")

        return auto_beam(out.read_bytes())
