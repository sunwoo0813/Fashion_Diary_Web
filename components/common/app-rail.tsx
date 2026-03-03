"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { DarkModeToggle } from "@/components/common/dark-mode-toggle";
import { LogoutImageButton } from "@/components/common/logout-image-button";
import { MainNav } from "@/components/common/main-nav";

type AppRailProps = {
  displayName: string;
  email: string;
  initials: string;
};

const COLLAPSE_DELAY_MS = 1000;

export function AppRail({ displayName, email, initials }: AppRailProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isInstantClosing, setIsInstantClosing] = useState(false);
  const railRef = useRef<HTMLElement | null>(null);
  const collapseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearCollapseTimer = () => {
    if (!collapseTimerRef.current) return;
    clearTimeout(collapseTimerRef.current);
    collapseTimerRef.current = null;
  };

  const openRail = () => {
    clearCollapseTimer();
    setIsExpanded(true);
  };

  const scheduleCloseRail = () => {
    clearCollapseTimer();
    collapseTimerRef.current = setTimeout(() => {
      setIsExpanded(false);
      collapseTimerRef.current = null;
    }, COLLAPSE_DELAY_MS);
  };

  const closeRailImmediately = () => {
    clearCollapseTimer();
    setIsInstantClosing(true);
    setIsExpanded(false);
    window.setTimeout(() => {
      setIsInstantClosing(false);
    }, 0);
  };

  useEffect(() => clearCollapseTimer, []);

  useEffect(() => {
    const handlePointerDown = (event: PointerEvent) => {
      if (!isExpanded) return;
      const target = event.target as Node | null;
      if (target && railRef.current?.contains(target)) return;
      closeRailImmediately();
    };

    document.addEventListener("pointerdown", handlePointerDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
    };
  }, [isExpanded]);

  return (
    <aside
      ref={railRef}
      className={`app-rail${isExpanded ? " is-expanded" : ""}${isInstantClosing ? " is-instant-closing" : ""}`}
      onMouseEnter={openRail}
      onMouseLeave={scheduleCloseRail}
      onFocusCapture={openRail}
      onBlurCapture={(event) => {
        const nextFocusTarget = event.relatedTarget as Node | null;
        if (nextFocusTarget && event.currentTarget.contains(nextFocusTarget)) return;
        scheduleCloseRail();
      }}
    >
      <div className="app-rail-compact" aria-hidden={isExpanded}>
        <div className="brand-lockup is-compact" aria-label="Fashion Diary logo">
          <div className="brand-logo" aria-hidden>
            FD
          </div>
        </div>
        <MainNav compact />
        <div className="topbar-right is-compact">
          <Link href="/account" className="topbar-profile-link is-compact" aria-label="Open profile">
            <div className="rail-user is-compact">
              <div className="rail-avatar" aria-hidden>
                {initials}
              </div>
            </div>
          </Link>
        </div>
      </div>

      <div className="app-rail-panel">
        <div className="brand-lockup" aria-label="Fashion Diary logo">
          <div className="brand-logo" aria-hidden>
            FD
          </div>
          <div className="brand-text">
            <p className="brand-kicker">Fashion Diary</p>
            <h2 className="brand-title">Wardrobe OS</h2>
          </div>
        </div>
        <MainNav />

        <div className="topbar-right">
          <Link href="/account" className="topbar-profile-link" aria-label="Open profile">
            <div className="rail-user">
              <div className="rail-avatar" aria-hidden>
                {initials}
              </div>
              <div className="rail-user-meta">
                <p className="rail-user-name">{displayName}</p>
                <p className="rail-user-email">{email}</p>
              </div>
            </div>
          </Link>
          <DarkModeToggle />
        </div>
        <LogoutImageButton />
      </div>
    </aside>
  );
}
