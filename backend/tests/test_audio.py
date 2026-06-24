import pytest

from core.config import settings
from utils.audio import validate_file, convert_audio, AUDIO_EXTENSIONS, VIDEO_EXTENSIONS


class TestValidateFile:
    @pytest.mark.parametrize("ext", sorted(AUDIO_EXTENSIONS))
    def test_accepts_audio_extensions(self, ext):
        validate_file(f"meeting{ext}", 1024)

    @pytest.mark.parametrize("ext", sorted(VIDEO_EXTENSIONS))
    def test_accepts_video_extensions(self, ext):
        validate_file(f"meeting{ext}", 1024)

    def test_rejects_no_extension(self):
        with pytest.raises(ValueError, match="no extension"):
            validate_file("meeting", 1024)

    def test_rejects_unsupported_extension(self):
        with pytest.raises(ValueError, match="Unsupported file type"):
            validate_file("meeting.txt", 1024)

    def test_extension_check_is_case_insensitive(self):
        validate_file("meeting.WAV", 1024)
        validate_file("meeting.Mp4", 1024)

    def test_rejects_empty_file(self):
        with pytest.raises(ValueError, match="File is empty"):
            validate_file("meeting.wav", 0)

    def test_accepts_file_exactly_at_size_limit(self, monkeypatch):
        monkeypatch.setattr(settings, "max_file_size_mb", 1)
        max_bytes = 1 * 1024 * 1024
        validate_file("meeting.wav", max_bytes)

    def test_rejects_file_one_byte_over_limit(self, monkeypatch):
        monkeypatch.setattr(settings, "max_file_size_mb", 1)
        max_bytes = 1 * 1024 * 1024
        with pytest.raises(ValueError, match="exceeds the"):
            validate_file("meeting.wav", max_bytes + 1)

    def test_empty_check_runs_even_with_unsupported_extension_skipped(self):
        # Unsupported extension is checked before size, so error message is about type.
        with pytest.raises(ValueError, match="Unsupported file type"):
            validate_file("meeting.xyz", 0)

    def test_path_with_directories_uses_only_suffix(self):
        validate_file("C:/some/folder/meeting.mp3", 1024)


class FakeAudioSegment:
    def __init__(self):
        self.frame_rate = None
        self.channels = None
        self.sample_width = None
        self.exported_to = None
        self.exported_format = None

    def set_frame_rate(self, rate):
        self.frame_rate = rate
        return self

    def set_channels(self, channels):
        self.channels = channels
        return self

    def set_sample_width(self, width):
        self.sample_width = width
        return self

    def export(self, path, format):
        self.exported_to = path
        self.exported_format = format
        with open(path, "wb") as f:
            f.write(b"fake-wav-bytes")


class TestConvertAudio:
    def test_audio_file_uses_default_loader(self, monkeypatch, tmp_path):
        src = tmp_path / "meeting.mp3"
        src.write_bytes(b"fake-audio")

        fake_segment = FakeAudioSegment()
        calls = {}

        def fake_from_file(path, format=None):
            calls["path"] = path
            calls["format"] = format
            return fake_segment

        monkeypatch.setattr(
            "utils.audio.AudioSegment.from_file", fake_from_file
        )

        out_path = convert_audio(str(src))

        assert calls["format"] is None
        assert out_path.endswith(".wav")
        assert fake_segment.frame_rate == 16000
        assert fake_segment.channels == 1
        assert fake_segment.sample_width == 2

    def test_video_file_passes_explicit_format(self, monkeypatch, tmp_path):
        src = tmp_path / "meeting.mp4"
        src.write_bytes(b"fake-video")

        fake_segment = FakeAudioSegment()
        calls = {}

        def fake_from_file(path, format=None):
            calls["path"] = path
            calls["format"] = format
            return fake_segment

        monkeypatch.setattr(
            "utils.audio.AudioSegment.from_file", fake_from_file
        )

        out_path = convert_audio(str(src))

        assert calls["format"] == "mp4"
        assert out_path.endswith(".wav")

    def test_returns_distinct_temp_file_each_call(self, monkeypatch, tmp_path):
        src = tmp_path / "meeting.wav"
        src.write_bytes(b"fake-audio")

        monkeypatch.setattr(
            "utils.audio.AudioSegment.from_file", lambda path, format=None: FakeAudioSegment()
        )

        out1 = convert_audio(str(src))
        out2 = convert_audio(str(src))

        assert out1 != out2
