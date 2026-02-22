"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo } from "react";

type NavLink = {
  href: string;
  label: string;
  matchPrefix?: string;
};

function isActive(pathname: string, link: NavLink): boolean {
  const prefix = link.matchPrefix ?? link.href;
  return pathname === link.href || pathname.startsWith(`${prefix}/`);
}

export function MainNav() {
  const pathname = usePathname();
  const router = useRouter();
  const todayIso = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const links: NavLink[] = useMemo(
    () => [
      { href: "/dashboard", label: "Dashboard", matchPrefix: "/dashboard" },
      { href: "/wardrobe", label: "Wardrobe", matchPrefix: "/wardrobe" },
      { href: `/diary/${todayIso}`, label: "Diary", matchPrefix: "/diary" },
      { href: "/stats", label: "Stats", matchPrefix: "/stats" },
      { href: "/account", label: "Account", matchPrefix: "/account" },
    ],
    [todayIso],
  );

  useEffect(() => {
    links.forEach((link) => {
      router.prefetch(link.href);
    });
  }, [links, router]);

  return (
    <nav className="app-nav" aria-label="Main">
      {links.map((link) => {
        const active = isActive(pathname, link);
        return (
          <Link
            key={link.href}
            href={link.href}
            className={`app-link${active ? " is-active" : ""}`}
            aria-current={active ? "page" : undefined}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
