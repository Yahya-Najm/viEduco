import asyncio
import os
import time
from pathlib import Path

from utils.audio import validate_file, convert_audio
from pipeline.transcriber import transcribe
from pipeline.diarizer import diarize
from pipeline.merger import merge


async def orchestrate(file_path: str) -> dict:
    filename = Path(file_path).name
    size_bytes = os.path.getsize(file_path)

    validate_file(filename, size_bytes)

    start_ms = time.monotonic_ns() // 1_000_000

    wav_path = await asyncio.to_thread(convert_audio, file_path)

    whisper_segments, diarization_segments = await asyncio.gather(
        asyncio.to_thread(transcribe, wav_path),
        asyncio.to_thread(diarize, wav_path),
    )

    segments = merge(whisper_segments, diarization_segments)
    duration_ms = (time.monotonic_ns() // 1_000_000) - start_ms

    return {
        "segments": segments,
        "metadata": {"duration_ms": duration_ms},
    }
