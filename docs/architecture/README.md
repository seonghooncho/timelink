# Timelink 구조 문서

## 근본 목적

아키텍처 정합성, 이미지 처리 파이프라인, 확장 판단 기준을 한 위치에서 찾게 해서 구조 변경의 영향 범위와 개선 우선순위를 빠르게 판단하게 하는 것이 목적입니다.

## 비목적

이 문서는 Terraform 전체 리소스 명세나 모든 AWS 운영 절차를 반복 설명하지 않습니다. 실제 배포, 모니터링, 부하테스트 결과는 `operations/`, `testing/` 문서를 기준으로 확인합니다.

## 문서 목록

- [이미지 처리 파이프라인](IMAGE_PROCESSING_PIPELINE.md): presigned upload, WebP 변환 Lambda, 처리 상태 관리의 선택 이유와 한계입니다.
- [아키텍처 정합성 점검](ARCHITECTURE_ALIGNMENT.md): 프론트/백엔드/인프라 호출 경로와 데이터 계약 정리입니다.
- [확장 로드맵](SCALING_ROADMAP.md): 부하테스트 결과를 기준으로 언제 어떤 구조를 바꿀지 정리한 개선 문서입니다.
- [부하테스트 결과](../testing/LOAD_TEST_REPORT.md): k6/Playwright로 확인한 현 구조의 처리량, 지연, 실패 양상입니다.
- [운영 배포 유의사항](../operations/DEPLOYMENT_NOTES.md): S3/CloudFront/Lambda 배포와 소셜 로그인 콜백 확인 절차입니다.
- [모니터링 v1](../operations/MONITORING_V1.md): CloudWatch/SNS 기반 운영 초기 알림과 확장 전환 기준입니다.
