import type { Metadata, Viewport } from "next";
import { Archivo, Inter } from "next/font/google";
import "./globals.css";
import BottomNav from "@/components/BottomNav";
import WardrobeGate from "@/components/WardrobeGate";
import SyncBoot from "@/components/SyncBoot";

const archivo = Archivo({
  subsets: ["latin"],
  variable: "--font-archivo",
  display: "swap",
});
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Fitgod",
  description: "Your wardrobe, rotated daily.",
  manifest: "/manifest.webmanifest",
  icons: {
    apple: "/icons/apple-touch-icon.png",
  },
  appleWebApp: { capable: true, title: "Fitgod", statusBarStyle: "black-translucent" },
};

export const viewport: Viewport = {
  themeColor: "#0A0A0B",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${archivo.variable} ${inter.variable} font-body bg-base text-ink`}>
        <SyncBoot />
        <WardrobeGate>
          <div className="mx-auto min-h-dvh w-full max-w-md px-5 pb-28 pt-6 sm:max-w-lg md:max-w-2xl">
            {children}
          </div>
          <BottomNav />
        </WardrobeGate>
      </body>
    </html>
  );
}
