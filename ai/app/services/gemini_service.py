import os
import json
import base64
import re
import asyncio
import logging
from datetime import date, datetime, timedelta
from functools import lru_cache
from io import BytesIO
from typing import TypedDict

import google.generativeai as genai
from google.api_core.exceptions import GoogleAPICallError, InvalidArgument, ResourceExhausted

from app.config import get_settings

logger = logging.getLogger(__name__)

# ── 설정 ──
MAX_IMAGE_DIMENSION = 1024  # 비용·속도 최적화: 긴 변 기준 리사이즈
MAX_BASE64_LENGTH = 10 * 1024 * 1024  # 10 MB 원본 제한
REQUEST_TIMEOUT = 30  # seconds


class ScheduleExtractionSchema(TypedDict):
    title: str
    content: str
    category: str
    startDate: str
    startTime: str
    endDate: str
    endTime: str
    duration: float
    isImportant: bool

OCR_PROMPT = """Read the uploaded image and transcribe all visible text in reading order.
Return plain text only.

Rules:
- Do not summarize.
- Do not translate.
- Preserve titles, dates, times, speaker names, and venue text as faithfully as possible.
- Keep useful line breaks if the image has separate text blocks.
- If some characters are unclear, still provide your best OCR guess."""

STRUCTURE_PROMPT = """You are a schedule extraction assistant. Convert the OCR text into one structured schedule/event object.

Today's date is {today}. If the year is not specified, assume the current year.
If multiple schedule candidates are present, choose the single most prominent or actionable event.
Use the OCR text exactly as evidence. Do not invent details that are not supported by the text.

OCR text:
{ocr_text}

Return ONLY valid JSON:
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
- title should prefer the main headline, not the whole body text
- content should include supporting details such as venue, speaker, reservation, or description
- If you can't determine a field, use empty string or a conservative estimate
- duration: estimate based on start/end time, or event type (meeting ~1h, class ~1.5h, etc.)
- isImportant: true if the image suggests urgency or importance
- Return ONLY one JSON object, nothing else"""

MONTH_MAP = {
    "jan": 1,
    "january": 1,
    "feb": 2,
    "february": 2,
    "mar": 3,
    "march": 3,
    "apr": 4,
    "april": 4,
    "may": 5,
    "jun": 6,
    "june": 6,
    "jul": 7,
    "july": 7,
    "aug": 8,
    "august": 8,
    "sep": 9,
    "sept": 9,
    "september": 9,
    "oct": 10,
    "october": 10,
    "nov": 11,
    "november": 11,
    "dec": 12,
    "december": 12,
}


# ── 초기화 (앱 시작 시 1회) ──

@lru_cache(maxsize=1)
def _configure_genai() -> str:
    gemini_api_key = get_settings().gemini_api_key
    if not gemini_api_key:
        raise RuntimeError("GEMINI_API_KEY is not configured")
    genai.configure(api_key=gemini_api_key)
    return gemini_api_key


@lru_cache(maxsize=1)
def _get_ocr_model() -> genai.GenerativeModel:
    """OCR용 Gemini 모델을 초기화하고 캐시합니다."""
    _configure_genai()
    return genai.GenerativeModel(
        "gemini-2.5-flash",
        generation_config=genai.GenerationConfig(
            temperature=0.0,
            max_output_tokens=2048,
        ),
    )


