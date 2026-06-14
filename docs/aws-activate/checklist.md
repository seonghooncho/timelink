# AWS Activate Founders Checklist

## 근본 목적

Timelink의 AWS Activate Founders 신청에서 제품 상태, 공개 신뢰 요소, AWS 사용 계획, 비용 통제 계획을 일관되게 제시해 신청 검토에 필요한 준비도를 높인다.

## 비목적

이 문서는 AWS Activate 최종 제출, AWS 로그인/MFA 대행, 비밀값 취급, 운영 배포 자동 수행을 대신하기 위한 문서가 아니다.

## 기준 정보

- Product: Timelink
- Website: https://timelink.cloud/
- GitHub: https://github.com/seonghooncho/timelink
- Disquiet: https://disquiet.io/product/timelink
- 신청 경로: AWS Activate Founders Self-funded
- 신청 주체: 개인/솔로 창업자
- 상태: live web/PWA, public MVP/beta
- 시작 기준일: 2026-06
- 투자/매출: self-funded, no external funding, no revenue yet
- 이전 AWS Activate credits: 받은 적 없음

## 공식 AWS 기준 확인

AWS 공식 Credits 페이지와 신청 가이드 기준으로 Founders 신청 전에 아래 항목을 확인한다.

- Pre-Series B startup이어야 한다.
- 설립 또는 시작 시점이 최근 10년 이내여야 한다.
- AWS account가 Paid Tier Plan이어야 한다.
- AWS Activate Credits를 새로 신청하거나, 이전 수령액보다 높은 credit tier를 신청해야 한다.
- Founders Self-funded는 bootstrapped 또는 self-funded startup이 직접 신청하는 경로다.
- Portfolio는 Activate Provider의 Organization ID가 있을 때 사용하는 경로다.
- 신청 흐름은 AWS Builder ID 생성/로그인, Activate profile 작성, credit tier 선택, startup details 입력, AWS account 연결, account verification, review and submit 순서다.
- 제출 후 처리 안내는 공식 가이드 기준 5-10 business days 또는 7-10 business days 범위로 안내되어 있으므로, 신청 화면의 최신 문구를 최종 기준으로 본다.

Sources:

- https://aws.amazon.com/startups/credits/
- https://aws.amazon.com/startups/learn/applying-for-aws-activate-credits-a-step-by-step-guide?lang=en-US

## Readiness Checklist

- [x] Live product website exists: https://timelink.cloud/
- [x] Product is public on Disquiet: https://disquiet.io/product/timelink
- [x] Public GitHub repository exists: https://github.com/seonghooncho/timelink
- [x] Product positioning is clear enough for application draft.
- [x] Founder status is conservative: solo founder, self-funded.
- [x] Current stage is conservative: live MVP/beta.
- [x] Privacy policy route exists in frontend code: `/privacy`.
- [x] Terms route exists in frontend code: `/terms`.
- [ ] Confirm AWS account is active and on Paid Tier Plan.
- [ ] Confirm AWS Builder ID email and Activate profile email.
- [x] Add Cloudflare DNS records for SES receiving, SPF, DMARC, and DKIM.
- [x] Confirm SES domain identity and DKIM for `timelink.cloud` are `SUCCESS`.
- [x] Confirm `contact@timelink.cloud` receives and forwards test email successfully.
- [ ] Confirm no prior Activate credit record exists in the AWS Activate application/status page.
- [ ] Confirm the final application answers on the AWS review screen before manual submission.

## Missing Items

- Legal entity name: unknown. Use individual/solo founder status unless a legal entity exists.
- Legal address: unknown. Enter directly in AWS only if required; do not store it in this repository.
- Exact user/traction numbers: unknown. Use "live MVP/beta with public listing" rather than fabricated metrics.
- AWS account Paid Tier Plan status: must be verified in AWS account/billing screens.
- Business email/domain consistency: AWS recommends using a business email that matches the startup domain for Activate profile and credit application.

## Risks Before Applying

- The site is a client-side SPA, so some crawlers may only see the base HTML and not the rendered product explanation.
- The public website should expose `/about`, `/contact`, `/privacy`, and `/terms` without requiring login.
- Application details cannot be edited after submission according to the official AWS guide; incorrect information may require cancellation and resubmission.
- If an AWS account is already linked to another Builder ID, account linking can fail.
- Cost controls should be enabled before scaling usage, because AWS Budgets and Cost Anomaly Detection can have notification delays.

## Manual Founder Steps

1. Create or sign in to AWS Builder ID with the chosen business email.
2. Complete the AWS Activate profile with truthful founder and startup information.
3. Choose Activate Founders Self-funded.
4. Fill application fields using `application-draft.md`.
5. Link the primary Timelink AWS account.
6. Verify the linked AWS account in the AWS Management Console if prompted.
7. Review every application answer on the final screen.
8. Manually click submit only after confirming all facts.
9. Monitor email and AWS Activate application status for the review result.

## Do Not Share Or Store

- AWS password
- Root credentials
- MFA codes
- Access keys or secret access keys
- Billing card details
- GitHub tokens
- OAuth client secrets
- Database credentials
- `.env` values
- Production secrets
