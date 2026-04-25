// app/layout.jsx - Updated with MessagesProvider
import React from "react";
import Head from "next/head";
import localFont from "next/font/local";
import "@/assets/styles/globals.css";
import Footer from "@/assets/components/Footer";
import Providers from "@/assets/components/Providers";
import { Toaster } from "@/components/ui/toaster";
import Navbar from "@/assets/components/Navbar";
import DisableZoom from "@/app/DisableZoom";
import MobileLayoutWrapper from "@/assets/components/MobileLayoutWrapper";

const font = localFont({
  src: "../public/Zalando.ttf",
  display: "swap",
  variable: "--font-zalando",
});

export const metadata = {
  title: "Ohi! | Pitch. Persuade. Procure",
  description: "Find home businesses near you or anywhere around South Africa.",
  keywords:
    "home businesses, home industry, home stores, home store near me, home business near me, home store near me",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Ohi!",
  },
  icons: {
    icon: "/icons/icon-192x192.png",
    apple: "/icons/icon-192x192.png",
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#059669",
  colorScheme: "light",
};

const MainLayout = ({ children }) => {
  return (
    <html suppressHydrationWarning>
      <body suppressHydrationWarning className={font.className}>
        <Providers>
          <DisableZoom />
          <Navbar />
          {/* <MobileLayoutWrapper> */}
            <div suppressHydrationWarning>{children}</div>
          {/* </MobileLayoutWrapper> */}
          <Footer />
          <Toaster />
        </Providers>
      </body>
    </html>
  );
};

export default MainLayout;
