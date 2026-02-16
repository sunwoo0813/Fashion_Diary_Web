import os
from datetime import date

from flask import Blueprint, jsonify, redirect, render_template, request, session, url_for
from sqlalchemy import func, or_

from extensions import db
from models import Item, Outfit, OutfitItem, OutfitPhoto, OutfitPhotoItem
from services.supabase_service import (
    delete_from_storage,
    get_supabase_admin,
    upload_to_storage,
)

wardrobe_bp = Blueprint("wardrobe", __name__)


def _get_current_user_id() -> int | None:
    uid = session.get("user_id")
    try:
        return int(uid) if uid is not None else None
    except Exception:
        return None


def _normalize_public_image_path(path: str, bucket_name: str | None = None) -> str:
    raw = (path or "").strip()
    if not raw:
        return ""
    if raw.startswith(("http://", "https://")):
        return raw

    supabase_url = (os.getenv("SUPABASE_URL") or "").rstrip("/")
    if raw.startswith("/storage/v1/object/public/"):
        return f"{supabase_url}{raw}" if supabase_url else raw
    if raw.startswith("storage/v1/object/public/"):
        return f"{supabase_url}/{raw}" if supabase_url else f"/{raw}"
    if raw.startswith("uploads/") or raw.startswith("product-assets/"):
        return f"{supabase_url}/storage/v1/object/public/{raw}" if supabase_url else raw

    bucket = (bucket_name or os.getenv("SUPABASE_BUCKET") or "uploads").strip() or "uploads"
    return f"{supabase_url}/storage/v1/object/public/{bucket}/{raw}" if supabase_url else raw


@wardrobe_bp.route("/wardrobe", endpoint="wardrobe")
def wardrobe():
    user_id = _get_current_user_id()
    if not user_id:
        return redirect(url_for("auth.home"))

    q = (request.args.get("q") or "").strip()
    category = (request.args.get("category") or "").strip()

    query = Item.query.filter(Item.user_id == user_id)
    if q:
        like_q = f"%{q}%"
        query = query.filter(or_(Item.name.ilike(like_q), Item.category.ilike(like_q)))
    if category:
        category_map = {
            "Top": ["Top", "Tops"],
            "Bottom": ["Bottom", "Bottoms"],
            "Outerwear": ["Outerwear"],
            "Footwear": ["Footwear", "Shoes"],
            "Accessories": ["Accessories", "Accessory"],
        }
        if category in category_map:
            query = query.filter(Item.category.in_(category_map[category]))
        else:
            query = query.filter(Item.category == category)
    items = query.order_by(Item.created_at.desc()).all()
    categories = [
        c[0]
        for c in Item.query.with_entities(Item.category)
        .filter(Item.user_id == user_id)
        .distinct()
        .all()
        if c[0]
    ]
    has_filters = bool(q or category)

    wear_counts = {}
    if items:
        wear_rows = (
            db.session.query(OutfitItem.item_id, func.count(OutfitItem.item_id))
            .join(Outfit, OutfitItem.outfit_id == Outfit.id)
            .filter(Outfit.user_id == user_id)
            .group_by(OutfitItem.item_id)
            .all()
        )
        for iid, cnt in wear_rows:
            wear_counts[iid] = int(cnt)

        photo_rows = (
            db.session.query(OutfitPhotoItem.item_id, func.count(OutfitPhotoItem.item_id))
            .join(OutfitPhoto, OutfitPhotoItem.photo_id == OutfitPhoto.id)
            .join(Outfit, OutfitPhoto.outfit_id == Outfit.id)
            .filter(Outfit.user_id == user_id)
            .group_by(OutfitPhotoItem.item_id)
            .all()
        )
        for iid, cnt in photo_rows:
            wear_counts[iid] = wear_counts.get(iid, 0) + int(cnt)

    fav_ids = {
        iid
        for iid, cnt in sorted(wear_counts.items(), key=lambda x: x[1], reverse=True)[:3]
        if cnt > 0
    }

    email = session.get("user_email") or ""
    initials = (email.split("@")[0][:2] if email else "U").upper()

    return render_template(
        "wardrobe.html",
        hide_nav=True,
        items=items,
        q=q,
        category=category,
        categories=categories,
        has_filters=has_filters,
        wear_counts=wear_counts,
        fav_ids=fav_ids,
        initials=initials,
        now=date.today(),
    )


