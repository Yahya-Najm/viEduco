from pathlib import Path
import tempfile

from pydub import AudioSegment

from core.config import settings

AUDIO_EXTENSIONS = {".wav", ".mp3", ".m4a", ".ogg", ".flac", ".aac", ".opus", ".wma"}
VIDEO_EXTENSIONS = {".mp4", ".mkv", ".avi", ".mov", ".webm", ".flv", ".wmv", ".m4v"}
ALLOWED_EXTENSIONS = AUDIO_EXTENSIONS | VIDEO_EXTENSIONS


def validate_file(filename: str, size_bytes: int) -> None:
    ext = Path(filename).suffix.lower()

    if not ext:
        raise ValueError("File has no extension.")

    if ext not in ALLOWED_EXTENSIONS:
        raise ValueError(
            f"Unsupported file type '{ext}'. "
            f"Accepted audio: {sorted(AUDIO_EXTENSIONS)}, "
            f"video: {sorted(VIDEO_EXTENSIONS)}."
        )

    max_bytes = settings.max_file_size_mb * 1024 * 1024
    if size_bytes > max_bytes:
        raise ValueError(
            f"File size {size_bytes / 1024 / 1024:.1f} MB exceeds the "
            f"{settings.max_file_size_mb} MB limit."
        )

    if size_bytes == 0:
        raise ValueError("File is empty.")


def convert_audio(input_path: str) -> str:
    input_path = Path(input_path)
    ext = input_path.suffix.lower()

    if ext in VIDEO_EXTENSIONS:
        audio = AudioSegment.from_file(str(input_path), format=ext.lstrip("."))
    else:
        audio = AudioSegment.from_file(str(input_path))

    audio = audio.set_frame_rate(16000).set_channels(1).set_sample_width(2)

    out = tempfile.NamedTemporaryFile(suffix=".wav", delete=False)
    out.close()
    audio.export(out.name, format="wav")
    return out.name
