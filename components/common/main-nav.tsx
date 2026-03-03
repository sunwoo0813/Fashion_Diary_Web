"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";

import { APP_NAV_LINKS, type AppNavLink } from "@/components/common/nav-links";

function isActive(pathname: string, link: AppNavLink): boolean {
  const prefix = link.matchPrefix ?? link.href;
  return pathname === link.href || pathname.startsWith(`${prefix}/`);
}

export function MainNav({ compact = false }: { compact?: boolean }) {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    APP_NAV_LINKS.forEach((link) => {
      router.prefetch(link.href);
    });
  }, [router]);

  return (
    <nav className={`app-nav${compact ? " is-compact" : ""}`} aria-label="Main">
      {APP_NAV_LINKS.map((link) => {
        const active = isActive(pathname, link);
        return (
          <Link
            key={link.href}
            href={link.href}
            className={`app-link${compact ? " is-compact" : ""}${active ? " is-active" : ""}`}
            aria-current={active ? "page" : undefined}
            aria-label={compact ? link.label : undefined}
          >
            <span className="app-link-icon" aria-hidden>
              {link.icon}
            </span>
            {!compact ? <span className="app-link-text">{link.label}</span> : null}
          </Link>
        );
      })}
    </nav>
  );
}
