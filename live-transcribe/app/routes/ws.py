import os
import tempfile

from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from openai import AsyncOpenAI

from app.auth import validate_token
from app.config import settings

router = APIRouter()


@router.websocket("/ws/transcribe")
async def live_transcribe(websocket: WebSocket, token: str = ""):
    await websocket.accept()

    if not validate_token(token):
        await websocket.close(code=4003)
        return

    client = AsyncOpenAI(api_key=settings.openai_api_key)

    try:
        async for chunk in websocket.iter_bytes():
            if not chunk:
                continue

            with tempfile.NamedTemporaryFile(delete=False, suffix=".webm") as tmp:
                tmp.write(chunk)
                tmp_path = tmp.name

            try:
                with open(tmp_path, "rb") as f:
                    result = await client.audio.transcriptions.create(
                        model="whisper-1",
                        file=("audio.webm", f, "audio/webm"),
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
