import sys
import types
from unittest.mock import MagicMock

import pytest

import pipeline.transcriber as transcriber


@pytest.fixture(autouse=True)
def reset_model_singleton():
    transcriber._model = None
    yield
    transcriber._model = None
    sys.modules.pop("whisper", None)


@pytest.fixture
def fake_whisper(monkeypatch):
    fake_model = MagicMock()
    fake_model.transcribe.return_value = {
        "segments": [
            {"start": 0.0, "end": 1.0, "text": "  hello  "},
            {"start": 1.0, "end": 2.5, "text": "world"},
        ]
    }
    fake_module = types.ModuleType("whisper")
    fake_module.load_model = MagicMock(return_value=fake_model)
    monkeypatch.setitem(sys.modules, "whisper", fake_module)
    return fake_module, fake_model


class TestGetModel:
    def test_loads_model_with_configured_size(self, fake_whisper, monkeypatch):
        from core.config import settings

        monkeypatch.setattr(settings, "whisper_model_size", "small")
        fake_module, fake_model = fake_whisper

        model = transcriber._get_model()

        fake_module.load_model.assert_called_once_with("small")
        assert model is fake_model

    def test_caches_model_across_calls(self, fake_whisper):
        fake_module, _ = fake_whisper

        transcriber._get_model()
        transcriber._get_model()

        fake_module.load_model.assert_called_once()


class TestTranscribe:
    def test_strips_whitespace_from_text(self, fake_whisper):
        result = transcriber.transcribe("audio.wav")
        assert result[0]["text"] == "hello"
        assert result[1]["text"] == "world"

    def test_preserves_start_end_fields(self, fake_whisper):
        result = transcriber.transcribe("audio.wav")
        assert result[0]["start"] == 0.0
        assert result[0]["end"] == 1.0
        assert result[1]["start"] == 1.0
        assert result[1]["end"] == 2.5

    def test_passes_audio_path_and_verbose_false(self, fake_whisper):
        _, fake_model = fake_whisper
        transcriber.transcribe("audio.wav")
        fake_model.transcribe.assert_called_once_with("audio.wav", verbose=False)

    def test_empty_segments_returns_empty_list(self, fake_whisper):
        _, fake_model = fake_whisper
        fake_model.transcribe.return_value = {"segments": []}
        result = transcriber.transcribe("audio.wav")
        assert result == []

    def test_model_loaded_only_once_across_multiple_transcribe_calls(self, fake_whisper):
        fake_module, _ = fake_whisper
        transcriber.transcribe("audio1.wav")
        transcriber.transcribe("audio2.wav")
        fake_module.load_model.assert_called_once()
