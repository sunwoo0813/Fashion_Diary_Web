from flask import Flask, render_template, request, redirect, url_for, session, flash
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy import or_, func
from datetime import datetime
import os
import json
from calendar import monthrange
from datetime import date
import requests
from urllib.parse import quote
from datetime import timedelta
from flask import jsonify
from dotenv import load_dotenv
from supabase import create_client, Client
import uuid
from functools import wraps
from supabase_auth.errors import AuthApiError

app = Flask(__name__)
load_dotenv()
API_KEY = "47afe938567d28eaa932281c49255b53"
app.secret_key = os.getenv("FLASK_SECRET_KEY") or os.getenv("SECRET_KEY") or "dev-secret"

# DB 설정
app.config['SQLALCHEMY_DATABASE_URI'] = 'postgresql://postgres.csbvhoczfmdlelmfjqij:sunwoo0813%40@aws-1-ap-northeast-2.pooler.supabase.com:5432/postgres'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

# Supabase Storage 설정
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
SUPABASE_ANON_KEY = os.getenv("SUPABASE_ANON_KEY")
SUPABASE_BUCKET = os.getenv("SUPABASE_BUCKET", "uploads")
AUTH_DISABLE_EMAIL_CONFIRM = (os.getenv("AUTH_DISABLE_EMAIL_CONFIRM") or "").lower() in (
    "1", "true", "yes", "on"
)
_supabase_admin: Client | None = None
_supabase_auth: Client | None = None

def get_supabase_admin() -> Client:
    global _supabase_admin
    if _supabase_admin is None:
        if not SUPABASE_URL or not SUPABASE_SERVICE_ROLE_KEY:
            raise RuntimeError("Supabase env vars are not set")
        _supabase_admin = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    return _supabase_admin

def get_supabase_auth() -> Client:
    global _supabase_auth
    if _supabase_auth is None:
        if not SUPABASE_URL or not SUPABASE_ANON_KEY:
            raise RuntimeError("Supabase auth env vars are not set")
        _supabase_auth = create_client(SUPABASE_URL, SUPABASE_ANON_KEY)
    return _supabase_auth

def storage_public_url(object_path: str) -> str:
    return f"{SUPABASE_URL}/storage/v1/object/public/{SUPABASE_BUCKET}/{object_path}"

def upload_to_storage(file, prefix: str) -> str:
    """
    Upload file to Supabase Storage and return public URL.
    """
    ext = os.path.splitext(file.filename)[1] if file.filename else ""
    safe_name = f"{uuid.uuid4().hex}{ext}"
    object_path = f"{prefix}/{safe_name}"
    content = file.stream.read()
    if not content:
        raise ValueError("empty file")
    sb = get_supabase_admin()
    sb.storage.from_(SUPABASE_BUCKET).upload(
        object_path,
        content,
        {"content-type": file.mimetype or "application/octet-stream"},
    )
    return storage_public_url(object_path)

def delete_from_storage(public_url_or_path: str) -> None:
    """
    Delete from Supabase Storage if it looks like a public URL.
    """
    if not public_url_or_path:
        return
    if SUPABASE_URL and public_url_or_path.startswith(SUPABASE_URL):
        prefix = f"{SUPABASE_URL}/storage/v1/object/public/{SUPABASE_BUCKET}/"
        if public_url_or_path.startswith(prefix):
            object_path = public_url_or_path[len(prefix):]
            sb = get_supabase_admin()
            sb.storage.from_(SUPABASE_BUCKET).remove([object_path])
            return

def get_current_user_id() -> int | None:
    uid = session.get("user_id")
    try:
        return int(uid) if uid is not None else None
    except Exception:
        return None

def login_required(fn):
    @wraps(fn)
    def wrapper(*args, **kwargs):
        if not get_current_user_id():
            return redirect(url_for('home'))
        return fn(*args, **kwargs)
    return wrapper

def get_or_create_user(email: str) -> "User":
    user = User.query.filter_by(email=email).first()
    if user:
        return user
    user = User(email=email)
    db.session.add(user)
    db.session.commit()
    return user

def find_supabase_uid_by_email(email: str) -> str | None:
    if not email:
        return None
    sb = get_supabase_admin()
    page = 1
    while True:
        users = sb.auth.admin.list_users(page=page, per_page=1000)
        if not users:
            return None
        for u in users:
            if (u.email or "").lower() == email.lower():
                return u.id
        page += 1

