from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    openai_api_key: str = ""
    huggingface_token: str = ""
    whisper_model_size: str = "base"
    max_file_size_mb: int = 50
    upload_dir: str = "uploads"
    cors_origins: list[str] = ["http://localhost:3000"]
    internal_api_key: str = ""
    cf_account_id: str = ""
    cf_r2_access_key_id: str = ""
    cf_r2_secret_access_key: str = ""
    cf_r2_bucket_name: str = "vieduco"
    cf_r2_public_url: str = ""

    class Config:
        env_file = ".env"


settings = Settings()
