import hashlib
import hmac
import os
import tempfile
import time

from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from openai import AsyncOpenAI

from core.config import settings

router = APIRouter()


def _validate_token(token: str) -> bool:
    if not settings.internal_api_key:
        return True  # local dev
    parts = token.split(".")
    if len(parts) != 2:
        return False
    expiry, sig = parts
    try:
        if int(expiry) < int(time.time()):
            return False
    except ValueError:
        return False
    expected = hmac.new(
        settings.internal_api_key.encode(), expiry.encode(), hashlib.sha256
    ).hexdigest()
    return hmac.compare_digest(expected, sig)


@router.websocket("/ws/transcribe")
async def live_transcribe(websocket: WebSocket, token: str = ""):
    if not _validate_token(token):
        await websocket.close(code=4003)
        return

    if settings.cors_origins and "*" not in settings.cors_origins:
        origin = websocket.headers.get("origin", "")
        if origin not in settings.cors_origins:
            await websocket.close(code=4003)
            return

    await websocket.accept()
    client = AsyncOpenAI(api_key=settings.openai_api_key)

    try:
        async for chunk in websocket.iter_bytes():
            if not chunk:
                continue
            suffix = ".webm"
            with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
                tmp.write(chunk)
                tmp_path = tmp.name
            try:
                with open(tmp_path, "rb") as f:
                    result = await client.audio.transcriptions.create(
                        model="whisper-1",
                        file=(f"audio{suffix}", f, "audio/webm"),
                    )
                text = result.text.strip()
                if text:
                    await websocket.send_text(text)
            except Exception:
                pass
            finally:
                if os.path.exists(tmp_path):
                    os.unlink(tmp_path)
    except WebSocketDisconnect:
        pass
