import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "LAYERED",
  description: "Next.js migration scaffold for LAYERED Web",
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
