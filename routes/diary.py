import json
from calendar import monthrange
from datetime import date, datetime, timedelta

from flask import Blueprint, redirect, render_template, request, session, url_for

from extensions import db
from models import Item, Outfit, OutfitItem, OutfitPhoto, OutfitPhotoItem
from services.supabase_service import delete_from_storage, upload_to_storage
from services.weather_service import get_today_weather_summary

diary_bp = Blueprint("diary", __name__)


def _get_current_user_id() -> int | None:
    uid = session.get("user_id")
    try:
        return int(uid) if uid is not None else None
    except Exception:
        return None


def _build_outfit_day_context(user_id: int, target_date: date):
    outfits = Outfit.query.filter_by(user_id=user_id, date=target_date).order_by(
        Outfit.created_at.desc()
    ).all()

    item_map = {o.id: [] for o in outfits}
    outfit_ids = [o.id for o in outfits]

    if outfit_ids:
        rows = (
            db.session.query(OutfitItem.outfit_id, Item)
            .join(Item, Item.id == OutfitItem.item_id)
            .filter(OutfitItem.outfit_id.in_(outfit_ids), Item.user_id == user_id)
            .all()
        )
        for oid, item in rows:
            item_map[oid].append(item)

    photo_map = {o.id: [] for o in outfits}
    photo_tag_map = {}
    if outfit_ids:
        photos = (
            OutfitPhoto.query.filter(OutfitPhoto.outfit_id.in_(outfit_ids))
            .order_by(OutfitPhoto.created_at.asc())
            .all()
        )
        photo_ids = []
        for p in photos:
            photo_map[p.outfit_id].append(p)
            photo_ids.append(p.id)

        if photo_ids:
            rows = (
                db.session.query(OutfitPhotoItem.photo_id, Item)
                .join(Item, Item.id == OutfitPhotoItem.item_id)
                .filter(OutfitPhotoItem.photo_id.in_(photo_ids), Item.user_id == user_id)
                .all()
            )
            for pid, item in rows:
                photo_tag_map.setdefault(pid, []).append({"id": item.id, "name": item.name})

    return outfits, item_map, photo_map, photo_tag_map


@diary_bp.route("/diary", endpoint="diary")
def diary():
    if not _get_current_user_id():
        return redirect(url_for("auth.home"))
    today = date.today()
    return redirect(url_for("diary.diary_day", date_str=today.isoformat()))


@diary_bp.route("/diary/month", endpoint="diary_month")
def diary_month():
    user_id = _get_current_user_id()
    if not user_id:
        return redirect(url_for("auth.home"))

    today = date.today()
    year = int(request.args.get("year", today.year))
    month = int(request.args.get("month", today.month))
    city = (request.args.get("city") or "Seoul").strip()
    weather = get_today_weather_summary(city)

    _, last_day = monthrange(year, month)
    days = list(range(1, last_day + 1))
    month_start = date(year, month, 1)
    month_end = month_start + timedelta(days=last_day)

    outfits = Outfit.query.filter(
        Outfit.user_id == user_id,
        Outfit.date >= month_start,
        Outfit.date < month_end,
    ).all()
    recorded_days = {o.date.day for o in outfits}

    return render_template(
        "diary.html",
        year=year,
        month=month,
        days=days,
        recorded_days=recorded_days,
        today=today,
        datetime=datetime,
        city=city,
        weather=weather,
    )


@diary_bp.route("/diary/date/<date_str>", endpoint="diary_day")
def diary_day(date_str):
    user_id = _get_current_user_id()
    if not user_id:
        return redirect(url_for("auth.home"))

    try:
        target_date = datetime.fromisoformat(date_str).date()
    except ValueError:
        return "Invalid date format. Use YYYY-MM-DD", 400

    outfits, item_map, photo_map, photo_tag_map = _build_outfit_day_context(user_id, target_date)

    city = (request.args.get("city") or "Seoul").strip()
    weather_live = get_today_weather_summary(city) if target_date == date.today() else None

    weather_record = None
    if outfits:
        o0 = outfits[0]
        has_record_weather = not (
            (o0.t_min or 0) == 0
            and (o0.t_max or 0) == 0
            and (o0.humidity in (0, None))
            and not o0.rain
        )
        if has_record_weather:
            weather_record = {
                "t_min": o0.t_min or 0,
                "t_max": o0.t_max or 0,
                "humidity": o0.humidity or 0,
                "rain": bool(o0.rain),
            }

    prev_date = target_date - timedelta(days=1)
    next_date = target_date + timedelta(days=1)
    email = session.get("user_email") or ""
    display_name = email.split("@")[0] if email else "User"
    initials = (display_name[:2] if display_name else "U").upper()

    total_outfits = Outfit.query.filter(Outfit.user_id == user_id).count()
    total_items = Item.query.filter(Item.user_id == user_id).count()

    week_start = target_date - timedelta(days=(target_date.weekday() + 1) % 7)
    week_days = [week_start + timedelta(days=i) for i in range(7)]
    month_label = target_date.strftime("%B %Y")

    return render_template(
        "diary_day.html",
        hide_nav=True,
        target_date=target_date,
        prev_date=prev_date,
        next_date=next_date,
        outfits=outfits,
        item_map=item_map,
        photo_map=photo_map,
        photo_tag_map=photo_tag_map,
        weather=weather_live,
        weather_record=weather_record,
        city=city,
        display_name=display_name,
        initials=initials,
        total_outfits=total_outfits,
        total_items=total_items,
        week_days=week_days,
        month_label=month_label,
    )


