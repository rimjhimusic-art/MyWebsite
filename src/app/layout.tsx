import type { Metadata } from "next";
import { Outfit } from "next/font/google";
import "./globals.css";
import { ToastProvider } from "@/components/ToastProvider";
import { ChatWidget } from "@/components/ChatWidget";
import { CookieBanner } from "@/components/CookieBanner";
import { getCmsSiteData } from "@/lib/cms";

const outfit = Outfit({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
  variable: "--font-outfit",
});

export async function generateMetadata(): Promise<Metadata> {
  try {
    const cms = await getCmsSiteData();
    const homeSeo = cms.seoMap["home"];
    const favicon = cms.settings.faviconUrl || "/ref/logo.png";
    return {
      title: homeSeo?.metaTitle || `${cms.settings.siteName} | Music Distribution Services`,
      description:
        homeSeo?.metaDescription ||
        "Distribute your music to Spotify, Apple Music, JioSaavn, TikTok, and 150+ stores. Keep 100% of your rights and manage releases, labels, royalties, VEVO, and YouTube Content ID.",
      icons: {
        icon: favicon,
      },
    };
  } catch {
    return {
      title: "OneTab Media Network | Music Distribution & Label Management",
      description:
        "Distribute your music to Spotify, Apple Music, JioSaavn, TikTok, and 150+ stores. Keep 100% of your rights and manage releases, labels, royalties, VEVO, and YouTube Content ID.",
      icons: { icon: "/ref/logo.png" },
    };
  }
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={outfit.variable}>
      <body className="antialiased bg-[#0f0f0f] text-white min-h-screen">
        <ToastProvider>
          {children}
          <CookieBanner />
          <ChatWidget />
        </ToastProvider>
      </body>
    </html>
  );
}
