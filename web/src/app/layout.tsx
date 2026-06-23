import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";

const geist = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Metrix — Barcha analitikangiz bitta joyda",
  description:
    "YouTube, Telegram, Instagram va saytingiz — hammasi bitta minimalist dashboardda. Ertalab 1 daqiqada hamma narsa ko'z oldingizda.",
  keywords: ["analytics", "dashboard", "youtube", "telegram", "instagram"],
  openGraph: {
    title: "Metrix — Barcha analitikangiz bitta joyda",
    description: "Unified analytics dashboard for solopreneurs and indie hackers.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="uz" className={geist.variable} suppressHydrationWarning>
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
