# Timelink AI Service

Google Gemini 기반 AI 일정 추출 서비스 (FastAPI)

## 근본 목적

사진에서 일정 정보를 추출하는 AI 서비스의 로컬 실행, API 계약, 배포 경로를 실제 운영 구조와 맞춰 유지해 프론트와 AI Lambda 연동 오류를 줄이는 것이 목적입니다.

## 비목적

이 문서는 Gemini 프롬프트 전체나 백엔드 일정 저장 로직을 중복 설명하기 위한 문서가 아니며, 모델 선택 실험 결과를 장황하게 기록하는 문서도 아닙니다.

## 기능

- **📸 이미지 → 일정 추출**: 포스터, 메시지, 캘린더 스크린샷 등에서 일정 정보를 자동 추출
- **🖼️ 이미지 자동 리사이즈**: 큰 이미지를 1024px로 축소하여 API 비용·속도 최적화
- **⚡ 비동기 처리**: 이벤트 루프 블로킹 없이 Gemini API 호출
- **🚀 Lambda 배포**: Mangum 어댑터를 통한 AWS Lambda 컨테이너 이미지 배포 지원

## 로컬 개발

```bash
cd ai

# 가상환경 생성
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# 의존성 설치
pip install -r requirements.txt

# 로컬 전용 환경변수 설정
cp .env.example .env
# .env 파일에서 GEMINI_API_KEY 설정

# 서버 실행
uvicorn app.main:app --reload --port 8000
```

## API

### `POST /api/ai/v1/extract-schedule`

이미지에서 일정 정보를 추출합니다.

**Request:**
```json
{
  "imageBase64": "data:image/jpeg;base64,..."
}
```

**Response:**
```json
{
  "title": "팀 미팅",
  "content": "주간 회의",
  "category": "appointment",
  "startDate": "2026-03-10",
  "startTime": "14:00",
  "endDate": "2026-03-10",
  "endTime": "15:00",
  "duration": 1,
  "isImportant": false
}
```

## 환경변수

| 변수 | 설명 | 필수 |
|------|------|------|
| `GEMINI_API_KEY` | Google AI Studio API 키 ([발급](https://aistudio.google.com/apikey)) | ✅ |
| `CORS_ORIGINS` | CORS 허용 오리진 (콤마 구분) | ❌ |
| `LOG_LEVEL` | 로그 레벨 (기본: INFO) | ❌ |

운영 배포에서는 위 값을 직접 Lambda env로 넣지 않고, SSM Parameter Store를 통해 읽습니다. Lambda에는 `APP_CONFIG_PREFIX`만 전달됩니다.

## Lambda 이미지 빌드

```bash
docker build -t planner-ai .
docker run --rm -p 9000:8080 planner-ai
```

## AWS Lambda 배포

Docker 이미지를 ECR에 push하면 Lambda가 `app.main.handler` (Mangum)를 엔트리포인트로 사용합니다.

```bash
# ECR 로그인
aws ecr get-login-password --region ap-northeast-2 | \
  docker login --username AWS --password-stdin <ACCOUNT_ID>.dkr.ecr.ap-northeast-2.amazonaws.com

# 빌드 & 푸시
docker build --platform linux/arm64 -t planner-ai .
docker tag planner-ai:latest <ECR_URI>:latest
docker push <ECR_URI>:latest

# Lambda 업데이트
aws lambda update-function-code \
  --function-name planner-prod-ai \
  --image-uri <ECR_URI>:latest
```

## 아키텍처

```
Client → API Gateway (/api/ai/*) → Lambda (Container) → Gemini API
                                         ↑
                                    Mangum 어댑터
                                    FastAPI app
```

## 최적화 포인트

| 항목 | 적용 |
|------|------|
| 이미지 리사이즈 | 긴 변 1024px 이하로 축소 (Pillow) |
| 토큰 절약 | OCR 최대 `2048` 토큰, 구조화 최대 `1024` 토큰, `temperature=0.0` |
| 이벤트 루프 | `run_in_executor`로 동기 SDK 오프로드 |
| 타임아웃 | 30초 제한 (`asyncio.wait_for`) |
| 모델 캐싱 | `@lru_cache`로 OCR/구조화 모델 인스턴스 1회 초기화 |
| 이미지 크기 제한 | 10MB 초과 시 조기 거부 |
