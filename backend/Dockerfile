# OMR backend: FastAPI + homr (ONNX). Single service, no Java/Redis/DB.
FROM python:3.12-slim

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    HOMR_BIN=homr

WORKDIR /app

# homr's opencv + rendering need a couple of shared libs.
RUN apt-get update && apt-get install -y --no-install-recommends \
    libgl1 libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

COPY pyproject.toml ./
RUN pip install --no-cache-dir --upgrade pip && pip install --no-cache-dir .

# Bake homr's models into the image so the first scan isn't a slow download.
RUN homr --init

COPY app ./app

EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
