import math
import os
from datetime import datetime, timedelta
from threading import Lock
from time import time

import requests


def _sanitize_proxy_env() -> None:
    # Some local setups keep broken loopback proxies (127.0.0.1:9),
    # which blocks outbound HTTPS requests.
    bad_proxy_targets = ("127.0.0.1:9", "localhost:9")
    for key in (
        "HTTP_PROXY",
        "HTTPS_PROXY",
        "ALL_PROXY",
        "http_proxy",
        "https_proxy",
        "all_proxy",
    ):
        value = os.getenv(key, "")
        if any(target in value for target in bad_proxy_targets):
            os.environ.pop(key, None)


_sanitize_proxy_env()

_session = requests.Session()
_session.headers.update(
    {
        "User-Agent": "fashion-diary-weather/1.0 (+https://example.local)",
        "Accept-Language": "ko,en;q=0.8",
    }
)

_cache_lock = Lock()
_geo_cache = {}
_weather_cache = {}

_GEO_TTL_SEC = 60 * 60 * 24
_GEO_ERR_TTL_SEC = 60 * 5
_WEATHER_TTL_SEC = 60 * 10
_WEATHER_ERR_TTL_SEC = 60

_KMA_ENDPOINT = "https://apis.data.go.kr/1360000/VilageFcstInfoService_2.0/getVilageFcst"
_GEOCODER_ENDPOINT = "https://nominatim.openstreetmap.org/search"
_BASE_HOURS = (2, 5, 8, 11, 14, 17, 20, 23)

# Small fast-path table for common city names.
# (query -> nx, ny, display_name)
_CITY_GRID = {
    "seoul": (60, 127, "Seoul"),
    "busan": (98, 76, "Busan"),
    "incheon": (55, 124, "Incheon"),
    "daegu": (89, 90, "Daegu"),
    "gwangju": (58, 74, "Gwangju"),
    "daejeon": (67, 100, "Daejeon"),
    "ulsan": (102, 84, "Ulsan"),
    "sejong": (66, 103, "Sejong"),
    "suwon": (60, 121, "Suwon"),
    "changwon": (91, 77, "Changwon"),
    "goyang": (57, 128, "Goyang"),
    "yongin": (64, 120, "Yongin"),
    "cheongju": (69, 106, "Cheongju"),
    "jeonju": (63, 89, "Jeonju"),
    "pohang": (102, 94, "Pohang"),
    "cheonan": (63, 110, "Cheonan"),
    "jeju": (52, 38, "Jeju"),
    "\uc11c\uc6b8": (60, 127, "\uc11c\uc6b8"),
    "\uc11c\uc6b8\uc2dc": (60, 127, "\uc11c\uc6b8"),
    "\uc11c\uc6b8\ud2b9\ubcc4\uc2dc": (60, 127, "\uc11c\uc6b8"),
    "\ubd80\uc0b0": (98, 76, "\ubd80\uc0b0"),
    "\ubd80\uc0b0\uc2dc": (98, 76, "\ubd80\uc0b0"),
    "\ubd80\uc0b0\uad11\uc5ed\uc2dc": (98, 76, "\ubd80\uc0b0"),
    "\uc778\ucc9c": (55, 124, "\uc778\ucc9c"),
    "\ub300\uad6c": (89, 90, "\ub300\uad6c"),
    "\uad11\uc8fc": (58, 74, "\uad11\uc8fc"),
    "\ub300\uc804": (67, 100, "\ub300\uc804"),
    "\uc6b8\uc0b0": (102, 84, "\uc6b8\uc0b0"),
    "\uc138\uc885": (66, 103, "\uc138\uc885"),
    "\uc218\uc6d0": (60, 121, "\uc218\uc6d0"),
    "\ucc3d\uc6d0": (91, 77, "\ucc3d\uc6d0"),
    "\uace0\uc591": (57, 128, "\uace0\uc591"),
    "\uc6a9\uc778": (64, 120, "\uc6a9\uc778"),
    "\uccad\uc8fc": (69, 106, "\uccad\uc8fc"),
    "\uc804\uc8fc": (63, 89, "\uc804\uc8fc"),
    "\ud3ec\ud56d": (102, 94, "\ud3ec\ud56d"),
    "\ucc9c\uc548": (63, 110, "\ucc9c\uc548"),
    "\uc81c\uc8fc": (52, 38, "\uc81c\uc8fc"),
}


