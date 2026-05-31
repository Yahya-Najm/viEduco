import uuid
from datetime import datetime

import boto3
from botocore.config import Config

from core.config import settings

_client = None


def _get_client():
    global _client
    if _client is None:
        _client = boto3.client(
            "s3",
            endpoint_url=f"https://{settings.cf_account_id}.r2.cloudflarestorage.com",
            aws_access_key_id=settings.cf_r2_access_key_id,
            aws_secret_access_key=settings.cf_r2_secret_access_key,
            config=Config(signature_version="s3v4"),
            region_name="auto",
        )
    return _client


def _key(folder: str, filename: str) -> str:
    date = datetime.utcnow().strftime("%Y/%m/%d")
    uid = uuid.uuid4().hex[:8]
    return f"{folder}/{date}/{uid}_{filename}"


def upload_file(data: bytes, filename: str, folder: str, content_type: str = "application/octet-stream") -> str:
    key = _key(folder, filename)
    _get_client().put_object(
        Bucket=settings.cf_r2_bucket_name,
        Key=key,
        Body=data,
        ContentType=content_type,
    )
    return key


def public_url(key: str) -> str:
    if settings.cf_r2_public_url:
        return f"{settings.cf_r2_public_url.rstrip('/')}/{key}"
    # Fallback: presigned URL (valid 1 hour)
    return _get_client().generate_presigned_url(
        "get_object",
        Params={"Bucket": settings.cf_r2_bucket_name, "Key": key},
        ExpiresIn=3600,
    )


def download_bytes(key: str) -> bytes:
    response = _get_client().get_object(
        Bucket=settings.cf_r2_bucket_name,
        Key=key,
    )
    return response["Body"].read()
