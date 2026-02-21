"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type NavLink = {
  href: string;
  label: string;
  matchPrefix?: string;
};

const links: NavLink[] = [
  { href: "/dashboard", label: "Dashboard", matchPrefix: "/dashboard" },
  { href: "/wardrobe", label: "Wardrobe", matchPrefix: "/wardrobe" },
  { href: "/diary", label: "Diary", matchPrefix: "/diary" },
  { href: "/stats", label: "Stats", matchPrefix: "/stats" },
  { href: "/account", label: "Account", matchPrefix: "/account" },
];

function isActive(pathname: string, link: NavLink): boolean {
  const prefix = link.matchPrefix ?? link.href;
  return pathname === link.href || pathname.startsWith(`${prefix}/`);
}

export function MainNav() {
  const pathname = usePathname();

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
