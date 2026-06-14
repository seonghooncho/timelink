# AWS Activate Submission Ready Sheet

## 근본 목적

AWS Activate Founders 신청 화면에서 사용자가 로그인, 계정 연결, 최종 검토만 직접 수행하면 되도록 Timelink의 확정 입력값과 직접 확인할 항목을 한 곳에 정리한다.

## 비목적

이 문서는 AWS 로그인, MFA, 결제정보 입력, 개인정보 저장, 비밀값 처리, 최종 submit 클릭을 대신하기 위한 문서가 아니다.

## Readiness Verdict

ALMOST READY.

신청 답변과 공개 근거는 준비됐다. 다만 `contact@timelink.cloud`는 AWS SES 수신 파이프라인과 Cloudflare DNS가 구성됐지만, SES 도메인 검증이 아직 `PENDING`이다. 신청을 바로 진행해야 하면 신청 연락처에는 검증된 founder Gmail을 사용하고, public product/contact에는 `contact@timelink.cloud`를 보조 연락처로 둔다. SES 검증이 `SUCCESS`가 된 뒤에는 `contact@timelink.cloud`를 주 연락처로 써도 된다.

Official AWS Apply URL:

```text
https://aws.amazon.com/startups/join?destination=%2Fcredits%2Fapply
```

Official AWS criteria checked on 2026-06-14:

- Founders Self-funded is for bootstrapped or self-funded startups applying directly.
- Eligibility includes pre-Series B, founded in the last 10 years, AWS account on Paid Tier Plan, and either new to Activate Credits or requesting more credits than previously received.
- Founders Self-funded starts with $1,000 in credits, and select participants may qualify for up to $5,000.
- The application flow is Builder ID, credit tier, startup details, AWS account linking, then submit.

## Confirmed Values

| Field | Value |
| --- | --- |
| Activate path | Founders Self-funded |
| Product name | Timelink |
| Website | https://timelink.cloud/ |
| GitHub | https://github.com/seonghooncho/timelink |
| Public product listing | https://disquiet.io/product/timelink |
| Stage | Live MVP/beta |
| Founder/team | Solo founder |
| Team size | 1 |
| Funding | Self-funded |
| External funding | None |
| Revenue | No revenue yet |
| Prior AWS Activate credits | None |
| Project/start date | 2026-06 |
| Legal entity | Individual/solo founder unless a registered business exists |
| Target market | Korean university students, study groups, team projects, clubs, side-project teams, small communities, friend groups |

## Contact Field

Use this conservative order:

1. If AWS asks for the application/business email today, use the verified founder Gmail directly in AWS.
2. If SES domain verification becomes `SUCCESS` before submission, use `contact@timelink.cloud`.
3. Do not store personal address, phone, tax, billing, or identity verification data in this repository.

## Copy-Paste Answers

### Product Description

```text
Timelink is a live web/PWA schedule management and group coordination service. It helps users organize personal schedules at a glance and coordinate meeting times with groups such as university study groups, team projects, clubs, side-project teams, and small communities.
```

### Problem Being Solved

```text
Small groups often coordinate schedules across chats, calendars, and manual polls, which creates friction, duplicated work, and missed availability. Timelink brings personal schedules and group coordination into one service so users can quickly find workable meeting times.
```

### Target Customers

```text
Timelink is built for Korean university students, study groups, team project teams, clubs, side-project teams, small communities, and friend groups that need a simple way to manage schedules and coordinate meeting times.
```

### Current Stage

```text
Timelink is a live MVP/beta. The web/PWA is publicly available at https://timelink.cloud/ and the product has been publicly listed on Disquiet at https://disquiet.io/product/timelink.
```

### Funding Status

```text
Timelink is self-funded by a solo founder. It has no external funding and no revenue yet.
```

### Business Model

```text
Timelink is currently free during the MVP/beta stage. Potential future business models include freemium features for groups, premium productivity features, and paid tools for communities or small teams.
```

### How AWS Will Be Used

```text
AWS credits will support production hosting, object storage, serverless backend workloads, image handling, scheduled notifications, monitoring, and future AI-assisted schedule extraction experiments. The goal is to run a reliable early-stage production service while keeping infrastructure simple and cost-controlled.
```

### Why AWS Credits Are Useful Now

```text
AWS credits would reduce early infrastructure cost while Timelink validates user workflows, improves reliability, and scales from a live MVP toward a more stable public beta. Credits are especially useful now because the product is already live and needs production monitoring, storage, and compute capacity without increasing early cash burn.
```

### Team / Company Description

```text
Timelink is built by a solo founder in Korea. The founder designed, implemented, and launched the current live service, including the web/PWA, backend, infrastructure, and public product listing.
```

### Public Product Presence

```text
Website: https://timelink.cloud/
GitHub: https://github.com/seonghooncho/timelink
Disquiet: https://disquiet.io/product/timelink
```

## Final Manual Steps

1. Open the official AWS Activate Credits page.
2. Choose Founders Self-funded.
3. Sign in with AWS Builder ID.
4. Complete startup profile with truthful individual/solo founder information.
5. Enter the field values above.
6. Link the Timelink AWS account.
7. Complete AWS account verification if prompted.
8. On the final review screen, check every answer against this sheet.
9. The founder manually clicks submit.

## Stop Conditions

Stop and do not submit if any screen requires facts not confirmed here:

- legal entity name that does not exist
- exact traction/user count not currently tracked
- revenue, funding, or investor information
- tax, identity, billing, or private address data that should be entered only by the founder
- final review where any field differs from this sheet
