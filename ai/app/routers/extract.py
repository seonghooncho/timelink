import logging
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from app.services.gemini_service import extract_schedule_from_image

logger = logging.getLogger(__name__)
router = APIRouter()


class ExtractRequest(BaseModel):
    imageBase64: str = Field(..., min_length=1, description="base64 인코딩된 이미지 (data URI 또는 raw)")


class ExtractResponse(BaseModel):
    title: str = ""
    content: str = ""
    category: str = "task"
    startDate: str = ""
    startTime: str = ""
    endDate: str = ""
    endTime: str = ""
    duration: float = 0
    isImportant: bool = False


@router.post("/extract-schedule", response_model=ExtractResponse)
async def extract_schedule(req: ExtractRequest):
    """이미지에서 일정 정보를 AI로 추출합니다."""
    try:
        result = await extract_schedule_from_image(req.imageBase64)
        return result
    except ValueError as e:
        logger.warning(f"추출 실패 (클라이언트 오류): {e}")
        raise HTTPException(status_code=400, detail=str(e))
    except RuntimeError as e:
        logger.error(f"추출 실패 (서버 오류): {e}")
        raise HTTPException(status_code=500, detail=str(e))
    except Exception as e:
        logger.exception("예상치 못한 오류")
        raise HTTPException(status_code=500, detail="일정 추출 중 오류가 발생했습니다")
