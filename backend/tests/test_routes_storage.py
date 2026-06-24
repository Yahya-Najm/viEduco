import pytest
from fastapi.testclient import TestClient

from core.config import settings
import api.routes.storage as storage_route
from main import app


@pytest.fixture(autouse=True)
def disable_internal_key_check(monkeypatch):
    monkeypatch.setattr(settings, "internal_api_key", "")


@pytest.fixture
def client():
    return TestClient(app)


HEADERS = {"x-internal-key": "anything"}


class TestDeleteStorageObject:
    def test_deletes_and_returns_ok(self, client, monkeypatch):
        calls = []
        monkeypatch.setattr(storage_route, "delete_object", lambda key: calls.append(key))

        response = client.delete("/storage", headers=HEADERS, params={"key": "uploads/2026/06/24/abc_meeting.wav"})

        assert response.status_code == 200
        assert response.json() == {"ok": True}
        assert calls == ["uploads/2026/06/24/abc_meeting.wav"]

    def test_missing_key_param_returns_422(self, client):
        response = client.delete("/storage", headers=HEADERS)
        assert response.status_code == 422


class TestPresignedUpload:
    def test_returns_url_and_key(self, client, monkeypatch):
        fake_client = type("C", (), {})()
        fake_client.generate_presigned_url = lambda op, Params, ExpiresIn: f"https://r2.example.com/{Params['Key']}?sig=xyz"

        monkeypatch.setattr(storage_route, "_get_client", lambda: fake_client)
        monkeypatch.setattr(storage_route, "_key", lambda folder, filename: f"{folder}/fixed_{filename}")

        response = client.get("/presigned-upload", headers=HEADERS, params={"filename": "meeting.mp4"})

        assert response.status_code == 200
        body = response.json()
        assert body["key"] == "videos/fixed_meeting.mp4"
        assert body["url"] == "https://r2.example.com/videos/fixed_meeting.mp4?sig=xyz"

    def test_default_content_type_is_video_mp4(self, client, monkeypatch):
        captured = {}

        fake_client = type("C", (), {})()

        def fake_presigned(op, Params, ExpiresIn):
            captured["params"] = Params
            return "https://example.com/x"

        fake_client.generate_presigned_url = fake_presigned
        monkeypatch.setattr(storage_route, "_get_client", lambda: fake_client)
        monkeypatch.setattr(storage_route, "_key", lambda folder, filename: f"{folder}/{filename}")

        client.get("/presigned-upload", headers=HEADERS, params={"filename": "meeting.mp4"})

        assert captured["params"]["ContentType"] == "video/mp4"

    def test_custom_content_type_passed_through(self, client, monkeypatch):
        captured = {}

        fake_client = type("C", (), {})()

        def fake_presigned(op, Params, ExpiresIn):
            captured["params"] = Params
            return "https://example.com/x"

        fake_client.generate_presigned_url = fake_presigned
        monkeypatch.setattr(storage_route, "_get_client", lambda: fake_client)
        monkeypatch.setattr(storage_route, "_key", lambda folder, filename: f"{folder}/{filename}")

        client.get(
            "/presigned-upload",
            headers=HEADERS,
            params={"filename": "meeting.wav", "content_type": "audio/wav"},
        )

        assert captured["params"]["ContentType"] == "audio/wav"

    def test_missing_filename_returns_422(self, client):
        response = client.get("/presigned-upload", headers=HEADERS)
        assert response.status_code == 422


class TestPresignedDownload:
    def test_returns_url(self, client, monkeypatch):
        fake_client = type("C", (), {})()
        fake_client.generate_presigned_url = lambda op, Params, ExpiresIn: f"https://r2.example.com/{Params['Key']}"

        monkeypatch.setattr(storage_route, "_get_client", lambda: fake_client)

        response = client.get("/presigned-download", headers=HEADERS, params={"key": "protocols/result.json"})

        assert response.status_code == 200
        assert response.json() == {"url": "https://r2.example.com/protocols/result.json"}

    def test_missing_key_returns_422(self, client):
        response = client.get("/presigned-download", headers=HEADERS)
        assert response.status_code == 422
