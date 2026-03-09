import os
import json
import base64
import re
import asyncio
import logging
from datetime import date
from functools import lru_cache
from io import BytesIO

import google.generativeai as genai
from google.api_core.exceptions import GoogleAPICallError, InvalidArgument, ResourceExhausted

from app.config import get_settings

logger = logging.getLogger(__name__)

# ── 설정 ──
MAX_IMAGE_DIMENSION = 1024  # 비용·속도 최적화: 긴 변 기준 리사이즈
MAX_BASE64_LENGTH = 10 * 1024 * 1024  # 10 MB 원본 제한
REQUEST_TIMEOUT = 30  # seconds

SYSTEM_PROMPT = """You are a schedule extraction assistant. Analyze the uploaded image and extract schedule/event information from it. The image might be a screenshot of a message, poster, flyer, calendar, or any document containing schedule info.

Today's date is {today}. If the year is not specified, assume the current year.

Extract the following fields and return ONLY valid JSON (no markdown, no explanation):
{{
  "title": "event/schedule title",
  "content": "description or details",
  "category": "task" | "appointment" | "group" | "repeat",
  "startDate": "YYYY-MM-DD",
  "startTime": "HH:MM",
  "endDate": "YYYY-MM-DD or empty",
  "endTime": "HH:MM or empty",
  "duration": number (hours, estimate if not explicit),
  "isImportant": boolean
}}

Rules:
- category: use "appointment" for meetings/events, "task" for todos/deadlines, "group" for group activities, "repeat" for recurring items
- If you can't determine a field, use a reasonable default or empty string
- duration: estimate based on start/end time, or event type (meeting ~1h, class ~1.5h, etc.)
- isImportant: true if the image suggests urgency or importance
- Return ONLY the JSON object, nothing else"""


# ── 초기화 (앱 시작 시 1회) ──

@lru_cache(maxsize=1)
def _get_model() -> genai.GenerativeModel:
    """Gemini 모델을 한 번만 초기화하고 캐시합니다."""
    gemini_api_key = get_settings().gemini_api_key
    if not gemini_api_key:
        raise RuntimeError("GEMINI_API_KEY is not configured")
    genai.configure(api_key=gemini_api_key)
    return genai.GenerativeModel(
        "gemini-2.5-flash",
        generation_config=genai.GenerationConfig(
            temperature=0.1,  # 낮은 temperature로 일관된 JSON 출력
            max_output_tokens=512,  # 일정 JSON은 작으므로 토큰 절약
        ),
    )


# ── 이미지 처리 ──

def _decode_and_resize(image_base64: str) -> tuple[bytes, str]:
    """base64 → 바이너리 디코딩 + 리사이즈 (비용 최적화)."""
    # data URI 파싱
    if image_base64.startswith("data:"):
        header, encoded = image_base64.split(",", 1)
        mime_type = header.split(":")[1].split(";")[0]
    else:
        encoded = image_base64
        mime_type = "image/jpeg"

    if len(encoded) > MAX_BASE64_LENGTH:
        raise ValueError(f"이미지가 너무 큽니다 (최대 {MAX_BASE64_LENGTH // 1024 // 1024}MB)")

    image_bytes = base64.b64decode(encoded)

    # Pillow가 있으면 리사이즈하여 토큰 비용 절감
    try:
        from PIL import Image
        img = Image.open(BytesIO(image_bytes))
        w, h = img.size
        if max(w, h) > MAX_IMAGE_DIMENSION:
            ratio = MAX_IMAGE_DIMENSION / max(w, h)
            new_size = (int(w * ratio), int(h * ratio))
            img = img.resize(new_size, Image.LANCZOS)
            logger.info(f"이미지 리사이즈: {w}x{h} → {new_size[0]}x{new_size[1]}")

            buf = BytesIO()
            fmt = "PNG" if mime_type == "image/png" else "JPEG"
            img.save(buf, format=fmt, quality=85)
            image_bytes = buf.getvalue()
            mime_type = f"image/{fmt.lower()}"
    except ImportError:
        logger.warning("Pillow 미설치: 이미지 리사이즈 건너뜀 (pip install Pillow 권장)")

    return image_bytes, mime_type


def _parse_json_response(content: str) -> dict:
    """Gemini 응답에서 JSON을 안전하게 추출합니다."""
    # 마크다운 코드블록 제거
    content = re.sub(r'```json\s*', '', content)
    content = re.sub(r'```\s*', '', content)

    json_match = re.search(r'\{[\s\S]*\}', content)
    if json_match:
        return json.loads(json_match.group(0))

    return json.loads(content)


def _normalize(extracted: dict) -> dict:
    """기본값 적용 및 카테고리 유효성 검사."""
    defaults = {
        "title": "",
        "content": "",
        "category": "task",
        "startDate": "",
        "startTime": "",
        "endDate": "",
        "endTime": "",
        "duration": 0,
        "isImportant": False,
    }
    for key, default in defaults.items():
        if key not in extracted or extracted[key] is None:
            extracted[key] = default

    valid_categories = {"task", "appointment", "group", "repeat"}
    if extracted.get("category") not in valid_categories:
        extracted["category"] = "task"

    # duration을 숫자로 강제
    try:
        extracted["duration"] = float(extracted["duration"])
    except (ValueError, TypeError):
        extracted["duration"] = 0

    return extracted


# ── 메인 함수 ──

async def extract_schedule_from_image(image_base64: str) -> dict:
    """Gemini를 사용하여 이미지에서 일정 정보를 추출합니다."""
    model = _get_model()
    image_bytes, mime_type = _decode_and_resize(image_base64)

    today = date.today().isoformat()
    prompt = SYSTEM_PROMPT.format(today=today)

    # 동기 genai 호출을 스레드풀로 오프로드하여 이벤트 루프 블로킹 방지
    def _call_gemini():
        return model.generate_content([
            prompt,
            {"mime_type": mime_type, "data": image_bytes},
        ])

    try:
        response = await asyncio.wait_for(
            asyncio.get_event_loop().run_in_executor(None, _call_gemini),
            timeout=REQUEST_TIMEOUT,
        )
    except asyncio.TimeoutError:
        raise RuntimeError(f"Gemini API 응답 시간 초과 ({REQUEST_TIMEOUT}초)")
    except InvalidArgument as exc:
        raise ValueError("이미지를 해석할 수 없습니다. 더 선명한 이미지나 다른 캡처로 다시 시도해주세요.") from exc
    except ResourceExhausted as exc:
        raise RuntimeError("AI 호출 한도를 초과했습니다. 잠시 후 다시 시도해주세요.") from exc
    except GoogleAPICallError as exc:
        raise RuntimeError("AI 서비스와 통신 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.") from exc

    content = response.text
    logger.debug(f"Gemini 원본 응답: {content[:300]}")

    try:
        extracted = _parse_json_response(content)
    except (json.JSONDecodeError, ValueError):
        raise ValueError(f"AI 응답을 파싱할 수 없습니다: {content[:200]}")

    return _normalize(extracted)
