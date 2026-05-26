import "./globals.css";

import type { Metadata } from "next";
import { Playfair_Display, Inter } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";

import { NewsTipFloatingButton } from "./components/NewsTipCta";
import HideOnStudio from "./components/HideOnStudio";
import AdminNewsTipsNotice from "./components/AdminNewsTipsNotice";
import SiteFooter from "./components/SiteFooter";
import SupabaseAuthReturn from "./components/SupabaseAuthReturn";
import SiteTopBar from "./components/SiteTopBar";
import {
  siteDescription,
  siteKeywords,
  siteLocale,
  siteName,
  siteUrl,
} from "@/lib/site";
import { absoluteUrl } from "@/lib/seo";

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  applicationName: siteName,
  title: {
    default: siteName,
    template: `%s | ${siteName}`,
  },
  description: siteDescription,
  keywords: siteKeywords,
  authors: [{ name: siteName }],
  creator: siteName,
  publisher: siteName,
  category: "news",
  classification: "news, satire, opinion",
  alternates: {
    canonical: "/",
    types: {
      "application/rss+xml": absoluteUrl("/feed.xml"),
    },
  },
  formatDetection: {
    address: false,
    email: false,
    telephone: false,
  },
  openGraph: {
    type: "website",
    locale: siteLocale,
    url: siteUrl,
    siteName,
    title: siteName,
    description: siteDescription,
  },
  twitter: {
    card: "summary_large_image",
    title: siteName,
    description: siteDescription,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body className={`${playfair.variable} ${inter.variable}`}>
        <SupabaseAuthReturn />
        <HideOnStudio>
          <SiteTopBar />
        </HideOnStudio>
        <HideOnStudio>
          <AdminNewsTipsNotice />
        </HideOnStudio>
        <HideOnStudio>
          <NewsTipFloatingButton />
        </HideOnStudio>
        {children}
        <HideOnStudio>
          <SiteFooter />
        </HideOnStudio>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