# KMA DFS (5km) grid conversion constants.
_RE = 6371.00877  # Earth radius (km)
_GRID = 5.0
_SLAT1 = 30.0
_SLAT2 = 60.0
_OLON = 126.0
_OLAT = 38.0
_XO = 43
_YO = 136


def _weather_api_key() -> str:
    return os.getenv("KMA_API_KEY") or os.getenv("WEATHER_API_KEY") or os.getenv("API_KEY") or ""


def has_weather_api_key() -> bool:
    return bool(_weather_api_key())


def _cache_get(cache: dict, key: str):
    now = time()
    with _cache_lock:
        record = cache.get(key)
        if record is None:
            return False, None
        expires_at, value = record
        if expires_at < now:
            cache.pop(key, None)
            return False, None
        return True, value


def _cache_set(cache: dict, key: str, value, ttl_sec: int):
    with _cache_lock:
        cache[key] = (time() + ttl_sec, value)


def _city_key(city_name: str) -> str:
    return (city_name or "").strip().lower()


def _unique_strings(values: list[str]) -> list[str]:
    out = []
    seen = set()
    for value in values:
        v = (value or "").strip()
        if v and v not in seen:
            seen.add(v)
            out.append(v)
    return out


def _strip_admin_suffix(token: str) -> list[str]:
    suffixes = (
        "\ud2b9\ubcc4\uc2dc",
        "\uad11\uc5ed\uc2dc",
        "\ud2b9\ubcc4\uc790\uce58\uc2dc",
        "\ud2b9\ubcc4\uc790\uce58\ub3c4",
        "\uc790\uce58\uc2dc",
        "\uc790\uce58\ub3c4",
        "\uc2dc",
        "\uad70",
        "\uad6c",
        "\uc74d",
        "\uba74",
        "\ub3d9",
        "city",
        "county",
        "district",
        "gu",
        "gun",
        "si",
    )
    out = [token]
    lowered = token.lower()
    for suffix in suffixes:
        if lowered.endswith(suffix.lower()) and len(token) > len(suffix):
            out.append(token[: -len(suffix)].strip())
    return _unique_strings(out)


def _candidate_queries(city_name: str) -> list[str]:
    raw = (city_name or "").strip()
    if not raw:
        return []

    normalized = " ".join(raw.replace(",", " ").split())
    tokens = [t for t in normalized.split() if t]

    queries = [raw, normalized]
    if tokens:
        queries.extend(tokens)
        queries.append(tokens[-1])
        queries.append(tokens[0])
        if len(tokens) >= 2:
            queries.append(" ".join(tokens[-2:]))
            queries.append(" ".join(tokens[1:]))

        for token in tokens:
            queries.extend(_strip_admin_suffix(token))
        queries.extend(_strip_admin_suffix(tokens[-1]))

    return _unique_strings(queries)


def _latest_base_datetime(now: datetime) -> datetime:
    # Forecast data is published every 3 hours and can lag a few minutes.
    ref = now - timedelta(minutes=15)
    for hour in reversed(_BASE_HOURS):
        candidate = ref.replace(hour=hour, minute=0, second=0, microsecond=0)
        if ref >= candidate:
            return candidate
    return (ref - timedelta(days=1)).replace(hour=23, minute=0, second=0, microsecond=0)


def _to_float(value):
    try:
        return float(value)
    except Exception:
        return None


def _to_int(value):
    try:
        return int(float(value))
    except Exception:
        return None


def _describe_weather(pty: int, sky: int) -> str:
    if pty == 1:
        return "Rain"
    if pty == 2:
        return "Rain/Snow"
    if pty == 3:
        return "Snow"
    if pty == 4:
        return "Shower"
    if sky == 1:
        return "Sunny"
    if sky == 3:
        return "Mostly Cloudy"
    if sky == 4:
        return "Cloudy"
    return "Clear"


