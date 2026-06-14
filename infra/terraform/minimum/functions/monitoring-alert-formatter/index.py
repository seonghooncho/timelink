import json
import os
import urllib.error
import urllib.request
from datetime import datetime
from email.header import Header
from email.utils import formataddr
from zoneinfo import ZoneInfo

import boto3


ses = boto3.client("sesv2")
ssm = boto3.client("ssm")
KST = ZoneInfo("Asia/Seoul")
DISCORD_PARAMETER_ENV = "DISCORD_WEBHOOK_PARAMETER_NAME"


def handler(event, context):
    results = []
    for record in event.get("Records", []):
        sns = record.get("Sns", {})
        message = parse_message(sns.get("Message", ""))
        alert = build_alert_context(message, sns)
        subject, body = build_email(alert)
        response = send_email(subject, body)
        discord_result = send_discord_alert(alert)

        result = {
            "snsMessageId": sns.get("MessageId"),
            "sesMessageId": response.get("MessageId"),
            "discord": discord_result,
        }
        print(json.dumps({
            "event": "monitoring_alert_processed",
            "snsMessageId": result["snsMessageId"],
            "sesMessageId": result["sesMessageId"],
            "discordStatus": discord_result.get("status"),
            "alarmName": alert["alarm_name"],
            "state": alert["state"],
            "severity": alert["severity"],
        }, ensure_ascii=False))
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


def build_alert_context(message, sns):
    alarm_name = message.get("AlarmName") or "Timelink 모니터링 알림"
    state = message.get("NewStateValue") or "INFO"
    trigger = message.get("Trigger") if isinstance(message.get("Trigger"), dict) else {}
    category = category_for(alarm_name, trigger)

    return {
        "alarm_name": alarm_name,
        "state": state,
        "state_label": state_label_for(state),
        "severity": severity_for(alarm_name, state),
        "category": category,
        "changed_at_kst": format_kst(message.get("StateChangeTime") or sns.get("Timestamp")),
        "reason": message.get("NewStateReason") or message.get("Message") or "상세 사유가 제공되지 않았습니다.",
        "description": message.get("AlarmDescription") or "-",
        "metric_lines": metric_summary(trigger),
        "user_impact": user_impact_for(alarm_name, state),
        "log_groups": log_groups_for(alarm_name, trigger),
        "logs_insights_query": logs_insights_query_for(alarm_name),
        "next_steps": action_hints(alarm_name, state),
        "discord_color": discord_color_for(state, alarm_name),
        "timestamp": discord_timestamp(message.get("StateChangeTime") or sns.get("Timestamp")),
    }


def build_email(alert):
    subject = f"[Timelink 운영 알림] {alert['state_label']} / {alert['severity']}: {alert['category']}"
    lines = [
        "Timelink 운영 알림",
        "",
        f"알람명: {alert['alarm_name']}",
        f"상태: {alert['state_label']} ({alert['state']})",
        f"심각도: {alert['severity']}",
        f"분류: {alert['category']}",
        f"발생 시각(KST): {alert['changed_at_kst']}",
        "",
        "어떤 지표가 기준을 넘었나요?",
        *prefix_lines(alert["metric_lines"] or ["지표 상세가 제공되지 않았습니다."]),
        "",
        "사용자 영향 가능성",
        *prefix_lines(alert["user_impact"]),
        "",
        "알람 사유",
        *prefix_lines([alert["reason"]]),
        "",
        "알람 설명",
        *prefix_lines([alert["description"]]),
        "",
        "먼저 확인할 로그 그룹",
        *prefix_lines(alert["log_groups"]),
        "",
        "CloudWatch Logs Insights 쿼리",
        "```",
        alert["logs_insights_query"],
        "```",
        "",
        "다음 조치",
        *prefix_lines(alert["next_steps"]),
        "",
        "운영 메모",
        "- 이 메일은 CloudWatch 알람을 Timelink 운영용 요약으로 변환한 알림입니다.",
        "- 원본 SNS email-json 백업 구독은 formatter 이메일/Discord 알림 확인 후 제거하거나 별도 백업 주소로 분리합니다.",
    ]
    return subject, "\n".join(lines)


