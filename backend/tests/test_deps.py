import pytest
from fastapi import HTTPException

from core.config import settings
from api.deps import require_internal_key


class TestRequireInternalKey:
    async def test_skips_check_when_no_key_configured(self, monkeypatch):
        monkeypatch.setattr(settings, "internal_api_key", "")
        # Should not raise regardless of what header value is supplied.
        await require_internal_key(x_internal_key="anything")
        await require_internal_key(x_internal_key="")

    async def test_raises_403_when_key_mismatched(self, monkeypatch):
        monkeypatch.setattr(settings, "internal_api_key", "expected-key")
        with pytest.raises(HTTPException) as exc_info:
            await require_internal_key(x_internal_key="wrong-key")
        assert exc_info.value.status_code == 403

    async def test_passes_when_key_matches(self, monkeypatch):
        monkeypatch.setattr(settings, "internal_api_key", "expected-key")
        await require_internal_key(x_internal_key="expected-key")

    async def test_raises_403_when_header_empty_but_key_configured(self, monkeypatch):
        monkeypatch.setattr(settings, "internal_api_key", "expected-key")
        with pytest.raises(HTTPException) as exc_info:
            await require_internal_key(x_internal_key="")
        assert exc_info.value.status_code == 403
