import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from mangum import Mangum

from app.config import get_settings
from app.routers import extract

settings = get_settings()

# ── 로깅 ──
logging.basicConfig(
    level=settings.log_level,
    format="%(asctime)s %(levelname)s [%(name)s] %(message)s",
)

app = FastAPI(
    title="Planner AI Service",
    description="AI 기반 일정 추출 서비스 (Google Gemini)",
    version="1.0.0",
)

cors_origins = settings.cors_origins.split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in cors_origins],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(extract.router, prefix="/api/ai/v1", tags=["AI"])


@app.get("/health")
async def health():
    return {"status": "ok"}


# ── AWS Lambda 어댑터 ──
handler = Mangum(app, lifespan="off")
