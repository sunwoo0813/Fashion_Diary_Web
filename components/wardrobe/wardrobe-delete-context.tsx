"use client";

import { createContext, useContext, useState } from "react";

type WardrobeDeleteContextValue = {
  deleteMode: boolean;
  selectedIds: number[];
  toggleItem: (id: number) => void;
  handleDeleteButton: () => void;
};

const WardrobeDeleteContext = createContext<WardrobeDeleteContextValue | null>(null);

export function useWardrobeDelete() {
  const ctx = useContext(WardrobeDeleteContext);
  if (!ctx) throw new Error("useWardrobeDelete must be used within WardrobeDeleteProvider");
  return ctx;
}

export function WardrobeDeleteProvider({ children }: { children: React.ReactNode }) {
  const [deleteMode, setDeleteMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  function toggleItem(id: number) {
    if (!deleteMode) return;
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((itemId) => itemId !== id) : [...prev, id],
    );
  }

  function handleDeleteButton() {
    if (!deleteMode) {
      setDeleteMode(true);
      return;
    }
    if (selectedIds.length === 0) {
      setDeleteMode(false);
    }
  }

  return (
    <WardrobeDeleteContext.Provider value={{ deleteMode, selectedIds, toggleItem, handleDeleteButton }}>
      {children}
    </WardrobeDeleteContext.Provider>
  );
}
