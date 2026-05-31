import modal

APP_NAME = "vieduco"

IGNORE = ["venv", "__pycache__", ".env", ".pyc", "modal_app.py", ".git"]

image = (
    modal.Image.debian_slim(python_version="3.11")
    .apt_install("ffmpeg")
    .env({
        "XDG_CACHE_HOME":       "/model-cache",
        "TRANSFORMERS_CACHE":   "/model-cache/huggingface",
        "HF_HOME":              "/model-cache/huggingface",
        "WHISPER_CACHE":        "/model-cache/whisper",
    })
    .pip_install_from_requirements("requirements.txt")
    .add_local_dir(".", remote_path="/app", ignore=IGNORE, copy=True)
)

model_cache = modal.Volume.from_name(
    f"{APP_NAME}-model-cache",
    create_if_missing=True,
)

app = modal.App(APP_NAME)


@app.function(
    image=image,
    secrets=[modal.Secret.from_name(f"{APP_NAME}-secrets")],
    volumes={"/model-cache": model_cache},
    gpu="any",
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