def build_discord_payload(alert):
    fields = [
        {"name": "상태", "value": f"{alert['state_label']} ({alert['state']})", "inline": True},
        {"name": "심각도", "value": alert["severity"], "inline": True},
        {"name": "발생 시각", "value": alert["changed_at_kst"], "inline": False},
        {"name": "지표", "value": truncate("\n".join(alert["metric_lines"]) or "지표 상세 없음"), "inline": False},
        {"name": "사용자 영향 가능성", "value": truncate("\n".join(alert["user_impact"])), "inline": False},
        {"name": "먼저 볼 로그 그룹", "value": truncate("\n".join(f"`{item}`" for item in alert["log_groups"])), "inline": False},
        {"name": "다음 조치", "value": truncate("\n".join(alert["next_steps"])), "inline": False},
    ]
    return {
        "username": "Timelink Monitor",
        "embeds": [
            {
                "title": f"{discord_title_icon(alert)} {alert['category']}",
                "description": truncate(alert["alarm_name"], 240),
                "color": alert["discord_color"],
                "fields": fields,
                "timestamp": alert["timestamp"],
            }
        ],
    }


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


def send_discord_alert(alert):
    webhook_url = get_discord_webhook_url()
    if not webhook_url:
        print(json.dumps({
            "event": "monitoring_alert_discord_skipped",
            "reason": "webhook_not_configured",
            "alarmName": alert["alarm_name"],
        }, ensure_ascii=False))
        return {"status": "skipped", "reason": "webhook_not_configured"}

    try:
        post_discord(webhook_url, build_discord_payload(alert))
        return {"status": "sent"}
    except urllib.error.HTTPError as exc:
        print(json.dumps({
            "event": "monitoring_alert_discord_failed",
            "errorType": exc.__class__.__name__,
            "httpStatus": exc.code,
            "alarmName": alert["alarm_name"],
        }, ensure_ascii=False))
        return {"status": "failed", "errorType": exc.__class__.__name__, "httpStatus": exc.code}
    except Exception as exc:
        print(json.dumps({
            "event": "monitoring_alert_discord_failed",
            "errorType": exc.__class__.__name__,
            "alarmName": alert["alarm_name"],
        }, ensure_ascii=False))
        return {"status": "failed", "errorType": exc.__class__.__name__}


def get_discord_webhook_url():
    parameter_name = os.environ.get(DISCORD_PARAMETER_ENV)
    if not parameter_name:
        return None

    try:
        response = ssm.get_parameter(Name=parameter_name, WithDecryption=True)
        value = response.get("Parameter", {}).get("Value")
        return value.strip() if isinstance(value, str) and value.strip() else None
    except Exception as exc:
        code = getattr(exc, "response", {}).get("Error", {}).get("Code")
        level = "info" if code == "ParameterNotFound" else "warning"
        print(json.dumps({
            "event": "monitoring_alert_discord_webhook_unavailable",
            "level": level,
            "parameterName": parameter_name,
            "errorCode": code or exc.__class__.__name__,
        }, ensure_ascii=False))
        return None


def post_discord(webhook_url, payload):
    request = urllib.request.Request(
        webhook_url,
        data=json.dumps(payload, ensure_ascii=False).encode("utf-8"),
        headers={
            "Content-Type": "application/json",
            "User-Agent": "TimelinkMonitor/1.0 (+https://timelink.cloud)",
        },
        method="POST",
    )
    with urllib.request.urlopen(request, timeout=5) as response:
        if response.status >= 300:
            raise urllib.error.HTTPError(
                webhook_url,
                response.status,
                f"Discord webhook returned HTTP {response.status}",
                response.headers,
                None,
            )


def state_label_for(state):
    labels = {
        "ALARM": "문제 발생",
        "OK": "복구됨",
        "INSUFFICIENT_DATA": "데이터 부족",
        "INFO": "알림",
    }
    return labels.get(state, state)


def severity_for(alarm_name, state):
    if state == "OK":
        return "RESOLVED"
    if state == "INSUFFICIENT_DATA":
        return "INFO"

    name = alarm_name.lower()
    if "5xx" in name or "lambda-errors" in name or "throttles" in name:
        return "HIGH"
    if "latency" in name or "duration" in name or "dynamodb" in name:
        return "MEDIUM"
    return "LOW"


