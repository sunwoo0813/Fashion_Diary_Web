type IconProps = {
  size?: number;
  className?: string;
};

function BaseIcon({
  size = 16,
  className,
  children,
}: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
      focusable="false"
    >
      {children}
    </svg>
  );
}

export function DashboardIcon({ size, className }: IconProps) {
  return (
    <BaseIcon size={size} className={className}>
      <circle cx="8" cy="8" r="3" />
      <path d="M8 2v2M8 12v2M2 8h2M12 8h2M3.8 3.8l1.4 1.4M10.8 10.8l1.4 1.4M12.2 3.8l-1.4 1.4M5.2 10.8l-1.4 1.4" />
      <path d="M14 17a3 3 0 0 1 2.9-2.2A3.6 3.6 0 0 1 20.5 18H14Z" />
      <path d="M12.5 18a2.5 2.5 0 0 1 2.5-2" />
    </BaseIcon>
  );
}

export function WardrobeIcon({ size, className }: IconProps) {
  return (
    <BaseIcon size={size} className={className}>
      <path d="M12 6a2 2 0 1 0-2-2" />
      <path d="M10 4h4" />
      <path d="M12 6v2" />
      <path d="M12 8 5 13a2 2 0 0 0 1.16 3.63h11.68A2 2 0 0 0 19 13l-7-5Z" />
    </BaseIcon>
  );
}

export function TryOnIcon({ size, className }: IconProps) {
  return (
    <BaseIcon size={size} className={className}>
      <circle cx="12" cy="12" r="8" />
      <circle cx="12" cy="12" r="3" />
    </BaseIcon>
  );
}

export function DiaryIcon({ size, className }: IconProps) {
  return (
    <BaseIcon size={size} className={className}>
      <rect x="3" y="4" width="18" height="17" rx="2" />
      <path d="M8 2v4M16 2v4M3 9h18" />
    </BaseIcon>
  );
}

export function OOTDIcon({ size, className }: IconProps) {
  return (
    <BaseIcon size={size} className={className}>
      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
      <circle cx="12" cy="13" r="4" />
    </BaseIcon>
  );
}

export function ArchiveIcon({ size, className }: IconProps) {
  return (
    <BaseIcon size={size} className={className}>
      <rect x="3" y="5" width="18" height="4" rx="1.5" />
      <path d="M5 9h14v10a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V9Z" />
      <path d="M10 13h4" />
    </BaseIcon>
  );
}

export function StatsIcon({ size, className }: IconProps) {
  return (
    <BaseIcon size={size} className={className}>
      <path d="M4 19V9" />
      <path d="M10 19V5" />
      <path d="M16 19v-7" />
      <path d="M22 19V3" />
    </BaseIcon>
  );
}

export function GridIcon({ size, className }: IconProps) {
  return (
    <BaseIcon size={size} className={className}>
      <rect x="3" y="3" width="7" height="7" />
      <rect x="14" y="3" width="7" height="7" />
      <rect x="3" y="14" width="7" height="7" />
      <rect x="14" y="14" width="7" height="7" />
    </BaseIcon>
  );
}

export function PlusIcon({ size, className }: IconProps) {
  return (
    <BaseIcon size={size} className={className}>
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </BaseIcon>
  );
}

export function ArrowRightIcon({ size, className }: IconProps) {
  return (
    <BaseIcon size={size} className={className}>
      <path d="M5 12h14" />
      <path d="m12 5 7 7-7 7" />
    </BaseIcon>
  );
}

export function ChevronDownIcon({ size, className }: IconProps) {
  return (
    <BaseIcon size={size} className={className}>
      <path d="m6 9 6 6 6-6" />
    </BaseIcon>
  );
}

export function TrashIcon({ size, className }: IconProps) {
  return (
    <BaseIcon size={size} className={className}>
      <path d="M3 6h18" />
      <path d="M8 6V4h8v2" />
      <path d="M19 6l-1 14H6L5 6" />
      <path d="M10 11v6" />
      <path d="M14 11v6" />
    </BaseIcon>
  );
}

export function SettingsIcon({ size, className }: IconProps) {
  return (
    <svg
      width={size || 16}
      height={size || 16}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
      focusable="false"
    >
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}

export function KebabVerticalIcon({ size, className }: IconProps) {
  return (
    <svg
      width={size || 16}
      height={size || 16}
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden
      focusable="false"
    >
      <circle cx="12" cy="5" r="2" />
      <circle cx="12" cy="12" r="2" />
      <circle cx="12" cy="19" r="2" />
    </svg>
  );
}
