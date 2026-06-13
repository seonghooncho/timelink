# AGENTS

- 워크플로우 규칙은 `.ai/WORKFLOW_RULES.md`에 정의한다.
- 상태 파일은 `.ai/state/`에 둔다.
- 기본 응답 언어는 한국어로 한다.
- 사용자가 명시적으로 다른 언어를 요청하지 않는 한 모든 출력은 한국어로 작성한다.
- AI는 `.ai/state/` 하위에 새 파일을 생성하지 않는다.
- AI는 `.ai/state/99_resolved.md` 기존 이력을 수정하거나 삭제하지 않는다.
- 상태 전이(`todo -> resolved`, `trouble -> resolved`)는 `.ai/scripts/update-state.sh`로만 수행한다.
- 운영 배포를 수행하기 전에는 `docs/operations/DEPLOYMENT_NOTES.md`를 읽고, 소셜 로그인 콜백 URL과 S3/CloudFront/Lambda 반영 순서를 확인한다.