def _latlon_to_grid(lat: float, lon: float) -> tuple[int, int]:
    deg_to_rad = math.pi / 180.0
    re = _RE / _GRID
    slat1 = _SLAT1 * deg_to_rad
    slat2 = _SLAT2 * deg_to_rad
    olon = _OLON * deg_to_rad
    olat = _OLAT * deg_to_rad

    sn = math.tan(math.pi * 0.25 + slat2 * 0.5) / math.tan(math.pi * 0.25 + slat1 * 0.5)
    sn = math.log(math.cos(slat1) / math.cos(slat2)) / math.log(sn)
    sf = math.tan(math.pi * 0.25 + slat1 * 0.5)
    sf = (sf ** sn) * math.cos(slat1) / sn
    ro = math.tan(math.pi * 0.25 + olat * 0.5)
    ro = re * sf / (ro ** sn)

    ra = math.tan(math.pi * 0.25 + (lat * deg_to_rad) * 0.5)
    ra = re * sf / (ra ** sn)
    theta = lon * deg_to_rad - olon
    if theta > math.pi:
        theta -= 2.0 * math.pi
    if theta < -math.pi:
        theta += 2.0 * math.pi
    theta *= sn

    x = int(math.floor(ra * math.sin(theta) + _XO + 0.5))
    y = int(math.floor(ro - ra * math.cos(theta) + _YO + 0.5))
    return x, y


def _pick_display_name(geo_item: dict, fallback: str) -> str:
    address = geo_item.get("address") or {}
    # Prefer district-level names when available (e.g. Gangnam-gu),
    # then fall back to city-level names.
    for key in (
        "borough",
        "city_district",
        "county",
        "town",
        "village",
        "suburb",
        "city",
        "state_district",
        "municipality",
    ):
        value = address.get(key)
        if isinstance(value, str) and value.strip():
            return value.strip()

    for key in ("name", "display_name"):
        value = geo_item.get(key)
        if isinstance(value, str) and value.strip():
            return value.split(",")[0].strip()

    return fallback


def _geocode_query(query: str):
    # Try plain query first, then add country hints for better hit rate.
    variants = [query]
    lowered = query.lower()
    if "korea" not in lowered and "\ud55c\uad6d" not in query:
        variants.append(f"{query}, South Korea")
        variants.append(f"{query}, Korea")

    for q in variants:
        try:
            res = _session.get(
                _GEOCODER_ENDPOINT,
                params={
                    "q": q,
                    "format": "jsonv2",
                    "countrycodes": "kr",
                    "limit": 1,
                    "addressdetails": 1,
                },
                timeout=4,
            )
            if res.status_code != 200:
                continue

            data = res.json()
            if not isinstance(data, list) or not data:
                continue

            first = data[0]
            lat = _to_float(first.get("lat"))
            lon = _to_float(first.get("lon"))
            if lat is None or lon is None:
                continue

            nx, ny = _latlon_to_grid(lat, lon)
            display_name = _pick_display_name(first, query)
            return nx, ny, display_name
        except Exception:
            continue

    return None


def get_coordinates(city_name: str):
    cache_key = _city_key(city_name)
    hit, cached = _cache_get(_geo_cache, cache_key)
    if hit:
        if cached is None:
            return None, None, city_name
        nx, ny, display_name = cached
        return nx, ny, display_name

    alias_candidates = _candidate_queries(city_name)
    normalized = " ".join((city_name or "").replace(",", " ").split())
    tokens = [t for t in normalized.split() if t]
    prefer_geocode = (len(tokens) >= 2) or any(
        t.endswith(("\uad6c", "\uad70", "\uc74d", "\uba74", "\ub3d9")) for t in tokens
    )

    # 1) Fast path for simple city queries.
    if not prefer_geocode:
        for alias in alias_candidates:
            mapped = _CITY_GRID.get(alias.lower())
            if mapped:
                _cache_set(_geo_cache, cache_key, mapped, _GEO_TTL_SEC)
                return mapped

    # 2) Geocode arbitrary nationwide text query -> lat/lon -> KMA grid.
    for query in alias_candidates:
        resolved = _geocode_query(query)
        if resolved:
            _cache_set(_geo_cache, cache_key, resolved, _GEO_TTL_SEC)
            return resolved

    # 3) Final fallback to city table when geocoding misses.
    for alias in alias_candidates:
        mapped = _CITY_GRID.get(alias.lower())
        if mapped:
            _cache_set(_geo_cache, cache_key, mapped, _GEO_TTL_SEC)
            return mapped

    _cache_set(_geo_cache, cache_key, None, _GEO_ERR_TTL_SEC)
    return None, None, city_name


