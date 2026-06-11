# Timelink

Timelink 모노레포 구조로 프론트엔드, 백엔드, AI 서비스, 인프라를 관리합니다.

## 근본 목적

저장소의 상위 구조와 각 서브시스템의 책임 범위를 한눈에 보여줘서, 개발자가 어느 디렉터리에서 어떤 변경을 해야 하는지 빠르게 판단할 수 있게 하는 것이 목적입니다.

## 비목적

세부 구현을 이 문서 하나에 모두 담으려는 것이 아니며, 각 영역의 세밀한 API나 컴포넌트 동작을 중복 설명하는 문서가 되려는 것도 아닙니다.

## 프로젝트 구조

```
├── fe/                     # React + Vite + Tailwind
│   └── src/
│       ├── components/     # common, coordination, layout, schedule, ui
│       ├── context/        # AuthContext, AppContext
│       ├── hooks/          # react-query 기반 커스텀 훅
│       ├── pages/          # 라우트 단위 페이지
│       ├── services/       # API 클라이언트, 세션 저장
│       ├── test/           # 프론트 테스트 유틸
│       ├── types/          # TypeScript 타입
│       └── utils/          # 포맷팅/도메인 유틸
├── backend/                # Spring Boot + Java 21 + DynamoDB
│   └── src/main/java/com/planner/
│       ├── domain/
│       │   ├── auth/            # 백엔드 JWT 세션 발급
│       │   ├── storage/         # 프로필/그룹 이미지 업로드
│       │   ├── profile/         # controller/service/repository/model/dto/converter/error
│       │   ├── schedule/        # 작은 도메인은 dto/ 단일 계층 유지
│       │   ├── group/           # 작은 도메인은 dto/ 단일 계층 유지
│       │   ├── notification/    # NotificationController, NotificationSettingsController
│       │   └── coordination/    # 복합 응답이 많아 dto/req, dto/res 유지
│       └── global/
│           ├── config/          # Aws/Security/Cors/Jwt 설정
│           ├── cursor/          # 커서 기반 페이지네이션 공통 객체
│           ├── error/           # 공통 예외/에러 코드
│           ├── response/        # CustomResponse
│           ├── security/        # JWT, AuthUtil
│           └── health/          # 헬스체크
├── ai/                     # FastAPI + Google Gemini
│   └── app/
│       ├── routers/        # AI 엔드포인트
│       └── services/       # Gemini 연동 서비스
├── infra/
│   └── terraform/
│       ├── init/                # tfstate S3 + lock DynamoDB bootstrap
│       ├── minimum/             # 현재 운영 최소 스택
│       │   ├── api_gateway.tf   # Backend/AI 라우팅용 HTTP API
│       │   ├── lambda.tf        # Backend Lambda 및 IAM
│       │   ├── lambda_ai.tf     # AI Lambda, ECR 및 IAM
│       │   ├── dynamodb.tf      # Single Table Design
│       │   ├── s3_cloudfront.tf # 프론트 CloudFront + S3
│       │   ├── s3_storage.tf    # 업로드 이미지 버킷
│       │   ├── ssm.tf           # 런타임 설정 SSM Parameter Store
│       │   └── outputs.tf       # 배포 결과 출력
│       ├── cloudflare_free/     # Workers.dev 기반 무료 프론트 서빙
│       │   ├── main.tf
│       │   ├── variables.tf
│       │   ├── outputs.tf
│       │   ├── worker.js
│       │   └── README.md
│       └── README.md
├── docs/                   # 설계/운영 문서
│   └── infrastructure/     # 배포/아키텍처/부하테스트/확장 문서
└── README.md
```

## 운영 문서

- [기능 요구사항 명세서](FEATURE_REQUIREMENTS.md): 운영 중인 사용자 기능, 제약 조건, 예외 처리 기준을 화면과 유즈케이스 중심으로 정리한 문서입니다.
- [인프라 문서 인덱스](infrastructure/README.md): 배포, 아키텍처 정합성, 부하테스트, 확장 로드맵을 모아 둔 문서입니다.
- [운영 배포 유의사항](infrastructure/DEPLOYMENT_NOTES.md): S3/CloudFront/Lambda 배포 순서와 Google/Kakao 소셜 로그인 콜백 확인 항목을 정리한 배포 전 체크 문서입니다.

