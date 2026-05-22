import "./globals.css";

import type { Metadata } from "next";
import { Playfair_Display, Inter } from "next/font/google";

import HideOnStudio from "./components/HideOnStudio";
import SupabaseAuthReturn from "./components/SupabaseAuthReturn";
import SiteTopBar from "./components/SiteTopBar";
import { siteName, siteUrl } from "@/lib/site";

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
        {children}
      </body>
    </html>
  );
}
