import os

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from core.config import settings
import api.routes.protocol as protocol_route
from main import app


@pytest.fixture(autouse=True)
def disable_internal_key_check(monkeypatch):
    monkeypatch.setattr(settings, "internal_api_key", "")


@pytest.fixture
def client():
    # NOTE: api/router.py never calls router.include_router(protocol_route.router),
    # so /build_protocol is NOT reachable on the real `app` from main.py (confirmed
    # below in test_build_protocol_route_is_not_registered_on_real_app -- it 404s).
    # We mount the router directly on a throwaway app to exercise the route's own
    # logic in isolation, since that logic is otherwise completely untested in prod.
    isolated_app = FastAPI()
    isolated_app.include_router(protocol_route.router)
    return TestClient(isolated_app)


def test_build_protocol_route_is_not_registered_on_real_app():
    real_client = TestClient(app)
    response = real_client.post(
        "/build_protocol",
        headers={"x-internal-key": "anything"},
        files={"file": ("meeting.wav", b"fake-bytes", "audio/wav")},
    )
    assert response.status_code == 404


HEADERS = {"x-internal-key": "anything"}


@pytest.fixture
def mocked_storage(monkeypatch):
    calls = []

    def fake_upload_file(data, filename, folder, content_type="application/octet-stream"):
        calls.append({"filename": filename, "folder": folder, "content_type": content_type})
        return f"{folder}/{filename}"

    def fake_public_url(key):
        return f"https://cdn.example.com/{key}"

    monkeypatch.setattr(protocol_route, "upload_file", fake_upload_file)
    monkeypatch.setattr(protocol_route, "public_url", fake_public_url)
    return calls


class TestBuildProtocolRoute:
    def test_happy_path_includes_storage_urls(self, client, monkeypatch, mocked_storage):
        async def fake_orchestrate(path):
            return {"segments": [{"speaker": "A", "start_time": 0.0, "end_time": 1.0, "text": "hi"}], "metadata": {"duration_ms": 5}}

        monkeypatch.setattr(protocol_route, "orchestrate", fake_orchestrate)

        response = client.post(
            "/build_protocol",
            headers=HEADERS,
            files={"file": ("meeting.wav", b"fake-bytes", "audio/wav")},
        )

        assert response.status_code == 200
        body = response.json()
        assert body["segments"] == [{"speaker": "A", "start_time": 0.0, "end_time": 1.0, "text": "hi"}]
        assert body["storage"]["source_url"] == "https://cdn.example.com/uploads/meeting.wav"
        assert body["storage"]["result_url"] == "https://cdn.example.com/protocols/result.json"

    def test_uploads_source_then_result_with_expected_folders(self, client, monkeypatch, mocked_storage):
        async def fake_orchestrate(path):
            return {"segments": [], "metadata": {"duration_ms": 0}}

        monkeypatch.setattr(protocol_route, "orchestrate", fake_orchestrate)

        client.post(
            "/build_protocol",
            headers=HEADERS,
            files={"file": ("meeting.wav", b"fake-bytes", "audio/wav")},
        )

        assert len(mocked_storage) == 2
        assert mocked_storage[0]["folder"] == "uploads"
        assert mocked_storage[0]["filename"] == "meeting.wav"
        assert mocked_storage[1]["folder"] == "protocols"
        assert mocked_storage[1]["filename"] == "result.json"
        assert mocked_storage[1]["content_type"] == "application/json"

    def test_source_upload_happens_even_if_orchestrate_later_fails(self, client, monkeypatch, mocked_storage):
        async def fake_orchestrate(path):
            raise ValueError("File is empty.")

        monkeypatch.setattr(protocol_route, "orchestrate", fake_orchestrate)

        response = client.post(
            "/build_protocol",
            headers=HEADERS,
            files={"file": ("meeting.wav", b"fake-bytes", "audio/wav")},
        )

        assert response.status_code == 422
        # The source file was already uploaded to R2 before orchestrate ran and failed.
        assert len(mocked_storage) == 1
        assert mocked_storage[0]["folder"] == "uploads"

    def test_value_error_returns_422_with_detail(self, client, monkeypatch, mocked_storage):
        async def fake_orchestrate(path):
            raise ValueError("Unsupported file type '.xyz'.")

        monkeypatch.setattr(protocol_route, "orchestrate", fake_orchestrate)

        response = client.post(
            "/build_protocol",
            headers=HEADERS,
            files={"file": ("meeting.xyz", b"fake-bytes", "application/octet-stream")},
        )

        assert response.status_code == 422
        assert response.json()["detail"] == "Unsupported file type '.xyz'."

    def test_temp_file_cleaned_up_on_success(self, client, monkeypatch, mocked_storage):
        captured_path = {}

        async def fake_orchestrate(path):
            captured_path["path"] = path
            assert os.path.exists(path)
            return {"segments": [], "metadata": {"duration_ms": 0}}

        monkeypatch.setattr(protocol_route, "orchestrate", fake_orchestrate)

        client.post(
            "/build_protocol",
            headers=HEADERS,
            files={"file": ("meeting.wav", b"fake-bytes", "audio/wav")},
        )

        assert not os.path.exists(captured_path["path"])

    def test_temp_file_cleaned_up_on_value_error(self, client, monkeypatch, mocked_storage):
        captured_path = {}

        async def fake_orchestrate(path):
            captured_path["path"] = path
            raise ValueError("bad file")

        monkeypatch.setattr(protocol_route, "orchestrate", fake_orchestrate)

        client.post(
            "/build_protocol",
            headers=HEADERS,
            files={"file": ("meeting.wav", b"fake-bytes", "audio/wav")},
        )

        assert not os.path.exists(captured_path["path"])

    def test_missing_file_returns_422(self, client):
        response = client.post("/build_protocol", headers=HEADERS)
        assert response.status_code == 422

    def test_endpoint_does_not_call_llm_protocol_generation(self, client, monkeypatch, mocked_storage):
        """Documents current behavior: /build_protocol returns raw merged segments,
        it never calls pipeline.protocol.generate_protocol to produce an LLM-summarized
        protocol (participants/discussion/decisions), despite the route name."""
        async def fake_orchestrate(path):
            return {"segments": [{"speaker": "A", "start_time": 0.0, "end_time": 1.0, "text": "hi"}], "metadata": {"duration_ms": 0}}

        monkeypatch.setattr(protocol_route, "orchestrate", fake_orchestrate)

        response = client.post(
            "/build_protocol",
            headers=HEADERS,
            files={"file": ("meeting.wav", b"fake-bytes", "audio/wav")},
        )

        body = response.json()
        assert "participants" not in body
        assert "discussion" not in body
        assert "decisions" not in body
        assert "segments" in body
