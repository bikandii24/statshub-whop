import type { Metadata } from "next";
import { Inter, Syne, Geist_Mono } from "next/font/google";
import "./globals.css";
import { WhopApp } from "@whop/react/components";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const syne = Syne({
  variable: "--font-syne",
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500", "600", "700", "800"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Stats Hub — Social Media Analytics",
  description: "Real-time social media analytics. Manage and analyze all your accounts in one place.",
};

import { AppLayoutClient } from "@/components/app-layout-client";
import { I18nProvider } from "@/i18n";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${inter.variable} ${syne.variable} ${geistMono.variable} font-sans antialiased`}
      >
        {/* WhopApp syncs theme (light/dark) from host Whop page automatically */}
        <WhopApp>
          <I18nProvider>
            <AppLayoutClient>
              {children}
            </AppLayoutClient>
          </I18nProvider>
        </WhopApp>
      </body>
    </html>
  );
}
