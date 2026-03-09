"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useFormStatus } from "react-dom";

export function LoginSubmitButton() {
  const { pending } = useFormStatus();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
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
      <button type="submit" className="solid-button auth-submit" disabled={pending}>
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