def category_for(alarm_name, trigger=None):
    name = alarm_name.lower()
    metric_name = ((trigger or {}).get("MetricName") or "").lower()
    if "api-gateway-5xx" in name or metric_name == "5xx":
        return "API 5xx 오류"
    if "api-gateway-latency" in name or metric_name == "latency":
        return "API 응답 지연"
    if "lambda-duration" in name or metric_name == "duration":
        return "Lambda 처리 지연"
    if "lambda-errors" in name or metric_name == "errors":
        return "Lambda 오류"
    if "lambda-throttles" in name or metric_name == "throttles":
        return "Lambda 동시성 제한"
    if "dynamodb-read-throttles" in name:
        return "DynamoDB 읽기 제한"
    if "dynamodb-write-throttles" in name:
        return "DynamoDB 쓰기 제한"
    if "dynamodb-scan-returned-items" in name:
        return "DynamoDB Scan 사용 감지"
    return "운영 지표 이상"


def user_impact_for(alarm_name, state):
    if state == "OK":
        return ["현재 알람은 복구 상태입니다.", "같은 시간대 반복 발생 여부만 확인하면 됩니다."]

    name = alarm_name.lower()
    if "api-gateway-5xx" in name or "lambda-errors" in name:
        return ["일부 사용자의 API 요청이 실패했을 수 있습니다.", "로그에서 같은 requestId의 ERROR stack trace를 먼저 확인합니다."]
    if "latency" in name or "duration" in name:
        return ["일부 사용자가 화면 전환이나 저장 완료를 느리게 경험했을 수 있습니다.", "느린 path와 DynamoDB/외부 API 지연 여부를 함께 확인합니다."]
    if "lambda-throttles" in name:
        return ["일부 요청 또는 비동기 작업이 지연되거나 재시도됐을 수 있습니다.", "동시성 한도와 같은 시각 트래픽 증가를 확인합니다."]
    if "dynamodb" in name:
        return ["일부 조회/저장 요청이 느려졌을 수 있습니다.", "hot partition, scan 재발, 갑작스러운 요청 증가를 확인합니다."]
    return ["사용자 영향은 알람 지표와 로그를 함께 확인해야 합니다."]


def action_hints(alarm_name, state):
    if state == "OK":
        return [
            "CloudWatch Alarm history에서 같은 알람이 반복됐는지 확인합니다.",
            "사용자 문의나 오류 로그가 남았는지 같은 시간대 로그를 확인합니다.",
        ]

    name = alarm_name.lower()
    if "api-gateway-5xx" in name:
        return [
            "API Lambda 최근 ERROR stack trace를 확인합니다.",
            "직전 배포, SSM 설정, 외부 의존성 변경이 있었는지 확인합니다.",
            "같은 requestId가 프론트/백엔드 로그에 반복되는지 확인합니다.",
        ]
    if "latency" in name or "duration" in name:
        return [
            "Logs Insights로 durationMs가 큰 path를 찾습니다.",
            "DynamoDB throttle/scan 알람과 같은 시각에 발생했는지 확인합니다.",
            "일시 급증이면 재발 빈도를 기록하고, 반복되면 병목 path를 분리합니다.",
        ]
    if "lambda-throttles" in name:
        return [
            "Lambda concurrent executions와 reserved concurrency 사용량을 확인합니다.",
            "반복되면 예약 동시성 조정 또는 비동기 큐 분리를 검토합니다.",
        ]
    if "lambda-errors" in name:
        return [
            "해당 Lambda의 최근 ERROR 로그와 stack trace를 확인합니다.",
            "알림/푸시 작업이면 누락된 스케줄 재처리가 필요한지 확인합니다.",
        ]
    if "dynamodb" in name:
        return [
            "DynamoDB 지표에서 throttle, scan, hot partition 가능성을 확인합니다.",
            "최근 변경 코드에서 Query/GetItem 대신 Scan이 쓰였는지 확인합니다.",
        ]
    return [
        "CloudWatch Alarm detail에서 원본 지표와 시간을 확인합니다.",
        "같은 시각의 배포, 트래픽, 외부 의존성 변화를 함께 확인합니다.",
    ]


