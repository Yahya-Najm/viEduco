from core.config import settings

_model = None


def _get_model():
    global _model
    if _model is None:
        import whisper
        _model = whisper.load_model(settings.whisper_model_size)
    return _model


def transcribe(audio_path: str) -> list[dict]:
    result = _get_model().transcribe(audio_path, verbose=False)
    return [
        {"start": seg["start"], "end": seg["end"], "text": seg["text"].strip()}
        for seg in result["segments"]
    ]
