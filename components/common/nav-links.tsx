import {
  DashboardIcon,
  DiaryIcon,
  StatsIcon,
  TryOnIcon,
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
    label: "대시보드",
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
    href: "/try-on",
    label: "가상 피팅",
    icon: <TryOnIcon size={16} />,
    matchPrefix: "/try-on",
  },
  {
    href: "/diary",
    label: "다이어리",
    icon: <DiaryIcon size={16} />,
    matchPrefix: "/diary",
  },
  {
    href: "/stats",
    label: "통계",
    icon: <StatsIcon size={16} />,
    matchPrefix: "/stats",
  },
];
