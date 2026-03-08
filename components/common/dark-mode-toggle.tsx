"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "fashion-diary-theme";

function applyTheme(isDark: boolean) {
  document.documentElement.dataset.theme = isDark ? "dark" : "light";
  document.documentElement.classList.toggle("dark", isDark);
}

function SunIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="4.25" fill="none" stroke="currentColor" strokeWidth="1.9" />
      <path
        d="M12 2.75v2.1M12 19.15v2.1M21.25 12h-2.1M4.85 12h-2.1M18.54 5.46l-1.49 1.49M6.95 17.05l-1.49 1.49M18.54 18.54l-1.49-1.49M6.95 6.95L5.46 5.46"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
      />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path
        d="M14.6 3.35A8.95 8.95 0 1019.9 17.7 7.8 7.8 0 0114.6 3.35z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function DarkModeToggle() {
  const [theme, setTheme] = useState<"light" | "dark">("light");

  useEffect(() => {
    const savedTheme =
      window.localStorage.getItem(STORAGE_KEY) ||
      (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
    const nextTheme = savedTheme === "dark" ? "dark" : "light";

    setTheme(nextTheme);
    applyTheme(nextTheme === "dark");
  }, []);

  function toggleTheme() {
    const nextTheme = theme === "light" ? "dark" : "light";
    setTheme(nextTheme);
    window.localStorage.setItem(STORAGE_KEY, nextTheme);
    applyTheme(nextTheme === "dark");
  }

  return (
    <button
      type="button"
      className="theme-switch-button"
      aria-label="다크 모드 전환"
      aria-pressed={theme === "dark"}
      onClick={toggleTheme}
    >
      <span className={`theme-switch-icon theme-switch-sun${theme === "light" ? " is-active" : ""}`}>
        <SunIcon />
      </span>
      <span className={`theme-switch-icon theme-switch-moon${theme === "dark" ? " is-active" : ""}`}>
        <MoonIcon />
      </span>
    </button>
  );
}
