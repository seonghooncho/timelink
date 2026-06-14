import email
import os
from email import policy

import boto3


s3 = boto3.client("s3")
ses = boto3.client("ses")


MAIL_BUCKET = os.environ["MAIL_BUCKET"]
MAIL_PREFIX = os.environ.get("MAIL_PREFIX", "")
FORWARD_TO = os.environ["FORWARD_TO"]
SOURCE_EMAIL = os.environ["SOURCE_EMAIL"]
SUBJECT_PREFIX = os.environ.get("SUBJECT_PREFIX", "[Timelink contact]")


def _first_header(message, name):
    value = message.get(name)
    return str(value).strip() if value else ""


def _text_body(message):
    if message.is_multipart():
        for part in message.walk():
            if part.get_content_type() == "text/plain" and not part.get_filename():
                return part.get_content()
        for part in message.walk():
            if part.get_content_type() == "text/html" and not part.get_filename():
                return part.get_content()
        return "(No readable text body was found.)"

    return message.get_content()


def handler(event, context):
    for record in event.get("Records", []):
        ses_record = record["ses"]
        message_id = ses_record["mail"]["messageId"]
        object_key = f"{MAIL_PREFIX}{message_id}"

        raw_object = s3.get_object(Bucket=MAIL_BUCKET, Key=object_key)
        raw_message = raw_object["Body"].read()
        message = email.message_from_bytes(raw_message, policy=policy.default)

        original_from = _first_header(message, "From")
        original_to = _first_header(message, "To")
        original_subject = _first_header(message, "Subject") or "(No subject)"
        body = _text_body(message)

        forwarded_body = "\n".join(
            [
                "Timelink contact email received.",
                "",
                f"From: {original_from}",
                f"To: {original_to}",
                f"SES message ID: {message_id}",
                "",
                "----- Original message -----",
                body,
            ]
        )

        send_args = {
            "Source": SOURCE_EMAIL,
            "Destination": {"ToAddresses": [FORWARD_TO]},
            "Message": {
                "Subject": {"Data": f"{SUBJECT_PREFIX} {original_subject}", "Charset": "UTF-8"},
                "Body": {"Text": {"Data": forwarded_body, "Charset": "UTF-8"}},
            },
        }

        if original_from:
            send_args["ReplyToAddresses"] = [original_from]

        ses.send_email(**send_args)

    return {"processed": len(event.get("Records", []))}
