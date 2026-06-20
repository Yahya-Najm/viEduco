import asyncio
import os
import tempfile

from fastapi import APIRouter, HTTPException, UploadFile, File

from pipeline.orchestrator import orchestrate

router = APIRouter()

# Soft ceiling below the Modal function's hard timeout, so the request can
# return a clear error instead of being killed mid-response.
PROCESSING_SOFT_TIMEOUT_SECONDS = 1500


@router.post("/transcribe")
async def transcribe_file(file: UploadFile = File(...)):
    with tempfile.NamedTemporaryFile(delete=False, suffix=f"_{file.filename}") as tmp:
        tmp.write(await file.read())
        tmp_path = tmp.name

    try:
        return await asyncio.wait_for(orchestrate(tmp_path), timeout=PROCESSING_SOFT_TIMEOUT_SECONDS)
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
    except asyncio.TimeoutError:
        raise HTTPException(
            status_code=504,
            detail=(
                "Processing took longer than "
                f"{PROCESSING_SOFT_TIMEOUT_SECONDS // 60} minutes and was stopped. "
                "This file is too large for the current synchronous pipeline — "
                "it's time to switch to async/chunked processing."
            ),
        )
    finally:
        if os.path.exists(tmp_path):
            os.unlink(tmp_path)
