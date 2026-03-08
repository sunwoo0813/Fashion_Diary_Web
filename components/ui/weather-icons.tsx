"use client";

import { motion } from "framer-motion";

import { cn } from "@/lib/utils";

interface WeatherIconProps {
  size?: number;
  className?: string;
}

function iconStyle(size: number) {
  return { width: size, height: size };
}

export function SunIcon({ size = 48, className }: WeatherIconProps) {
  return (
    <motion.svg
      viewBox="0 0 48 48"
      fill="none"
      className={cn(className)}
      style={iconStyle(size)}
    >
      <motion.g
        animate={{ rotate: 360 }}
        transition={{ duration: 12, ease: "linear", repeat: Infinity }}
      >
        {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => (
          <motion.line
            key={deg}
            x1="24"
            y1="6"
            x2="24"
            y2="10"
            stroke="#f5b625"
            strokeWidth={2}
            strokeLinecap="round"
            style={{ transformOrigin: "24px 24px", rotate: `${deg}deg` }}
            animate={{ opacity: [0.4, 1, 0.4] }}
            transition={{ duration: 2, repeat: Infinity, delay: deg / 360 }}
          />
        ))}
      </motion.g>
      <motion.circle
        cx="24"
        cy="24"
        r="8"
        fill="#f5b625"
        opacity={0.2}
        animate={{ scale: [1, 1.15, 1] }}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
      />
      <circle cx="24" cy="24" r="8" stroke="#f5b625" strokeWidth={2} />
    </motion.svg>
  );
}

export function MoonIcon({ size = 48, className }: WeatherIconProps) {
  const stars = [
    { cx: 34, cy: 10, d: 0 },
    { cx: 38, cy: 18, d: 0.5 },
    { cx: 30, cy: 6, d: 1 },
    { cx: 40, cy: 12, d: 1.5 },
  ];

  return (
    <svg viewBox="0 0 48 48" fill="none" className={cn(className)} style={iconStyle(size)}>
      <path d="M28 8a14 14 0 100 28 10 10 0 010-28z" fill="#8b89ff" opacity={0.15} />
      <path
        d="M28 8a14 14 0 100 28 10 10 0 010-28z"
        stroke="#8b89ff"
        strokeWidth={2}
        strokeLinecap="round"
      />
      {stars.map((star) => (
        <motion.circle
          key={`${star.cx}-${star.cy}`}
          cx={star.cx}
          cy={star.cy}
          r="1"
          fill="#8b89ff"
          animate={{ opacity: [0.2, 0.9, 0.2], scale: [0.8, 1.2, 0.8] }}
          transition={{ duration: 2, repeat: Infinity, delay: star.d }}
        />
      ))}
    </svg>
  );
}