@lru_cache(maxsize=1)
def _get_structure_model() -> genai.GenerativeModel:
    """일정 필드 매핑용 Gemini 모델을 초기화하고 캐시합니다."""
    _configure_genai()
    return genai.GenerativeModel(
        "gemini-2.5-flash",
        generation_config=genai.GenerationConfig(
            temperature=0.0,
            max_output_tokens=1024,
            response_mime_type="application/json",
            response_schema=ScheduleExtractionSchema,
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


async def _run_gemini(callable_, invalid_argument_message: str):
    try:
        return await asyncio.wait_for(
            asyncio.get_event_loop().run_in_executor(None, callable_),
            timeout=REQUEST_TIMEOUT,
        )
    except asyncio.TimeoutError:
        raise RuntimeError(f"Gemini API 응답 시간 초과 ({REQUEST_TIMEOUT}초)")
    except InvalidArgument as exc:
        raise ValueError(invalid_argument_message) from exc
    except ResourceExhausted as exc:
        raise RuntimeError("AI 호출 한도를 초과했습니다. 잠시 후 다시 시도해주세요.") from exc
    except GoogleAPICallError as exc:
        raise RuntimeError("AI 서비스와 통신 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.") from exc


def _extract_response_text(response) -> str:
    text = getattr(response, "text", "") or ""
    return text.strip()


def _coerce_extracted_payload(payload: object) -> dict:
    """모델 응답이 배열/중첩 구조여도 단일 일정 객체로 정규화합니다."""
    if isinstance(payload, dict):
        for key in ("events", "schedules", "items", "results", "data"):
            nested = payload.get(key)
            if isinstance(nested, list):
                first_dict = next((item for item in nested if isinstance(item, dict)), None)
                if first_dict:
                    return first_dict
        return payload

    if isinstance(payload, list):
        first_dict = next((item for item in payload if isinstance(item, dict)), None)
        if first_dict:
            return first_dict
        raise ValueError("AI가 일정 객체를 반환하지 않았습니다.")

    raise ValueError("AI 응답이 JSON 객체 형식이 아닙니다.")


def _parse_relaxed_object(content: str) -> dict:
    """깨진 JSON 문자열에서도 일정 필드를 최대한 복구합니다."""
    fields: dict[str, object] = {}
    string_fields = ("title", "content", "category", "startDate", "startTime", "endDate", "endTime")
    known_keys = "|".join(string_fields + ("duration", "isImportant"))

    for key in string_fields:
        strict_pattern = rf'"{key}"\s*:\s*"((?:\\.|[^"\\])*)"'
        match = re.search(strict_pattern, content, flags=re.DOTALL)
        if match:
            fields[key] = json.loads(f'"{match.group(1)}"')
            continue

        loose_pattern = rf'"{key}"\s*:\s*"([\s\S]*?)(?=\s*,\s*"(?:{known_keys})"\s*:|\s*\}}|$)'
        match = re.search(loose_pattern, content, flags=re.DOTALL)
        if match:
            fields[key] = match.group(1).strip().rstrip('"').strip()

    duration_match = re.search(r'"duration"\s*:\s*(-?\d+(?:\.\d+)?)', content)
    if duration_match:
        try:
            fields["duration"] = float(duration_match.group(1))
        except ValueError:
            pass

    important_match = re.search(r'"isImportant"\s*:\s*(true|false)', content, flags=re.IGNORECASE)
    if important_match:
        fields["isImportant"] = important_match.group(1).lower() == "true"

    if fields:
        return fields

    raise ValueError("AI 응답에서 복구 가능한 일정 필드를 찾지 못했습니다.")


def _parse_json_response(content: str) -> dict:
    """Gemini 응답에서 JSON을 안전하게 추출합니다."""
    cleaned = re.sub(r"```json\s*", "", content, flags=re.IGNORECASE)
    cleaned = re.sub(r"```\s*", "", cleaned)
    cleaned = cleaned.strip()

    decoder = json.JSONDecoder()

    try:
        return _coerce_extracted_payload(json.loads(cleaned))
    except (json.JSONDecodeError, ValueError):
        pass

    for match in re.finditer(r"[\[{]", cleaned):
        try:
            parsed, _ = decoder.raw_decode(cleaned[match.start():])
            return _coerce_extracted_payload(parsed)
        except (json.JSONDecodeError, ValueError):
            continue

    return _parse_relaxed_object(cleaned)


def _split_ocr_lines(ocr_text: str) -> list[str]:
    return [line.strip(" -•\t") for line in ocr_text.splitlines() if line.strip()]


def _looks_like_date_or_time(line: str) -> bool:
    return bool(
        re.search(r"\b\d{1,2}:\d{2}\b", line)
        or re.search(r"\b\d{4}[./-]\d{1,2}[./-]\d{1,2}\b", line)
        or re.search(r"\b(?:jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\s+\d{1,2}", line, flags=re.IGNORECASE)
        or re.search(r"\b\d{1,2}\s*(?:월|/)\s*\d{1,2}\b", line)
    )


def _infer_title_from_ocr(ocr_text: str) -> str:
    lines = _split_ocr_lines(ocr_text)
    candidates: list[tuple[int, int, str]] = []
    detail_pattern = re.compile(
        r"\b(lecturer|speaker|reservation|required|zoom|online|venue|contact|문의|장소|강사|연사|주최|주관|신청|사전등록|참가)\b",
        flags=re.IGNORECASE,
    )

    for index, line in enumerate(lines):
        if len(line) < 4 or _looks_like_date_or_time(line):
            continue
        if detail_pattern.search(line):
            continue

        words = re.findall(r"[A-Za-z0-9가-힣]+", line)
        word_count = len(words)
        english_letters = re.findall(r"[A-Za-z]", line)
        uppercase_ratio = (
            sum(1 for char in english_letters if char.isupper()) / len(english_letters)
            if english_letters
            else 0.0
        )

        score = 0
        score += max(0, 8 - index) * 4

        if 8 <= len(line) <= 48:
            score += 8
        elif len(line) <= 70:
            score += 3

        if 2 <= word_count <= 6:
            score += 8
        elif word_count == 1 and len(line) < 12:
            score -= 8
        elif word_count > 9:
            score -= 4

        if uppercase_ratio >= 0.8:
            score += 10
        elif uppercase_ratio >= 0.5:
            score += 4
        elif re.fullmatch(r"[가-힣0-9\s]+", line) and len(line) <= 20:
            score += 3

        if ":" in line or "/" in line:
            score -= 4
        if line.endswith((".", "!", "?")):
            score -= 2

        candidates.append((score, -index, line))

    if not candidates:
        return ""
    return max(candidates)[2]


def _extract_date_from_ocr(ocr_text: str) -> str:
    today = date.today()

    iso_match = re.search(r"\b(20\d{2})[./-](\d{1,2})[./-](\d{1,2})\b", ocr_text)
    if iso_match:
        year, month, day = map(int, iso_match.groups())
        return f"{year:04d}-{month:02d}-{day:02d}"

    month_name_match = re.search(
        r"\b("
        + "|".join(MONTH_MAP.keys())
        + r")\s+(\d{1,2})(?:,?\s*(20\d{2}))?\b",
        ocr_text,
        flags=re.IGNORECASE,
    )
    if month_name_match:
        month_name, day, year = month_name_match.groups()
        month = MONTH_MAP[month_name.lower()]
        resolved_year = int(year) if year else today.year
        return f"{resolved_year:04d}-{month:02d}-{int(day):02d}"

    korean_match = re.search(r"\b(\d{1,2})\s*월\s*(\d{1,2})\s*일(?:\s*(20\d{2})\s*년)?", ocr_text)
    if korean_match:
        month, day, year = korean_match.groups()
        resolved_year = int(year) if year else today.year
        return f"{resolved_year:04d}-{int(month):02d}-{int(day):02d}"

    return ""


def _extract_time_from_ocr(ocr_text: str) -> str:
    twelve_hour_match = re.search(r"\b(\d{1,2})(?::(\d{2}))?\s*(AM|PM)\b", ocr_text, flags=re.IGNORECASE)
    if twelve_hour_match:
        hour = int(twelve_hour_match.group(1))
        minute = int(twelve_hour_match.group(2) or "0")
        meridiem = twelve_hour_match.group(3).lower()
        if meridiem == "pm" and hour < 12:
            hour += 12
        if meridiem == "am" and hour == 12:
            hour = 0
        return f"{hour:02d}:{minute:02d}"

    twenty_four_match = re.search(r"\b([01]?\d|2[0-3]):([0-5]\d)\b", ocr_text)
    if twenty_four_match:
        return f"{int(twenty_four_match.group(1)):02d}:{int(twenty_four_match.group(2)):02d}"

    return ""


def _infer_content_from_ocr(ocr_text: str, title: str) -> str:
    lines = _split_ocr_lines(ocr_text)
    filtered = [
        line for line in lines
        if line != title and not _looks_like_date_or_time(line)
    ]
    if not filtered:
        return ""
    return " ".join(filtered[:3])


def _apply_ocr_fallbacks(extracted: dict, ocr_text: str) -> dict:
    enriched = dict(extracted)
    missing_core_fields = not enriched.get("title") or not enriched.get("startDate") or not enriched.get("startTime")

    if not enriched.get("title"):
        enriched["title"] = _infer_title_from_ocr(ocr_text)
    if not enriched.get("startDate"):
        enriched["startDate"] = _extract_date_from_ocr(ocr_text)
    if not enriched.get("startTime"):
        enriched["startTime"] = _extract_time_from_ocr(ocr_text)
    inferred_content = _infer_content_from_ocr(ocr_text, str(enriched.get("title", "")))
    current_content = str(enriched.get("content", "") or "")
    if not current_content:
        enriched["content"] = inferred_content
    elif (
        inferred_content
        and missing_core_fields
        and len(current_content) < len(inferred_content)
        and current_content in inferred_content
    ):
        enriched["content"] = inferred_content

    if enriched.get("duration") in (None, "", 0, 0.0):
        text = (enriched.get("content") or "") + "\n" + ocr_text
        if re.search(r"\b특강\b|\btalk\b|\blecture\b|\b발표\b", text, flags=re.IGNORECASE):
            enriched["duration"] = 1.5
        elif enriched.get("startTime"):
            enriched["duration"] = 1

    if not enriched.get("endDate") and not enriched.get("endTime"):
        if enriched.get("startDate") and enriched.get("startTime") and enriched.get("duration"):
            try:
                start_dt = datetime.fromisoformat(
                    f"{enriched['startDate']}T{enriched['startTime']}:00"
                )
                end_dt = start_dt + timedelta(hours=float(enriched["duration"]))
                enriched["endDate"] = end_dt.date().isoformat()
                enriched["endTime"] = end_dt.strftime("%H:%M")
            except (ValueError, TypeError):
                pass

    return enriched


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
    """OCR 텍스트 추출과 일정 필드 매핑을 분리하여 처리합니다."""
    image_bytes, mime_type = _decode_and_resize(image_base64)
    ocr_model = _get_ocr_model()
    structure_model = _get_structure_model()

    def _call_ocr():
        return ocr_model.generate_content([
            OCR_PROMPT,
            {"mime_type": mime_type, "data": image_bytes},
        ])

    ocr_response = await _run_gemini(
        _call_ocr,
        "이미지를 해석할 수 없습니다. 더 선명한 이미지나 다른 캡처로 다시 시도해주세요.",
    )
    ocr_text = _extract_response_text(ocr_response)
    if not ocr_text:
        raise ValueError("이미지에서 읽을 수 있는 텍스트를 찾지 못했습니다.")

    logger.info("AI OCR preview: %s", ocr_text[:200].replace("\n", " | "))

    today = date.today().isoformat()
    prompt = STRUCTURE_PROMPT.format(today=today, ocr_text=ocr_text)

    def _call_structure():
        return structure_model.generate_content(prompt)

    structure_response = await _run_gemini(
        _call_structure,
        "추출한 텍스트를 일정 정보로 정리하지 못했습니다. 다른 이미지로 다시 시도해주세요.",
    )
    content = _extract_response_text(structure_response)
    logger.debug("Gemini structured response: %s", content[:300])

    try:
        extracted = _parse_json_response(content)
    except (json.JSONDecodeError, ValueError):
        raise ValueError(f"AI 응답을 파싱할 수 없습니다: {content[:200]}")

    enriched = _apply_ocr_fallbacks(extracted, ocr_text)
    normalized = _normalize(enriched)

    logger.info(
        "AI extracted fields title=%s startDate=%s startTime=%s",
        normalized.get("title", ""),
        normalized.get("startDate", ""),
        normalized.get("startTime", ""),
    )

    return normalized