@wardrobe_bp.route("/items", methods=["GET", "POST"], endpoint="items_create")
def items_create():
    user_id = _get_current_user_id()
    if not user_id:
        return redirect(url_for("auth.home"))

    if request.method == "POST":
        f = request.files.get("image")
        image_path = None
        image_path_prefill = (request.form.get("image_path_prefill") or "").strip()
        if f and f.filename:
            image_path = upload_to_storage(f, "items")
        elif image_path_prefill:
            image_path = _normalize_public_image_path(image_path_prefill)

        brand = (request.form.get("brand") or "").strip()
        product = (request.form.get("product") or "").strip()
        display_name = f"{brand} {product}".strip()
        if not display_name:
            display_name = "Untitled"

        item = Item(
            user_id=user_id,
            name=display_name,
            category=request.form.get("category"),
            color=request.form.get("color"),
            season=request.form.get("season"),
            image_path=image_path,
        )
        db.session.add(item)
        db.session.commit()
        return redirect(url_for("wardrobe.wardrobe"))
    return render_template("item_new.html")


@wardrobe_bp.route("/api/products/search", endpoint="api_products_search")
def api_products_search():
    user_id = _get_current_user_id()
    if not user_id:
        return jsonify({"ok": False, "error": "Unauthorized"}), 401

    q = (request.args.get("q") or "").strip()
    if not q:
        return jsonify({"ok": True, "items": []})

    try:
        resp = (
            get_supabase_admin()
            .table("products")
            .select("brand,name,category,size_table,image_path")
            .ilike("brand", f"%{q}%")
            .order("brand")
            .limit(12)
            .execute()
        )
        rows = resp.data or []

        def _to_text(value) -> str:
            if value is None:
                return ""
            if isinstance(value, str):
                return value.strip()
            return str(value).strip()

        items = [
            {
                "brand": _to_text(row.get("brand")),
                "name": _to_text(row.get("name")),
                "category": _to_text(row.get("category")),
                "size_table": _to_text(row.get("size_table")),
                "image_path": _normalize_public_image_path(
                    _to_text(row.get("image_path")), bucket_name="product-assets"
                ),
            }
            for row in rows
        ]
        return jsonify({"ok": True, "items": items})
    except Exception:
        return jsonify({"ok": False, "error": "Product search failed"}), 500


@wardrobe_bp.route("/items/delete", methods=["POST"], endpoint="items_delete")
def items_delete():
    user_id = _get_current_user_id()
    if not user_id:
        return redirect(url_for("auth.home"))

    raw_ids = request.form.getlist("item_ids")
    if not raw_ids:
        return redirect(url_for("wardrobe.wardrobe"))

    ids = []
    for rid in raw_ids:
        try:
            ids.append(int(rid))
        except Exception:
            pass
    if not ids:
        return redirect(url_for("wardrobe.wardrobe"))

    items = Item.query.filter(Item.id.in_(ids), Item.user_id == user_id).all()
    ids = [it.id for it in items]
    if not ids:
        return redirect(url_for("wardrobe.wardrobe"))

    OutfitItem.query.filter(OutfitItem.item_id.in_(ids)).delete(synchronize_session=False)
    OutfitPhotoItem.query.filter(OutfitPhotoItem.item_id.in_(ids)).delete(synchronize_session=False)

    for it in items:
        if it.image_path:
            try:
                delete_from_storage(it.image_path)
            except Exception:
                pass
        db.session.delete(it)

    db.session.commit()
    return redirect(url_for("wardrobe.wardrobe"))


@wardrobe_bp.route("/tag/<int:item_id>", endpoint="tag_page")
def tag_page(item_id):
    user_id = _get_current_user_id()
    if not user_id:
        return redirect(url_for("auth.home"))

    item = Item.query.filter_by(id=item_id, user_id=user_id).first_or_404()
    outfit_ids = [r.outfit_id for r in OutfitItem.query.filter_by(item_id=item.id).all()]
    outfits = (
        Outfit.query.filter(Outfit.id.in_(outfit_ids), Outfit.user_id == user_id)
        .order_by(Outfit.date.desc())
        .all()
    )
    return render_template("tag.html", item=item, outfits=outfits)
