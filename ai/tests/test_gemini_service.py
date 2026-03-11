import sys
import types
import unittest

google_module = types.ModuleType("google")
generativeai_module = types.ModuleType("google.generativeai")
api_core_module = types.ModuleType("google.api_core")
exceptions_module = types.ModuleType("google.api_core.exceptions")
boto3_module = types.ModuleType("boto3")
botocore_module = types.ModuleType("botocore")
botocore_exceptions_module = types.ModuleType("botocore.exceptions")
dotenv_module = types.ModuleType("dotenv")


class _GoogleApiError(Exception):
    pass


exceptions_module.GoogleAPICallError = _GoogleApiError
exceptions_module.InvalidArgument = _GoogleApiError
exceptions_module.ResourceExhausted = _GoogleApiError
generativeai_module.GenerativeModel = object
generativeai_module.GenerationConfig = object
generativeai_module.configure = lambda *args, **kwargs: None
botocore_exceptions_module.BotoCoreError = Exception
botocore_exceptions_module.ClientError = Exception
boto3_module.client = lambda *args, **kwargs: None
dotenv_module.load_dotenv = lambda *args, **kwargs: None
google_module.generativeai = generativeai_module

sys.modules.setdefault("google", google_module)
sys.modules.setdefault("google.generativeai", generativeai_module)
sys.modules.setdefault("google.api_core", api_core_module)
sys.modules.setdefault("google.api_core.exceptions", exceptions_module)
sys.modules.setdefault("boto3", boto3_module)
sys.modules.setdefault("botocore", botocore_module)
sys.modules.setdefault("botocore.exceptions", botocore_exceptions_module)
sys.modules.setdefault("dotenv", dotenv_module)

from app.services.gemini_service import _apply_ocr_fallbacks, _parse_json_response


class GeminiServiceParsingTest(unittest.TestCase):
    def test_parse_plain_object(self):
        result = _parse_json_response(
            """
            {
              "title": "카카오 현직자 특강",
              "content": "19시 온라인",
              "category": "appointment",
              "startDate": "2026-03-20",
              "startTime": "19:00",
              "endDate": "",
              "endTime": "",
              "duration": 1,
              "isImportant": true
            }
            """
        )

        self.assertEqual(result["title"], "카카오 현직자 특강")
        self.assertEqual(result["category"], "appointment")

    def test_parse_code_fenced_array_uses_first_item(self):
        result = _parse_json_response(
            """```json
            [
              {
                "title": "카카오 현직자 특강",
                "content": "19시 온라인",
                "category": "appointment",
                "startDate": "2026-03-20",
                "startTime": "19:00",
                "endDate": "",
                "endTime": "",
                "duration": 1,
                "isImportant": true
              },
              {
                "title": "뒤풀이",
                "content": "",
                "category": "group",
                "startDate": "2026-03-20",
                "startTime": "21:00",
                "endDate": "",
                "endTime": "",
                "duration": 2,
                "isImportant": false
              }
            ]
            ```"""
        )

        self.assertEqual(result["title"], "카카오 현직자 특강")
        self.assertEqual(result["startTime"], "19:00")

    def test_parse_nested_schedule_list_uses_first_item(self):
        result = _parse_json_response(
            """
            분석 결과입니다.
            {
              "schedules": [
                {
                  "title": "팀 미팅",
                  "content": "회의실 A",
                  "category": "appointment",
                  "startDate": "2026-03-12",
                  "startTime": "14:00",
                  "endDate": "",
                  "endTime": "",
                  "duration": 1,
                  "isImportant": false
                }
              ]
            }
            """
        )

        self.assertEqual(result["title"], "팀 미팅")
        self.assertEqual(result["content"], "회의실 A")

    def test_parse_truncated_json_recovers_known_fields(self):
        result = _parse_json_response(
            """
            {"category":"appointment","content":"파이널 프로젝트 발표와 취업 tip. 강사: simon.lee(이상원)/AI실"
            """
        )

        self.assertEqual(result["category"], "appointment")
        self.assertEqual(
            result["content"],
            "파이널 프로젝트 발표와 취업 tip. 강사: simon.lee(이상원)/AI실",
        )

    def test_apply_ocr_fallbacks_recovers_title_date_and_time(self):
        enriched = _apply_ocr_fallbacks(
            {
                "title": "",
                "content": "Lecturers: simon.lee(이상원)",
                "category": "appointment",
                "startDate": "",
                "startTime": "",
                "endDate": "",
                "endTime": "",
                "duration": 0,
                "isImportant": False,
            },
            """
            FINAL PROJECT PRESENTATION
            March 20, 2026 19:00
            Job Search Tips
            Lecturers: simon.lee(이상원)
            AI 실무 특강
            """,
        )

        self.assertEqual(enriched["title"], "FINAL PROJECT PRESENTATION")
        self.assertEqual(enriched["startDate"], "2026-03-20")
        self.assertEqual(enriched["startTime"], "19:00")
        self.assertEqual(enriched["endDate"], "2026-03-20")
        self.assertEqual(enriched["endTime"], "20:30")
        self.assertEqual(enriched["duration"], 1.5)
        self.assertIn("Job Search Tips", enriched["content"])
        self.assertIn("AI 실무 특강", enriched["content"])


if __name__ == "__main__":
    unittest.main()
