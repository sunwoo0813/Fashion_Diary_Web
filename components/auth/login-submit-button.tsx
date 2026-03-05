"use client";

import { useFormStatus } from "react-dom";

export function LoginSubmitButton() {
  const { pending } = useFormStatus();

  return (
    <>
      <button type="submit" className="solid-button auth-submit" disabled={pending}>
        Log In
      </button>
      {pending ? (
        <p className="auth-loading-indicator" role="status" aria-live="polite">
          loading...
        </p>
      ) : null}
    </>
  );
}
