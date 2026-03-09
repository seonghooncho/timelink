# ── Stage 1: 빌드 ──
FROM python:3.12-slim AS builder

WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir --target /app/deps -r requirements.txt

# ── Stage 2: 런타임 (Lambda Container Image) ──
FROM public.ecr.aws/lambda/python:3.12

WORKDIR ${LAMBDA_TASK_ROOT}

COPY --from=builder /app/deps ${LAMBDA_TASK_ROOT}
COPY app ${LAMBDA_TASK_ROOT}/app

CMD ["app.main.handler"]
