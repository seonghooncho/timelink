# 📅 일정관리 앱 (Planner)

모노레포 구조로 프론트엔드, 백엔드, AI 서비스, 인프라를 관리합니다.

## 프로젝트 구조

```
├── frontend/          # React + Vite + Tailwind (Lovable)
│   ├── src/
│   │   ├── components/    # UI 컴포넌트
│   │   ├── context/       # AuthContext, AppContext
│   │   ├── pages/         # 페이지 컴포넌트
│   │   ├── services/      # API 클라이언트 (api.ts)
│   │   ├── hooks/         # react-query 기반 커스텀 훅
│   │   ├── utils/         # 유틸리티 (category, formatting)
│   │   └── types/         # TypeScript 타입
│   └── ...
├── backend/           # Spring Boot + Java 21 + DynamoDB
│   └── src/main/java/com/planner/
│       ├── domain/                    # 도메인 기반 패키지 (DDD)
│       │   ├── schedule/              # 일정 도메인
│       │   │   ├── controller/        #   └── ScheduleController
│       │   │   ├── service/           #   └── ScheduleService
│       │   │   ├── repository/        #   └── ScheduleRepository
│       │   │   ├── model/             #   └── Schedule
│       │   │   ├── dto/req/           #   └── ScheduleCreateReqDTO, UpdateReqDTO
│       │   │   ├── dto/res/           #   └── ScheduleResDTO
│       │   │   ├── converter/         #   └── ScheduleConverter
│       │   │   └── error/             #   └── ScheduleErrorCode, ScheduleException
│       │   ├── group/                 # 그룹 도메인
│       │   │   ├── controller/        #   └── GroupController
│       │   │   ├── service/           #   └── GroupService
│       │   │   ├── repository/        #   └── GroupRepository
│       │   │   ├── model/             #   └── Group, GroupMember
│       │   │   ├── dto/req/           #   └── GroupCreateReqDTO, JoinReqDTO
│       │   │   ├── dto/res/           #   └── GroupResDTO, GroupDetailResDTO
│       │   │   ├── converter/         #   └── GroupConverter
│       │   │   └── error/             #   └── GroupErrorCode, GroupException
│       │   ├── coordination/          # 시간 조율 도메인
│       │   │   ├── controller/        #   └── CoordinationController
│       │   │   ├── service/           #   └── CoordinationService
│       │   │   ├── repository/        #   └── CoordinationRepository
│       │   │   ├── model/             #   └── Coordination, CoordinationResponse
│       │   │   ├── dto/req/           #   └── CreateReqDTO, SubmitReqDTO
│       │   │   ├── dto/res/           #   └── ResDTO, DetailResDTO, HeatmapDTO
│       │   │   ├── converter/         #   └── CoordinationConverter
│       │   │   └── error/             #   └── CoordinationErrorCode, Exception
│       │   ├── profile/               # 프로필 도메인
│       │   │   ├── controller/service/repository/model/dto/converter/error/
│       │   │   └── ...
│       │   └── notification/          # 알림 도메인
│       │       ├── controller/        #   └── NotificationController, SettingsController
│       │       ├── service/           #   └── NotificationService
│       │       ├── repository/model/dto/converter/error/
│       │       └── ...
│       └── global/                    # 공통 인프라
│           ├── config/                #   └── SecurityConfig, DynamoDbConfig
│           │                          #   └── JwtProperties, CorsProperties, AwsProperties
│           ├── error/                 #   └── BaseErrorCode, CustomException
│           │                          #   └── GeneralErrorCode, GlobalExceptionHandler
│           ├── response/              #   └── CustomResponse
│           ├── security/              #   └── AuthUtil, JwtTokenProvider, JwtAuthFilter
│           └── health/                #   └── HealthCheckController
├── ai/                # FastAPI + Google Gemini (AI 서비스)
│   ├── app/
│   │   ├── main.py        # FastAPI 앱 엔트리포인트
│   │   ├── routers/       # API 라우터
│   │   │   └── extract.py # 일정 추출 엔드포인트
│   │   └── services/      # 서비스 레이어
│   │       └── gemini_service.py  # Gemini API 연동
│   ├── Dockerfile
│   ├── requirements.txt
│   └── README.md
├── infra/             # Terraform (API Gateway + Lambda + DynamoDB)
├── docs/              # 문서
│   ├── API_SPEC.md
│   └── DESIGN_GUIDE.md
└── README.md
```

## 백엔드 아키텍처 원칙

### Domain-Driven Package Structure
- 각 도메인은 `controller → service → repository` 계층 + `model`, `dto`, `converter`, `error`를 자체 패키지에 포함
- 도메인 간 의존은 repository 수준에서만 허용 (e.g., `CoordinationService → GroupRepository`)

### Error Handling
- `BaseErrorCode` 인터페이스 → 도메인별 `ErrorCode` enum 구현
- `CustomException` 베이스 → 도메인별 `XxxException` 상속
- `GlobalExceptionHandler`에서 일관된 에러 응답 포맷

### Converter Pattern
- Model ↔ DTO 매핑을 Converter 클래스에서 분리
- Service는 비즈니스 로직에 집중

### Config Properties
- `@ConfigurationProperties`로 타입 안전한 설정 주입 (JwtProperties, CorsProperties, AwsProperties)

## 기술 스택

| 영역 | 기술 |
|------|------|
| Frontend | React 18, Vite, TypeScript, Tailwind CSS, shadcn/ui, react-query |
| Backend | Spring Boot 3.3, Java 21, AWS SDK DynamoDB |
| AI | FastAPI, Python 3.12, Google Gemini 2.0 Flash (무료) |
| Infra | Terraform, AWS API Gateway, Lambda, DynamoDB |
| CI/CD | GitHub Actions (추후) |

## 로컬 개발

### Frontend
```bash
npm install
npm run dev
```

### Backend
```bash
cd backend
./gradlew bootRun
```

### AI Service
```bash
cd ai
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env  # GEMINI_API_KEY 설정
uvicorn app.main:app --reload --port 8000
```

### Infra
```bash
cd infra
terraform init
terraform plan
terraform apply
```

## 환경별 설정

| 환경 | Frontend | Backend | AI |
|------|----------|---------|-----|
| Local | `localhost:5173` | `localhost:8080` | `localhost:8000` |
| Dev | Lovable Preview | Lambda (dev) | ECS/Lambda |
| Prod | Custom Domain | API Gateway + Lambda | ECS/Lambda |

## 환경변수

### Frontend (.env)
```
VITE_API_BASE_URL=/api/planner/v1    # 백엔드 API
VITE_AI_BASE_URL=http://localhost:8000/api/ai/v1  # AI 서비스
```

### AI Service (ai/.env)
```
GEMINI_API_KEY=your_key   # https://aistudio.google.com/apikey
CORS_ORIGINS=http://localhost:5173
```
