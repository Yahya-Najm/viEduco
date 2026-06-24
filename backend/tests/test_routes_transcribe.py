import asyncio
import os

import pytest
from fastapi.testclient import TestClient

from core.config import settings
import api.routes.transcribe as transcribe_route
from main import app


@pytest.fixture(autouse=True)
def disable_internal_key_check(monkeypatch):
    monkeypatch.setattr(settings, "internal_api_key", "")


@pytest.fixture
def client():
    return TestClient(app)


HEADERS = {"x-internal-key": "anything"}


class TestTranscribeRoute:
    def test_happy_path_returns_orchestrate_result(self, client, monkeypatch):
        expected = {"segments": [{"speaker": "A", "start_time": 0.0, "end_time": 1.0, "text": "hi"}], "metadata": {"duration_ms": 42}}

        async def fake_orchestrate(path):
            return expected

        monkeypatch.setattr(transcribe_route, "orchestrate", fake_orchestrate)

        response = client.post(
            "/transcribe",
            headers=HEADERS,
            files={"file": ("meeting.wav", b"fake-bytes", "audio/wav")},
        )

        assert response.status_code == 200
        assert response.json() == expected

    def test_value_error_returns_422(self, client, monkeypatch):
        async def fake_orchestrate(path):
            raise ValueError("Unsupported file type '.txt'.")

        monkeypatch.setattr(transcribe_route, "orchestrate", fake_orchestrate)

        response = client.post(
            "/transcribe",
            headers=HEADERS,
            files={"file": ("meeting.txt", b"fake-bytes", "text/plain")},
        )

        assert response.status_code == 422
        assert response.json()["detail"] == "Unsupported file type '.txt'."

    def test_timeout_returns_504_with_message(self, client, monkeypatch):
        async def fake_orchestrate(path):
            raise asyncio.TimeoutError()

        monkeypatch.setattr(transcribe_route, "orchestrate", fake_orchestrate)

        response = client.post(
            "/transcribe",
            headers=HEADERS,
            files={"file": ("meeting.wav", b"fake-bytes", "audio/wav")},
        )

        assert response.status_code == 504
        detail = response.json()["detail"]
        assert "25 minutes" in detail
        assert "async/chunked processing" in detail

    def test_temp_file_cleaned_up_on_success(self, client, monkeypatch, tmp_path):
        captured_path = {}

        async def fake_orchestrate(path):
            captured_path["path"] = path
            assert os.path.exists(path)
            return {"segments": [], "metadata": {"duration_ms": 0}}

        monkeypatch.setattr(transcribe_route, "orchestrate", fake_orchestrate)

        client.post(
            "/transcribe",
            headers=HEADERS,
            files={"file": ("meeting.wav", b"fake-bytes", "audio/wav")},
        )

        assert not os.path.exists(captured_path["path"])

    def test_temp_file_cleaned_up_on_value_error(self, client, monkeypatch):
        captured_path = {}

        async def fake_orchestrate(path):
            captured_path["path"] = path
            raise ValueError("bad file")

        monkeypatch.setattr(transcribe_route, "orchestrate", fake_orchestrate)

        client.post(
            "/transcribe",
            headers=HEADERS,
            files={"file": ("meeting.wav", b"fake-bytes", "audio/wav")},
        )

        assert not os.path.exists(captured_path["path"])

    def test_missing_file_field_returns_422(self, client):
        response = client.post("/transcribe", headers=HEADERS)
        assert response.status_code == 422

    def test_missing_internal_key_header_returns_422(self, client, monkeypatch):
        # Header(...) makes the header itself required regardless of internal_api_key value.
        response = client.post(
            "/transcribe",
            files={"file": ("meeting.wav", b"fake-bytes", "audio/wav")},
        )
        assert response.status_code == 422

    def test_forbidden_when_internal_key_configured_and_mismatched(self, client, monkeypatch):
        monkeypatch.setattr(settings, "internal_api_key", "expected-key")
        response = client.post(
            "/transcribe",
            headers={"x-internal-key": "wrong"},
            files={"file": ("meeting.wav", b"fake-bytes", "audio/wav")},
        )
        assert response.status_code == 403
