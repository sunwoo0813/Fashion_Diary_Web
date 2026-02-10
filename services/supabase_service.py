import os
import uuid
from typing import Optional

from supabase import Client, create_client

_supabase_admin: Optional[Client] = None
_supabase_auth: Optional[Client] = None


def _supabase_url() -> str:
    return os.getenv("SUPABASE_URL") or ""


def _supabase_service_role_key() -> str:
    return os.getenv("SUPABASE_SERVICE_ROLE_KEY") or ""


def _supabase_anon_key() -> str:
    return os.getenv("SUPABASE_ANON_KEY") or ""


def _supabase_bucket() -> str:
    return os.getenv("SUPABASE_BUCKET", "uploads")


def get_supabase_admin() -> Client:
    global _supabase_admin
    if _supabase_admin is None:
        url = _supabase_url()
        role_key = _supabase_service_role_key()
        if not url or not role_key:
            raise RuntimeError("Supabase env vars are not set")
        _supabase_admin = create_client(url, role_key)
    return _supabase_admin


def get_supabase_auth() -> Client:
    global _supabase_auth
    if _supabase_auth is None:
        url = _supabase_url()
        anon_key = _supabase_anon_key()
        if not url or not anon_key:
            raise RuntimeError("Supabase auth env vars are not set")
        _supabase_auth = create_client(url, anon_key)
    return _supabase_auth


def storage_public_url(object_path: str) -> str:
    return f"{_supabase_url()}/storage/v1/object/public/{_supabase_bucket()}/{object_path}"


def upload_to_storage(file, prefix: str) -> str:
    ext = os.path.splitext(file.filename)[1] if file.filename else ""
    safe_name = f"{uuid.uuid4().hex}{ext}"
    object_path = f"{prefix}/{safe_name}"
    content = file.stream.read()
    if not content:
        raise ValueError("empty file")
    sb = get_supabase_admin()
    sb.storage.from_(_supabase_bucket()).upload(
        object_path,
        content,
        {"content-type": file.mimetype or "application/octet-stream"},
    )
    return storage_public_url(object_path)


def delete_from_storage(public_url_or_path: str) -> None:
    if not public_url_or_path:
        return
    supabase_url = _supabase_url()
    bucket = _supabase_bucket()
    if supabase_url and public_url_or_path.startswith(supabase_url):
        prefix = f"{supabase_url}/storage/v1/object/public/{bucket}/"
        if public_url_or_path.startswith(prefix):
            object_path = public_url_or_path[len(prefix):]
            sb = get_supabase_admin()
            sb.storage.from_(bucket).remove([object_path])
            return


def find_supabase_uid_by_email(email: str) -> str | None:
    if not email:
        return None
    sb = get_supabase_admin()
    page = 1
    while True:
        users = sb.auth.admin.list_users(page=page, per_page=1000)
        if not users:
            return None
        for user in users:
            if (user.email or "").lower() == email.lower():
                return user.id
        page += 1
