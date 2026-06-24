import re
from unittest.mock import MagicMock

import pytest

from core.config import settings
import utils.storage as storage


@pytest.fixture(autouse=True)
def reset_client_singleton():
    storage._client = None
    yield
    storage._client = None


@pytest.fixture
def fake_boto_client(monkeypatch):
    client = MagicMock()
    monkeypatch.setattr(storage.boto3, "client", MagicMock(return_value=client))
    return client


class TestGetClient:
    def test_builds_client_with_r2_endpoint(self, monkeypatch, fake_boto_client):
        monkeypatch.setattr(settings, "cf_account_id", "acct123")
        monkeypatch.setattr(settings, "cf_r2_access_key_id", "key-id")
        monkeypatch.setattr(settings, "cf_r2_secret_access_key", "secret")

        client = storage._get_client()

        assert client is fake_boto_client
        _, kwargs = storage.boto3.client.call_args
        assert kwargs["endpoint_url"] == "https://acct123.r2.cloudflarestorage.com"
        assert kwargs["aws_access_key_id"] == "key-id"
        assert kwargs["aws_secret_access_key"] == "secret"
        assert kwargs["region_name"] == "auto"

    def test_caches_client_singleton(self, fake_boto_client):
        first = storage._get_client()
        second = storage._get_client()

        assert first is second
        storage.boto3.client.assert_called_once()


class TestKey:
    def test_key_format(self, monkeypatch):
        monkeypatch.setattr(
            storage,
            "datetime",
            MagicMock(**{"utcnow.return_value": MagicMock(strftime=lambda fmt: "2026/06/24")}),
        )
        key = storage._key("uploads", "meeting.mp3")
        assert re.match(r"^uploads/2026/06/24/[0-9a-f]{8}_meeting\.mp3$", key)

    def test_key_unique_per_call(self):
        k1 = storage._key("uploads", "meeting.mp3")
        k2 = storage._key("uploads", "meeting.mp3")
        assert k1 != k2


class TestUploadFile:
    def test_uploads_with_expected_params(self, fake_boto_client, monkeypatch):
        monkeypatch.setattr(settings, "cf_r2_bucket_name", "my-bucket")
        monkeypatch.setattr(storage, "_key", lambda folder, filename: f"{folder}/fixed_{filename}")

        key = storage.upload_file(b"hello", "meeting.wav", "uploads", "audio/wav")

        assert key == "uploads/fixed_meeting.wav"
        fake_boto_client.put_object.assert_called_once_with(
            Bucket="my-bucket",
            Key="uploads/fixed_meeting.wav",
            Body=b"hello",
            ContentType="audio/wav",
        )

    def test_default_content_type(self, fake_boto_client):
        storage.upload_file(b"data", "f.bin", "folder")
        _, kwargs = fake_boto_client.put_object.call_args
        assert kwargs["ContentType"] == "application/octet-stream"


class TestPublicUrl:
    def test_uses_public_url_when_configured(self, monkeypatch, fake_boto_client):
        monkeypatch.setattr(settings, "cf_r2_public_url", "https://cdn.example.com")
        url = storage.public_url("uploads/2026/06/24/abc123_meeting.wav")
        assert url == "https://cdn.example.com/uploads/2026/06/24/abc123_meeting.wav"
        fake_boto_client.generate_presigned_url.assert_not_called()

    def test_strips_trailing_slash_from_public_url(self, monkeypatch):
        monkeypatch.setattr(settings, "cf_r2_public_url", "https://cdn.example.com/")
        url = storage.public_url("key.txt")
        assert url == "https://cdn.example.com/key.txt"

    def test_falls_back_to_presigned_when_no_public_url(self, monkeypatch, fake_boto_client):
        monkeypatch.setattr(settings, "cf_r2_public_url", "")
        monkeypatch.setattr(settings, "cf_r2_bucket_name", "my-bucket")
        fake_boto_client.generate_presigned_url.return_value = "https://presigned.example.com/x"

        url = storage.public_url("key.txt")

        assert url == "https://presigned.example.com/x"
        fake_boto_client.generate_presigned_url.assert_called_once_with(
            "get_object",
            Params={"Bucket": "my-bucket", "Key": "key.txt"},
            ExpiresIn=3600,
        )


class TestDownloadBytes:
    def test_reads_body_stream(self, fake_boto_client, monkeypatch):
        monkeypatch.setattr(settings, "cf_r2_bucket_name", "my-bucket")
        body = MagicMock()
        body.read.return_value = b"file-contents"
        fake_boto_client.get_object.return_value = {"Body": body}

        result = storage.download_bytes("some/key.wav")

        assert result == b"file-contents"
        fake_boto_client.get_object.assert_called_once_with(Bucket="my-bucket", Key="some/key.wav")


class TestDeleteObject:
    def test_deletes_with_bucket_and_key(self, fake_boto_client, monkeypatch):
        monkeypatch.setattr(settings, "cf_r2_bucket_name", "my-bucket")
        storage.delete_object("some/key.wav")
        fake_boto_client.delete_object.assert_called_once_with(Bucket="my-bucket", Key="some/key.wav")
