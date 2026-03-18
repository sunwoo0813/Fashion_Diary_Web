"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

export function LoginSubmitButton() {
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const [mounted, setMounted] = useState(false);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const form = buttonRef.current?.form;
    if (!form) return;

    function handleSubmit() {
      setPending(true);
    }

    form.addEventListener("submit", handleSubmit);
    return () => form.removeEventListener("submit", handleSubmit);
  }, []);

  useEffect(() => {
    const body = document.body;

    if (pending) {
      body.dataset.authLoading = "true";
    } else {
      delete body.dataset.authLoading;
    }

    return () => {
      delete body.dataset.authLoading;
    };
  }, [pending]);

  return (
    <>
      <button ref={buttonRef} type="submit" className="solid-button auth-submit" disabled={pending}>
        Log In
      </button>
      {mounted && pending
        ? createPortal(
            <div className="auth-loading-overlay" role="status" aria-live="polite" aria-label="Loading">
              <p className="auth-loading-indicator">loading...</p>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
