import asyncio
import json
import os
import tempfile

from fastapi import APIRouter, HTTPException, UploadFile, File

from pipeline.orchestrator import orchestrate
from pipeline.protocol import generate_protocol
from utils.storage import upload_file, public_url

router = APIRouter()


@router.post("/build_protocol")
async def build_protocol(file: UploadFile = File(...)):
    raw = await file.read()

    # Upload original file to R2
    source_key = await asyncio.to_thread(
        upload_file, raw, file.filename or "upload", "uploads",
        file.content_type or "application/octet-stream",
    )

    with tempfile.NamedTemporaryFile(delete=False, suffix=f"_{file.filename}") as tmp:
        tmp.write(raw)
        tmp_path = tmp.name

    try:
        result = await orchestrate(tmp_path)
        result["protocol"] = await asyncio.to_thread(generate_protocol, result["segments"])
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
    finally:
        if os.path.exists(tmp_path):
            os.unlink(tmp_path)

    # Store protocol JSON result in R2
    result_key = await asyncio.to_thread(
        upload_file,
        json.dumps(result).encode(),
        "result.json",
        "protocols",
        "application/json",
    )

    result["storage"] = {
        "source_url": public_url(source_key),
        "result_url": public_url(result_key),
    }

    return result
