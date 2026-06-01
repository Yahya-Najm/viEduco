from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    openai_api_key: str = ""
    internal_api_key: str = ""
    cors_origins: list[str] = ["http://localhost:3000"]

    class Config:
        env_file = ".env"


settings = Settings()