def get_coordinates(city_name: str):
    """
    OpenWeather Geocoding API: 도시명 -> (lat, lon, 표시용 도시명)
    """
    try:
        city_encoded = quote(city_name)
        geo_url = f"http://api.openweathermap.org/geo/1.0/direct?q={city_encoded}&limit=1&appid={API_KEY}"
        res = requests.get(geo_url, timeout=6)
        data = res.json()

        if res.status_code == 200 and isinstance(data, list) and len(data) > 0:
            lat = data[0].get("lat")
            lon = data[0].get("lon")
            local_names = data[0].get("local_names") or {}
            display_name = local_names.get("ko", data[0].get("name", city_name))
            return lat, lon, display_name
    except Exception:
        pass
    return None, None, city_name

def get_today_weather_summary(city_name: str):
    """
    OpenWeather 5day/3hour forecast를 이용해 '오늘' 요약값 반환
    - t_min/t_max: 오늘 예보에서 최저/최고
    - humidity: 오늘 예보 습도 평균
    - rain: 오늘 비/눈 가능 여부
    - desc/icon: 대표 날씨 설명/아이콘(첫 슬롯)
    """
    lat, lon, display_city = get_coordinates(city_name)
    if lat is None or lon is None:
        return None

    try:
        url = f"http://api.openweathermap.org/data/2.5/forecast?lat={lat}&lon={lon}&appid={API_KEY}&units=metric&lang=kr"
        res = requests.get(url, timeout=6)
        data = res.json()

        if res.status_code != 200 or "list" not in data:
            return None

        today = datetime.now().date()

        temps, hums = [], []
        rain_flag = False
        desc, icon = "", ""

        first_today_slot = True

        for item in data["list"]:
            dt = datetime.fromtimestamp(item["dt"]).date()
            if dt != today:
                continue

            main = item.get("main", {})
            if "temp" in main:
                temps.append(float(main["temp"]))
            if "humidity" in main:
                hums.append(int(main["humidity"]))

            w0 = (item.get("weather") or [{}])[0]
            if first_today_slot:
                desc = w0.get("description", "") or ""
                icon = w0.get("icon", "") or ""
                first_today_slot = False

            main_name = (w0.get("main") or "").lower()
            if "rain" in main_name or "snow" in main_name:
                rain_flag = True

        # 오늘 예보가 하나도 없으면 첫 슬롯으로 fallback
        if not temps:
            first = data["list"][0]
            temps = [float(first["main"]["temp"])]
            hums = [int(first["main"].get("humidity", 0))]
            w0 = (first.get("weather") or [{}])[0]
            desc = w0.get("description", "") or ""
            icon = w0.get("icon", "") or ""
            main_name = (w0.get("main") or "").lower()
            rain_flag = ("rain" in main_name or "snow" in main_name)

        t_min = round(min(temps), 1)
        t_max = round(max(temps), 1)
        humidity = int(round(sum(hums) / len(hums))) if hums else 0

        return {
            "city": display_city,
            "t_min": t_min,
            "t_max": t_max,
            "humidity": humidity,
            "rain": bool(rain_flag),
            "desc": desc,
            "icon": icon
        }

    except Exception:
        return None

db = SQLAlchemy(app)

# -------------------- 모델 --------------------
class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String, unique=True)

class Item(db.Model):  # 옷장 아이템
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, index=True)
    name = db.Column(db.String, nullable=False)
    category = db.Column(db.String)   # top/bottom/outer/shoes/acc
    color = db.Column(db.String)
    season = db.Column(db.String)     # spring/summer/fall/winter
    image_path = db.Column(db.String)
    visibility = db.Column(db.String, default='private')
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

class Outfit(db.Model):  # 오늘의 코디 (다이어리 기록)
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, index=True)
    date = db.Column(db.Date, default=datetime.utcnow)
    note = db.Column(db.String)
    photo_path = db.Column(db.String)
    t_min = db.Column(db.Float)
    t_max = db.Column(db.Float)
    rain = db.Column(db.Boolean, default=False)
    humidity = db.Column(db.Integer)
    visibility = db.Column(db.String, default='private')
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

class OutfitItem(db.Model):  # Outfit ↔ Item 연결 (M:N)
    outfit_id = db.Column(db.Integer, db.ForeignKey('outfit.id'), primary_key=True)
    item_id = db.Column(db.Integer, db.ForeignKey('item.id'), primary_key=True)

