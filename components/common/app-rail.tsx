"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import { MainNav } from "@/components/common/main-nav";

type AppRailProps = {
  displayName: string;
  email: string;
  initials: string;
};

type RailPanelContentProps = AppRailProps & {
  expanded: boolean;
  onNavigate?: () => void;
};

function MenuIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden focusable="false">
      <path d="M4 7h16M4 12h16M4 17h16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden focusable="false">
      <path d="M6 6l12 12M18 6L6 18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function RailPanelContent({ expanded, onNavigate, displayName, email, initials }: RailPanelContentProps) {
  return (
    <div className="app-rail-panel">
      <div className="brand-lockup" aria-label="LAYERED logo">
        <div className="brand-logo" aria-hidden>
          LY
        </div>
        <div className="brand-text" aria-hidden={!expanded}>
          <h2 className="brand-title">LAYERED</h2>
        </div>
      </div>
      <MainNav onLinkClick={onNavigate} />

      <div className="topbar-right">
        <Link
          href="/account"
          className="topbar-profile-link"
          aria-label="Open profile"
          onClick={onNavigate}
        >
          <div className="rail-user">
            <div className="rail-avatar" aria-hidden>
              {initials}
            </div>
            <div className="rail-user-meta" aria-hidden={!expanded}>
              <p className="rail-user-name">{displayName}</p>
              <p className="rail-user-email">{email}</p>
            </div>
          </div>
        </Link>
      </div>
    </div>
  );
}

export function AppRail({ displayName, email, initials }: AppRailProps) {
  const pathname = usePathname();
  const [isExpanded, setIsExpanded] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  useEffect(() => {
    setIsMobileOpen(false);
  }, [pathname]);

  const openRail = () => {
    if (typeof window !== "undefined" && window.matchMedia("(max-width: 900px)").matches) return;
    setIsExpanded(true);
  };

  const closeRail = () => {
    setIsExpanded(false);
  };

  const openMobileRail = () => {
    setIsMobileOpen(true);
  };

  const closeMobileRail = () => {
    setIsMobileOpen(false);
  };

  return (
    <aside
      className={`app-rail${isExpanded || isMobileOpen ? " is-expanded" : ""}`}
      onMouseEnter={openRail}
      onMouseLeave={closeRail}
      onFocusCapture={openRail}
      onBlurCapture={(event) => {
        const nextFocusTarget = event.relatedTarget as Node | null;
        if (nextFocusTarget && event.currentTarget.contains(nextFocusTarget)) return;
        closeRail();
      }}
    >
      <div className="app-rail-desktop">
        <RailPanelContent expanded={isExpanded} displayName={displayName} email={email} initials={initials} />
      </div>

      <div className="app-rail-mobile-bar">
        <button
          type="button"
          className="app-rail-mobile-trigger"
          aria-label="메뉴 열기"
          aria-expanded={isMobileOpen}
          onClick={openMobileRail}
        >
          <MenuIcon />
        </button>
        <p className="app-rail-mobile-logo" aria-hidden>
          LAYERED
        </p>
      </div>

      {isMobileOpen ? (
        <div className="app-rail-mobile-overlay" role="dialog" aria-modal="true" aria-label="모바일 메뉴">
          <button type="button" className="app-rail-mobile-close" aria-label="메뉴 닫기" onClick={closeMobileRail}>
            <CloseIcon />
          </button>
          <RailPanelContent expanded displayName={displayName} email={email} initials={initials} onNavigate={closeMobileRail} />
        </div>
      ) : null}
    </aside>
  );
}
