import json
import os
import sys
import unittest
from pathlib import Path
from unittest.mock import patch


os.environ.setdefault("AWS_DEFAULT_REGION", "ap-northeast-2")
sys.path.insert(0, str(Path(__file__).parent))

import index  # noqa: E402


FIXTURE_PATH = Path(__file__).parent / "fixtures" / "cloudwatch-alarm-sns-event.json"


def load_fixture():
    return json.loads(FIXTURE_PATH.read_text(encoding="utf-8"))


def load_message():
    event = load_fixture()
    sns = event["Records"][0]["Sns"]
    return index.parse_message(sns["Message"]), sns


class MonitoringAlertFormatterTest(unittest.TestCase):

    def test_builds_readable_email_and_discord_payload(self):
        message, sns = load_message()
        alert = index.build_alert_context(message, sns)

        subject, body = index.build_email(alert)
        payload = index.build_discord_payload(alert)

        self.assertIn("[Timelink 운영 알림]", subject)
        self.assertIn("알람명: planner-prod-api-gateway-5xx", body)
        self.assertIn("심각도: HIGH", body)
        self.assertIn("발생 시각(KST): 2026-06-14 17:00:00 KST", body)
        self.assertIn("어떤 지표가 기준을 넘었나요?", body)
        self.assertIn("AWS/ApiGateway / 5xx", body)
        self.assertIn("사용자 영향 가능성", body)
        self.assertIn("먼저 확인할 로그 그룹", body)
        self.assertIn("/aws/apigateway/planner-prod", body)
        self.assertIn("CloudWatch Logs Insights 쿼리", body)
        self.assertIn("fields @timestamp, @message", body)
        self.assertIn("다음 조치", body)
        self.assertNotIn("\"Trigger\"", body)

        self.assertEqual(payload["username"], "Timelink Monitor")
        self.assertEqual(payload["embeds"][0]["color"], 0xE74C3C)
        field_names = [field["name"] for field in payload["embeds"][0]["fields"]]
        self.assertIn("심각도", field_names)
        self.assertIn("먼저 볼 로그 그룹", field_names)

    def test_handler_skips_discord_when_webhook_parameter_is_not_configured(self):
        event = load_fixture()

        with patch.object(index, "ses") as ses_mock, patch.dict(os.environ, {
            "ALERT_EMAIL_FROM": "alerts@example.com",
            "ALERT_EMAIL_TO": "ops@example.com",
            "ALERT_EMAIL_FROM_NAME": "Timelink 운영 알림",
        }, clear=False):
            os.environ.pop(index.DISCORD_PARAMETER_ENV, None)
            ses_mock.send_email.return_value = {"MessageId": "ses-message-1"}

            result = index.handler(event, None)

        self.assertEqual(result["sent"], 1)
        self.assertEqual(result["messageIds"][0]["sesMessageId"], "ses-message-1")
        self.assertEqual(result["messageIds"][0]["discord"]["status"], "skipped")

    def test_discord_failure_does_not_fail_email_delivery(self):
        event = load_fixture()

        with patch.object(index, "ses") as ses_mock, \
                patch.object(index, "get_discord_webhook_url", return_value="https://discord.test/webhook"), \
                patch.object(index, "post_discord", side_effect=RuntimeError("discord failed")), \
                patch.dict(os.environ, {
                    "ALERT_EMAIL_FROM": "alerts@example.com",
                    "ALERT_EMAIL_TO": "ops@example.com",
                    "ALERT_EMAIL_FROM_NAME": "Timelink 운영 알림",
                }, clear=False):
            ses_mock.send_email.return_value = {"MessageId": "ses-message-1"}

            result = index.handler(event, None)

        self.assertEqual(result["sent"], 1)
        self.assertEqual(result["messageIds"][0]["sesMessageId"], "ses-message-1")
        self.assertEqual(result["messageIds"][0]["discord"]["status"], "failed")


if __name__ == "__main__":
    unittest.main()
