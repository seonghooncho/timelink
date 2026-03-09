# Terraform 구조

## 근본 목적

Terraform 상태 관리와 실제 애플리케이션 인프라를 분리해서, 구조 개편 이후에도 최소 운영 스택과 부트스트랩 스택을 독립적으로 유지보수할 수 있게 하는 것이 목적입니다.

## 비목적

모든 인프라를 과하게 모듈화하거나, 운영상 의미 없는 디렉터리 분산으로 가독성을 떨어뜨리는 것이 목적은 아닙니다.

## 디렉터리

```text
infra/terraform/
├── init/      # tfstate S3 bucket + DynamoDB lock table bootstrap
├── minimum/   # 현재 운영 최소 스택 (frontend/backend/ai/dynamodb/ssm)
└── cloudflare_free/ # workers.dev 기반 무료 프론트 서빙
```

## 적용 순서

1. `init/`에서 Terraform state bucket과 lock table을 먼저 생성합니다.
2. `minimum/backend.hcl.example`을 참고해 로컬 `backend.hcl`을 만든 뒤 remote backend를 초기화합니다.
3. `minimum/`에서 실제 서비스 인프라를 계획하고 적용합니다.
4. 도메인 없이 무료 프론트 서빙이 필요하면 `cloudflare_free/`를 별도로 적용합니다.

## 예시 명령

```bash
cd infra/terraform/init
terraform init
terraform apply

cd ../minimum
cp backend.hcl.example backend.hcl
terraform init -backend-config=backend.hcl
terraform plan
terraform apply

cd ../cloudflare_free
terraform init
terraform plan
terraform apply
```

## SSM Parameter Store

- Backend Lambda는 `APP_CONFIG_PREFIX=/planner/<env>/backend`를 기준으로 런타임 설정을 읽습니다.
- AI Lambda는 `APP_CONFIG_PREFIX=/planner/<env>/ai`를 기준으로 런타임 설정을 읽습니다.
- `jwt.secret`, `GEMINI_API_KEY`는 Terraform이 만들지 않습니다. 실제 secret 값은 SSM에 별도로 넣어야 합니다.
- 실제 비밀값과 `backend.hcl`은 Git에 커밋하지 않습니다.

## Cloudflare Free

- `cloudflare_free/`는 `workers.dev` 도메인을 써서 프론트 정적 파일을 무료로 서빙하는 선택 스택입니다.
- 같은 Worker가 `/api/*`를 AWS API origin으로 프록시하므로, 프론트 코드의 상대 경로 설계를 유지할 수 있습니다.
- `cloudflare_api_token`, `cloudflare_account_id`, `api_origin`은 로컬 `terraform.tfvars` 또는 `TF_VAR_*`로만 주입합니다.
