"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";

import { SettingsIcon } from "@/components/common/icons";
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
      <Link
        href="/account"
        className={`app-link${compact ? " is-compact" : ""}${pathname === "/account" ? " is-active" : ""}`}
        aria-current={pathname === "/account" ? "page" : undefined}
        aria-label={compact ? "설정" : undefined}
        onClick={onLinkClick}
      >
        <span className="app-link-icon" aria-hidden>
          <SettingsIcon size={16} />
        </span>
        <span className="app-link-text" aria-hidden={compact}>
          설정
        </span>
      </Link>
    </nav>
  );
}
