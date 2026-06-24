from unittest.mock import MagicMock

import pytest

import pipeline.orchestrator as orchestrator


@pytest.fixture
def patched(monkeypatch, tmp_path):
    src = tmp_path / "meeting.wav"
    src.write_bytes(b"0" * 100)

    calls = []

    monkeypatch.setattr(orchestrator, "validate_file", MagicMock())
    monkeypatch.setattr(orchestrator, "convert_audio", lambda path: (calls.append(("convert", path)), "wav-path")[1])
    monkeypatch.setattr(orchestrator, "transcribe", lambda wav: (calls.append(("transcribe", wav)), [{"start": 0, "end": 1, "text": "hi"}])[1])
    monkeypatch.setattr(orchestrator, "diarize", lambda wav: (calls.append(("diarize", wav)), [{"start": 0, "end": 1, "speaker": "A"}])[1])
    monkeypatch.setattr(orchestrator, "merge", lambda w, d: (calls.append(("merge", w, d)), [{"speaker": "A", "start_time": 0, "end_time": 1, "text": "hi"}])[1])

    return src, calls


class TestOrchestrate:
    async def test_happy_path_returns_segments_and_metadata(self, patched):
        src, calls = patched

        result = await orchestrator.orchestrate(str(src))

        assert result["segments"] == [{"speaker": "A", "start_time": 0, "end_time": 1, "text": "hi"}]
        assert "duration_ms" in result["metadata"]
        assert isinstance(result["metadata"]["duration_ms"], int)
        assert result["metadata"]["duration_ms"] >= 0

    async def test_validate_file_called_with_filename_and_size(self, patched):
        src, calls = patched

        await orchestrator.orchestrate(str(src))

        orchestrator.validate_file.assert_called_once_with("meeting.wav", 100)

    async def test_convert_transcribe_diarize_merge_all_invoked(self, patched):
        src, calls = patched

        await orchestrator.orchestrate(str(src))

        kinds = [c[0] for c in calls]
        assert kinds == ["convert", "transcribe", "diarize", "merge"] or set(kinds) == {
            "convert", "transcribe", "diarize", "merge"
        }
        # transcribe and diarize both receive the converted wav path
        transcribe_call = next(c for c in calls if c[0] == "transcribe")
        diarize_call = next(c for c in calls if c[0] == "diarize")
        assert transcribe_call[1] == "wav-path"
        assert diarize_call[1] == "wav-path"

    async def test_merge_receives_transcribe_and_diarize_outputs(self, patched):
        src, calls = patched

        await orchestrator.orchestrate(str(src))

        merge_call = next(c for c in calls if c[0] == "merge")
        assert merge_call[1] == [{"start": 0, "end": 1, "text": "hi"}]
        assert merge_call[2] == [{"start": 0, "end": 1, "speaker": "A"}]

    async def test_validate_file_error_short_circuits_pipeline(self, monkeypatch, tmp_path):
        src = tmp_path / "meeting.wav"
        src.write_bytes(b"0" * 10)

        def raise_invalid(filename, size):
            raise ValueError("File is empty.")

        monkeypatch.setattr(orchestrator, "validate_file", raise_invalid)
        convert_spy = MagicMock()
        monkeypatch.setattr(orchestrator, "convert_audio", convert_spy)

        with pytest.raises(ValueError, match="File is empty."):
            await orchestrator.orchestrate(str(src))

        convert_spy.assert_not_called()
