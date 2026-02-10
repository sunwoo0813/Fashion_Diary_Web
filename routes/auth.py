import os

from flask import Blueprint, current_app, flash, redirect, render_template, request, session, url_for
from supabase_auth.errors import AuthApiError

from extensions import db
from models import Item, Outfit, OutfitItem, OutfitPhoto, OutfitPhotoItem, User
from services.supabase_service import (
    delete_from_storage,
    find_supabase_uid_by_email,
    get_supabase_admin,
    get_supabase_auth,
)

auth_bp = Blueprint("auth", __name__)


def get_current_user_id() -> int | None:
    uid = session.get("user_id")
    try:
        return int(uid) if uid is not None else None
    except Exception:
        return None


def get_or_create_user(email: str) -> User:
    user = User.query.filter_by(email=email).first()
    if user:
        return user
    user = User(email=email)
    db.session.add(user)
    db.session.commit()
    return user


@auth_bp.route("/", methods=["GET"])
def home():
    if get_current_user_id():
        return redirect(url_for("diary.diary"))
    return render_template("login.html", hide_nav=True)


@auth_bp.route("/login", methods=["GET", "POST"])
def login():
    if request.method == "GET":
        return redirect(url_for("auth.home"))

    email = (request.form.get("email") or "").strip().lower()
    password = request.form.get("password") or ""
    if not email or not password:
        flash("Email and password are required.", "danger")
        return redirect(url_for("auth.home"))

    try:
        resp = get_supabase_auth().auth.sign_in_with_password(
            {"email": email, "password": password}
        )
        if not resp or not resp.user or not (resp.user.email or email):
            flash("Login failed. Please check your credentials.", "danger")
            return redirect(url_for("auth.home"))

        user = get_or_create_user(resp.user.email or email)
        session["user_id"] = user.id
        session["user_email"] = user.email
        session["supabase_uid"] = resp.user.id
        return redirect(url_for("diary.diary"))
    except AuthApiError as e:
        flash(f"Login failed: {e.message}", "danger")
        return redirect(url_for("auth.home"))
    except Exception as e:
        flash(f"Login failed: {str(e)}", "danger")
        return redirect(url_for("auth.home"))


@auth_bp.route("/signup", methods=["GET", "POST"])
def signup():
    if request.method == "GET":
        if get_current_user_id():
            return redirect(url_for("diary.diary"))
        return render_template("signup.html", hide_nav=True)

    email = (request.form.get("email") or "").strip().lower()
    password = request.form.get("password") or ""
    if not email or not password:
        flash("Email and password are required.", "danger")
        return redirect(url_for("auth.signup"))

    try:
        app_base_url = (os.getenv("APP_BASE_URL") or request.host_url).rstrip("/")
        auth_disable_email_confirm = current_app.config.get("AUTH_DISABLE_EMAIL_CONFIRM", False)

        if auth_disable_email_confirm:
            try:
                get_supabase_admin().auth.admin.create_user(
                    {"email": email, "password": password, "email_confirm": True}
                )
            except AuthApiError as e:
                if e.code not in ("user_already_exists", "email_exists"):
                    raise

            resp = get_supabase_auth().auth.sign_in_with_password(
                {"email": email, "password": password}
            )
        else:
            resp = get_supabase_auth().auth.sign_up(
                {
                    "email": email,
                    "password": password,
                    "options": {"email_redirect_to": app_base_url},
                }
            )

        if resp.session and resp.user and (resp.user.email or email):
            user = get_or_create_user(resp.user.email or email)
            session["user_id"] = user.id
            session["user_email"] = user.email
            session["supabase_uid"] = resp.user.id
            return redirect(url_for("diary.diary"))

        flash("Signup complete. Please verify your email and log in.", "success")
        return redirect(url_for("auth.home"))
    except AuthApiError as e:
        flash(f"Signup failed: {e.message}", "danger")
        return redirect(url_for("auth.signup"))
    except Exception as e:
        flash(f"Signup failed: {str(e)}", "danger")
        return redirect(url_for("auth.signup"))


@auth_bp.route("/logout", methods=["POST"])
def logout():
    session.clear()
    return redirect(url_for("auth.home"))


@auth_bp.route("/account")
def account():
    if not get_current_user_id():
        return redirect(url_for("auth.home"))
    return render_template("account.html", hide_nav=True)


@auth_bp.route("/account/delete", methods=["POST"])
def account_delete():
    user_id = get_current_user_id()
    if not user_id:
        return redirect(url_for("auth.home"))

    if (request.form.get("confirm") or "").strip().upper() != "DELETE":
        flash("Type DELETE to confirm account deletion.", "danger")
        return redirect(url_for("auth.account"))

    user_email = session.get("user_email")
    supa_uid = session.get("supabase_uid")

    items = Item.query.filter(Item.user_id == user_id).all()
    item_ids = [it.id for it in items]
    outfits = Outfit.query.filter(Outfit.user_id == user_id).all()
    outfit_ids = [o.id for o in outfits]

    photos = []
    photo_ids = []
    if outfit_ids:
        photos = OutfitPhoto.query.filter(OutfitPhoto.outfit_id.in_(outfit_ids)).all()
        photo_ids = [p.id for p in photos]

    for it in items:
        if it.image_path:
            try:
                delete_from_storage(it.image_path)
            except Exception:
                pass
    for p in photos:
        if p.photo_path:
            try:
                delete_from_storage(p.photo_path)
            except Exception:
                pass
    for o in outfits:
        if o.photo_path:
            try:
                delete_from_storage(o.photo_path)
            except Exception:
                pass

    if photo_ids:
        OutfitPhotoItem.query.filter(OutfitPhotoItem.photo_id.in_(photo_ids)).delete(
            synchronize_session=False
        )
    if item_ids:
        OutfitItem.query.filter(OutfitItem.item_id.in_(item_ids)).delete(
            synchronize_session=False
        )
    if outfit_ids:
        OutfitItem.query.filter(OutfitItem.outfit_id.in_(outfit_ids)).delete(
            synchronize_session=False
        )
        OutfitPhoto.query.filter(OutfitPhoto.outfit_id.in_(outfit_ids)).delete(
            synchronize_session=False
        )
        Outfit.query.filter(Outfit.id.in_(outfit_ids)).delete(synchronize_session=False)
    if item_ids:
        Item.query.filter(Item.id.in_(item_ids)).delete(synchronize_session=False)

    user = User.query.filter_by(id=user_id).first()
    if user:
        db.session.delete(user)
    db.session.commit()

    try:
        if not supa_uid and user_email:
            supa_uid = find_supabase_uid_by_email(user_email)
        if supa_uid:
            get_supabase_admin().auth.admin.delete_user(supa_uid)
    except Exception:
        pass

    session.clear()
    flash("Account deleted.", "success")
    return redirect(url_for("auth.home"))
