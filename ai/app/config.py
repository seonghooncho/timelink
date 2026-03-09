import os
from dataclasses import dataclass
from functools import lru_cache

import boto3
from botocore.exceptions import BotoCoreError, ClientError
from dotenv import load_dotenv

load_dotenv()


@dataclass(frozen=True)
class AiSettings:
    gemini_api_key: str | None
    cors_origins: str
    log_level: str


def _load_ssm_parameters(prefix: str) -> dict[str, str]:
    client = boto3.client("ssm", region_name=os.getenv("AWS_REGION", "ap-northeast-2"))
    parameters: dict[str, str] = {}
    next_token: str | None = None

    while True:
        request = {
            "Path": prefix,
            "Recursive": True,
            "WithDecryption": True,
        }
        if next_token:
            request["NextToken"] = next_token

        response = client.get_parameters_by_path(**request)
        for item in response.get("Parameters", []):
            key = item["Name"][len(prefix):].lstrip("/")
            parameters[key] = item["Value"]

        next_token = response.get("NextToken")
        if not next_token:
            return parameters


@lru_cache(maxsize=1)
def get_settings() -> AiSettings:
    prefix = os.getenv("APP_CONFIG_PREFIX", "").strip()
    ssm_values: dict[str, str] = {}

    if prefix:
        try:
            ssm_values = _load_ssm_parameters(prefix)
        except (BotoCoreError, ClientError) as exc:
            raise RuntimeError(f"SSM Parameter Store 로딩 실패: {prefix}") from exc

    return AiSettings(
        gemini_api_key=ssm_values.get("GEMINI_API_KEY") or os.getenv("GEMINI_API_KEY"),
        cors_origins=ssm_values.get("CORS_ORIGINS") or os.getenv("CORS_ORIGINS", "http://localhost:5173"),
        log_level=ssm_values.get("LOG_LEVEL") or os.getenv("LOG_LEVEL", "INFO"),
    )