@diary_bp.route("/outfits", methods=["GET", "POST"], endpoint="outfits_create")
def outfits_create():
    user_id = _get_current_user_id()
    if not user_id:
        return redirect(url_for("auth.home"))

    if request.method == "POST":
        date_val = request.form.get("date") or datetime.utcnow().date().isoformat()
        target_date = datetime.fromisoformat(date_val).date()

        existing = Outfit.query.filter_by(user_id=user_id, date=target_date).first()
        if existing:
            return redirect(url_for("diary.outfit_edit", outfit_id=existing.id))

        t_min_raw = request.form.get("t_min")
        t_max_raw = request.form.get("t_max")
        humidity_raw = request.form.get("humidity")
        rain_raw = request.form.get("rain")

        t_min_val = float(t_min_raw) if t_min_raw not in (None, "") else 0.0
        t_max_val = float(t_max_raw) if t_max_raw not in (None, "") else 0.0
        humidity_val = int(humidity_raw) if humidity_raw not in (None, "") else 0
        rain_val = bool(int(rain_raw)) if rain_raw not in (None, "") else False

        outfit = Outfit(
            user_id=user_id,
            date=target_date,
            note=request.form.get("note"),
            t_min=t_min_val,
            t_max=t_max_val,
            rain=rain_val,
            humidity=humidity_val,
        )
        db.session.add(outfit)
        db.session.flush()

        photo_tags_raw = request.form.get("photo_tags_json")
        try:
            photo_tags_list = json.loads(photo_tags_raw) if photo_tags_raw else []
        except Exception:
            photo_tags_list = []
        if not isinstance(photo_tags_list, list):
            photo_tags_list = []

        allowed_item_ids = {
            r[0] for r in Item.query.with_entities(Item.id).filter(Item.user_id == user_id).all()
        }

        files = request.files.getlist("photos")
        for idx, f in enumerate(files):
            if f and f.filename:
                photo_path = upload_to_storage(f, "outfits")
                photo = OutfitPhoto(outfit_id=outfit.id, photo_path=photo_path)
                db.session.add(photo)
                db.session.flush()

                tag_ids = photo_tags_list[idx] if idx < len(photo_tags_list) else []
                for iid in tag_ids:
                    try:
                        iid_int = int(iid)
                        if iid_int in allowed_item_ids:
                            db.session.add(OutfitPhotoItem(photo_id=photo.id, item_id=iid_int))
                    except Exception:
                        pass

        db.session.commit()
        return redirect(url_for("diary.outfits_by_date", date_str=target_date.isoformat()))

    items = Item.query.filter(Item.user_id == user_id).order_by(Item.created_at.desc()).all()
    now = request.args.get("date") or datetime.utcnow().date().isoformat()
    return render_template("outfit_new.html", items=items, now=now)


@diary_bp.route("/outfits/<int:outfit_id>/delete", methods=["POST"], endpoint="outfit_delete")
def outfit_delete(outfit_id):
    user_id = _get_current_user_id()
    if not user_id:
        return redirect(url_for("auth.home"))

    outfit = Outfit.query.filter_by(id=outfit_id, user_id=user_id).first_or_404()
    OutfitItem.query.filter_by(outfit_id=outfit.id).delete()

    photos = OutfitPhoto.query.filter_by(outfit_id=outfit.id).all()
    photo_ids = [p.id for p in photos]
    if photo_ids:
        OutfitPhotoItem.query.filter(OutfitPhotoItem.photo_id.in_(photo_ids)).delete(
            synchronize_session=False
        )
    for p in photos:
        if p.photo_path:
            try:
                delete_from_storage(p.photo_path)
            except Exception:
                pass
        db.session.delete(p)

    if outfit.photo_path:
        try:
            delete_from_storage(outfit.photo_path)
        except Exception:
            pass

    db.session.delete(outfit)
    db.session.commit()
    return redirect(url_for("diary.diary"))


