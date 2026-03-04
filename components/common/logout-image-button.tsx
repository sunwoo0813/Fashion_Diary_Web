"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

export function LogoutImageButton() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  async function handleLogout() {
    setError("");

    try {
      const response = await fetch("/api/auth/logout", {
        method: "POST",
      });

      if (!response.ok) {
        throw new Error("로그아웃에 실패했어요.");
      }

      startTransition(() => {
        router.replace("/login");
        router.refresh();
      });
    } catch {
      setError("로그아웃에 실패했어요.");
    }
  }

  return (
    <div className="rail-logout-wrap">
      <button
        type="button"
        className="rail-logout-button"
        aria-label="로그아웃"
        onClick={handleLogout}
        disabled={isPending}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logout-button.png" alt="" aria-hidden="true" />
      </button>
      {error ? <p className="rail-logout-error">{error}</p> : null}
    </div>
  );
}
