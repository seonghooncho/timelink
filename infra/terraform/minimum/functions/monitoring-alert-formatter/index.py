import json
import os
from datetime import datetime
from email.header import Header
from email.utils import formataddr
from zoneinfo import ZoneInfo

import boto3


ses = boto3.client("sesv2")
KST = ZoneInfo("Asia/Seoul")


def handler(event, context):
    results = []
    for record in event.get("Records", []):
        sns = record.get("Sns", {})
        message = parse_message(sns.get("Message", ""))
        subject, body = build_email(message, sns)
        response = send_email(subject, body)
        result = {
            "snsMessageId": sns.get("MessageId"),
            "sesMessageId": response.get("MessageId"),
        }
        print(json.dumps({"event": "monitoring_alert_email_sent", **result}, ensure_ascii=False))
        results.append(result)
    return {"sent": len(results), "messageIds": results}


def parse_message(raw_message):
    try:
        parsed = json.loads(raw_message)
        if isinstance(parsed, dict):
            return parsed
    except json.JSONDecodeError:
        pass
    return {"Message": raw_message}


def build_email(message, sns):
    alarm_name = message.get("AlarmName") or "Timelink 모니터링 알림"
    state = message.get("NewStateValue") or "INFO"
    state_label = state_label_for(state)
    category = category_for(alarm_name)
    changed_at = format_kst(message.get("StateChangeTime") or sns.get("Timestamp"))
    reason = message.get("NewStateReason") or message.get("Message") or "상세 사유가 제공되지 않았습니다."
    description = message.get("AlarmDescription") or "-"
    trigger = message.get("Trigger") or {}

    subject = f"[Timelink 운영 알림] {state_label}: {category}"
    lines = [
        f"상태: {state_label}",
        f"대상: {alarm_name}",
        f"분류: {category}",
        f"시간: {changed_at}",
        "",
        "무슨 일이 발생했나요?",
        f"- {reason}",
        "",
        "알람 설명",
        f"- {description}",
    ]

    metric_lines = metric_summary(trigger)
    if metric_lines:
        lines.extend(["", "관련 지표", *metric_lines])

    lines.extend(["", "먼저 확인할 것", *action_hints(alarm_name, state)])
    lines.extend([
        "",
        "운영 메모",
        "- 이 메일은 CloudWatch 알람을 Timelink용 한글 요약으로 변환한 알림입니다.",
        "- 원본 SNS JSON 알림은 초기 백업 경로로 당분간 유지됩니다.",
    ])

    return subject, "\n".join(lines)


def send_email(subject, body):
    source = os.environ["ALERT_EMAIL_FROM"]
    to_address = os.environ["ALERT_EMAIL_TO"]
    from_name = os.environ.get("ALERT_EMAIL_FROM_NAME", "Timelink 운영 알림")

    return ses.send_email(
        FromEmailAddress=formataddr((str(Header(from_name, "utf-8")), source)),
        Destination={"ToAddresses": [to_address]},
        Content={
            "Simple": {
                "Subject": {"Data": subject, "Charset": "UTF-8"},
                "Body": {"Text": {"Data": body, "Charset": "UTF-8"}},
            }
        },
    )


def state_label_for(state):
    labels = {
        "ALARM": "문제 발생",
        "OK": "복구됨",
        "INSUFFICIENT_DATA": "데이터 부족",
        "INFO": "알림",
    }
    return labels.get(state, state)


def category_for(alarm_name):
    name = alarm_name.lower()
    if "api-gateway-5xx" in name:
        return "API 5xx 오류"
    if "api-gateway-latency" in name:
        return "API 응답 지연"
    if "lambda-duration" in name:
        return "Lambda 처리 지연"
    if "lambda-errors" in name:
        return "Lambda 오류"
    if "lambda-throttles" in name:
        return "Lambda 동시성 제한"
    if "dynamodb-read-throttles" in name:
        return "DynamoDB 읽기 제한"
    if "dynamodb-write-throttles" in name:
        return "DynamoDB 쓰기 제한"
    if "dynamodb-scan-returned-items" in name:
        return "DynamoDB Scan 사용 감지"
    return "운영 지표 이상"


def action_hints(alarm_name, state):
    if state == "OK":
        return [
            "- 같은 시간대에 반복 알람이 있었는지 CloudWatch Alarm history를 확인합니다.",
            "- 사용자 영향이 있었다면 배포 시각과 CloudWatch Logs를 함께 확인합니다.",
        ]

    name = alarm_name.lower()
    if "api-gateway-5xx" in name:
        return [
            "- API Lambda 최근 로그에서 예외 stack trace를 확인합니다.",
            "- 직전 배포나 설정 변경이 있었는지 확인합니다.",
        ]
    if "latency" in name or "duration" in name:
        return [
            "- 느린 API 경로를 CloudWatch Logs와 API Gateway 지표에서 확인합니다.",
            "- DynamoDB 쿼리 증가나 외부 API 지연이 같이 있었는지 확인합니다.",
        ]
    if "lambda-throttles" in name:
        return [
            "- Lambda 동시성 사용량과 같은 시각의 트래픽 증가를 확인합니다.",
            "- 반복되면 reserved concurrency와 계정 quota 상향을 검토합니다.",
        ]
    if "lambda-errors" in name:
        return [
            "- 해당 Lambda의 최근 ERROR 로그를 먼저 확인합니다.",
            "- 알림/푸시 작업이라면 누락된 스케줄 재처리가 필요한지 확인합니다.",
        ]
    if "dynamodb" in name:
        return [
            "- hot partition, scan 재발, 갑작스러운 요청 증가 여부를 확인합니다.",
            "- 앱 코드에서 Query/GetItem 대신 Scan이 쓰였는지 확인합니다.",
        ]
    return [
        "- CloudWatch Alarm detail에서 원본 지표와 시간을 확인합니다.",
        "- 같은 시각의 배포, 트래픽, 외부 의존성 변화를 함께 확인합니다.",
    ]


def metric_summary(trigger):
    if not isinstance(trigger, dict) or not trigger:
        return []

    lines = []
    metric_name = trigger.get("MetricName")
    namespace = trigger.get("Namespace")
    statistic = trigger.get("Statistic") or trigger.get("ExtendedStatistic")
    threshold = trigger.get("Threshold")
    comparison = trigger.get("ComparisonOperator")

    if namespace or metric_name:
        lines.append(f"- 지표: {namespace or '-'} / {metric_name or '-'}")
    if statistic or threshold is not None:
        lines.append(f"- 기준: {statistic or '-'} {comparison or ''} {threshold if threshold is not None else '-'}")

    dimensions = trigger.get("Dimensions")
    if isinstance(dimensions, list) and dimensions:
        rendered = ", ".join(
            f"{item.get('name') or item.get('Name')}={item.get('value') or item.get('Value')}"
            for item in dimensions
        )
        lines.append(f"- 대상 차원: {rendered}")

    return lines


def format_kst(value):
    if not value:
        return datetime.now(KST).strftime("%Y-%m-%d %H:%M:%S KST")
    normalized = value.replace("Z", "+00:00")
    if len(normalized) >= 5 and normalized[-5] in ("+", "-") and normalized[-3] != ":":
        normalized = f"{normalized[:-2]}:{normalized[-2:]}"
    try:
        parsed = datetime.fromisoformat(normalized)
        return parsed.astimezone(KST).strftime("%Y-%m-%d %H:%M:%S KST")
    except ValueError:
        return value