export function CloudIcon({ size = 48, className }: WeatherIconProps) {
  return (
    <svg viewBox="0 0 48 48" fill="none" className={cn(className)} style={iconStyle(size)}>
      <motion.g
        animate={{ x: [0, 2, 0, -2, 0] }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
      >
        <path
          d="M36 30H14a8 8 0 01-.5-16A10 10 0 0134 16a7 7 0 012 14z"
          fill="#94a3b8"
          opacity={0.12}
        />
        <path
          d="M36 30H14a8 8 0 01-.5-16A10 10 0 0134 16a7 7 0 012 14z"
          stroke="#94a3b8"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </motion.g>
    </svg>
  );
}

export function RainIcon({ size = 48, className }: WeatherIconProps) {
  const drops = [
    { x: 16, d: 0 },
    { x: 22, d: 0.3 },
    { x: 28, d: 0.6 },
    { x: 34, d: 0.15 },
  ];

  return (
    <svg viewBox="0 0 48 48" fill="none" className={cn(className)} style={iconStyle(size)}>
      <path d="M36 22H14a7 7 0 01-.5-14A9 9 0 0134 10a6 6 0 012 12z" fill="#60a5fa" opacity={0.1} />
      <path
        d="M36 22H14a7 7 0 01-.5-14A9 9 0 0134 10a6 6 0 012 12z"
        stroke="#60a5fa"
        strokeWidth={2}
        strokeLinecap="round"
      />
      {drops.map((drop) => (
        <motion.line
          key={drop.x}
          x1={drop.x}
          y1={26}
          x2={drop.x}
          y2={30}
          stroke="#60a5fa"
          strokeWidth={2}
          strokeLinecap="round"
          animate={{ y: [0, 12], opacity: [0.8, 0] }}
          transition={{ duration: 0.8, repeat: Infinity, delay: drop.d, ease: "easeIn" }}
        />
      ))}
    </svg>
  );
}

export function HeavyRainIcon({ size = 48, className }: WeatherIconProps) {
  const drops = [
    { x: 14, d: 0 },
    { x: 19, d: 0.15 },
    { x: 24, d: 0.3 },
    { x: 29, d: 0.1 },
    { x: 34, d: 0.4 },
    { x: 37, d: 0.25 },
  ];

  return (
    <svg viewBox="0 0 48 48" fill="none" className={cn(className)} style={iconStyle(size)}>
      <path d="M36 20H14a7 7 0 01-.5-14A9 9 0 0134 8a6 6 0 012 12z" fill="#3b82f6" opacity={0.1} />
      <path
        d="M36 20H14a7 7 0 01-.5-14A9 9 0 0134 8a6 6 0 012 12z"
        stroke="#3b82f6"
        strokeWidth={2}
        strokeLinecap="round"
      />
      {drops.map((drop) => (
        <motion.line
          key={drop.x}
          x1={drop.x}
          y1={24}
          x2={drop.x - 2}
          y2={30}
          stroke="#3b82f6"
          strokeWidth={1.5}
          strokeLinecap="round"
          animate={{ y: [0, 16], opacity: [1, 0] }}
          transition={{ duration: 0.6, repeat: Infinity, delay: drop.d, ease: "easeIn" }}
        />
      ))}
    </svg>
  );
}

export function SnowIcon({ size = 48, className }: WeatherIconProps) {
  const flakes = [
    { x: 16, d: 0 },
    { x: 22, d: 0.5 },
    { x: 28, d: 0.2 },
    { x: 34, d: 0.7 },
    { x: 19, d: 1.0 },
    { x: 31, d: 0.4 },
  ];

  return (
    <svg viewBox="0 0 48 48" fill="none" className={cn(className)} style={iconStyle(size)}>
      <path d="M36 22H14a7 7 0 01-.5-14A9 9 0 0134 10a6 6 0 012 12z" fill="#cbd5e1" opacity={0.15} />
      <path
        d="M36 22H14a7 7 0 01-.5-14A9 9 0 0134 10a6 6 0 012 12z"
        stroke="#cbd5e1"
        strokeWidth={2}
        strokeLinecap="round"
      />
      {flakes.map((flake, index) => (
        <motion.circle
          key={`${flake.x}-${index}`}
          cx={flake.x}
          cy={26}
          r={1.5}
          fill="#cbd5e1"
          animate={{ y: [0, 14], x: [0, index % 2 === 0 ? 3 : -3, 0], opacity: [0.8, 0] }}
          transition={{ duration: 2, repeat: Infinity, delay: flake.d, ease: "easeIn" }}
        />
      ))}
    </svg>
  );
}

export function ThunderIcon({ size = 48, className }: WeatherIconProps) {
  return (
    <svg viewBox="0 0 48 48" fill="none" className={cn(className)} style={iconStyle(size)}>
      <path d="M36 20H14a7 7 0 01-.5-14A9 9 0 0134 8a6 6 0 012 12z" fill="#f59e0b" opacity={0.08} />
      <path
        d="M36 20H14a7 7 0 01-.5-14A9 9 0 0134 8a6 6 0 012 12z"
        stroke="#94a3b8"
        strokeWidth={2}
        strokeLinecap="round"
      />
      <motion.path
        d="M26 20l-3 8h6l-3 10"
        stroke="#f59e0b"
        strokeWidth={2.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        animate={{ opacity: [0, 1, 1, 0, 0, 0, 1, 0, 0, 0] }}
        transition={{ duration: 3, repeat: Infinity }}
      />
    </svg>
  );
}

export function FogIcon({ size = 48, className }: WeatherIconProps) {
  const lines = [
    { y: 16, w: 28, d: 0 },
    { y: 22, w: 32, d: 0.5 },
    { y: 28, w: 24, d: 1 },
    { y: 34, w: 30, d: 1.5 },
  ];

  return (
    <svg viewBox="0 0 48 48" fill="none" className={cn(className)} style={iconStyle(size)}>
      {lines.map((line) => (
        <motion.line
          key={line.y}
          x1={24 - line.w / 2}
          y1={line.y}
          x2={24 + line.w / 2}
          y2={line.y}
          stroke="#94a3b8"
          strokeWidth={2.5}
          strokeLinecap="round"
          animate={{ opacity: [0.2, 0.6, 0.2], x: [0, 3, 0] }}
          transition={{ duration: 3, repeat: Infinity, delay: line.d, ease: "easeInOut" }}
        />
      ))}
    </svg>
  );
}

export function PartlyCloudyIcon({ size = 48, className }: WeatherIconProps) {
  return (
    <svg viewBox="0 0 48 48" fill="none" className={cn(className)} style={iconStyle(size)}>
      <motion.g
        animate={{ rotate: 360 }}
        transition={{ duration: 20, ease: "linear", repeat: Infinity }}
        style={{ transformOrigin: "16px 16px" }}
      >
        {[0, 60, 120, 180, 240, 300].map((deg) => (
          <line
            key={deg}
            x1="16"
            y1="6"
            x2="16"
            y2="9"
            stroke="#f5b625"
            strokeWidth={1.5}
            strokeLinecap="round"
            style={{ transformOrigin: "16px 16px", rotate: `${deg}deg` }}
          />
        ))}
      </motion.g>
      <circle cx="16" cy="16" r="6" stroke="#f5b625" strokeWidth={1.5} fill="#f5b625" fillOpacity={0.15} />
      <motion.g
        animate={{ x: [0, 1.5, 0, -1.5, 0] }}
        transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
      >
        <path d="M38 34H18a7 7 0 01-.5-14A9 9 0 0136 22a6 6 0 012 12z" fill="#94a3b8" opacity={0.12} />
        <path
          d="M38 34H18a7 7 0 01-.5-14A9 9 0 0136 22a6 6 0 012 12z"
          stroke="#94a3b8"
          strokeWidth={2}
          strokeLinecap="round"
        />
      </motion.g>
    </svg>
  );
}

export function getWeatherIconComponent(
  desc: string,
  precipitationType: string,
  precipitationAmount: string,
) {
  const normalizedDesc = desc.toLowerCase();
  const normalizedPty = precipitationType.toLowerCase();

  if (normalizedPty.includes("snow")) return SnowIcon;
  if (normalizedPty.includes("shower")) return HeavyRainIcon;
  if (normalizedPty.includes("rain")) {
    return precipitationAmount !== "-" && precipitationAmount !== "0mm"
      ? HeavyRainIcon
      : RainIcon;
  }
  if (normalizedDesc.includes("thunder")) return ThunderIcon;
  if (normalizedDesc.includes("fog")) return FogIcon;
  if (normalizedDesc.includes("mostly cloudy")) return PartlyCloudyIcon;
  if (normalizedDesc.includes("cloud")) return CloudIcon;
  if (normalizedDesc.includes("clear") || normalizedDesc.includes("sun")) return SunIcon;
  if (normalizedDesc.includes("night")) return MoonIcon;
  return PartlyCloudyIcon;
}
