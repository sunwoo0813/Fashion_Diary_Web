from datetime import date, timedelta

from flask import Blueprint, jsonify, redirect, render_template, request, session, url_for
from sqlalchemy import func

from extensions import db
from models import Item, Outfit, OutfitItem, OutfitPhoto
from services.weather_service import get_today_weather_summary, has_weather_api_key

stats_bp = Blueprint("stats", __name__)


def _get_current_user_id() -> int | None:
    uid = session.get("user_id")
    try:
        return int(uid) if uid is not None else None
    except Exception:
        return None


@stats_bp.route("/stats", endpoint="stats")
def stats():
    user_id = _get_current_user_id()
    if not user_id:
        return redirect(url_for("auth.home"))

    email = session.get("user_email") or ""
    display_name = email.split("@")[0] if email else "User"
    initials = (display_name[:2] if display_name else "U").upper()
    today = date.today()
    stats_start = today - timedelta(days=2)
    stats_days = [stats_start + timedelta(days=i) for i in range(5)]
    total_items = Item.query.filter(Item.user_id == user_id).count()
    total_outfits = Outfit.query.filter(Outfit.user_id == user_id).count()

    category_rows = (
        db.session.query(Item.category, func.count(Item.id))
        .filter(Item.user_id == user_id)
        .group_by(Item.category)
        .all()
    )
    season_rows = (
        db.session.query(Item.season, func.count(Item.id))
        .filter(Item.user_id == user_id)
        .group_by(Item.season)
        .all()
    )
    color_rows = (
        db.session.query(func.lower(Item.color), func.count(Item.id))
        .filter(Item.user_id == user_id)
        .filter(Item.color.isnot(None), func.length(func.trim(Item.color)) > 0)
        .group_by(func.lower(Item.color))
        .all()
    )
    photos_count = OutfitPhoto.query.join(Outfit, OutfitPhoto.outfit_id == Outfit.id).filter(
        Outfit.user_id == user_id
    ).count()

    category_counts = {}
    for category, cnt in category_rows:
        key = (category or "Unknown").strip() or "Unknown"
        category_counts[key] = category_counts.get(key, 0) + int(cnt)

    season_counts = {}
    for season, cnt in season_rows:
        key = (season or "Unknown").strip() or "Unknown"
        season_counts[key] = season_counts.get(key, 0) + int(cnt)

    color_counts = {}
    for color, cnt in color_rows:
        key = (color or "").strip().lower()
        if key:
            color_counts[key] = color_counts.get(key, 0) + int(cnt)

    current_year = date.today().year
    month_counts = {m: 0 for m in range(1, 13)}
    year_start = date(current_year, 1, 1)
    next_year_start = date(current_year + 1, 1, 1)
    month_rows = (
        db.session.query(db.extract("month", Outfit.date), func.count(Outfit.id))
        .filter(Outfit.user_id == user_id, Outfit.date >= year_start, Outfit.date < next_year_start)
        .group_by(db.extract("month", Outfit.date))
        .all()
    )
    for month_num, cnt in month_rows:
        month_counts[int(month_num)] = int(cnt)
    max_month_count = max(month_counts.values()) if month_counts else 0

    weather_total = 0
    rain_count = 0
    clear_count = 0
    temp_bucket_counts = {"0-4C": 0, "5-13C": 0, "14-22C": 0, "23-28C": 0, "29C+": 0}
    weather_rows = (
        Outfit.query.with_entities(Outfit.t_min, Outfit.t_max, Outfit.humidity, Outfit.rain)
        .filter(Outfit.user_id == user_id, Outfit.t_min.isnot(None), Outfit.t_max.isnot(None))
        .all()
    )
    for t_min, t_max, humidity, rain in weather_rows:
        if t_min == 0 and t_max == 0 and (humidity in (0, None)):
            continue
        weather_total += 1
        if rain:
            rain_count += 1
        else:
            clear_count += 1

        avg = (t_min + t_max) / 2
        if avg <= 4:
            temp_bucket_counts["0-4C"] += 1
        elif avg <= 13:
            temp_bucket_counts["5-13C"] += 1
        elif avg <= 22:
            temp_bucket_counts["14-22C"] += 1
        elif avg <= 28:
            temp_bucket_counts["23-28C"] += 1
        else:
            temp_bucket_counts["29C+"] += 1

    max_temp_count = max(temp_bucket_counts.values()) if temp_bucket_counts else 0
    rain_ratio = round((rain_count / weather_total) * 100) if weather_total else 0

    category_sorted = sorted(category_counts.items(), key=lambda x: (-x[1], x[0]))
    season_sorted = sorted(season_counts.items(), key=lambda x: (-x[1], x[0]))
    color_sorted = sorted(color_counts.items(), key=lambda x: (-x[1], x[0]))

    cutoff = today - timedelta(days=30)
    wear_counts = (
        db.session.query(OutfitItem.item_id, func.count(OutfitItem.outfit_id).label("cnt"))
        .join(Outfit, OutfitItem.outfit_id == Outfit.id)
        .join(Item, Item.id == OutfitItem.item_id)
        .filter(Item.user_id == user_id, Outfit.date >= cutoff)
        .group_by(OutfitItem.item_id)
        .order_by(func.count(OutfitItem.outfit_id).desc())
        .limit(5)
        .all()
    )
    item_ids = [row.item_id for row in wear_counts]
    item_map = {}
    if item_ids:
        for it in Item.query.filter(Item.user_id == user_id, Item.id.in_(item_ids)).all():
            item_map[it.id] = it
    top_items = []
    for row in wear_counts:
        it = item_map.get(row.item_id)
        if it:
            top_items.append({"item": it, "count": int(row.cnt)})

    color_total = sum(color_counts.values())
    palette_colors = ["#A89F91", "#D2B48C", "#9CAF88", "#E5D3B3"]
    palette = []
    if color_total:
        for idx, (name, cnt) in enumerate(color_sorted[:4]):
            percent = round((cnt / color_total) * 100)
            palette.append(
                {
                    "name": name.title(),
                    "count": cnt,
                    "percent": percent,
                    "color": palette_colors[idx],
                }
            )
    palette_center_percent = palette[0]["percent"] if palette else 0
    palette_center_label = palette[0]["name"] if palette else "Neutral"
    palette_remainder = max(0, 100 - sum(p["percent"] for p in palette))

    month_labels = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
    month_pairs = [(month_labels[m - 1], month_counts[m]) for m in range(1, 13)]
    efficiency_rate = 0
    if total_items > 0:
        efficiency_rate = min(100, round((total_outfits / total_items) * 100))
    curation_percent = min(100, round(60 + efficiency_rate * 0.4)) if total_items > 0 else 0
    top_season = season_sorted[0][0] if season_sorted else "Unknown"
    top_category = category_sorted[0][0] if category_sorted else "Unknown"

    return render_template(
        "stats.html",
        hide_nav=True,
        display_name=display_name,
        initials=initials,
        today=today,
        stats_days=stats_days,
        top_items=top_items,
        palette=palette,
        palette_center_label=palette_center_label,
        palette_center_percent=palette_center_percent,
        palette_remainder=palette_remainder,
        month_pairs=month_pairs,
        efficiency_rate=efficiency_rate,
        curation_percent=curation_percent,
        top_season=top_season,
        top_category=top_category,
        total_items=total_items,
        total_outfits=total_outfits,
        total_photos=photos_count,
        category_sorted=category_sorted,
        season_sorted=season_sorted,
        color_sorted=color_sorted,
        month_counts=month_counts,
        max_month_count=max_month_count,
        weather_total=weather_total,
        rain_count=rain_count,
        clear_count=clear_count,
        rain_ratio=rain_ratio,
        temp_buckets=list(temp_bucket_counts.items()),
        max_temp_count=max_temp_count,
        current_year=current_year,
    )


@stats_bp.route("/api/weather", endpoint="api_weather")
def api_weather():
    user_id = _get_current_user_id()
    if not user_id:
        return jsonify({"ok": False, "error": "unauthorized"}), 401
    if not has_weather_api_key():
        return jsonify({"ok": False, "error": "weather api key not set"}), 500

    city = (request.args.get("city") or "Seoul").strip()
    w = get_today_weather_summary(city)
    if not w:
        return jsonify({"ok": False, "error": "weather not available"}), 404
    return jsonify({"ok": True, "data": w})