@diary_bp.route("/outfits/<int:outfit_id>/edit", methods=["GET", "POST"], endpoint="outfit_edit")
def outfit_edit(outfit_id):
    user_id = _get_current_user_id()
    if not user_id:
        return redirect(url_for("auth.home"))

    outfit = Outfit.query.filter_by(id=outfit_id, user_id=user_id).first_or_404()

    if request.method == "POST":
        date_val = request.form.get("date") or outfit.date.isoformat()
        new_date = datetime.fromisoformat(date_val).date()

        clash = Outfit.query.filter(
            Outfit.user_id == user_id, Outfit.date == new_date, Outfit.id != outfit.id
        ).first()
        if clash:
            return redirect(url_for("diary.outfit_edit", outfit_id=outfit.id))

        outfit.date = new_date
        outfit.note = request.form.get("note")

        t_min_raw = request.form.get("t_min")
        t_max_raw = request.form.get("t_max")
        humidity_raw = request.form.get("humidity")
        rain_raw = request.form.get("rain")

        outfit.t_min = float(t_min_raw) if t_min_raw not in (None, "") else 0.0
        outfit.t_max = float(t_max_raw) if t_max_raw not in (None, "") else 0.0
        outfit.humidity = int(humidity_raw) if humidity_raw not in (None, "") else 0
        outfit.rain = bool(int(rain_raw)) if rain_raw not in (None, "") else False

        del_photo_ids = request.form.getlist("delete_photo_ids")
        for pid in del_photo_ids:
            p = OutfitPhoto.query.get(int(pid))
            if p and p.outfit_id == outfit.id:
                OutfitPhotoItem.query.filter_by(photo_id=p.id).delete()
                if p.photo_path:
                    try:
                        delete_from_storage(p.photo_path)
                    except Exception:
                        pass
                db.session.delete(p)

        existing_tags_raw = request.form.get("photo_tags_existing_json")
        try:
            existing_tags_map = json.loads(existing_tags_raw) if existing_tags_raw else {}
        except Exception:
            existing_tags_map = {}
        if not isinstance(existing_tags_map, dict):
            existing_tags_map = {}

        allowed_item_ids = {
            r[0] for r in Item.query.with_entities(Item.id).filter(Item.user_id == user_id).all()
        }

        remaining_photos = OutfitPhoto.query.filter_by(outfit_id=outfit.id).all()
        remaining_photo_ids = [p.id for p in remaining_photos]
        if remaining_photo_ids:
            OutfitPhotoItem.query.filter(
                OutfitPhotoItem.photo_id.in_(remaining_photo_ids)
            ).delete(synchronize_session=False)
            for pid in remaining_photo_ids:
                key = str(pid)
                tag_ids = existing_tags_map.get(key) or existing_tags_map.get(pid) or []
                for iid in tag_ids:
                    try:
                        iid_int = int(iid)
                        if iid_int in allowed_item_ids:
                            db.session.add(OutfitPhotoItem(photo_id=pid, item_id=iid_int))
                    except Exception:
                        pass

        new_tags_raw = request.form.get("photo_tags_new_json")
        try:
            new_tags_list = json.loads(new_tags_raw) if new_tags_raw else []
        except Exception:
            new_tags_list = []
        if not isinstance(new_tags_list, list):
            new_tags_list = []

        files = request.files.getlist("photos")
        for idx, f in enumerate(files):
            if f and f.filename:
                photo_path = upload_to_storage(f, "outfits")
                photo = OutfitPhoto(outfit_id=outfit.id, photo_path=photo_path)
                db.session.add(photo)
                db.session.flush()

                tag_ids = new_tags_list[idx] if idx < len(new_tags_list) else []
                for iid in tag_ids:
                    try:
                        iid_int = int(iid)
                        if iid_int in allowed_item_ids:
                            db.session.add(OutfitPhotoItem(photo_id=photo.id, item_id=iid_int))
                    except Exception:
                        pass

        db.session.commit()
        return redirect(url_for("diary.outfits_by_date", date_str=outfit.date.isoformat()))

    items = Item.query.filter(Item.user_id == user_id).order_by(Item.created_at.desc()).all()
    photos = OutfitPhoto.query.filter_by(outfit_id=outfit.id).order_by(OutfitPhoto.created_at.asc()).all()
    photo_ids = [p.id for p in photos]
    photo_tag_map = {pid: [] for pid in photo_ids}
    if photo_ids:
        rows = (
            db.session.query(OutfitPhotoItem.photo_id, Item)
            .join(Item, Item.id == OutfitPhotoItem.item_id)
            .filter(OutfitPhotoItem.photo_id.in_(photo_ids), Item.user_id == user_id)
            .all()
        )
        for pid, item in rows:
            photo_tag_map[pid].append(item.id)

    return render_template(
        "outfit_edit.html", outfit=outfit, items=items, photos=photos, photo_tag_map=photo_tag_map
    )


@diary_bp.route("/outfits/date/<date_str>", endpoint="outfits_by_date")
def outfits_by_date(date_str):
    if not _get_current_user_id():
        return redirect(url_for("auth.home"))
    return redirect(url_for("diary.diary_day", date_str=date_str))
