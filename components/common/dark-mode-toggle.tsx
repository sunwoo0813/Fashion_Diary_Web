"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "fashion-diary-theme";

function applyTheme(isDark: boolean) {
  document.documentElement.dataset.theme = isDark ? "dark" : "light";
  document.documentElement.classList.toggle("dark", isDark);
}

export function DarkModeToggle() {
  const [isDark, setIsDark] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    const nextIsDark = stored ? stored === "dark" : false;
    setIsDark(nextIsDark);
    applyTheme(nextIsDark);
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    applyTheme(isDark);
    window.localStorage.setItem(STORAGE_KEY, isDark ? "dark" : "light");
  }, [isDark, ready]);

  return (
    <div className="theme-toggle-card">
      <p className="theme-toggle-label">다크 모드</p>
      <button
        type="button"
        className={`theme-toggle-switch${isDark ? " is-on" : ""}`}
        aria-pressed={isDark}
        aria-label="다크 모드 전환"
        onClick={() => setIsDark((current) => !current)}
      >
        <span className="theme-toggle-track">
          <span className="theme-toggle-thumb" />
        </span>
      </button>
    </div>
  );
}
