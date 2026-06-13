# 이미지 처리 파이프라인

## 근본 목적

사용자 업로드 이미지를 원본 그대로 공개하지 않고 WebP로 변환해 저장 비용, 전송량, 화면 로딩 부담을 줄이면서도 모바일 업로드 UX를 유지하는 것이 목적입니다.

## 비목적

이 문서는 이미지 편집 UI의 세부 구현이나 S3, Lambda, DynamoDB의 모든 설정값을 반복 설명하지 않으며, 운영자가 구조 선택 이유와 한계를 빠르게 판단하는 데 필요한 내용만 다룹니다.

## 현재 구조

이미지 업로드는 프론트에서 crop을 완료한 뒤 S3 `upload/` prefix로 직접 올리고, S3 이벤트가 Lambda를 호출해 WebP 변환과 DB 상태 갱신을 수행하는 비동기 구조입니다.

1. 사용자가 프로필, 그룹, 일정, 모임 소개, 모임 글 이미지 파일을 선택합니다.
2. 프론트가 15MB 이하와 허용 확장자 `jpg`, `jpeg`, `png`, `webp`를 먼저 검증합니다.
3. 프론트가 crop/position 조정 UI에서 최종 업로드 이미지를 만듭니다.
4. 백엔드가 이미지 목적과 크기, 타입을 검증하고 presigned PUT URL을 발급합니다.
5. 프론트가 결과 이미지를 S3 `upload/{purpose}/{userId}/{imageId}/original.{ext}`에 직접 업로드합니다.
6. 백엔드는 이미지 레코드를 `PROCESSING` 상태로 저장합니다. 프로필, 그룹, 일정, 모임 글처럼 단일 이미지 필드를 가진 대상은 `imageId`, `imageStatus`도 연결합니다.
7. S3 `upload/` object-created 이벤트가 image processor Lambda를 실행합니다.
8. Lambda가 원본을 읽어 WebP full variant로 변환하고 `public/member/`, `public/group/`, `public/schedule/`, `public/group-intro/`, `public/group-post/`, `public/community-post/` 중 목적에 맞는 prefix에 저장합니다.
9. 프로필, 모임 내 프로필, 모임 대표 이미지처럼 작은 크기로 반복 노출되는 `MEMBER`, `GROUP` 목적은 강하게 압축한 thumbnail variant를 추가 생성합니다.
10. Lambda가 DynamoDB 이미지 레코드를 `COMPLETED` 상태와 full/thumbnail URL/key로 갱신합니다. 단일 이미지 대상은 대상 엔티티도 함께 갱신하고, 모임 소개 이미지는 소개의 `imageIds`가 완료된 이미지 레코드를 조회합니다.
11. 변환 전 UI는 처리 중 placeholder를 보여주고, 목록/아바타는 thumbnail을, 상세/게시물/소개 이미지는 full WebP를 표시합니다.

주요 구현 위치는 다음과 같습니다.

- 프론트: `fe/src/lib/images.ts`, `fe/src/components/common/ImageCropModal.tsx`
- 백엔드: `backend/src/main/java/com/planner/domain/storage`
- Lambda: `infra/terraform/minimum/functions/image-processor/index.mjs`
- 인프라: `infra/terraform/minimum/image_processing.tf`, `infra/terraform/minimum/s3_storage.tf`, `infra/terraform/minimum/s3_cloudfront.tf`

## 선택한 방식

현재는 `S3 presigned upload + S3 event Lambda + WebP 변환 + DynamoDB 상태 갱신` 방식을 선택했습니다.

이 방식은 운영 초기 트래픽에서 비용이 낮고, 백엔드 Lambda가 큰 이미지 바이트를 직접 받지 않아 API 응답 지연과 Lambda payload 부담을 줄입니다. 또한 원본은 `upload/` 임시 prefix에만 두고 최종 공개 경로에는 WebP 결과만 노출할 수 있어 운영 정책이 명확합니다.

## 비교한 대안

### 클라이언트에서만 압축

장점은 서버 비용이 거의 없고 업로드 전 용량을 줄일 수 있다는 점입니다. 단점은 브라우저와 기기 성능에 따라 결과 품질과 처리 시간이 흔들리고, 악의적이거나 구형 클라이언트가 원본을 그대로 올리는 경우를 서버가 통제하기 어렵다는 점입니다.

Timelink는 모바일 PWA 업로드 안정성이 중요하므로 클라이언트 crop은 UX 보정에 쓰고, 최종 포맷 통제는 서버리스 파이프라인에서 처리하는 쪽을 선택했습니다.

### 백엔드 API가 multipart 이미지를 받아 직접 변환

장점은 흐름이 단순하고 요청 하나로 완료 여부를 알기 쉽다는 점입니다. 단점은 Spring Lambda가 이미지 바이트 수신, 변환, 저장을 모두 맡아야 해서 메모리와 응답 시간이 커지고, 업로드가 몰리면 일반 API 요청까지 함께 느려질 수 있다는 점입니다.

