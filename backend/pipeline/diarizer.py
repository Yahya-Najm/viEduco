from core.config import settings

_pipeline = None


def _get_pipeline():
    global _pipeline
    if _pipeline is None:
        from pyannote.audio import Pipeline
        _pipeline = Pipeline.from_pretrained(
            "pyannote/speaker-diarization-3.1",
            token=settings.huggingface_token,
        )
    return _pipeline


def diarize(audio_path: str) -> list[dict]:
    diarization = _get_pipeline()(audio_path)
    return [
        {"start": turn.start, "end": turn.end, "speaker": speaker}
        for turn, _, speaker in diarization.speaker_diarization.itertracks(yield_label=True)
    ]
