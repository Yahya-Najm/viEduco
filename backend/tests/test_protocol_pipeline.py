import json
from unittest.mock import MagicMock

import pytest

import pipeline.protocol as protocol


@pytest.fixture(autouse=True)
def reset_client_singleton():
    protocol._client = None
    yield
    protocol._client = None


def make_fake_openai_client(content: str):
    fake_client = MagicMock()
    response = MagicMock()
    response.choices = [MagicMock(message=MagicMock(content=content))]
    fake_client.chat.completions.create.return_value = response
    return fake_client


class TestGetClient:
    def test_builds_client_with_api_key(self, monkeypatch):
        from core.config import settings

        monkeypatch.setattr(settings, "openai_api_key", "sk-test")
        captured = {}

        class FakeOpenAI:
            def __init__(self, api_key):
                captured["api_key"] = api_key

        monkeypatch.setattr(protocol, "OpenAI", FakeOpenAI)

        client = protocol._get_client()

        assert captured["api_key"] == "sk-test"
        assert isinstance(client, FakeOpenAI)

    def test_caches_client_singleton(self, monkeypatch):
        monkeypatch.setattr(protocol, "OpenAI", MagicMock(side_effect=lambda api_key: MagicMock()))
        first = protocol._get_client()
        second = protocol._get_client()
        assert first is second
        protocol.OpenAI.assert_called_once()


class TestGenerateProtocol:
    def test_returns_parsed_json_dict(self, monkeypatch):
        expected = {"participants": ["A", "B"], "discussion": [], "decisions": []}
        fake_client = make_fake_openai_client(json.dumps(expected))
        monkeypatch.setattr(protocol, "_get_client", lambda: fake_client)

        result = protocol.generate_protocol(
            [{"speaker": "A", "start_time": 0.0, "end_time": 1.0, "text": "hello"}]
        )

        assert result == expected

    def test_formats_transcript_with_speaker_and_timestamps(self, monkeypatch):
        fake_client = make_fake_openai_client("{}")
        monkeypatch.setattr(protocol, "_get_client", lambda: fake_client)

        transcript = [
            {"speaker": "A", "start_time": 0.0, "end_time": 1.5, "text": "hello there"},
            {"speaker": "B", "start_time": 1.5, "end_time": 3.25, "text": "hi back"},
        ]
        protocol.generate_protocol(transcript)

        _, kwargs = fake_client.chat.completions.create.call_args
        user_content = kwargs["messages"][1]["content"]
        assert "[A] (0.0s - 1.5s): hello there" in user_content
        assert "[B] (1.5s - 3.2s): hi back" in user_content

    def test_passes_expected_model_name(self, monkeypatch):
        fake_client = make_fake_openai_client("{}")
        monkeypatch.setattr(protocol, "_get_client", lambda: fake_client)

        protocol.generate_protocol([])

        _, kwargs = fake_client.chat.completions.create.call_args
        assert kwargs["model"] == "gpt-5-nano-2025-08-07"

    def test_empty_transcript_produces_empty_user_content_suffix(self, monkeypatch):
        fake_client = make_fake_openai_client("{}")
        monkeypatch.setattr(protocol, "_get_client", lambda: fake_client)

        protocol.generate_protocol([])

        _, kwargs = fake_client.chat.completions.create.call_args
        assert kwargs["messages"][1]["content"] == "Transcript:\n"

    def test_invalid_json_response_raises(self, monkeypatch):
        fake_client = make_fake_openai_client("not valid json")
        monkeypatch.setattr(protocol, "_get_client", lambda: fake_client)

        with pytest.raises(json.JSONDecodeError):
            protocol.generate_protocol([])

    def test_system_prompt_requests_required_keys(self, monkeypatch):
        fake_client = make_fake_openai_client("{}")
        monkeypatch.setattr(protocol, "_get_client", lambda: fake_client)

        protocol.generate_protocol([])

        _, kwargs = fake_client.chat.completions.create.call_args
        system_content = kwargs["messages"][0]["content"]
        assert "participants" in system_content
        assert "discussion" in system_content
        assert "decisions" in system_content
