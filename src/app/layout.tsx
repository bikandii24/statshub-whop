import type { Metadata } from "next";
import { Inter, Syne, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";

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
  title: "Stats Hub — TikTok Analytics",
  description: "Real-time TikTok analytics. Manage and analyze all your accounts in one place.",
};

import { AppLayoutClient } from "@/components/app-layout-client";
import { I18nProvider } from "@/i18n";
import { CookieBanner } from "@/components/cookie-banner";

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
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem={false}
          disableTransitionOnChange
        >
          <I18nProvider>
            <AppLayoutClient>
              {children}
            </AppLayoutClient>
            <CookieBanner />
          </I18nProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
