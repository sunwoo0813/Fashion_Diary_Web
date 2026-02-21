"use client";

import { useRef, useState } from "react";

type WeatherData = {
  city: string;
  t_min: number;
  t_max: number;
  humidity: number;
  rain: boolean;
  desc: string;
};

type WeatherFieldsProps = {
  defaultCity?: string;
  defaultTMin?: number;
  defaultTMax?: number;
  defaultHumidity?: number;
  defaultRain?: boolean;
};

export function WeatherFields({
  defaultCity = "Seoul",
  defaultTMin = 0,
  defaultTMax = 0,
  defaultHumidity = 0,
  defaultRain = false,
}: WeatherFieldsProps) {
  const [city, setCity] = useState(defaultCity);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const tMinRef = useRef<HTMLInputElement>(null);
  const tMaxRef = useRef<HTMLInputElement>(null);
  const humidityRef = useRef<HTMLInputElement>(null);
  const rainRef = useRef<HTMLSelectElement>(null);

  async function handleFillWeather() {
    const trimmedCity = city.trim();
    if (!trimmedCity) {
      setError("Enter a city to fetch weather.");
      setMessage("");
      return;
    }

    setIsLoading(true);
    setError("");
    setMessage("");

    try {
      const response = await fetch(`/api/weather?city=${encodeURIComponent(trimmedCity)}`);
      const payload = (await response.json()) as
        | { ok: true; data: WeatherData }
        | { ok: false; error?: string };

      if (!response.ok || !payload.ok) {
        setError(payload.ok ? "Failed to fetch weather." : payload.error || "Failed to fetch weather.");
        return;
      }

      const weather = payload.data;
      if (tMinRef.current) tMinRef.current.value = String(weather.t_min);
      if (tMaxRef.current) tMaxRef.current.value = String(weather.t_max);
      if (humidityRef.current) humidityRef.current.value = String(weather.humidity);
      if (rainRef.current) rainRef.current.value = weather.rain ? "1" : "0";
      setMessage(`${weather.city} · ${weather.desc} · ${weather.t_max}C / ${weather.t_min}C`);
    } catch {
      setError("Failed to fetch weather.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <section className="outfit-weather-panel">
      <div className="outfit-weather-head">
        <label className="outfit-city-field">
          City
          <input
            type="text"
            value={city}
            onChange={(event) => setCity(event.target.value)}
            placeholder="Seoul"
          />
        </label>
        <button type="button" className="ghost-button" onClick={handleFillWeather} disabled={isLoading}>
          {isLoading ? "Loading..." : "Fill Weather"}
        </button>
      </div>

      {message ? <p className="outfit-weather-message">{message}</p> : null}
      {error ? <p className="form-error">{error}</p> : null}

      <div className="outfit-weather-grid">
        <label>
          Min Temp
          <input ref={tMinRef} type="number" step="0.1" name="t_min" defaultValue={String(defaultTMin)} />
        </label>
        <label>
          Max Temp
          <input ref={tMaxRef} type="number" step="0.1" name="t_max" defaultValue={String(defaultTMax)} />
        </label>
        <label>
          Humidity
          <input ref={humidityRef} type="number" name="humidity" defaultValue={String(defaultHumidity)} />
        </label>
        <label>
          Rain
          <select ref={rainRef} name="rain" defaultValue={defaultRain ? "1" : "0"}>
            <option value="0">No Rain</option>
            <option value="1">Rain</option>
          </select>
        </label>
      </div>
    </section>
  );
}