def log_groups_for(alarm_name, trigger):
    dimensions = dimensions_map(trigger)
    function_name = dimensions.get("FunctionName")
    if function_name:
        return [f"/aws/lambda/{function_name}"]

    name = alarm_name.lower()
    if "api-gateway" in name:
        return ["/aws/apigateway/planner-prod", "/aws/lambda/planner-prod-api"]
    if "notification-worker" in name:
        return ["/aws/lambda/planner-prod-notification-worker"]
    if "ai" in name:
        return ["/aws/lambda/planner-prod-ai"]
    if "dynamodb" in name:
        return ["/aws/lambda/planner-prod-api", "/aws/lambda/planner-prod-notification-worker"]
    return ["/aws/lambda/planner-prod-api"]


def logs_insights_query_for(alarm_name):
    name = alarm_name.lower()
    if "latency" in name or "duration" in name:
        return "\n".join([
            "fields @timestamp, @message",
            "filter @message like /http_request_completed/",
            "parse @message \"http_request_completed requestId=* method=* path=* status=* durationMs=*\" as requestId, method, path, status, durationMs",
            "sort durationMs desc",
            "limit 50",
        ])
    return "\n".join([
        "fields @timestamp, @message",
        "filter @message like /requestId|http_request_completed|ERROR|Exception/",
        "sort @timestamp desc",
        "limit 50",
    ])


def metric_summary(trigger):
    if not isinstance(trigger, dict) or not trigger:
        return []

    metric_name = trigger.get("MetricName")
    namespace = trigger.get("Namespace")
    statistic = trigger.get("Statistic") or trigger.get("ExtendedStatistic")
    threshold = trigger.get("Threshold")
    comparison = trigger.get("ComparisonOperator")
    period = trigger.get("Period")
    evaluation_periods = trigger.get("EvaluationPeriods")
    datapoints = trigger.get("DatapointsToAlarm")
    dimensions = dimensions_map(trigger)

    lines = []
    if namespace or metric_name:
        lines.append(f"{namespace or '-'} / {metric_name or '-'}")
    if statistic or threshold is not None:
        lines.append(f"{statistic or '-'} {comparison or ''} {threshold if threshold is not None else '-'}")
    if period or evaluation_periods or datapoints:
        lines.append(f"period={period or '-'}s, evaluationPeriods={evaluation_periods or '-'}, datapointsToAlarm={datapoints or '-'}")
    if dimensions:
        rendered = ", ".join(f"{key}={value}" for key, value in dimensions.items())
        lines.append(f"dimensions: {rendered}")
    return lines


def dimensions_map(trigger):
    dimensions = trigger.get("Dimensions") if isinstance(trigger, dict) else None
    if not isinstance(dimensions, list):
        return {}
    result = {}
    for item in dimensions:
        if not isinstance(item, dict):
            continue
        key = item.get("name") or item.get("Name")
        value = item.get("value") or item.get("Value")
        if key and value:
            result[str(key)] = str(value)
    return result


def format_kst(value):
    parsed = parse_datetime(value)
    if parsed is None:
        return datetime.now(KST).strftime("%Y-%m-%d %H:%M:%S KST")
    return parsed.astimezone(KST).strftime("%Y-%m-%d %H:%M:%S KST")


def discord_timestamp(value):
    parsed = parse_datetime(value)
    if parsed is None:
        parsed = datetime.now().astimezone()
    return parsed.astimezone(ZoneInfo("UTC")).isoformat().replace("+00:00", "Z")


def parse_datetime(value):
    if not value:
        return None
    normalized = value.replace("Z", "+00:00")
    if len(normalized) >= 5 and normalized[-5] in ("+", "-") and normalized[-3] != ":":
        normalized = f"{normalized[:-2]}:{normalized[-2:]}"
    try:
        return datetime.fromisoformat(normalized)
    except ValueError:
        return None


def discord_color_for(state, alarm_name):
    severity = severity_for(alarm_name, state)
    if severity == "RESOLVED":
        return 0x2ECC71
    if severity == "HIGH":
        return 0xE74C3C
    if severity == "MEDIUM":
        return 0xF1C40F
    return 0x95A5A6


def discord_title_icon(alert):
    if alert["state"] == "OK":
        return "[OK]"
    if alert["severity"] == "HIGH":
        return "[HIGH]"
    if alert["severity"] == "MEDIUM":
        return "[MEDIUM]"
    return "[INFO]"


def prefix_lines(lines):
    return [f"- {line}" for line in lines]


def truncate(value, limit=1000):
    if value is None:
        return ""
    text = str(value)
    if len(text) <= limit:
        return text
    return text[: limit - 3] + "..."
