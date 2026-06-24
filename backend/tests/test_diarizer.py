import sys
import types
from unittest.mock import MagicMock

import pytest

import pipeline.diarizer as diarizer


class FakeTurn:
    def __init__(self, start, end):
        self.start = start
        self.end = end


class FakeDiarizationResult:
    def __init__(self, tracks):
        self._tracks = tracks
        self.speaker_diarization = self

    def itertracks(self, yield_label=False):
        for turn, track_id, speaker in self._tracks:
            yield turn, track_id, speaker


@pytest.fixture(autouse=True)
def reset_pipeline_singleton():
    diarizer._pipeline = None
    yield
    diarizer._pipeline = None
    sys.modules.pop("pyannote.audio", None)
    sys.modules.pop("pyannote", None)


@pytest.fixture
def fake_pyannote(monkeypatch):
    fake_pipeline_instance = MagicMock()
    fake_pipeline_instance.return_value = FakeDiarizationResult(
        [
            (FakeTurn(0.0, 1.0), None, "SPEAKER_00"),
            (FakeTurn(1.0, 2.5), None, "SPEAKER_01"),
        ]
    )

    fake_pipeline_cls = MagicMock()
    fake_pipeline_cls.from_pretrained = MagicMock(return_value=fake_pipeline_instance)

    fake_audio_module = types.ModuleType("pyannote.audio")
    fake_audio_module.Pipeline = fake_pipeline_cls
    fake_pyannote_pkg = types.ModuleType("pyannote")
    fake_pyannote_pkg.audio = fake_audio_module

    monkeypatch.setitem(sys.modules, "pyannote", fake_pyannote_pkg)
    monkeypatch.setitem(sys.modules, "pyannote.audio", fake_audio_module)

    return fake_pipeline_cls, fake_pipeline_instance


class TestGetPipeline:
    def test_loads_pipeline_with_token(self, fake_pyannote, monkeypatch):
        from core.config import settings

        monkeypatch.setattr(settings, "huggingface_token", "hf-test-token")
        fake_pipeline_cls, fake_pipeline_instance = fake_pyannote

        pipeline = diarizer._get_pipeline()

        fake_pipeline_cls.from_pretrained.assert_called_once_with(
            "pyannote/speaker-diarization-3.1", token="hf-test-token"
        )
        assert pipeline is fake_pipeline_instance

    def test_caches_pipeline_singleton(self, fake_pyannote):
        fake_pipeline_cls, _ = fake_pyannote

        diarizer._get_pipeline()
        diarizer._get_pipeline()

        fake_pipeline_cls.from_pretrained.assert_called_once()


class TestDiarize:
    def test_maps_tracks_to_start_end_speaker_dicts(self, fake_pyannote):
        result = diarizer.diarize("audio.wav")

        assert result == [
            {"start": 0.0, "end": 1.0, "speaker": "SPEAKER_00"},
            {"start": 1.0, "end": 2.5, "speaker": "SPEAKER_01"},
        ]

    def test_calls_pipeline_with_audio_path(self, fake_pyannote):
        _, fake_pipeline_instance = fake_pyannote
        diarizer.diarize("audio.wav")
        fake_pipeline_instance.assert_called_once_with("audio.wav")

    def test_empty_tracks_returns_empty_list(self, fake_pyannote, monkeypatch):
        _, fake_pipeline_instance = fake_pyannote
        fake_pipeline_instance.return_value = FakeDiarizationResult([])
        result = diarizer.diarize("audio.wav")
        assert result == []
