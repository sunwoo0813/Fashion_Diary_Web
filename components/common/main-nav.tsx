"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";

import { DarkModeToggle } from "@/components/common/dark-mode-toggle";
import { APP_NAV_LINKS, type AppNavLink } from "@/components/common/nav-links";

function isActive(pathname: string, link: AppNavLink): boolean {
  const prefix = link.matchPrefix ?? link.href;
  return pathname === link.href || pathname.startsWith(`${prefix}/`);
}

export function MainNav({ compact = false, onLinkClick }: { compact?: boolean; onLinkClick?: () => void }) {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    APP_NAV_LINKS.forEach((link) => {
      router.prefetch(link.href);
    });
  }, [router]);

  return (
    <nav className={`app-nav${compact ? " is-compact" : ""}`} aria-label="메인 메뉴">
      {APP_NAV_LINKS.map((link) => {
        const active = isActive(pathname, link);
        return (
          <Link
            key={link.href}
            href={link.href}
            className={`app-link${compact ? " is-compact" : ""}${active ? " is-active" : ""}`}
            aria-current={active ? "page" : undefined}
            aria-label={compact ? link.label : undefined}
            onClick={onLinkClick}
          >
            <span className="app-link-icon" aria-hidden>
              {link.icon}
            </span>
            <span className="app-link-text" aria-hidden={compact}>
              {link.label}
            </span>
          </Link>
        );
      })}
      <div className="app-nav-theme-toggle">
        <DarkModeToggle />
      </div>
    </nav>
  );
}
