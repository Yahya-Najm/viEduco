import modal

APP_NAME = "vieduco"

# ---------------------------------------------------------------------------
# Container image
# ---------------------------------------------------------------------------
IGNORE = ["venv", "__pycache__", ".env", ".pyc", "modal_app.py", ".git"]

image = (
    modal.Image.debian_slim(python_version="3.11")
    .apt_install("ffmpeg")
    .pip_install_from_requirements("requirements.txt")
    .run_commands(
        "python -c \"import whisper; whisper.load_model('base')\""
    )
    .add_local_dir(".", remote_path="/app", ignore=IGNORE)
)

# ---------------------------------------------------------------------------
# Persistent volume — pyannote downloads its models here on first run,
# then reuses them across container restarts
# ---------------------------------------------------------------------------
model_cache = modal.Volume.from_name(
    f"{APP_NAME}-model-cache",
    create_if_missing=True,
)

# ---------------------------------------------------------------------------
# App
# ---------------------------------------------------------------------------
app = modal.App(APP_NAME)


@app.function(
    image=image,
    secrets=[
        # Create this once: modal secret create vieduco-secrets \
        #   OPENAI_API_KEY=... \
        #   HUGGINGFACE_TOKEN=... \
        #   INTERNAL_API_KEY=... \
        #   CORS_ORIGINS='["https://your-vercel-app.vercel.app"]'
        modal.Secret.from_name(f"{APP_NAME}-secrets"),
    ],
    volumes={"/root/.cache": model_cache},
    gpu="T4",
    timeout=600,
    scaledown_window=300,
)
@modal.asgi_app()
def web():
    import sys
    import os
    sys.path.insert(0, "/app")
    os.chdir("/app")
    from main import app as fastapi_app
    return fastapi_app
