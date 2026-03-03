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
];
