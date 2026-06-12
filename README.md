# Timelink

프론트엔드, 백엔드, AI 서비스, 인프라를 한 저장소에서 관리하는 모노레포입니다.

## 근본 목적

프론트엔드, 백엔드, AI, 인프라의 책임 경계를 디렉터리 수준에서 분명히 나눠 탐색 비용과 변경 영향 범위 파악 비용을 줄이는 것이 목적입니다.

## 비목적

기능 동작이나 제품 경험을 바꾸기 위한 문서가 아니며, 과도한 계층 추가나 불필요한 추상화를 정당화하기 위한 구조 문서도 아닙니다.

## 프로젝트 구조

```text
.
├── fe/         # React + Vite + Tailwind 프론트엔드
├── mobile/     # Expo React Native 모바일 앱
├── backend/    # Spring Boot 백엔드
├── ai/         # FastAPI 기반 AI 서비스
├── infra/      # Terraform 문서와 init/minimum/cloudflare_free 스택
├── docs/       # 설계/운영 문서
└── package.json
```

## 로컬 개발

### Frontend

프론트엔드 코드는 `fe/` 아래에 있고, 루트 `package.json`이 워크스페이스 진입점 역할을 합니다.

```sh
npm install
npm run dev
```

개별 워크스페이스 명령을 직접 실행하려면 아래처럼 사용할 수 있습니다.

```sh
npm run fe:build
npm run fe:test
npm run fe:lint
```

### Backend

```sh
cd backend
./gradlew bootRun
```

루트에서 바로 실행하려면 `npm run backend:run`을 사용할 수 있습니다.

### AI

```sh
cd ai
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
uvicorn app.main:app --reload --port 8000
```

이미 Python 의존성이 준비돼 있다면 루트에서 `npm run ai:run`으로 실행할 수 있습니다.

### Mobile

모바일 앱은 `mobile/` 아래에서 Expo React Native로 관리합니다. `android/`, `ios/` 네이티브 폴더는 커밋하지 않고 prebuild로 생성합니다.

```sh
cd mobile
npm install
npm run start
```

루트에서 검증하려면 아래 명령을 사용합니다.

```sh
npm run mobile:typecheck
npm run mobile:prebuild:android
npm run mobile:export:web
```

스토어 제출 준비 항목은 [docs/mobile/STORE_READINESS.md](docs/mobile/STORE_READINESS.md)를 확인합니다.

### Infra

```sh
cd infra/terraform/init
terraform init
terraform apply

cd ../minimum
cp backend.hcl.example backend.hcl
terraform init -backend-config=backend.hcl
terraform plan
terraform apply
```

Cloudflare 무료 정적 서빙을 쓰려면 아래 스택을 별도로 사용할 수 있습니다.

```sh
cd infra/terraform/cloudflare_free
terraform init
terraform plan
terraform apply
```

루트에서 보조 명령으로 `npm run infra:init:fmt`, `npm run infra:init:validate`, `npm run infra:fmt`, `npm run infra:validate`, `npm run infra:cloudflare:fmt`, `npm run infra:cloudflare:validate`를 사용할 수 있습니다.

## 운영 배포

운영 배포 전에는 [docs/infrastructure/DEPLOYMENT_NOTES.md](docs/infrastructure/DEPLOYMENT_NOTES.md)를 먼저 확인합니다.
이 문서에는 현행 S3/CloudFront/Lambda 배포 순서, CloudFront 캐시 무효화, Google/Kakao 소셜 로그인 콜백 URL 확인 항목이 정리돼 있습니다.

## 환경 변수

- 프론트엔드: 빌드 타임 환경변수 없이 상대 경로 `/api/planner/v1`, `/api/ai/v1`를 사용하고 로컬에서는 Vite proxy를 통해 백엔드/AI로 연결됩니다.
- 백엔드/AI 런타임 설정: AWS SSM Parameter Store에서 읽습니다. Terraform은 일반 설정만 적재하고, secret 값은 SSM에 별도로 넣은 뒤 Lambda에는 `APP_CONFIG_PREFIX`만 전달합니다.
- Cloudflare 무료 프론트 스택: `cloudflare_api_token`, `cloudflare_account_id`, `api_origin`이 필요합니다. 이 값들은 Git에 커밋하지 않습니다.
- 로컬 개발용 민감값은 `ai/.env`, Terraform `terraform.tfvars` 또는 `TF_VAR_*`로만 주입하고 Git에는 올리지 않습니다.

상세 구조와 아키텍처 설명은 [docs/README.md](docs/README.md)를 참고하면 됩니다.
