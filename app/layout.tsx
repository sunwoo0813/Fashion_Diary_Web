import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "LAYERED",
  description: "LAYERED keeps your wardrobe, outfit archive, and styling records in one place.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
