"use client";

import Link from "next/link";

import { ConfirmSubmitButton } from "@/components/common/confirm-submit-button";
import { PlusIcon, TrashIcon } from "@/components/common/icons";
import { useWardrobeDelete } from "./wardrobe-delete-context";

export function WardrobeDesktopActions() {
  const { deleteMode, selectedIds, handleDeleteButton } = useWardrobeDelete();

  return (
    <>
      <Link href="/wardrobe/new" className="solid-button diary-icon-button" aria-label="새 아이템 추가">
        <PlusIcon size={18} />
      </Link>
      {!deleteMode || selectedIds.length === 0 ? (
        <button
          type="button"
          className={`ghost-button diary-icon-button${deleteMode ? " is-delete-active" : ""}`}
          onClick={handleDeleteButton}
          aria-label="삭제 모드"
          aria-pressed={deleteMode}
        >
          <TrashIcon size={16} />
        </button>
      ) : (
        <ConfirmSubmitButton
          className="ghost-button diary-icon-button is-delete-active"
          formId="wardrobeDeleteForm"
          title={`${selectedIds.length}개 아이템을 삭제할까요?`}
          message="삭제한 아이템은 되돌릴 수 없고, 관련 착용 기록 연결도 함께 정리됩니다."
          confirmLabel="삭제"
          cancelLabel="취소"
        >
          <TrashIcon size={16} />
        </ConfirmSubmitButton>
      )}
      {deleteMode ? (
        <p className="wardrobe-desktop-delete-status">
          {selectedIds.length > 0 ? `${selectedIds.length}개 선택됨` : "삭제할 아이템을 선택하세요."}
        </p>
      ) : null}
    </>
  );
}
