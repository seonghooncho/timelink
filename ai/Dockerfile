# ── Stage 1: 빌드 ──
FROM python:3.12-slim AS builder

WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir --target /app/deps -r requirements.txt

# ── Stage 2: 런타임 (Lambda 호환) ──
FROM python:3.12-slim

WORKDIR /app

# 의존성 복사
COPY --from=builder /app/deps /app/deps
ENV PYTHONPATH="/app/deps:${PYTHONPATH}"

COPY . .

EXPOSE 8000

# 로컬: uvicorn / Lambda: handler (mangum)
CMD ["python", "-m", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
