import {
  ArchiveIcon,
  DashboardIcon,
  StatsIcon,
  WardrobeIcon,
} from "@/components/common/icons";

export type AppNavLink = {
  href: string;
  label: string;
  icon: React.ReactNode;
  matchPrefix?: string;
};

export const APP_NAV_LINKS: AppNavLink[] = [
  {
    href: "/dashboard",
    label: "오뭐입?",
    icon: <DashboardIcon size={16} />,
    matchPrefix: "/dashboard",
  },
  {
    href: "/wardrobe",
    label: "옷장",
    icon: <WardrobeIcon size={16} />,
    matchPrefix: "/wardrobe",
  },
  {
    href: "/diary",
    label: "아카이브",
    icon: <ArchiveIcon size={16} />,
    matchPrefix: "/diary",
  },
  {
    href: "/stats",
    label: "리포트",
    icon: <StatsIcon size={16} />,
    matchPrefix: "/stats",
  },
];