## 백엔드 아키텍처 원칙

### Domain-Driven Package Structure
- 각 도메인은 `controller → service → repository` 계층 + `model`, `dto`, `converter`, `error`를 자체 패키지에 포함
- DTO 수가 적은 도메인은 `dto/` 한 단계로 평탄화하고, 응답 조합이 많은 도메인만 `dto/req`, `dto/res`를 유지
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

## 인프라 구조 원칙

- `infra/terraform/init`은 Terraform 상태 저장소만 관리하고 앱 스택과 분리한다
- `infra/terraform/minimum`은 현재 운영 최소 스택만 포함해 이후 상위 구조 변경 시 비교 기준점 역할을 한다
- `infra/terraform/cloudflare_free`는 도메인 없이 `workers.dev`로 프론트를 무료 서빙할 때 쓰는 선택 스택이다
- `api_gateway.tf`에는 Backend/AI Lambda 라우팅을 모아 `CloudFront -> API Gateway -> Lambda` 경로를 한 파일에서 읽을 수 있게 유지한다
- 앱 런타임 설정은 SSM Parameter Store에서 읽고, Lambda에는 SSM prefix만 전달한다

## 기술 스택

| 영역 | 기술 |
|------|------|
| Frontend | React 18, Vite, TypeScript, Tailwind CSS, shadcn/ui, react-query |
| Backend | Spring Boot 3.3, Java 21, AWS SDK DynamoDB |
| AI | FastAPI, Python 3.12, Google Gemini 2.5 Flash |
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

또는 루트에서 `npm run backend:run`

### AI Service
```bash
cd ai
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env  # GEMINI_API_KEY 설정
uvicorn app.main:app --reload --port 8000
```

또는 루트에서 `npm run ai:run`

### Infra
```bash
cd infra/terraform/init
terraform init
terraform apply

cd ../minimum
cp backend.hcl.example backend.hcl
terraform init -backend-config=backend.hcl
terraform plan
terraform apply
```

보조 명령: `npm run infra:init:fmt`, `npm run infra:init:validate`, `npm run infra:fmt`, `npm run infra:validate`

### Optional: Cloudflare Free Frontend
```bash
cd infra/terraform/cloudflare_free
terraform init
terraform plan
terraform apply
```

## 환경별 설정

| 환경 | Frontend | Backend | AI |
|------|----------|---------|-----|
| Local | `localhost:5173` (Vite proxy) | `localhost:8080` | `localhost:8000` |
| Dev | CloudFront + S3, `/api/* -> API Gateway` | Lambda | Lambda |
| Prod | CloudFront + S3, `/api/* -> API Gateway` | Lambda | Lambda |

## 환경변수

### Frontend
```
기본값은 /api/planner/v1, /api/ai/v1 를 사용합니다.
로컬 개발은 Vite proxy가 backend:8080, ai:8000 으로 전달합니다.
배포는 CloudFront가 /api/* 를 API Gateway 로 전달합니다.
```

### Backend / AI
```
운영 런타임 설정은 SSM Parameter Store를 사용합니다.
Terraform은 /planner/{environment}/backend, /planner/{environment}/ai prefix 아래에 일반 설정만 적재합니다.
secret 값은 SSM에 별도로 넣습니다.
Lambda에는 APP_CONFIG_PREFIX만 주입합니다.
```

### Cloudflare Free Frontend
```
cloudflare_api_token, cloudflare_account_id, api_origin이 필요합니다.
api_origin에는 AWS minimum 스택의 api_endpoint 값을 사용하면 됩니다.
```

### AI Service Local (ai/.env)
```
GEMINI_API_KEY=your_key   # https://aistudio.google.com/apikey
CORS_ORIGINS=http://localhost:5173
```