class OutfitPhoto(db.Model):  # Outfit 사진 여러 장
    __tablename__ = 'outfit_photo'
    id = db.Column(db.Integer, primary_key=True)
    outfit_id = db.Column(db.Integer, db.ForeignKey('outfit.id'), index=True, nullable=False)
    photo_path = db.Column(db.String, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

class OutfitPhotoItem(db.Model):  # OutfitPhoto ↔ Item 연결 (M:N)
    __tablename__ = 'outfit_photo_item'
    photo_id = db.Column(db.Integer, db.ForeignKey('outfit_photo.id'), primary_key=True)
    item_id = db.Column(db.Integer, db.ForeignKey('item.id'), primary_key=True)

# -------------------- 라우트 --------------------
@app.route('/', methods=['GET'])
def home():
    if get_current_user_id():
        return redirect(url_for('diary'))
    return render_template('login.html', hide_nav=True)

@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'GET':
        return redirect(url_for('home'))

    email = (request.form.get('email') or '').strip().lower()
    password = request.form.get('password') or ''
    if not email or not password:
        flash("이메일과 비밀번호를 입력하세요.", "danger")
        return redirect(url_for('home'))

    try:
        resp = get_supabase_auth().auth.sign_in_with_password({
            "email": email,
            "password": password,
        })
        if not resp or not resp.user or not (resp.user.email or email):
            flash("로그인에 실패했습니다. 입력값을 확인하세요.", "danger")
            return redirect(url_for('home'))

        user = get_or_create_user(resp.user.email or email)
        session["user_id"] = user.id
        session["user_email"] = user.email
        session["supabase_uid"] = resp.user.id
        return redirect(url_for('diary'))
    except AuthApiError as e:
        flash(f"로그인 실패: {e.message}", "danger")
        return redirect(url_for('home'))
    except Exception as e:
        flash(f"로그인 실패: {str(e)}", "danger")
        return redirect(url_for('home'))

@app.route('/signup', methods=['GET', 'POST'])
def signup():
    if request.method == 'GET':
        if get_current_user_id():
            return redirect(url_for('diary'))
        return render_template('signup.html', hide_nav=True)

    email = (request.form.get('email') or '').strip().lower()
    password = request.form.get('password') or ''
    if not email or not password:
        flash("이메일과 비밀번호를 입력하세요.", "danger")
        return redirect(url_for('signup'))

    try:
        app_base_url = (os.getenv("APP_BASE_URL") or request.host_url).rstrip("/")
        if AUTH_DISABLE_EMAIL_CONFIRM:
            try:
                get_supabase_admin().auth.admin.create_user({
                    "email": email,
                    "password": password,
                    "email_confirm": True
                })
            except AuthApiError as e:
                if e.code not in ("user_already_exists", "email_exists"):
                    raise

            resp = get_supabase_auth().auth.sign_in_with_password({
                "email": email,
                "password": password,
            })
        else:
            resp = get_supabase_auth().auth.sign_up({
                "email": email,
                "password": password,
                "options": {
                    "email_redirect_to": app_base_url
                }
            })
        if resp.session and resp.user and (resp.user.email or email):
            user = get_or_create_user(resp.user.email or email)
            session["user_id"] = user.id
            session["user_email"] = user.email
            session["supabase_uid"] = resp.user.id
            return redirect(url_for('diary'))

        flash("회원가입 완료. 이메일 인증 후 로그인하세요.", "success")
        return redirect(url_for('home'))
    except AuthApiError as e:
        flash(f"회원가입 실패: {e.message}", "danger")
        return redirect(url_for('signup'))
    except Exception as e:
        flash(f"회원가입 실패: {str(e)}", "danger")
        return redirect(url_for('signup'))

@app.route('/logout', methods=['POST'])
def logout():
    session.clear()
    return redirect(url_for('home'))

@app.route('/account')
@login_required
def account():
    return render_template('account.html')

@app.route('/account/delete', methods=['POST'])
@login_required
def account_delete():
    if (request.form.get("confirm") or "").strip().upper() != "DELETE":
        flash("탈퇴하려면 DELETE 를 입력하세요.", "danger")
        return redirect(url_for('account'))

    user_id = get_current_user_id()
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

    # storage cleanup
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

    # relations cleanup
    if photo_ids:
        OutfitPhotoItem.query.filter(OutfitPhotoItem.photo_id.in_(photo_ids)) \
            .delete(synchronize_session=False)
    if item_ids:
        OutfitItem.query.filter(OutfitItem.item_id.in_(item_ids)) \
            .delete(synchronize_session=False)
    if outfit_ids:
        OutfitItem.query.filter(OutfitItem.outfit_id.in_(outfit_ids)) \
            .delete(synchronize_session=False)

    if outfit_ids:
        OutfitPhoto.query.filter(OutfitPhoto.outfit_id.in_(outfit_ids)) \
            .delete(synchronize_session=False)
        Outfit.query.filter(Outfit.id.in_(outfit_ids)) \
            .delete(synchronize_session=False)
    if item_ids:
        Item.query.filter(Item.id.in_(item_ids)) \
            .delete(synchronize_session=False)

    user = User.query.filter_by(id=user_id).first()
    if user:
        db.session.delete(user)

    db.session.commit()

    # supabase auth delete
    try:
        if not supa_uid and user_email:
            supa_uid = find_supabase_uid_by_email(user_email)
        if supa_uid:
            get_supabase_admin().auth.admin.delete_user(supa_uid)
    except Exception:
        pass

    session.clear()
    flash("회원탈퇴가 완료되었습니다.", "success")
    return redirect(url_for('home'))

# 옷장
@app.route('/wardrobe')
@login_required
def wardrobe():
    user_id = get_current_user_id()
    q = (request.args.get('q') or '').strip()
    category = (request.args.get('category') or '').strip()
    color = (request.args.get('color') or '').strip()

    query = Item.query.filter(Item.user_id == user_id)
    if q:
        like_q = f"%{q}%"
        query = query.filter(or_(
            Item.name.ilike(like_q),
            Item.category.ilike(like_q),
            Item.color.ilike(like_q),
        ))
    if category:
        query = query.filter(Item.category == category)
    if color:
        query = query.filter(Item.color.ilike(f"%{color}%"))

    items = query.order_by(Item.created_at.desc()).all()
    categories = [
        c[0] for c in Item.query.with_entities(Item.category)
        .filter(Item.user_id == user_id)
        .distinct()
        .all()
        if c[0]
    ]
    has_filters = bool(q or category or color)

    wear_counts = {}
    if items:
        wear_rows = db.session.query(
            OutfitItem.item_id, func.count(OutfitItem.item_id)
        ).join(
            Outfit, OutfitItem.outfit_id == Outfit.id
        ).filter(
            Outfit.user_id == user_id
        ).group_by(OutfitItem.item_id).all()
        for iid, cnt in wear_rows:
            wear_counts[iid] = int(cnt)

        photo_rows = db.session.query(
            OutfitPhotoItem.item_id, func.count(OutfitPhotoItem.item_id)
        ).join(
            OutfitPhoto, OutfitPhotoItem.photo_id == OutfitPhoto.id
        ).join(
            Outfit, OutfitPhoto.outfit_id == Outfit.id
        ).filter(
            Outfit.user_id == user_id
        ).group_by(OutfitPhotoItem.item_id).all()
        for iid, cnt in photo_rows:
            wear_counts[iid] = wear_counts.get(iid, 0) + int(cnt)

    fav_ids = {
        iid for iid, cnt in sorted(
            wear_counts.items(), key=lambda x: x[1], reverse=True
        )[:3] if cnt > 0
    }

    return render_template(
        'wardrobe.html',
        items=items,
        q=q,
        category=category,
        color=color,
        categories=categories,
        has_filters=has_filters,
        wear_counts=wear_counts,
        fav_ids=fav_ids
    )

# 옷 추가
@app.route('/items', methods=['GET', 'POST'])
@login_required
def items_create():
    user_id = get_current_user_id()
    if request.method == 'POST':
        f = request.files.get('image')
        image_path = None
        if f and f.filename:
            image_path = upload_to_storage(f, "items")

        brand = (request.form.get('brand') or '').strip()
        product = (request.form.get('product') or '').strip()
        display_name = f"{brand} {product}".strip()
        if not display_name:
            display_name = "이름 없음"

        item = Item(
            user_id=user_id,
            name=display_name,
            category=request.form.get('category'),
            color=request.form.get('color'),
            season=request.form.get('season'),
            image_path=image_path
        )
        db.session.add(item)
        db.session.commit()
        return redirect(url_for('wardrobe'))
    return render_template('item_new.html')

# 옷 삭제 (다중 선택)
@app.route('/items/delete', methods=['POST'])
@login_required
def items_delete():
    user_id = get_current_user_id()
    raw_ids = request.form.getlist('item_ids')
    if not raw_ids:
        return redirect(url_for('wardrobe'))

    ids = []
    for rid in raw_ids:
        try:
            ids.append(int(rid))
        except Exception:
            pass
    if not ids:
        return redirect(url_for('wardrobe'))

    items = Item.query.filter(Item.id.in_(ids), Item.user_id == user_id).all()
    ids = [it.id for it in items]
    if not ids:
        return redirect(url_for('wardrobe'))

    # 연결된 태그/관계 삭제
    OutfitItem.query.filter(OutfitItem.item_id.in_(ids)).delete(synchronize_session=False)
    OutfitPhotoItem.query.filter(OutfitPhotoItem.item_id.in_(ids)).delete(synchronize_session=False)

    # 아이템 이미지 파일 삭제 + 레코드 삭제
    for it in items:
        if it.image_path:
            try:
                delete_from_storage(it.image_path)
            except Exception as e:
                print("이미지 삭제 실패:", e)
        db.session.delete(it)

    db.session.commit()
    return redirect(url_for('wardrobe'))

# 다이어리
def build_outfit_day_context(user_id: int, target_date: date):
    outfits = Outfit.query.filter_by(
        user_id=user_id,
        date=target_date
    ).order_by(Outfit.created_at.desc()).all()

    item_map = {o.id: [] for o in outfits}
    outfit_ids = [o.id for o in outfits]

    if outfit_ids:
        rows = db.session.query(OutfitItem.outfit_id, Item).join(
            Item, Item.id == OutfitItem.item_id
        ).filter(
            OutfitItem.outfit_id.in_(outfit_ids),
            Item.user_id == user_id
        ).all()
        for oid, item in rows:
            item_map[oid].append(item)

    photo_map = {o.id: [] for o in outfits}
    photo_tag_map = {}
    if outfit_ids:
        photos = OutfitPhoto.query.filter(OutfitPhoto.outfit_id.in_(outfit_ids)) \
                                  .order_by(OutfitPhoto.created_at.asc()) \
                                  .all()
        photo_ids = []
        for p in photos:
            photo_map[p.outfit_id].append(p)
            photo_ids.append(p.id)

        if photo_ids:
            rows = db.session.query(OutfitPhotoItem.photo_id, Item) \
                             .join(Item, Item.id == OutfitPhotoItem.item_id) \
                             .filter(
                                 OutfitPhotoItem.photo_id.in_(photo_ids),
                                 Item.user_id == user_id
                             ) \
                             .all()
            for pid, item in rows:
                photo_tag_map.setdefault(pid, []).append({
                    "id": item.id,
                    "name": item.name
                })

    return outfits, item_map, photo_map, photo_tag_map


@app.route('/diary')
@login_required
def diary():
    today = date.today()
    return redirect(url_for('diary_day', date_str=today.isoformat()))


@app.route('/diary/month')
@login_required
def diary_month():
    user_id = get_current_user_id()
    today = date.today()
    year = int(request.args.get('year', today.year))
    month = int(request.args.get('month', today.month))

    # ✅ (추가) 도시 파라미터 (기본: 서울)
    city = (request.args.get('city') or "서울").strip()

    # ✅ (추가) 오늘 날씨 요약 가져오기
    weather = get_today_weather_summary(city)

    # 그 달의 첫날~마지막날
    _, last_day = monthrange(year, month)
    days = list(range(1, last_day + 1))

    outfits = Outfit.query.filter(
        Outfit.user_id == user_id,
        db.extract('year', Outfit.date) == year,
        db.extract('month', Outfit.date) == month
    ).all()

    recorded_days = {o.date.day for o in outfits}

    return render_template(
        'diary.html',
        year=year,
        month=month,
        days=days,
        recorded_days=recorded_days,
        today=today,
        datetime=datetime,
        # ✅ (추가) 템플릿에 넘길 값
        city=city,
        weather=weather
    )


@app.route('/diary/date/<date_str>')
@login_required
def diary_day(date_str):
    user_id = get_current_user_id()
    try:
        target_date = datetime.fromisoformat(date_str).date()
    except ValueError:
        return "Invalid date format. Use YYYY-MM-DD", 400

    outfits, item_map, photo_map, photo_tag_map = build_outfit_day_context(
        user_id, target_date
    )

    city = (request.args.get('city') or "서울").strip()
    weather_live = None
    if target_date == date.today():
        weather_live = get_today_weather_summary(city)

    weather_record = None
    if outfits:
        o0 = outfits[0]
        has_record_weather = not (
            (o0.t_min or 0) == 0 and (o0.t_max or 0) == 0 and (o0.humidity in (0, None)) and not o0.rain
        )
        if has_record_weather:
            weather_record = {
                "t_min": o0.t_min or 0,
                "t_max": o0.t_max or 0,
                "humidity": o0.humidity or 0,
                "rain": bool(o0.rain)
            }

    prev_date = target_date - timedelta(days=1)
    next_date = target_date + timedelta(days=1)

    return render_template(
        'diary_day.html',
        target_date=target_date,
        prev_date=prev_date,
        next_date=next_date,
        outfits=outfits,
        item_map=item_map,
        photo_map=photo_map,
        photo_tag_map=photo_tag_map,
        weather=weather_live,
        weather_record=weather_record,
        city=city
    )

# 통계
@app.route('/stats')
@login_required
def stats():
    user_id = get_current_user_id()
    items = Item.query.filter(Item.user_id == user_id).all()
    outfits = Outfit.query.filter(Outfit.user_id == user_id).all()
    photos_count = OutfitPhoto.query.join(
        Outfit, OutfitPhoto.outfit_id == Outfit.id
    ).filter(Outfit.user_id == user_id).count()

    category_counts = {}
    season_counts = {}
    color_counts = {}

    for it in items:
        cat = (it.category or "미분류").strip()
        category_counts[cat] = category_counts.get(cat, 0) + 1

        season = (it.season or "미분류").strip()
        season_counts[season] = season_counts.get(season, 0) + 1

        color = (it.color or "").strip()
        if color:
            color_key = color.lower()
            color_counts[color_key] = color_counts.get(color_key, 0) + 1

    # 월별 코디 수 (올해)
    current_year = date.today().year
    month_counts = {m: 0 for m in range(1, 13)}
    for o in outfits:
        if o.date and o.date.year == current_year:
            month_counts[o.date.month] += 1
    max_month_count = max(month_counts.values()) if month_counts else 0

    weather_total = 0
    rain_count = 0
    clear_count = 0
    temp_bucket_counts = {
        "0~4℃": 0,
        "5~13℃": 0,
        "14~22℃": 0,
        "23~28℃": 0,
        "29℃+": 0,
    }

    for o in outfits:
        if o.t_min is None or o.t_max is None:
            continue
        if o.t_min == 0 and o.t_max == 0 and (o.humidity in (0, None)):
            continue
        weather_total += 1
        if o.rain:
            rain_count += 1
        else:
            clear_count += 1

        avg = (o.t_min + o.t_max) / 2
        if avg <= 4:
            temp_bucket_counts["0~4℃"] += 1
        elif avg <= 13:
            temp_bucket_counts["5~13℃"] += 1
        elif avg <= 22:
            temp_bucket_counts["14~22℃"] += 1
        elif avg <= 28:
            temp_bucket_counts["23~28℃"] += 1
        else:
            temp_bucket_counts["29℃+"] += 1

    max_temp_count = max(temp_bucket_counts.values()) if temp_bucket_counts else 0
    rain_ratio = round((rain_count / weather_total) * 100) if weather_total else 0

    category_sorted = sorted(category_counts.items(), key=lambda x: (-x[1], x[0]))
    season_sorted = sorted(season_counts.items(), key=lambda x: (-x[1], x[0]))
    color_sorted = sorted(color_counts.items(), key=lambda x: (-x[1], x[0]))

    return render_template(
        'stats.html',
        total_items=len(items),
        total_outfits=len(outfits),
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
        current_year=current_year
    )

# 코디 기록 추가
@app.route('/outfits', methods=['GET', 'POST'])
@login_required
def outfits_create():
    user_id = get_current_user_id()
    if request.method == 'POST':
        date_val = request.form.get('date') or datetime.utcnow().date().isoformat()
        target_date = datetime.fromisoformat(date_val).date()

        # ✅ 날짜당 1개만: 이미 있으면 "수정"으로 보내기
        existing = Outfit.query.filter_by(user_id=user_id, date=target_date).first()
        if existing:
            return redirect(url_for('outfit_edit', outfit_id=existing.id))

        # 날씨 값 저장(없으면 0/False)
        t_min_raw = request.form.get('t_min')
        t_max_raw = request.form.get('t_max')
        humidity_raw = request.form.get('humidity')
        rain_raw = request.form.get('rain')

        t_min_val = float(t_min_raw) if t_min_raw not in (None, "") else 0.0
        t_max_val = float(t_max_raw) if t_max_raw not in (None, "") else 0.0
        humidity_val = int(humidity_raw) if humidity_raw not in (None, "") else 0
        rain_val = bool(int(rain_raw)) if rain_raw not in (None, "") else False

        outfit = Outfit(
            user_id=user_id,
            date=target_date,
            note=request.form.get('note'),
            # photo_path는 이제 안 씀(기존 호환을 위해 남겨두는 건 OK)
            t_min=t_min_val,
            t_max=t_max_val,
            rain=rain_val,
            humidity=humidity_val,
        )
        db.session.add(outfit)
        db.session.flush()  # outfit.id 확보

        # ✅ 사진 여러 장 업로드: name="photos" multiple
        photo_tags_raw = request.form.get('photo_tags_json')
        try:
            photo_tags_list = json.loads(photo_tags_raw) if photo_tags_raw else []
        except Exception:
            photo_tags_list = []
        if not isinstance(photo_tags_list, list):
            photo_tags_list = []

        allowed_item_ids = {
            r[0] for r in Item.query.with_entities(Item.id)
            .filter(Item.user_id == user_id).all()
        }

        files = request.files.getlist('photos')
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
        return redirect(url_for('outfits_by_date', date_str=target_date.isoformat()))

    # GET
    items = Item.query.filter(Item.user_id == user_id).order_by(Item.created_at.desc()).all()
    now = request.args.get("date") or datetime.utcnow().date().isoformat()  # ✅ 날짜 자동 채움
    return render_template('outfit_new.html', items=items, now=now)


# 코디 삭제 라우트
@app.route('/outfits/<int:outfit_id>/delete', methods=['POST'])
@login_required
def outfit_delete(outfit_id):
    user_id = get_current_user_id()
    outfit = Outfit.query.filter_by(id=outfit_id, user_id=user_id).first_or_404()

    # 연결된 OutfitItem 관계도 같이 삭제
    OutfitItem.query.filter_by(outfit_id=outfit.id).delete()

    # ✅ 여러 사진 삭제
    photos = OutfitPhoto.query.filter_by(outfit_id=outfit.id).all()
    photo_ids = [p.id for p in photos]
    if photo_ids:
        OutfitPhotoItem.query.filter(OutfitPhotoItem.photo_id.in_(photo_ids)).delete(synchronize_session=False)
    for p in photos:
        if p.photo_path:
            try:
                delete_from_storage(p.photo_path)
            except Exception as e:
                print("사진 삭제 실패:", e)
        db.session.delete(p)

    # (기존 단일 photo_path도 혹시 남아있으면 삭제)
    if outfit.photo_path:
        try:
            delete_from_storage(outfit.photo_path)
        except Exception as e:
            print("사진 삭제 실패:", e)

    # Outfit 자체 삭제
    db.session.delete(outfit)
    db.session.commit()

    return redirect(url_for('diary'))

# 코디 수정 라우트
@app.route('/outfits/<int:outfit_id>/edit', methods=['GET', 'POST'])
@login_required
def outfit_edit(outfit_id):
    user_id = get_current_user_id()
    outfit = Outfit.query.filter_by(id=outfit_id, user_id=user_id).first_or_404()

    if request.method == 'POST':
        date_val = request.form.get('date') or outfit.date.isoformat()
        new_date = datetime.fromisoformat(date_val).date()

        # ✅ 날짜 바꾸려는데 그 날짜에 이미 다른 기록 있으면 막기
        clash = Outfit.query.filter(
            Outfit.user_id == user_id,
            Outfit.date == new_date,
            Outfit.id != outfit.id
        ).first()
        if clash:
            # 충돌나면 원래 날짜 유지 (혹은 에러처리)
            return redirect(url_for('outfit_edit', outfit_id=outfit.id))

        outfit.date = new_date
        outfit.note = request.form.get('note')

        t_min_raw = request.form.get('t_min')
        t_max_raw = request.form.get('t_max')
        humidity_raw = request.form.get('humidity')
        rain_raw = request.form.get('rain')

        outfit.t_min = float(t_min_raw) if t_min_raw not in (None, "") else 0.0
        outfit.t_max = float(t_max_raw) if t_max_raw not in (None, "") else 0.0
        outfit.humidity = int(humidity_raw) if humidity_raw not in (None, "") else 0
        outfit.rain = bool(int(rain_raw)) if rain_raw not in (None, "") else False

        # ✅ 체크된 기존 사진 삭제
        del_photo_ids = request.form.getlist('delete_photo_ids')
        for pid in del_photo_ids:
            p = OutfitPhoto.query.get(int(pid))
            if p and p.outfit_id == outfit.id:
                OutfitPhotoItem.query.filter_by(photo_id=p.id).delete()
                if p.photo_path:
                    try:
                        delete_from_storage(p.photo_path)
                    except Exception as e:
                        print("사진 삭제 실패:", e)
                db.session.delete(p)

        # ✅ 기존 사진 태그 갱신
        existing_tags_raw = request.form.get('photo_tags_existing_json')
        try:
            existing_tags_map = json.loads(existing_tags_raw) if existing_tags_raw else {}
        except Exception:
            existing_tags_map = {}
        if not isinstance(existing_tags_map, dict):
            existing_tags_map = {}

        allowed_item_ids = {
            r[0] for r in Item.query.with_entities(Item.id)
            .filter(Item.user_id == user_id).all()
        }

        remaining_photos = OutfitPhoto.query.filter_by(outfit_id=outfit.id).all()
        remaining_photo_ids = [p.id for p in remaining_photos]
        if remaining_photo_ids:
            OutfitPhotoItem.query.filter(OutfitPhotoItem.photo_id.in_(remaining_photo_ids)) \
                .delete(synchronize_session=False)
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

        # ✅ 새 사진 추가 업로드
        new_tags_raw = request.form.get('photo_tags_new_json')
        try:
            new_tags_list = json.loads(new_tags_raw) if new_tags_raw else []
        except Exception:
            new_tags_list = []
        if not isinstance(new_tags_list, list):
            new_tags_list = []

        files = request.files.getlist('photos')
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
        return redirect(url_for('outfits_by_date', date_str=outfit.date.isoformat()))

    # GET: 선택 아이템/사진 로드
    items = Item.query.filter(Item.user_id == user_id).order_by(Item.created_at.desc()).all()
    photos = OutfitPhoto.query.filter_by(outfit_id=outfit.id).order_by(OutfitPhoto.created_at.asc()).all()
    photo_ids = [p.id for p in photos]
    photo_tag_map = {pid: [] for pid in photo_ids}
    if photo_ids:
        rows = db.session.query(OutfitPhotoItem.photo_id, Item).join(
            Item, Item.id == OutfitPhotoItem.item_id
        ).filter(
            OutfitPhotoItem.photo_id.in_(photo_ids),
            Item.user_id == user_id
        ).all()
        for pid, item in rows:
            photo_tag_map[pid].append(item.id)

    return render_template(
        'outfit_edit.html',
        outfit=outfit,
        items=items,
        photos=photos,
        photo_tag_map=photo_tag_map
    )

# 날짜별 코디 보기 라우트 (신규 다이어리 화면으로 이동)
@app.route('/outfits/date/<date_str>')
@login_required
def outfits_by_date(date_str):
    return redirect(url_for('diary_day', date_str=date_str))

# 특정 옷의 코디 히스토리
@app.route('/tag/<int:item_id>')
@login_required
def tag_page(item_id):
    user_id = get_current_user_id()
    item = Item.query.filter_by(id=item_id, user_id=user_id).first_or_404()
    outfit_ids = [r.outfit_id for r in OutfitItem.query.filter_by(item_id=item.id).all()]
    outfits = Outfit.query.filter(
        Outfit.id.in_(outfit_ids),
        Outfit.user_id == user_id
    ).order_by(Outfit.date.desc()).all()
    return render_template('tag.html', item=item, outfits=outfits)

# -------------------- 날씨 API --------------------
@app.route("/api/weather")
@login_required
def api_weather():
    city = (request.args.get("city") or "서울").strip()
    w = get_today_weather_summary(city)
    if not w:
        return jsonify({"ok": False, "error": "weather not available"}), 404
    return jsonify({"ok": True, "data": w})

# -------------------- 실행 --------------------
if __name__ == '__main__':
    with app.app_context():
        db.create_all()
    app.run(debug=True)
