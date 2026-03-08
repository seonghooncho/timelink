import logging
import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from mangum import Mangum

from app.routers import extract

load_dotenv()

# ── 로깅 ──
logging.basicConfig(
    level=os.getenv("LOG_LEVEL", "INFO"),
    format="%(asctime)s %(levelname)s [%(name)s] %(message)s",
)

app = FastAPI(
    title="Planner AI Service",
    description="AI 기반 일정 추출 서비스 (Google Gemini)",
    version="1.0.0",
)

cors_origins = os.getenv("CORS_ORIGINS", "http://localhost:5173").split(",")

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