현재 서비스는 일정, 그룹, 알림 API와 이미지 처리를 분리하는 것이 더 중요하므로 백엔드 직접 변환은 선택하지 않았습니다. 기존 multipart 업로드 API는 호환 목적의 경로로 남아 있지만, 신규 UX는 presigned upload를 기준으로 봅니다.

### 외부 이미지 CDN/관리형 변환 서비스

장점은 썸네일, 리사이징, 캐싱, 포맷 협상 같은 기능을 빠르게 얻을 수 있다는 점입니다. 단점은 고정비나 사용량 비용이 늘고, 운영 초기에는 장애 분석과 데이터 위치 관리가 복잡해질 수 있다는 점입니다.

현재 규모에서는 S3, Lambda, CloudFront만으로 비용 대비 충분한 효과를 얻을 수 있어 관리형 이미지 CDN은 보류했습니다.

### 동기 Lambda 변환 API

장점은 프론트가 업로드 직후 최종 URL을 받을 수 있어 상태 모델이 단순합니다. 단점은 사용자가 변환 완료까지 기다려야 하고, 큰 이미지나 콜드스타트가 겹치면 업로드 UX가 느려집니다.

Timelink는 업로드 후 화면을 막지 않는 흐름이 더 중요하므로 `PROCESSING → COMPLETED` 상태를 두는 비동기 방식을 선택했습니다.

## 장점

- API Lambda가 큰 파일을 직접 받지 않아 일반 API 응답 안정성이 높습니다.
- 최종 공개 이미지를 WebP로 통일하고, 작은 아바타류는 thumbnail을 사용해 목록 화면 전송량을 줄일 수 있습니다.
- `member`, `group`, `schedule`, `group-intro`, `group-post` 목적별 prefix가 분리되어 운영 조회와 정리가 쉽습니다.
- `upload/` 원본은 lifecycle로 자동 정리되어 임시 파일이 계속 쌓이는 문제를 줄입니다.
- 처리 상태를 DB에 남기므로 UI에서 처리 중, 실패, 완료 상태를 명확히 표현할 수 있습니다.

## 현재 한계

- Lambda 변환은 비동기라 업로드 직후 잠시 placeholder가 보일 수 있습니다.
- 현재 variant는 `full`, 일부 목적의 `thumbnail`까지만 생성하므로, 반응형 `srcset`이나 디바이스별 다중 사이즈는 아직 제공하지 않습니다.
- Lambda가 실패하면 `FAILED` 상태와 기본 이미지 표시까지는 가능하지만, 사용자 주도 재시도 UX는 아직 제한적입니다.
- CloudFront는 `/public/*`을 장기 캐시할 수 있으므로 같은 key를 덮어쓰는 방식보다 새 `imageId` 기반 key를 유지해야 캐시 문제가 적습니다.
- presigned PUT은 브라우저 CORS에 민감하므로 운영 도메인과 `www` 도메인 변경 시 S3 CORS도 함께 확인해야 합니다.

## 운영 확인 기준

이미지 처리 장애를 볼 때는 아래 순서로 확인합니다.

1. 백엔드 presign API가 `imageId`, `uploadKey`, `uploadUrl`을 발급했는지 확인합니다.
2. S3 `upload/` prefix에 원본 객체가 생성됐는지 확인합니다.
3. `planner-prod-image-processor` Lambda 로그에서 변환 성공 또는 실패 원인을 확인합니다.
4. DynamoDB `ImageUpload` 레코드의 `imageStatus`가 `PROCESSING`, `COMPLETED`, `FAILED` 중 어디에 멈춰 있는지 확인합니다.
5. CloudFront `/public/*` behavior와 S3 public assets bucket policy가 최종 WebP 조회를 허용하는지 확인합니다.

## 개선 방향

운영 초기에는 현재 구조를 유지하는 것이 비용과 복잡도 균형이 좋습니다. 다만 이미지 업로드가 잦아지고 화면 로딩 지표가 중요해지면 다음 순서로 개선합니다.

1. 이미지 사용량이 더 커지면 동일 원본에서 `small`, `medium`, `large` WebP variant와 `srcset`을 추가해 디바이스별 전송량을 더 줄입니다.
2. Lambda 실패 시 사용자가 다시 처리 요청을 보낼 수 있는 재시도 API를 추가합니다.
3. CloudFront cache policy와 이미지 key 정책을 정리해 긴 캐시와 빠른 갱신의 기준을 문서화합니다.
4. 업로드 트래픽이 커지면 SQS를 사이에 둬 S3 이벤트 폭주 시 Lambda 동시성 제어와 재처리를 명확히 합니다.
5. 이미지 기능이 제품 핵심이 되면 외부 이미지 CDN이나 전용 미디어 파이프라인 도입을 다시 비교합니다.
