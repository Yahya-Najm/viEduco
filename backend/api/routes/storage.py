import uuid
from datetime import datetime

from fastapi import APIRouter

from utils.storage import _get_client, _key, delete_object
from core.config import settings

router = APIRouter()


@router.delete("/storage")
async def delete_storage_object(key: str):
    delete_object(key)
    return {"ok": True}


@router.get("/presigned-upload")
async def presigned_upload(filename: str, content_type: str = "video/mp4"):
    key = _key("videos", filename)
    url = _get_client().generate_presigned_url(
        "put_object",
        Params={
            "Bucket": settings.cf_r2_bucket_name,
            "Key": key,
            "ContentType": content_type,
        },
        ExpiresIn=3600,
    )
    return {"url": url, "key": key}
