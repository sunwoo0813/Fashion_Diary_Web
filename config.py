import os
from pathlib import Path

from dotenv import load_dotenv


def apply_config(app) -> None:
    env_path = Path(__file__).resolve().parent / ".env"
    load_dotenv(dotenv_path=env_path, override=False)

    # Ignore broken local proxy settings that block outbound HTTPS calls
    # (observed as 127.0.0.1:9 causing WinError 10061 on Supabase Auth).
    bad_proxy_targets = ("127.0.0.1:9", "localhost:9")
    for key in ("HTTP_PROXY", "HTTPS_PROXY", "ALL_PROXY", "http_proxy", "https_proxy", "all_proxy"):
        value = os.getenv(key, "")
        if any(target in value for target in bad_proxy_targets):
            os.environ.pop(key, None)
    app.secret_key = os.getenv("FLASK_SECRET_KEY") or os.getenv("SECRET_KEY") or "dev-secret"

    db_url = os.getenv("DATABASE_URL") or os.getenv("SQLALCHEMY_DATABASE_URI")
    if not db_url:
        raise RuntimeError("DATABASE_URL is not set")

    app.config["SQLALCHEMY_DATABASE_URI"] = db_url
    app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
    app.config["SQLALCHEMY_ENGINE_OPTIONS"] = {
        "pool_size": 1,
        "max_overflow": 0,
        "pool_pre_ping": True,
        "pool_recycle": 180,
    }
    app.config["AUTH_DISABLE_EMAIL_CONFIRM"] = (
        os.getenv("AUTH_DISABLE_EMAIL_CONFIRM") or ""
    ).lower() in ("1", "true", "yes", "on")
