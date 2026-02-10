import os
from datetime import datetime
from urllib.parse import quote

import requests


def _weather_api_key() -> str:
    return os.getenv("WEATHER_API_KEY") or os.getenv("API_KEY") or ""


def has_weather_api_key() -> bool:
    return bool(_weather_api_key())


def get_coordinates(city_name: str):
    api_key = _weather_api_key()
    if not api_key:
        return None, None, city_name

    try:
        city_encoded = quote(city_name)
        geo_url = (
            f"http://api.openweathermap.org/geo/1.0/direct?q={city_encoded}"
            f"&limit=1&appid={api_key}"
        )
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
    api_key = _weather_api_key()
    if not api_key:
        return None

    lat, lon, display_city = get_coordinates(city_name)
    if lat is None or lon is None:
        return None

    try:
        url = (
            "http://api.openweathermap.org/data/2.5/forecast"
            f"?lat={lat}&lon={lon}&appid={api_key}&units=metric&lang=kr"
        )
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
            "icon": icon,
        }
    except Exception:
        return None
