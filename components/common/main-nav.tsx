"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo } from "react";

import {
  DashboardIcon,
  DiaryIcon,
  StatsIcon,
  TryOnIcon,
  WardrobeIcon,
} from "@/components/common/icons";

type NavLink = {
  href: string;
  label: string;
  icon: React.ReactNode;
  matchPrefix?: string;
};

function isActive(pathname: string, link: NavLink): boolean {
  const prefix = link.matchPrefix ?? link.href;
  return pathname === link.href || pathname.startsWith(`${prefix}/`);
}

export function MainNav() {
  const pathname = usePathname();
  const router = useRouter();
  const links: NavLink[] = useMemo(
    () => [
      {
        href: "/dashboard",
        label: "Dashboard",
        icon: <DashboardIcon size={16} />,
        matchPrefix: "/dashboard",
      },
      {
        href: "/wardrobe",
        label: "Wardrobe",
        icon: <WardrobeIcon size={16} />,
        matchPrefix: "/wardrobe",
      },
      {
        href: "/try-on",
        label: "Try-on",
        icon: <TryOnIcon size={16} />,
        matchPrefix: "/try-on",
      },
      {
        href: "/diary",
        label: "Diary",
        icon: <DiaryIcon size={16} />,
        matchPrefix: "/diary",
      },
      {
        href: "/stats",
        label: "Stats",
        icon: <StatsIcon size={16} />,
        matchPrefix: "/stats",
      },
    ],
    [],
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
            <span className="app-link-icon" aria-hidden>
              {link.icon}
            </span>
            <span className="app-link-text">{link.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