def get_today_weather_summary(city_name: str):
    api_key = _weather_api_key()
    if not api_key:
        return None

    weather_key = f"{datetime.now().date().isoformat()}::{_city_key(city_name)}"
    hit, cached_weather = _cache_get(_weather_cache, weather_key)
    if hit:
        return cached_weather

    nx, ny, display_city = get_coordinates(city_name)
    if nx is None or ny is None:
        _cache_set(_weather_cache, weather_key, None, _WEATHER_ERR_TTL_SEC)
        return None

    try:
        now = datetime.now()
        base_dt = _latest_base_datetime(now)
        res = _session.get(
            _KMA_ENDPOINT,
            params={
                "serviceKey": api_key,
                "pageNo": 1,
                "numOfRows": 1200,
                "dataType": "JSON",
                "base_date": base_dt.strftime("%Y%m%d"),
                "base_time": base_dt.strftime("%H00"),
                "nx": nx,
                "ny": ny,
            },
            timeout=4,
        )
        data = res.json()

        response = data.get("response") or {}
        header = response.get("header") or {}
        body = response.get("body") or {}
        items_obj = body.get("items") or {}
        items = items_obj.get("item") or []

        if (
            res.status_code != 200
            or header.get("resultCode") != "00"
            or not isinstance(items, list)
            or not items
        ):
            _cache_set(_weather_cache, weather_key, None, _WEATHER_ERR_TTL_SEC)
            return None

        today_key = now.strftime("%Y%m%d")
        today_items = [it for it in items if str(it.get("fcstDate") or "") == today_key]
        if not today_items:
            _cache_set(_weather_cache, weather_key, None, _WEATHER_ERR_TTL_SEC)
            return None

        temps, hums = [], []
        daily_tmn, daily_tmx = [], []
        slot_map = {}
        rain_flag = False

        for item in today_items:
            category = str(item.get("category") or "")
            fcst_time = str(item.get("fcstTime") or "")
            fcst_value = item.get("fcstValue")

            if fcst_time:
                slot_map.setdefault(fcst_time, {})[category] = fcst_value

            if category == "TMP":
                v = _to_float(fcst_value)
                if v is not None:
                    temps.append(v)
            elif category == "REH":
                v = _to_int(fcst_value)
                if v is not None:
                    hums.append(v)
            elif category == "TMN":
                v = _to_float(fcst_value)
                if v is not None:
                    daily_tmn.append(v)
            elif category == "TMX":
                v = _to_float(fcst_value)
                if v is not None:
                    daily_tmx.append(v)
            elif category == "PTY":
                v = _to_int(fcst_value)
                if v is not None and v > 0:
                    rain_flag = True

        if not temps and not daily_tmn and not daily_tmx:
            _cache_set(_weather_cache, weather_key, None, _WEATHER_ERR_TTL_SEC)
            return None

        t_min_raw = min(daily_tmn) if daily_tmn else min(temps)
        t_max_raw = max(daily_tmx) if daily_tmx else max(temps)
        t_min = round(t_min_raw, 1)
        t_max = round(t_max_raw, 1)
        if t_min > t_max:
            t_min, t_max = t_max, t_min

        humidity = int(round(sum(hums) / len(hums))) if hums else 0

        now_hhmm = now.strftime("%H%M")
        times = sorted([t for t in slot_map.keys() if t and t.isdigit()])
        target_time = None
        for t in times:
            if t >= now_hhmm:
                target_time = t
                break
        if target_time is None and times:
            target_time = times[0]

        target = slot_map.get(target_time or "", {})
        pty_now = _to_int(target.get("PTY")) or 0
        sky_now = _to_int(target.get("SKY")) or 1
        desc = _describe_weather(pty_now, sky_now)

        result = {
            "city": display_city,
            "t_min": t_min,
            "t_max": t_max,
            "humidity": humidity,
            "rain": bool(rain_flag),
            "desc": desc,
            "icon": "",
        }
        _cache_set(_weather_cache, weather_key, result, _WEATHER_TTL_SEC)
        return result
    except Exception:
        _cache_set(_weather_cache, weather_key, None, _WEATHER_ERR_TTL_SEC)
        return None
