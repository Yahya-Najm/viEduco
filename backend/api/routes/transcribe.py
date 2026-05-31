import os
import tempfile

from fastapi import APIRouter, HTTPException, UploadFile, File

from pipeline.orchestrator import orchestrate

router = APIRouter()


@router.post("/transcribe")
async def transcribe_file(file: UploadFile = File(...)):
    with tempfile.NamedTemporaryFile(delete=False, suffix=f"_{file.filename}") as tmp:
        tmp.write(await file.read())
        tmp_path = tmp.name

    try:
        return await orchestrate(tmp_path)
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
    finally:
        if os.path.exists(tmp_path):
            os.unlink(tmp_path)
