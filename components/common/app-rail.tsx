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

  useEffect(() => clearCollapseTimer, []);

  return (
    <aside
      className={`app-rail${isExpanded ? " is-expanded" : ""}`}
      onMouseEnter={openRail}
      onMouseLeave={scheduleCloseRail}
      onFocusCapture={openRail}
      onBlurCapture={(event) => {
        const nextFocusTarget = event.relatedTarget as Node | null;
        if (nextFocusTarget && event.currentTarget.contains(nextFocusTarget)) return;
        scheduleCloseRail();
      }}
    >
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
    </aside>
  );
}
