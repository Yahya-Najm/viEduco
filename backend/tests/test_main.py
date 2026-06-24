import pytest
from fastapi.testclient import TestClient

from core.config import settings
from main import app


@pytest.fixture(autouse=True)
def disable_internal_key_check(monkeypatch):
    monkeypatch.setattr(settings, "internal_api_key", "")


@pytest.fixture
def client():
    return TestClient(app)


class TestHealth:
    def test_health_returns_ok(self, client):
        response = client.get("/health")
        assert response.status_code == 200
        assert response.json() == {"status": "ok"}

    def test_health_does_not_require_internal_key(self, client, monkeypatch):
        # /health is mounted on the bare `app`, not behind api.router's
        # require_internal_key dependency, so it works with no header at all.
        monkeypatch.setattr(settings, "internal_api_key", "configured-key")
        response = client.get("/health")
        assert response.status_code == 200


def _configured_cors_origin():
    # CORSMiddleware reads settings.cors_origins once, at app construction time
    # in main.py -- monkeypatching `settings.cors_origins` afterwards has no
    # effect on the already-built middleware, so tests must introspect the
    # actual configured value instead of assuming the Settings default.
    for mw in app.user_middleware:
        if mw.cls.__name__ == "CORSMiddleware":
            return mw.kwargs["allow_origins"][0]
    raise AssertionError("CORSMiddleware not found on app")


class TestCors:
    def test_allowed_origin_gets_cors_headers_on_preflight(self, client):
        allowed_origin = _configured_cors_origin()
        response = client.options(
            "/health",
            headers={
                "Origin": allowed_origin,
                "Access-Control-Request-Method": "GET",
            },
        )
        assert response.headers.get("access-control-allow-origin") == allowed_origin

    def test_disallowed_origin_gets_no_cors_header(self, client):
        response = client.options(
            "/health",
            headers={
                "Origin": "http://evil.example.com",
                "Access-Control-Request-Method": "GET",
            },
        )
        assert "access-control-allow-origin" not in response.headers


class TestUnhandledExceptionHandler:
    def test_unhandled_exception_returns_generic_500(self, client, monkeypatch):
        import api.routes.storage as storage_route

        def boom(key):
            raise RuntimeError("boto3 credentials are invalid and leaked details!!")

        monkeypatch.setattr(storage_route, "delete_object", boom)

        # The default TestClient re-raises in-process exceptions for debugging;
        # disable that so we observe the same response a real client would get.
        non_raising_client = TestClient(app, raise_server_exceptions=False)
        response = non_raising_client.delete(
            "/storage",
            headers={"x-internal-key": "anything"},
            params={"key": "uploads/x.wav"},
        )

        assert response.status_code == 500
        assert response.json() == {"detail": "Internal server error"}
        assert "boto3 credentials" not in response.text
        assert "RuntimeError" not in response.text
