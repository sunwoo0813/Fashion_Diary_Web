"use client";

import { useEffect, useRef, useState } from "react";

type ConfirmSubmitButtonProps = {
  formAction?: string;
  formId?: string;
  name?: string;
  value?: string;
  className?: string;
  message: string;
  title?: string;
  kicker?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  children: React.ReactNode;
};

export function ConfirmSubmitButton({
  formAction,
  formId,
  name,
  value,
  className,
  message,
  title = "정말 삭제할까요?",
  kicker = "삭제 확인",
  confirmLabel = "삭제",
  cancelLabel = "취소",
  children,
}: ConfirmSubmitButtonProps) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const submitRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!open) return;

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [open]);

  function handleConfirm() {
    const form =
      (formId ? document.getElementById(formId) : null) ||
      triggerRef.current?.form ||
      submitRef.current?.form;
    if (!(form instanceof HTMLFormElement)) {
      setOpen(false);
      return;
    }

    setOpen(false);
    form.requestSubmit(submitRef.current || undefined);
  }

  return (
    <>
      <button ref={triggerRef} type="button" className={className} onClick={() => setOpen(true)}>
        {children}
      </button>
      <button
        ref={submitRef}
        type="submit"
        formAction={formAction}
        form={formId}
        name={name}
        value={value}
        hidden
        aria-hidden="true"
        tabIndex={-1}
        style={{ display: "none" }}
      />

      {open ? (
        <div className="confirm-modal-backdrop" onClick={() => setOpen(false)}>
          <div className="confirm-modal" onClick={(event) => event.stopPropagation()}>
            <p className="confirm-modal-kicker">{kicker}</p>
            <h2 className="confirm-modal-title">{title}</h2>
            <p className="confirm-modal-message">{message}</p>
            <div className="confirm-modal-actions">
              <button type="button" className="ghost-button" onClick={() => setOpen(false)}>
                {cancelLabel}
              </button>
              <button type="button" className="danger-button confirm-modal-danger" onClick={handleConfirm}>
                {confirmLabel}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
